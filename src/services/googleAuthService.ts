import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Custom toggle for Simulator/Diagnostic Mode
let mockGoogleEnabled = true;

export const setMockGoogleEnabled = (val: boolean) => {
  mockGoogleEnabled = val;
  if (!val) {
    // If turning off mock, reset connections to allow clean real auth trial
    localStorage.removeItem('eb_gdrive_connected');
    localStorage.removeItem('eb_gdrive_email');
  }
};

export const isMockGoogleEnabled = () => mockGoogleEnabled;

// Safely initialize GoogleAuth for native environments
try {
  if (Capacitor.isNativePlatform()) {
    GoogleAuth.initialize({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      grantOfflineAccess: true,
    });
  }
} catch (err) {
  console.warn("Capacitor GoogleAuth initialization skipped or failed:", err);
}

let cachedAccessToken: string | null = null;
let cachedUser: any = null;

export const googleAuthService = {
  signIn: async (): Promise<any> => {
    try {
      if (mockGoogleEnabled) {
        // Simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        cachedAccessToken = 'mock-access-token-12345';
        cachedUser = {
          email: 'ceo@eazybilling.test',
          displayName: 'EazyBilling CEO',
          uid: 'mock-ceo-user-id'
        };
        localStorage.setItem('eb_gdrive_connected', 'true');
        localStorage.setItem('eb_gdrive_email', 'ceo@eazybilling.test');
        return cachedUser;
      }

      if (Capacitor.isNativePlatform()) {
        const nativeUser = await GoogleAuth.signIn();
        cachedUser = nativeUser;
        cachedAccessToken = nativeUser.authentication?.accessToken || null;
        localStorage.setItem('eb_gdrive_connected', 'true');
        if (nativeUser.email) {
          localStorage.setItem('eb_gdrive_email', nativeUser.email);
        }
        return nativeUser;
      } else {
        // Web fallback via Firebase Google Auth provider
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.accessToken) {
          throw new Error('Failed to obtain Google Drive OAuth access token.');
        }
        cachedUser = result.user;
        cachedAccessToken = credential.accessToken;
        localStorage.setItem('eb_gdrive_connected', 'true');
        if (result.user.email) {
          localStorage.setItem('eb_gdrive_email', result.user.email);
        }
        return result.user;
      }
    } catch (error: any) {
      console.error("Google Drive Auth Sign In Error:", error);
      if (error?.code === 'auth/cancelled-popup-request' || error?.message?.includes('cancelled-popup-request') || error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
        throw new Error(
          "Iframe Popup Blocked: Browser نے Google Auth sign-in popup cancel/block kar diya hai. " +
          "AI Studio preview iframe context ki limitations ki wajah se direct local popups block ho sakte hain. " +
          "Bypass karne ke liye: \n" +
          "1. Screen ke top-right side par 'Open in New Tab' icon par click karein aur popup open karne ki description instructions ko click karein.\n" +
          "2. Ya direct Simulator/Diagnostic mode ka use karein by active testing."
        );
      }
      if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
        throw new Error(
          "Popup Closed: Google authentication popup window user ne manually band kar di hai. Kirpa karke connect par firse tap karein."
        );
      }
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      if (mockGoogleEnabled) {
        cachedAccessToken = null;
        cachedUser = null;
        localStorage.removeItem('eb_gdrive_connected');
        localStorage.removeItem('eb_gdrive_email');
        return;
      }

      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      } else {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn("Google Sign Out Warning:", err);
    } finally {
      cachedAccessToken = null;
      cachedUser = null;
      localStorage.removeItem('eb_gdrive_connected');
      localStorage.removeItem('eb_gdrive_email');
    }
  },

  getAccessToken: async (): Promise<string | null> => {
    if (mockGoogleEnabled) {
      return 'mock-access-token-12345';
    }

    if (cachedAccessToken) {
      return cachedAccessToken;
    }
    
    // Fallback/silent refresh for native if connected
    if (Capacitor.isNativePlatform() && localStorage.getItem('eb_gdrive_connected') === 'true') {
      try {
        const nativeUser = await GoogleAuth.signIn();
        cachedAccessToken = nativeUser.authentication?.accessToken || null;
        cachedUser = nativeUser;
        return cachedAccessToken;
      } catch (e) {
        return null;
      }
    }
    
    return null;
  },

  isConnected: (): boolean => {
    return localStorage.getItem('eb_gdrive_connected') === 'true';
  },

  getConnectedEmail: (): string | null => {
    return localStorage.getItem('eb_gdrive_email');
  }
};
