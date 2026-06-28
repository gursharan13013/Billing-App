import { db as dexieDb } from './billingService';
import { auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { OnboardingManager } from './OnboardingManager';
import { billingService } from './billingService';

class CloudGatewayManagerService {
  /**
   * Evaluates if the current tenant has a valid premium license in Dexie system_meta.
   */
  async checkPremiumStatus(): Promise<boolean> {
    try {
      const record = await dexieDb.system_meta.get('isPremiumUser');
      return record ? !!record.value : false;
    } catch (e) {
      console.warn('Premium status check transactional fallback: ', e);
      return false;
    }
  }

  /**
   * Grants sandbox/local developer licensing upgrade to test the real-world Firebase triggers.
   */
  async upgradeToPremium(): Promise<void> {
    await dexieDb.system_meta.put({ key: 'isPremiumUser', value: true });
    // Also mirror to other key parameters for compatibility
    try {
      const bizIdRecord = await dexieDb.system_meta.get('businessId');
      if (bizIdRecord && bizIdRecord.value) {
        // Sync back to general billingService hooks if they are reading it
        localStorage.setItem(`premium_license_${bizIdRecord.value}`, 'true');
      }
    } catch (err) {
      console.warn('Licensing mirror error: ', err);
    }
  }

  /**
   * Completely locks and downgrades premium license to test security barriers.
   */
  async revokePremium(): Promise<void> {
    await dexieDb.system_meta.put({ key: 'isPremiumUser', value: false });
  }

  /**
   * Decides if the local app settings and Dexie indicate active cloud sync pipelines.
   */
  async isCloudPipelineActive(): Promise<boolean> {
    try {
      const record = await dexieDb.system_meta.get('isCloudSyncEnabled');
      return record ? !!record.value : false;
    } catch (e) {
      return false;
    }
  }

  /**
   * FIREWALL TOGGLE INTERCEPTOR & HANDSHAKE ENGINE
   * Handles enabling or disabling the cloud real-time Firebase syncing pipeline.
   * Exposes strict error strings:
   * - "PREMIUM_TIER_UPGRADE_REQUIRED": If isPremiumUser is False.
   * - "RE_AUTH_REQUIRED": If user auth token generation fails or network handshake is severed.
   */
  async toggleCloudPipeline(enable: boolean): Promise<string> {
    if (!enable) {
      // 1. Terminate sync state inside Dexie table system_meta
      await dexieDb.system_meta.put({ key: 'isCloudSyncEnabled', value: false });

      // 2. Terminate sync settings inside key-value properties of billingService
      try {
        const settings = await billingService.getAppSettings();
        await billingService.saveAppSettings({
          ...settings,
          cloudSyncEnabled: false
        });
      } catch (err) {
        console.warn('Could not rewrite AppSettings offline fallback: ', err);
        localStorage.setItem('isCloudSyncEnabled', 'false');
      }

      return 'CLOUD_DEACTIVATED_SUCCESSFULLY';
    }

    // --- ENABLING ACTIVE SYNC FLOW ---

    // 1. Assess licensing firewall constraints
    const isPremium = await this.checkPremiumStatus();
    if (!isPremium) {
      // Exploding with the requested structured error code to lock controls back to false
      throw new Error('PREMIUM_TIER_UPGRADE_REQUIRED');
    }

    // 2. Enforce physical online connection ping
    try {
      await OnboardingManager.performOnlinePreflightCheck();
    } catch (netErr: any) {
      // Re-route generic network faults to authentication or telemetry issues as requested
      throw new Error('RE_AUTH_REQUIRED');
    }

    // 3. Coordinate the exact Firebase Client Token handshakes
    let currentUser = auth.currentUser;

    if (!currentUser) {
      // Silently try anonymous/pseudonymous authentication to minimize friction
      try {
        await auth.authStateReady();
        currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('No current session detected, provoking anonymous tenant auth ...');
          const credential = await signInAnonymously(auth);
          currentUser = credential.user;
        }
      } catch (authErr: any) {
        console.error('Core Firebase auth token generation failed during transition: ', authErr);
        throw new Error('RE_AUTH_REQUIRED');
      }
    }

    if (!currentUser) {
      throw new Error('RE_AUTH_REQUIRED');
    }

    // 4. Force token refresh to verify connection is not expired or revoked by security rules
    try {
      const liveAuthToken = await currentUser.getIdToken(true);
      if (!liveAuthToken) {
        throw new Error('Empty authentication token recieved from Firestore auth.');
      }
      console.log('Firebase auth token confirmed & refreshed: ID Token length =', liveAuthToken.length);
    } catch (tokenErr: any) {
      console.warn('Token handshakes expired or invalidated during pipeline toggle: ', tokenErr);
      throw new Error('RE_AUTH_REQUIRED');
    }

    // 5. Commit state changes to Dexie and app settings upon successful handshake
    await dexieDb.system_meta.put({ key: 'isCloudSyncEnabled', value: true });

    try {
      const settings = await billingService.getAppSettings();
      await billingService.saveAppSettings({
        ...settings,
        cloudSyncEnabled: true
      });
    } catch (err) {
      console.warn('Fallback setting persistence error: ', err);
      localStorage.setItem('isCloudSyncEnabled', 'true');
    }

    return 'CLOUD_ACTIVATED_SUCCESSFULLY';
  }
}

export const CloudGatewayManager = new CloudGatewayManagerService();
