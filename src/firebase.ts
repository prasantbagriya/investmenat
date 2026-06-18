import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getFirestore, doc, getDocFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

// Initialize provider and configure Google Sheets scope permissions
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/contacts');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/documents');
googleProvider.addScope('https://www.googleapis.com/auth/presentations');
googleProvider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');

googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/chat.spaces.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/chat.messages.create');
googleProvider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/presentations');
googleProvider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');

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
      const result = await FirebaseAuthentication.signInWithGoogle();
      
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
        // We will TRY redirect, but alert the user if it fails.
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
          await signInWithRedirect(auth, provider);
        } else {
          // If popup failed for another reason, try redirect as last resort
          await signInWithRedirect(auth, provider);
        }
        throw error;
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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on load as mandated by firebase-integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Startup connectivity notice: Please check your Firebase configuration if operations are slow. Client appears to be offline.");
    }
  }
}
testConnection();
