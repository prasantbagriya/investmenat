import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Debounce timer
let syncTimeout: any = null;
let isSyncingToCloud = false;

// Store original localStorage methods so we don't cause infinite loops
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);

let currentUserId: string | null = null;
let isInterceptorActive = false;

// We track the last time we pulled from the cloud so we don't overwrite newer local data with older cloud data during a session
const SYNC_KEY = 'cloud_sync_updated_at';

export async function restoreFromCloud(userId: string): Promise<boolean> {
  try {
    currentUserId = userId;
    const docRef = doc(db, 'users', userId, 'cloudSync', 'localStorage');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const cloudUpdatedAt = data.updatedAt ? (data.updatedAt as Timestamp).toMillis() : 0;
      
      const localUpdatedAt = parseInt(localStorage.getItem(SYNC_KEY) || '0');

      // If cloud is newer, overwrite local storage
      if (cloudUpdatedAt > localUpdatedAt) {
        console.log('[CloudSync] Cloud is newer. Restoring data to local storage...');
        
        // Optional: clear local storage first for user-specific keys if we want a pristine state
        // But merging is safer in case some keys were not synced.
        
        const payload = data.payload || {};
        for (const [key, value] of Object.entries(payload)) {
          if (typeof value === 'string') {
            originalSetItem(key, value);
          }
        }
        
        // Update local timestamp to match cloud
        originalSetItem(SYNC_KEY, cloudUpdatedAt.toString());
        return true; // Indicates we restored data (should reload UI)
      } else {
        console.log('[CloudSync] Local data is up to date.');
      }
    } else {
      console.log('[CloudSync] No cloud backup found. Starting fresh.');
    }
  } catch (error) {
    console.error('[CloudSync] Error restoring from cloud:', error);
  }
  return false;
}

function triggerDebouncedSync() {
  // Double-check userId is valid before scheduling any sync
  if (!currentUserId || currentUserId.startsWith('guest_offline_')) return;
  
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // Debounce for 2 seconds to batch rapid consecutive writes
  syncTimeout = setTimeout(async () => {
    // Re-check inside the timeout in case user logged out during the debounce window
    if (!currentUserId || currentUserId.startsWith('guest_offline_')) return;
    if (isSyncingToCloud) return;
    isSyncingToCloud = true;
    
    try {
      // Gather all user-specific keys from localStorage
      const payload: Record<string, string> = {};
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        const isUserKey = key.includes(currentUserId);
        const isCommonKey = key === 'investmant_unlocked' || key.includes('tax_') || key.includes('theme');
        const isSensitive = key.includes('custom_google') || key.includes('oauth') || key === SYNC_KEY;
        
        if ((isUserKey || isCommonKey) && !isSensitive) {
          payload[key] = localStorage.getItem(key) || '';
        }
      }

      if (Object.keys(payload).length === 0) {
        console.log('[CloudSync] No data to sync, skipping.');
        return;
      }

      const docRef = doc(db, 'users', currentUserId, 'cloudSync', 'localStorage');
      await setDoc(docRef, {
        payload,
        updatedAt: serverTimestamp()
      }, { merge: true });

      originalSetItem(SYNC_KEY, Date.now().toString());
      console.log(`[CloudSync] ✅ Successfully backed up ${Object.keys(payload).length} keys to cloud.`);
    } catch (error) {
      console.error('[CloudSync] ❌ Failed to sync to cloud. Check Firebase auth and rules:', error);
    } finally {
      isSyncingToCloud = false;
    }
  }, 2000);
}

export function initCloudSyncInterceptor(userId: string) {
  // Don't intercept for offline/guest users — they have no Firebase account
  if (!userId || userId.startsWith('guest_offline_')) return;
  
  currentUserId = userId;
  
  if (isInterceptorActive) return;
  isInterceptorActive = true;

  console.log('[CloudSync] Interceptor activated for user:', userId);

  localStorage.setItem = function(key: string, value: string) {
    originalSetItem(key, value);
    // Only trigger sync for non-system keys
    if (key !== SYNC_KEY && !key.includes('custom_google') && !key.includes('oauth')) {
      triggerDebouncedSync();
    }
  };

  localStorage.removeItem = function(key: string) {
    originalRemoveItem(key);
    if (key !== SYNC_KEY && !key.includes('custom_google') && !key.includes('oauth')) {
      triggerDebouncedSync();
    }
  };

  localStorage.clear = function() {
    originalClear();
    triggerDebouncedSync();
  };
}

/**
 * Call this on logout to reset the sync interceptor state.
 */
export function resetCloudSyncInterceptor() {
  currentUserId = null;
  isInterceptorActive = false;
  // Restore original methods so next user starts fresh
  localStorage.setItem = originalSetItem;
  localStorage.removeItem = originalRemoveItem;
  localStorage.clear = originalClear;
  console.log('[CloudSync] Interceptor reset on logout.');
}
