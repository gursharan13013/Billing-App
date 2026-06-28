import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, getDocs, deleteDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChatMessage, billingService, db as localDb } from './billingService';
import { sqliteService } from './sqliteService';
import { app, auth, db } from './firebase';

// Initialize Firebase
import { setLogLevel } from 'firebase/app';
setLogLevel('silent'); // Suppress warnings about offline mode

export { auth, db };
export const storage = getStorage(app, firebaseConfig.storageBucket);

import type { Invoice, Item, PaymentRecord, Party } from '../core/types/';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase connection test successful");
  } catch (error: any) {
    if (error.message && error.message.includes('Missing or insufficient permissions')) {
        console.warn("Firebase permission check failed for 'test' collection - check firestore.rules if this is unexpected.");
    }
  }
}

let unsubscribeMessages: (() => void) | null = null;
let unsubscribeInvoices: (() => void) | null = null;

let currentMyMobile: string = '';

export const playNotificationSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const audioCtx = new AudioContextClass();
        const playTone = (freq: number, startTime: number, duration: number) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + startTime + 0.05);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + startTime + duration - 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + startTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(audioCtx.currentTime + startTime);
            oscillator.stop(audioCtx.currentTime + startTime + duration);
        };

        // Zomato-like notification chime
        playTone(659.25, 0, 0.25); // E5
        playTone(523.25, 0.3, 0.5); // C5
        
    } catch (error) {
        console.warn("Could not play notification sound", error);
    }
};

export const signInWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        console.log("Signed in with Google");
    } catch (e: any) {
        if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request' || e?.message?.includes('cancelled-popup-request') || e?.message?.includes('popup-blocked')) {
            console.warn("Google sign in popup was closed or blocked.");
            throw new Error(
                "Sign-in popup is block ya cancel ho gaya hai. " +
                "AI Studio preview iframe boundaries ki wajah se popups direct block ho sakte hain. " +
                "Kripya right-top par 'Open in New Tab' icon click karke application ko nayi window mein run karein!"
            );
        }
        console.error("Google sign in failed:", e);
        throw e;
    }
};

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

export const signInWithEmail = async (email: string, pass: string) => {
    return await signInWithEmailAndPassword(auth, email, pass);
};

export const signUpWithEmail = async (email: string, pass: string) => {
    return await createUserWithEmailAndPassword(auth, email, pass);
};

export const resetPasswordEmail = async (email: string) => {
    return await sendPasswordResetEmail(auth, email);
};

// Authenticate anonymously so we can read/write to Firestore securely
async function autoSyncProfileUid() {
    try {
        const localProfile = await billingService.getCompanyProfile();
        if (localProfile && localProfile.mobile && auth.currentUser) {
            const cleanMobile = localProfile.mobile.replace(/\D/g, '');
            // Only update the uid field to keep it fast and not overwrite other things if unneeded,
            // but the easiest is just calling the existing sync function.
            // Wait, saveCompanyProfile handles UI. We will just do a lightweight doc update:
            const profileRef = doc(db, 'company_profile', cleanMobile);
            const snap = await getDocFromServer(profileRef).catch(()=>null);
            if (snap && snap.exists() && snap.data().uid !== auth.currentUser.uid) {
                await updateDoc(profileRef, { uid: auth.currentUser.uid });
                console.log("Auto-synced new UID to Firebase company_profile:", auth.currentUser.uid);
            } else if (!snap || !snap.exists()) {
                // Not in cloud yet, sync it entirely
                const firebaseData = {
                    uid: auth.currentUser.uid,
                    name: localProfile.name || null,
                    address: localProfile.address || null,
                    city: localProfile.city || null,
                    state: localProfile.state || null,
                    pincode: localProfile.pincode || null,
                    gstin: localProfile.gstin || null,
                    pan: localProfile.pan || null,
                    mobile: localProfile.mobile || null,
                    email: localProfile.email || null,
                    website: localProfile.website || null,
                    is_gst_registered: localProfile.isGstRegistered ?? null,
                    business_category: localProfile.businessCategory || null,
                    business_type: localProfile.businessType || null,
                    updated_at: new Date().toISOString()
                };
                await updateDoc(profileRef, firebaseData).catch(async () => {
                    await setDoc(profileRef, firebaseData);
                });
            }
        }
    } catch (e) {
        console.warn("Could not auto-sync profile UID", e);
    }
}

export let firebaseAuthError: string | null = null;

export const logout = async () => {
    try {
        await auth.signOut();
        console.log("Signed out");
        // Re-initialize with anonymous if allowed, or just leave as null
        await initFirebaseAuth().catch(() => {});
    } catch (e) {
        console.error("Logout failed", e);
    }
};

export const initFirebaseAuth = async () => {
    try {
        const settings = await billingService.getAppSettings();
        if (!settings.cloudSyncEnabled && !settings.messagingEnabled && !settings.liveSearchEnabled) {
            console.log("Firebase auto-auth skipped: All online features disabled.");
            return;
        }

        await auth.authStateReady();
        if (auth.currentUser) {
            console.log("Firebase Auth already initialized for user:", auth.currentUser.uid, auth.currentUser.isAnonymous ? '(Anon)' : '(Google)');
            await autoSyncProfileUid();
            return;
        }
        
        // Attempt anonymous login first (default behavior for silent start)
        try {
            await signInAnonymously(auth);
            console.log("Firebase Auth initialized anonymously");
            firebaseAuthError = null;
            await testConnection(); // Test connection after auth
        } catch (anonErr: any) {
            console.warn("Anonymous auth failed (likely disabled in console):", anonErr.code);
            firebaseAuthError = anonErr.code || anonErr.message;
            // We don't throw yet, because the user might still login with Google manually if needed
        }
        
        await autoSyncProfileUid();
    } catch (error: any) {
        console.warn("Firebase auto-auth failed:", error.code || error.message);
        firebaseAuthError = error.code || error.message;
    }
};

export const startChatSync = async () => {
    const settings = await billingService.getAppSettings();
    if (!settings.messagingEnabled) return;

    // Only proceed if authenticated
    if (!auth.currentUser) return;

    const profile = await billingService.getCompanyProfile();
    const myPhone = profile?.mobile;
    if (!myPhone) return;

    if (currentMyMobile === myPhone && unsubscribeMessages) {
        return; // Already listening
    }

    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    currentMyMobile = myPhone;
    
    // Notify user that we are using in-app notification logic instead of desktop push
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    const messagesRef = collection(db, 'messages');
    
    // Listen for all messages where receiver is me to ensure we catch 'removed' events for deletions
    const qIncoming = query(messagesRef, where('receiverUid', '==', auth.currentUser.uid));
    
    unsubscribeMessages = onSnapshot(qIncoming, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const cloudId = change.doc.id;
                // Check if we already have this message locally to avoid duplicates
                const allLocalMsgs = await sqliteService.getAllMessages();
                const existing = allLocalMsgs.find((m: any) => m.cloudId === cloudId);
                
                if (existing) {
                    return; // Already processed this message
                }

                const data = change.doc.data();
                const senderPhone = data.senderPhone;
                
                // Find local party by phone number to map to our local partyId
                const allParties = await billingService.getAllParties();
                let party = allParties.find(p => p.mobile === senderPhone);
                
                // If party doesn't exist, create an unknown party temp record (or skip)
                if (!party) {
                    const profileData = data.senderProfile || {};
                    party = {
                        id: `unknown_${senderPhone}`,
                        name: data.senderName || senderPhone,
                        mobile: senderPhone,
                        type: 'Customer', // Default to Customer, user can edit later
                        currentBalance: 0,
                        isLocal: true,
                        category: profileData.businessCategory || '',
                        address: profileData.address || '',
                        city: profileData.city || '',
                        state: profileData.state || '',
                        pincode: profileData.pincode || '',
                        gstin: profileData.gstin || '',
                        pan: profileData.pan || '',
                        email: profileData.email || '',
                    };
                    await billingService.saveParty(party);
                } else {
                    // Update existing party with the sender profile data if any, and if our local data doesn't have it
                    if (data.senderProfile) {
                        const profileData = data.senderProfile;
                        let updated = false;
                        if (!party.name || party.name === party.mobile) {
                            party.name = data.senderName || party.name;
                            updated = true;
                        }
                        if (!party.category && profileData.businessCategory) { party.category = profileData.businessCategory; updated = true; }
                        if (!party.address && profileData.address) { party.address = profileData.address; updated = true; }
                        // Save changes if needed
                        if (updated) {
                            await billingService.saveParty(party);
                        }
                    }
                }

                const newMessage: ChatMessage = {
                    id: (Date.now() + Math.random()).toString(), // local id
                    partyId: party.id,
                    text: data.text,
                    isSent: false,
                    time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: data.type || 'text',
                    contentUrl: data.contentUrl,
                    fileName: data.fileName,
                    fileSize: data.fileSize,
                    cloudId: cloudId // Add property to schema internally
                } as any;

                // Save to local database
                await billingService.saveMessage(newMessage);

                // Show browser notification ONLY if it is a genuinely new (sent) message
                if (data.status === 'sent') {
                    playNotificationSound();
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`New message from ${party.name}`, {
                            body: data.type === 'text' ? data.text : `[${data.type.toUpperCase()}]`,
                            icon: '/vite.svg'
                        });
                    } else if ('navigator' in window && 'serviceWorker' in navigator) {
                        try {
                            const reg = await navigator.serviceWorker.ready;
                            reg.showNotification(`New message from ${party.name}`, {
                                body: data.type === 'text' ? data.text : `[${data.type.toUpperCase()}]`,
                                icon: '/vite.svg'
                            });
                        } catch(e){}
                    }

                    // Mark as delivered in cloud
                    try {
                        await updateDoc(doc(db, 'messages', cloudId), {
                            status: 'delivered'
                        });
                    } catch(e) {}
                }
            } else if (change.type === 'removed') {
                const allLocalMsgs = await sqliteService.getAllMessages();
                const msgToDelete = allLocalMsgs.find(m => m.cloudId === change.doc.id);
                if (msgToDelete && msgToDelete.id) {
                    await billingService.deleteMessages([msgToDelete.id]);
                }
            }
        });
    }, (error) => {
        if (error.message && error.message.includes('Quota limit exceeded')) {
            console.warn("Firebase Sync Quota Exceeded (messages), pausing sync.");
        } else {
            console.error("Firebase Sync Error (messages):", error);
            if (error.message && (error.message.includes('permission') || error.message.includes('Permission'))) {
                try {
                    handleFirestoreError(error, OperationType.GET, 'messages');
                } catch (e) {}
            }
        }
        // Quota exceeded or permission errors will throw here without crashing loops
    });
};

export function generatePayload(payload: any) {
    return JSON.parse(JSON.stringify(payload, (k, v) => v === undefined ? null : v));
}

export const sendCloudMessage = async (msg: ChatMessage, receiverPhone: string) => {
    let currentProfile = null;
    if (!currentMyMobile) {
        const profile = await billingService.getCompanyProfile();
        currentProfile = profile;
        currentMyMobile = profile?.mobile || '';
    } else {
        currentProfile = await billingService.getCompanyProfile();
    }
    
    // If not authenticated, or missing phones, fallback to local save only
    if (!auth.currentUser) {
        throw new Error("You must be logged in to send cloud messages.");
    }
    if (!currentMyMobile) {
        throw new Error("Please set up your mobile number in Company Profile first.");
    }
    if (!receiverPhone) {
        console.warn("Cloud chat unavailable (missing receiver phone). Message saved locally only.");
        await billingService.saveMessage(msg);
        return;
    }

    try {
        let cloudContentUrl = msg.contentUrl || null;

        // Upload attachment to Firebase Storage if exists
        if (msg.fileData) {
            try {
                const fileExt = msg.fileName ? msg.fileName.split('.').pop() : 'bin';
                const storagePath = `chat_files/${currentMyMobile}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const storageRef = ref(storage, storagePath);
                await uploadBytes(storageRef, msg.fileData as Blob);
                cloudContentUrl = await getDownloadURL(storageRef);
            } catch (storageErr) {
                console.warn("Firebase Storage upload failed (likely due to missing rules), trying Base64 fallback...", storageErr);
                const blob = msg.fileData as Blob;
                if (blob.size < 700000) { // ~700KB safe limit for Firestore 1MB doc size
                    const reader = new FileReader();
                    cloudContentUrl = await new Promise((resolve, reject) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } else {
                    throw new Error("File is too large. Firebase Storage is not configured. To send Videos & High-Res Images, go to Firebase Console -> Storage -> Rules and set `allow read, write: if true;`");
                }
            }
        }

        let receiverUid = null;
        try {
            const cleanReceiverPhone = receiverPhone.replace(/\D/g, '');
            const receiverProfileSnap = await getDocFromServer(doc(db, 'company_profile', cleanReceiverPhone));
            if (receiverProfileSnap.exists()) {
                receiverUid = receiverProfileSnap.data()?.uid || null;
            }
        } catch (e) {}

        const messagesRef = collection(db, 'messages');
        const payload = generatePayload({
            text: msg.text || '',
            senderPhone: currentMyMobile,
            senderUid: auth.currentUser?.uid || null,
            senderName: currentProfile?.name || '',
            senderProfile: currentProfile,
            receiverPhone: receiverPhone,
            receiverUid: receiverUid,
            timestamp: Date.now(),
            status: 'sent',
            type: msg.type || 'text',
            contentUrl: cloudContentUrl,
            fileName: msg.fileName || null,
            fileSize: msg.fileSize || null
        });
        const docRef = await addDoc(messagesRef, payload);
        
        // Update local message with cloudId
        (msg as any).cloudId = docRef.id;
        await billingService.saveMessage(msg);
    } catch (error) {
        console.error("Error sending cloud message:", error);
        // Fallback to save locally if cloud fails
        await billingService.saveMessage(msg);
        throw error;
    }
};

export const deleteCloudMessages = async (cloudIds: string[]) => {
    if (!auth.currentUser) return;
    try {
        for (const id of cloudIds) {
            await deleteDoc(doc(db, 'messages', id));
        }
    } catch (e) {
        console.error("Failed to delete cloud messages", e);
    }
};

let unsubscribePayments: (() => void) | null = null;

export const startPaymentSync = async () => {
    const settings = await billingService.getAppSettings();
    if (!settings.cloudSyncEnabled) return;
    if (!auth.currentUser) return;

    const profile = await billingService.getCompanyProfile();
    const myPhone = profile?.mobile;
    if (!myPhone) return;

    if (unsubscribePayments) {
        unsubscribePayments();
    }

    const paymentsRef = collection(db, 'shared_payments');
    const qIncoming = query(paymentsRef, where('receiverUid', '==', auth.currentUser.uid));

    unsubscribePayments = onSnapshot(qIncoming, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.status !== 'pending') return;
                const cloudId = change.doc.id;
                const senderPhone = data.senderPhone;
                
                // Find or create local party
                const allParties = await billingService.getAllParties();
                let party = allParties.find(p => p.mobile === senderPhone);
                if (!party) {
                    const profileData = data.senderProfile || {};
                    party = {
                        id: `unknown_${senderPhone}`,
                        name: data.senderName || senderPhone,
                        mobile: senderPhone,
                        type: 'Supplier',
                        currentBalance: 0,
                        isLocal: true,
                        accountGroup: 'Sundry Creditors',
                        category: profileData.businessCategory || '',
                        address: profileData.address || '',
                        city: profileData.city || '',
                        state: profileData.state || '',
                        pincode: profileData.pincode || '',
                        gstin: profileData.gstin || '',
                        pan: profileData.pan || '',
                        email: profileData.email || ''
                    };
                    await billingService.saveParty(party);
                } else if (data.senderProfile) {
                    const profileData = data.senderProfile;
                    let updated = false;
                    if (!party.name || party.name === party.mobile) {
                        party.name = data.senderName || party.name;
                        updated = true;
                    }
                    if (!party.category && profileData.businessCategory) { party.category = profileData.businessCategory; updated = true; }
                    if (!party.address && profileData.address) { party.address = profileData.address; updated = true; }
                    if (updated) {
                        await billingService.saveParty(party);
                    }
                }

                // If my client sent a Receipt to me, it's a Payment out for me.
                // If they sent a Payment out, it's a Receipt for me.
                let targetType: 'Payment' | 'Receipt' = 'Payment';
                if (data.payment.type === 'Payment') targetType = 'Receipt';
                else if (data.payment.type === 'Receipt') targetType = 'Payment';

                // Save as payment locally
                try {
                    const mappedPayment: PaymentRecord = {
                        ...data.payment,
                        id: `cloud_${data.payment.id}`,
                        partyId: party.id,
                        partyName: party.name,
                        type: targetType,
                        isSyncedToCloud: true,
                        createdAt: Date.now()
                    };
                    
                    await billingService.savePayment(mappedPayment);

                    // Mark as processed
                    await updateDoc(doc(db, 'shared_payments', cloudId), {
                        status: 'processed'
                    });

                    playNotificationSound();
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`New ${targetType} from ${party.name}`, {
                           body: `Amount: ₹${data.payment.amount}`,
                           icon: '/vite.svg'
                        });
                    }

                } catch (e) {
                    console.error("Failed to save synced payment", e);
                }
            }
        });
    }, (error) => {
        if (error.message && error.message.includes('Quota limit exceeded')) {
            console.warn("Firebase Sync Quota Exceeded (payments), pausing sync.");
        } else {
            console.error("Firebase Sync Error (payments):", error);
            if (error.message && (error.message.includes('permission') || error.message.includes('Permission'))) {
                try {
                    handleFirestoreError(error, OperationType.GET, 'shared_payments');
                } catch (e) {}
            }
        }
    });
};

export const startInvoiceSync = async () => {
    const settings = await billingService.getAppSettings();
    if (!settings.cloudSyncEnabled) return;
    if (!auth.currentUser) return;

    const profile = await billingService.getCompanyProfile();
    const myPhone = profile?.mobile;
    if (!myPhone) return;

    if (unsubscribeInvoices) {
        unsubscribeInvoices();
    }

    const invoicesRef = collection(db, 'shared_invoices');
    const qIncoming = query(invoicesRef, where('receiverUid', '==', auth.currentUser.uid));

    unsubscribeInvoices = onSnapshot(qIncoming, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                if (data.status !== 'pending') return;
                const cloudId = change.doc.id;
                const senderPhone = data.senderPhone;
                
                // Calculate targetType first
                let targetType = 'Purchase';
                if (data.invoice.type === 'Sale Return') targetType = 'Purchase Return';
                else if (data.invoice.type === 'Purchase') targetType = 'Sale';
                else if (data.invoice.type === 'Purchase Return') targetType = 'Sale Return';
                else if (data.invoice.type === 'Purchase Order') targetType = 'Sale Order';
                else if (data.invoice.type === 'Sale Order') targetType = 'Purchase Order';

                // Find or create local party
                const allParties = await billingService.getAllParties();
                let party = allParties.find(p => p.mobile === senderPhone);
                if (!party) {
                    const partyType = (targetType === 'Purchase' || targetType === 'Purchase Order') ? 'Supplier' : 'Customer';
                    const accountGroup = partyType === 'Supplier' ? 'Sundry Creditors' : 'Sundry Debtors';
                    const profileData = data.senderProfile || {};

                    party = {
                        id: `unknown_${senderPhone}`,
                        name: data.senderName || senderPhone,
                        mobile: senderPhone,
                        type: partyType,
                        currentBalance: 0,
                        isLocal: true,
                        accountGroup: accountGroup,
                        category: profileData.businessCategory || '',
                        address: profileData.address || '',
                        city: profileData.city || '',
                        state: profileData.state || '',
                        pincode: profileData.pincode || '',
                        gstin: profileData.gstin || '',
                        pan: profileData.pan || '',
                        email: profileData.email || ''
                    };
                    await billingService.saveParty(party);
                } else if (data.senderProfile) {
                    const profileData = data.senderProfile;
                    let updated = false;
                    if (!party.name || party.name === party.mobile) {
                        party.name = data.senderName || party.name;
                        updated = true;
                    }
                    if (!party.category && profileData.businessCategory) { party.category = profileData.businessCategory; updated = true; }
                    if (!party.address && profileData.address) { party.address = profileData.address; updated = true; }
                    if (updated) {
                        await billingService.saveParty(party);
                    }
                }

                // Save as invoice locally
                try {
                    const mappedItems = data.invoice.items || [];
                    
                    let invoiceDate = new Date();
                    if (data.invoice.date) {
                        const [y, m, d] = data.invoice.date.split('-');
                        if (y && m && d) {
                            invoiceDate = new Date(Number(y), Number(m) - 1, Number(d));
                        }
                    }

                    const savedId = await billingService.saveInvoice(
                        party.id,
                        invoiceDate,
                        mappedItems,
                        targetType as any,
                        undefined,
                        data.invoice.invoiceNo
                    );

                    // Mark as synced so we know it came from cloud
                    const iv = await sqliteService.getInvoiceById(savedId);
                    if (iv) await sqliteService.saveInvoice({ ...iv, isSyncedToCloud: true });
                    
                    if (targetType === 'Sale Order' || targetType === 'Purchase Order') {
                        const od = await sqliteService.getOrderById(savedId);
                        if (od) await sqliteService.saveOrder({ ...od, isSyncedToCloud: true });
                    }

                    // Mark as processed
                    await updateDoc(doc(db, 'shared_invoices', cloudId), {
                        status: 'processed'
                    });

                    playNotificationSound();
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`New ${targetType} from ${party.name}`, {
                           body: `Invoice amount: ₹${data.invoice.totalAmount}`,
                           icon: '/vite.svg'
                        });
                    }

                } catch (e) {
                    console.error("Failed to save synced invoice", e);
                }
            }
        });
    }, (error) => {
        if (error.message && error.message.includes('Quota limit exceeded')) {
            console.warn("Firebase Sync Quota Exceeded (invoices), pausing sync.");
        } else {
            console.error("Firebase Sync Error (invoices):", error);
            if (error.message && (error.message.includes('permission') || error.message.includes('Permission'))) {
                try {
                    handleFirestoreError(error, OperationType.GET, 'shared_invoices');
                } catch (e) {}
            }
        }
    });
};

export const shareInvoiceWithClient = async (invoice: Invoice): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) {
        return { success: false, error: "You must be logged in to sync to cloud." };
    }
    
    try {
        const profile = await billingService.getCompanyProfile();
        const myPhone = profile?.mobile;
        const myName = profile?.name;
        if (!myPhone) {
            return { success: false, error: "Please set up your mobile number in Company Profile first." };
        }

        // Get party to find their phone
        const party = await sqliteService.getPartyById(invoice.partyId);
        if (!party || !party.mobile) {
            return { success: false, error: "This party does not have a registered mobile number." };
        }

        const invoicesRef = collection(db, 'shared_invoices');
        
        // Use timeout to prevent hanging on slow connection
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout saving to cloud")), 10000)
        );
        
        // Strip undefined values to prevent Firestore unsupported field error
        const cleanInvoice = JSON.parse(JSON.stringify(invoice));

        let receiverUid = null;
        try {
            const cleanMobile = party.mobile.replace(/\D/g, '');
            const receiverProfileSnap = await getDocFromServer(doc(db, 'company_profile', cleanMobile));
            if (receiverProfileSnap.exists()) {
                receiverUid = receiverProfileSnap.data()?.uid || null;
            }
        } catch (e) {
            console.warn("Could not fetch receiver profile");
        }

        const payload = generatePayload({
                senderPhone: myPhone,
                senderUid: auth.currentUser?.uid || null,
                senderName: myName || myPhone,
                senderProfile: profile,
                receiverPhone: party.mobile,
                receiverUid: receiverUid,
                invoice: cleanInvoice,
                timestamp: Date.now(),
                status: 'pending'
            });

        await Promise.race([
            addDoc(invoicesRef, payload),
            timeoutPromise
        ]);
        
        return { success: true };
    } catch (error: any) {
         console.warn("Could not share cloud invoice:", error);
         return { success: false, error: error?.message || "Unknown cloud network error" };
    }
};

export const sharePaymentWithClient = async (payment: PaymentRecord): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser) {
        return { success: false, error: "You must be logged in to sync to cloud." };
    }
    
    try {
        const profile = await billingService.getCompanyProfile();
        const myPhone = profile?.mobile;
        const myName = profile?.name;
        if (!myPhone) {
            return { success: false, error: "Please set up your mobile number in Company Profile first." };
        }

        // Get party to find their phone
        const party = await sqliteService.getPartyById(payment.partyId);
        if (!party || !party.mobile) {
            return { success: false, error: "This party does not have a registered mobile number." };
        }

        const paymentsRef = collection(db, 'shared_payments');
        
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout saving to cloud")), 10000)
        );

        const cleanPayment = JSON.parse(JSON.stringify(payment));

        let receiverUid = null;
        try {
            const cleanMobile = party.mobile.replace(/\D/g, '');
            const receiverProfileSnap = await getDocFromServer(doc(db, 'company_profile', cleanMobile));
            if (receiverProfileSnap.exists()) {
                receiverUid = receiverProfileSnap.data()?.uid || null;
            }
        } catch (e) {
            console.warn("Could not fetch receiver profile");
        }

        const payload = generatePayload({
                senderPhone: myPhone,
                senderUid: auth.currentUser?.uid || null,
                senderName: myName || myPhone,
                senderProfile: profile,
                receiverPhone: party.mobile,
                receiverUid: receiverUid,
                payment: cleanPayment,
                timestamp: Date.now(),
                status: 'pending'
            });

        await Promise.race([
            addDoc(paymentsRef, payload),
            timeoutPromise
        ]);
        
        return { success: true };
    } catch (error: any) {
         console.warn("Could not share cloud payment:", error);
         return { success: false, error: error?.message || "Unknown cloud network error" };
    }
};

let unsubscribeItems: (() => void) | null = null;

export const startItemSync = async () => {
    const settings = await billingService.getAppSettings();
    if (!settings.cloudSyncEnabled) return;
    if (!auth.currentUser) return;

    const profile = await billingService.getCompanyProfile();
    const myPhone = profile?.mobile;
    const myCategory = profile?.businessCategory || '';
    if (!myPhone) return;

    if (unsubscribeItems) {
        unsubscribeItems();
    }

    const itemsRef = collection(db, 'shared_items');
    const qIncoming = query(itemsRef, where('receiverUid', '==', auth.currentUser.uid));

    unsubscribeItems = onSnapshot(qIncoming, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                try {
                    const data = change.doc.data();
                    if (data.status !== 'pending') return;
                    const cloudId = change.doc.id;
                    const itemsToSave: Item[] = data.items || [];
                    const senderPhone = data.senderPhone;
                    const senderName = data.senderName;
                    const senderCategory = data.senderCategory || '';
                    
                    if (itemsToSave.length > 0) {
                        const isSameCategory = myCategory === senderCategory || myCategory === '' || senderCategory === '';
                        let newItemsAdded = 0;

                        // ALWAYS map the items to the supplier so they can be selected in Purchase Orders
                             const allParties = await billingService.getAllParties();
                             let party = allParties.find(p => p.mobile === senderPhone);
                             
                             if (!party) {
                                  // Create supplier if not exists
                                  party = {
                                      id: `unknown_${senderPhone}`,
                                      name: senderName || senderPhone,
                                      mobile: senderPhone,
                                      type: 'Supplier',
                                      currentBalance: 0,
                                      isLocal: true,
                                      category: senderCategory
                                  };
                                  await billingService.saveParty(party);
                             }

                             for (const item of itemsToSave) {
                                  // Since it's a different category, we might still want to keep standard record of the item in our main items table but let's just map it 
                                  // For Invoice Screen to pick it up, we need the item to exist in main item table? 
                                  // Wait, the InvoiceScreen fetches all items then filters. Let's just make sure the item is in the main list BUT it only shows up mapping. Actually, let's save the item to main items but also to supplierItems mapping! 
                                  // That way we can query `localDb.items.get(mapping.itemId)` 
                                  const allItems = await sqliteService.getAllItems();
                                  let existingItem = allItems.find(i => i.name.toLowerCase() === item.name.toLowerCase() || (item.code && i.code === item.code));
                                  let finalItemId = existingItem ? existingItem.id : '';

                                  if (!existingItem) {
                                      const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
                                      await billingService.saveItem(newItem);
                                      finalItemId = newItem.id;
                                      newItemsAdded++;
                                  }

                                  // Create Mapping in supplierItems
                                  const existingMappings = await sqliteService.getSupplierItems(party.id);
                                  if (!existingMappings.find(m => m.itemId === finalItemId)) {
                                      await sqliteService.saveSupplierItem({
                                          id: `${party.id}_${finalItemId}`,
                                          supplierId: party.id,
                                          itemId: finalItemId,
                                          itemName: item.name,
                                          itemCode: item.code,
                                          category: senderCategory
                                      } as any);
                                  }
                             }

                        // Mark as processed
                        await updateDoc(doc(db, 'shared_items', cloudId), {
                            status: 'processed'
                        });

                        playNotificationSound();
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(`New items received from ${senderName}`, {
                                body: isSameCategory ? `Added ${newItemsAdded} items to your master list.` : `Added items to ${senderName}'s supplier list.`
                            });
                        }
                    } else {
                        // Mark as processed even if empty
                        await updateDoc(doc(db, 'shared_items', cloudId), {
                            status: 'processed'
                        });
                    }

                } catch (e) {
                    console.error("Failed to process incoming shared items", e);
                }
            }
        });
    }, (error) => {
        if (error.message && error.message.includes('Quota limit exceeded')) {
            console.warn("Firebase Sync Quota Exceeded (items), pausing sync.");
        } else {
            console.error("Firebase Sync Error (items):", error);
            if (error.message && (error.message.includes('permission') || error.message.includes('Permission'))) {
                try {
                    handleFirestoreError(error, OperationType.GET, 'shared_items');
                } catch (e) {}
            }
        }
    });
};

export const shareItemsWithClient = async (items: Item[], receiverMobile: string): Promise<boolean> => {
    if (!auth.currentUser) {
        throw new Error("You must be logged in to send cloud messages.");
    }
    if (items.length === 0) return false;
    
    try {
        const profile = await billingService.getCompanyProfile();
        const myPhone = profile?.mobile;
        const myName = profile?.name;
        if (!myPhone) {
            throw new Error("Please set up your mobile number in Company Profile first.");
        }

        const itemsRef = collection(db, 'shared_items');
        
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Timeout saving to cloud")), 10000)
        );

        let receiverUid = null;
        try {
            const cleanReceiverMobile = receiverMobile.replace(/\D/g, '');
            const receiverProfileSnap = await getDocFromServer(doc(db, 'company_profile', cleanReceiverMobile));
            if (receiverProfileSnap.exists()) {
                receiverUid = receiverProfileSnap.data()?.uid || null;
            }
        } catch (e) {
            console.warn("Could not fetch receiver profile");
        }

        const payload = generatePayload({
                senderPhone: myPhone,
                senderUid: auth.currentUser?.uid || null,
                senderName: myName || myPhone,
                senderProfile: profile,
                receiverPhone: receiverMobile,
                receiverUid: receiverUid,
                items: items,
                timestamp: Date.now(),
                status: 'pending'
            });

        await Promise.race([
            addDoc(itemsRef, payload),
            timeoutPromise
        ]);
        
        return true;
    } catch (error) {
         console.warn("Could not share items:", error);
         return false;
    }
};

export const searchPartiesOnline = async (queryStr: string): Promise<Party[]> => {
    const settings = await billingService.getAppSettings();
    if (!settings.liveSearchEnabled) return [];
    if (!navigator.onLine) return [];

    try {
        const cleanMobile = queryStr.replace(/\D/g, '');
        // We only support searching by exact 10-digit mobile for now to protect privacy
        if (cleanMobile.length === 10) {
            const docSnap = await getDocFromServer(doc(db, 'company_profile', cleanMobile));
            if (docSnap.exists()) {
                const data = docSnap.data();
                return [{
                    id: `online_${cleanMobile}`,
                    name: data.name || 'Unknown Business',
                    mobile: cleanMobile,
                    address: data.address || '',
                    city: data.city || '',
                    gstin: data.gstin || '',
                    type: 'Customer',
                    currentBalance: 0,
                    isLocal: false, // Flag to indicate this needs to be imported
                    category: data.business_category || ''
                } as Party];
            }
        }
    } catch (e) {
        console.warn("Online search failed:", e);
    }
    return [];
};

export const writeAuditLog = async (log: {
  actionType: 'Create' | 'Update' | 'Delete' | 'Login' | 'Logout';
  module: 'Billing' | 'Inventory' | 'CRM' | 'Accounting' | 'System' | 'Staff';
  description: string;
  targetId?: string;
  targetTable?: string;
  metadata?: any;
}) => {
  try {
    let activeUser = { id: 'system_sync', name: 'System Sync', role: 'system', businessId: 'default_business_id' };
    const saved = localStorage.getItem('eazy_billing_current_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) {
        activeUser = {
          id: parsed.id || 'current_user',
          name: parsed.name || 'Admin User',
          role: parsed.role || 'admin',
          businessId: parsed.businessId || 'default_business_id'
        };
      }
    }

    const actionMap: Record<string, string> = {
      Create: 'create',
      Update: 'update',
      Delete: 'delete',
      Login: 'login',
      Logout: 'logout'
    };

    const auditLogRef = doc(collection(db, 'audit_logs'));
    await setDoc(auditLogRef, {
      action: actionMap[log.actionType] || log.actionType.toLowerCase(),
      actionType: log.actionType,
      userId: activeUser.id,
      createdBy: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.role,
      businessId: activeUser.businessId,
      timestamp: Date.now(),
      changes: log.metadata || {},
      metadata: log.metadata || {},
      targetId: log.targetId || '',
      targetTable: log.targetTable || '',
      module: log.module,
      description: log.description
    });

    const currentLogCount = parseInt(localStorage.getItem('audit_log_count') || '0', 10);
    localStorage.setItem('audit_log_count', (currentLogCount + 1).toString());
  } catch (err) {
    console.warn("Could not write direct audit log:", err);
  }
};


