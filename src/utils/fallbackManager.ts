import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';

/**
 * Returns merged data by checking both the Cloud array and LocalStorage array
 */
export function mergeWithFallback<T extends { id: string }>(
  user: User | null, 
  storageKeyPrefix: string, 
  cloudData: T[]
): T[] {
  if (!user || user.uid.startsWith('guest_offline_')) return cloudData;
  
  try {
    const localData = JSON.parse(localStorage.getItem(`${storageKeyPrefix}_${user.uid}`) || '[]');
    if (!Array.isArray(localData) || localData.length === 0) return cloudData;

    // Merge logic: local data takes precedence for optimistically added items
    const merged = [...cloudData];
    const cloudIds = new Set(cloudData.map(d => d.id));

    localData.forEach((localItem: T) => {
      // If it's a completely new offline item, it won't exist in cloudIds
      if (!cloudIds.has(localItem.id)) {
        merged.push(localItem);
      } else {
        // If it exists in cloud but local might have optimistic edits, we overwrite with local
        const idx = merged.findIndex(d => d.id === localItem.id);
        if (idx !== -1) merged[idx] = localItem;
      }
    });
    return merged;
  } catch (err) {
    console.error("Failed to merge fallback data:", err);
    return cloudData;
  }
}

/**
 * Sweeps localStorage for specific keys and pushes them to Firebase Collections.
 * This is a recovery function — runs on login and every 30s to push any offline data.
 */
export async function flushFallbacksToCloud(user: User | null) {
  if (!user || user.uid.startsWith('guest_offline_')) return;

  const syncKeys = [
    { key: 'tx', collection: 'transactions' },
    { key: 'propFirmChallenges', collection: 'propFirmChallenges' },
    { key: 'propFirmAccounts', collection: 'propFirmAccounts' },
    { key: 'propFirmPayouts', collection: 'propFirmPayouts' },
    { key: 'goals', collection: 'savingsGoals' },
    { key: 'limits', collection: 'budgetLimits' },
    { key: 'bankAccounts', collection: 'bankAccounts' },
    { key: 'ccbills', collection: 'ccbills' },
    { key: 'ccemis', collection: 'ccemis' },
    { key: 'recurringBills', collection: 'recurringBills' },
    { key: 'holdings', collection: 'holdings' },
    { key: 'sips', collection: 'sips' },
    { key: 'fds', collection: 'fds' },
    { key: 'watchlist', collection: 'watchlist' },
    { key: 'realized_trades', collection: 'realizedTrades' },
    { key: 'pay', collection: 'pendingPayments' },
    { key: 'tasks', collection: 'tasks' },
    { key: 'settings', collection: 'userSettings' },
    { key: 'physicalAssets', collection: 'physicalAssets' }
  ];

  let totalFlushed = 0;

  for (const sk of syncKeys) {
    const fullKey = `${sk.key}_${user.uid}`;
    const localDataStr = localStorage.getItem(fullKey);
    if (!localDataStr) continue;

    try {
      const localData = JSON.parse(localDataStr);
      if (!Array.isArray(localData) || localData.length === 0) continue;

      let allSuccess = true;
      
      for (const item of localData) {
        // Safety: skip items with no ID (broken data)
        if (!item || !item.id) {
          console.warn(`[FallbackManager] Skipping item with no ID in ${sk.collection}`);
          continue;
        }

        // Ensure userId is always set before uploading — prevents permission-denied
        const itemWithUser = item.userId ? item : { ...item, userId: user.uid };

        try {
          await setDoc(doc(db, sk.collection, item.id), itemWithUser, { merge: true });
          totalFlushed++;
        } catch (e: any) {
          const msg = e?.message || String(e);
          console.error(`[FallbackManager] ❌ Failed to flush ${item.id} to ${sk.collection}:`, msg);
          allSuccess = false;
        }
      }

      if (allSuccess) {
        localStorage.removeItem(fullKey);
        console.log(`[FallbackManager] ✅ Flushed and cleared ${fullKey}`);
      }
    } catch (err) {
      console.error(`[FallbackManager] Failed to process fallback queue for ${fullKey}:`, err);
    }
  }

  if (totalFlushed > 0) {
    console.log(`[FallbackManager] ✅ Total items flushed to Firebase: ${totalFlushed}`);
  }
}

