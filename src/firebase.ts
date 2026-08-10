import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, signInWithCredential, setPersistence, browserLocalPersistence, indexedDBLocalPersistence, linkWithPopup, linkWithRedirect, linkWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getFirestore, doc, getDoc, getDocFromServer, setDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
// Only pass a custom database ID if it is explicitly defined in the config.
// Passing `undefined` as the third argument to initializeFirestore silently
// prevents writes on some SDK versions — so we must guard against it.
const _customDbId: string | undefined = (firebaseConfig as any).firestoreDatabaseId;
const _isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();

export const db = _customDbId
  ? initializeFirestore(app, { ignoreUndefinedProperties: true }, _customDbId)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });
export const auth = getAuth(app);
setPersistence(auth, indexedDBLocalPersistence).catch(err => {
  console.warn("[Firebase] Failed to set indexedDB persistence:", err);
});
// Initialize provider and configure Google Sheets scope permissions
export const googleProvider = new GoogleAuthProvider();
export const ALL_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.announcements.readonly'
];

ALL_GOOGLE_SCOPES.forEach(scope => googleProvider.addScope(scope));

// Force Google to show the consent screen again so it asks for the new Drive scopes
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline' // Good for getting refresh tokens if needed
});

// Memory cache for the OAuth access token
let cachedAccessToken: string | null = null;

if (typeof window !== 'undefined') {
  if (!localStorage.getItem('custom_google_client_id')) {
    localStorage.setItem('custom_google_client_id', import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  }
  if (!localStorage.getItem('custom_google_client_secret')) {
    localStorage.setItem('custom_google_client_secret', import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '');
  }
}

export function getAccessToken(): string | null {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem('custom_google_access_token');
  }
  return cachedAccessToken;
}

export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('custom_google_access_token', token);
    } else {
      localStorage.removeItem('custom_google_access_token');
    }
  }
}

// Handle redirect result on load
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    }
  } catch (error) {
    console.error("Error getting redirect result:", error);
  }
}
if (typeof window !== 'undefined') {
  handleRedirectResult();
}

// Google login utility
export async function signInWithGoogle() {
  try {
    const provider = googleProvider;
    
    if (Capacitor.isNativePlatform()) {
      // Native App Login Flow
      // We must pass the Web Client ID from Firebase Console to use Google Sign-In natively
      const result = await FirebaseAuthentication.signInWithGoogle({
        scopes: ALL_GOOGLE_SCOPES,
      });
      
      if (!result.credential?.idToken) {
        throw new Error("No ID Token returned from Google Sign-In");
      }
      
      const credential = GoogleAuthProvider.credential(result.credential.idToken);
      const userCred = await signInWithCredential(auth, credential);
      
      // Save the access token for Google Sheets sync
      if (result.credential.accessToken) {
        setAccessToken(result.credential.accessToken);
      }
      
      return userCred.user;
    } else {
      // Web Flow
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          setAccessToken(credential.accessToken);
        }
        return result.user;
      } catch (error: any) {
        // In mobile browsers or webviews, popup might fail. 
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled') {
          // User explicitly closed the popup or it was cancelled. 
          throw new Error('Google Sign-In was cancelled.');
        } else if (error.code === 'auth/popup-blocked') {
          // If popup was blocked, fallback to redirect
          signInWithRedirect(auth, provider);
          // Return a never-resolving promise so the UI stays in a loading state while redirecting
          return new Promise(() => {});
        } else {
          // If popup failed for another reason, try redirect as last resort
          signInWithRedirect(auth, provider);
          return new Promise(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Error signing in with Google:", error);
    alert("Google Sign-In failed. Please try Direct Access (Guest). Error: " + (error as any).message);
    throw error;
  }
}

// Anonymous / Guest sign in utility for environments with iframe/cookie blocks
export async function signInGuestAnonymously() {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Anonymous Sign-In failed:", error);
    throw error;
  }
}

// Link Google Account to existing Email/Password user
export async function linkGoogleAccount() {
  try {
    const provider = googleProvider;
    
    if (!auth.currentUser) throw new Error("You must be logged in to link your Google Account");

    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle({
        scopes: ALL_GOOGLE_SCOPES,
      });
      
      if (!result.credential?.idToken) throw new Error("No ID Token returned from Google Sign-In");
      
      const credential = GoogleAuthProvider.credential(result.credential.idToken);
      const userCred = await linkWithCredential(auth.currentUser, credential);
      
      if (result.credential.accessToken) setAccessToken(result.credential.accessToken);
      return userCred.user;
    } else {
      try {
        const result = await linkWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) setAccessToken(credential.accessToken);
        return result.user;
      } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled') {
          throw new Error('Google Account linking was cancelled.');
        } else if (error.code === 'auth/popup-blocked') {
          linkWithRedirect(auth.currentUser, provider);
          return new Promise(() => {});
        } else {
          linkWithRedirect(auth.currentUser, provider);
          return new Promise(() => {});
        }
      }
    }
  } catch (error) {
    console.error("Error linking Google account:", error);
    throw error;
  }
}

// Google Offline Access (Refresh Token Flow)
export async function authorizeGoogleOffline(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as any).google) {
      reject(new Error("Google Identity Services not loaded."));
      return;
    }
    
    const clientId = localStorage.getItem('custom_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientSecret = localStorage.getItem('custom_google_client_secret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';

    if (!clientId || !clientSecret) {
      reject(new Error("Google Client ID or Secret is missing. Go to Settings and configure custom OAuth credentials first."));
      return;
    }

    const client = (window as any).google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: ALL_GOOGLE_SCOPES.join(' '),
      ux_mode: 'popup',
      callback: async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        
        try {
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code: response.code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: 'postmessage',
              grant_type: 'authorization_code'
            })
          });
          
          const data = await res.json();
          if (data.error) {
            throw new Error(data.error_description || data.error);
          }
          
          if (data.refresh_token) {
            await setDoc(doc(db, 'users', userId, 'integrations', 'google'), {
              refresh_token: data.refresh_token,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          
          if (data.access_token) {
            setAccessToken(data.access_token);
          }
          
          resolve();
        } catch (err) {
          reject(err);
        }
      },
    });
    
    client.requestCode();
  });
}

export async function refreshGoogleTokenIfNeeded(userId: string): Promise<string | null> {
  try {
    const docRef = doc(db, 'users', userId, 'integrations', 'google');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    if (!data.refresh_token) return null;
    
    const clientId = localStorage.getItem('custom_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientSecret = localStorage.getItem('custom_google_client_secret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
    
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    
    const tokenData = await res.json();
    if (tokenData.error) {
      console.error("Token refresh failed:", tokenData);
      return null;
    }
    
    if (tokenData.access_token) {
      setAccessToken(tokenData.access_token);
      return tokenData.access_token;
    }
  } catch (err) {
    console.error("Failed to refresh token", err);
  }
  return null;
}

// Logout utility
export async function logout() {
  await signOut(auth);
  cachedAccessToken = null;
}

// Error handling standard as mandated by the firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  const errMessage = error instanceof Error ? error.message : String(error);
  const isPermissionError = errMessage.includes('permission-denied') || errMessage.includes('Missing or insufficient permissions');

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
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
  };

  if (isPermissionError) {
    // Permission errors are common (e.g. new collections not yet whitelisted in rules).
    // Don't throw — throwing from an onSnapshot error callback permanently kills the listener.
    console.warn('Firestore permission error (non-fatal, listener kept alive):', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    // Only alert for unexpected non-permission errors
    if (typeof window !== 'undefined') {
      console.warn(`Firestore Error (${operationType} on ${path}): ${errMessage}`);
    }
  }
  // NOTE: Do NOT throw here — throwing from onSnapshot error callback terminates the listener permanently.
}

// Connection test on load — runs silently, logs problems clearly
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] ✅ Firestore connection OK.');
  } catch (error: any) {
    const msg = error?.message || String(error);
    const code = error?.code || '';
    if (msg.includes('offline') || code === 'unavailable') {
      console.warn('[Firebase] ⚠️ Firestore: Client appears offline. Data writes will be queued.');
    } else if (code === 'permission-denied') {
      // Expected for unauthenticated test read — connection is fine
      console.log('[Firebase] ✅ Firestore reachable (permission-denied on test doc is expected).');
    } else if (code === 'not-found') {
      // Also expected — connection is fine, test doc just does not exist
      console.log('[Firebase] ✅ Firestore reachable (test doc not found, that is OK).');
    } else {
      console.error(
        '[Firebase] ❌ Firestore connection FAILED. Check your firebase-applet-config.json and Firebase project settings.\n' +
        `  Code: ${code}\n  Message: ${msg}`
      );
    }
  }
}
testConnection();

