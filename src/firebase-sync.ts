import { 
  setDoc as fsSetDoc, 
  updateDoc as fsUpdateDoc, 
  deleteDoc as fsDeleteDoc, 
  DocumentReference,
  SetOptions,
  UpdateData,
  WithFieldValue,
  PartialWithFieldValue,
  DocumentData
} from "firebase/firestore";
import { proxyFetch } from './utils/proxyFetch';

/**
 * Asynchronously posts data to the local Express SQLite backup server.
 * This is fire-and-forget — failure here does NOT affect Firebase write.
 */
async function syncToSqlite(collectionName: string, docId: string, operation: 'set' | 'update' | 'delete', data?: any) {
  try {
    await proxyFetch('/api/sync-sqlite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: collectionName, id: docId, operation, data })
    });
  } catch (err) {
    // SQLite sync is optional — never block or throw here
    console.warn("[SQLiteSync] Could not sync to local SQLite (non-critical):", (err as any)?.message || err);
  }
}

/**
 * Wrapper for Firebase setDoc that also syncs to the backend SQLite DB.
 * ✅ Firebase write is always attempted first. SQLite is secondary.
 */
export async function setDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: WithFieldValue<AppModelType> | PartialWithFieldValue<AppModelType>,
  options?: SetOptions
): Promise<void> {
  try {
    if (options) {
      await fsSetDoc(reference, data as PartialWithFieldValue<AppModelType>, options);
    } else {
      await fsSetDoc(reference, data as WithFieldValue<AppModelType>);
    }
    // Only sync to SQLite after a successful Firebase write
    const collectionName = reference.parent.id;
    syncToSqlite(collectionName, reference.id, 'set', data);
  } catch (err: any) {
    const msg = err?.message || String(err);
    // Log clearly so developer can see exactly what went wrong
    console.error(
      `[firebase-sync] ❌ setDoc FAILED on "${reference.path}". ` +
      `Error: ${msg}. ` +
      `This data did NOT reach Firebase.`
    );
    throw err; // Re-throw so callers can handle (e.g. save to localStorage fallback)
  }
}

/**
 * Wrapper for Firebase updateDoc that also syncs to the backend SQLite DB.
 */
export async function updateDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: UpdateData<DbModelType>
): Promise<void> {
  try {
    await fsUpdateDoc(reference, data);
    const collectionName = reference.parent.id;
    syncToSqlite(collectionName, reference.id, 'update', data);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(
      `[firebase-sync] ❌ updateDoc FAILED on "${reference.path}". ` +
      `Error: ${msg}. ` +
      `This data did NOT reach Firebase.`
    );
    throw err;
  }
}

/**
 * Wrapper for Firebase deleteDoc that also syncs to the backend SQLite DB.
 */
export async function deleteDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<void> {
  try {
    await fsDeleteDoc(reference);
    const collectionName = reference.parent.id;
    syncToSqlite(collectionName, reference.id, 'delete');
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(
      `[firebase-sync] ❌ deleteDoc FAILED on "${reference.path}". ` +
      `Error: ${msg}. ` +
      `This delete did NOT reach Firebase.`
    );
    throw err;
  }
}
