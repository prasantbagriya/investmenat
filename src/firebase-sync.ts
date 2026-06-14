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

/**
 * Asynchronously posts data to the local Express SQLite backup server
 */
async function syncToSqlite(collectionName: string, docId: string, operation: 'set' | 'update' | 'delete', data?: any) {
  try {
    await fetch('/api/sync-sqlite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: collectionName, id: docId, operation, data })
    });
  } catch (err) {
    console.error("[SQLiteSync] Failed to sync to local SQLite database:", err);
  }
}

/**
 * Wrapper for Firebase setDoc that also syncs to the backend SQLite DB
 */
export async function setDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: WithFieldValue<AppModelType> | PartialWithFieldValue<AppModelType>,
  options?: SetOptions
): Promise<void> {
  const result = options 
    ? await fsSetDoc(reference, data as PartialWithFieldValue<AppModelType>, options)
    : await fsSetDoc(reference, data as WithFieldValue<AppModelType>);
    
  // Parent of a document is its collection
  const collectionName = reference.parent.id;
  syncToSqlite(collectionName, reference.id, 'set', data);
  
  return result;
}

/**
 * Wrapper for Firebase updateDoc that also syncs to the backend SQLite DB
 */
export async function updateDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: UpdateData<DbModelType>
): Promise<void> {
  const result = await fsUpdateDoc(reference, data);
  
  const collectionName = reference.parent.id;
  syncToSqlite(collectionName, reference.id, 'update', data);
  
  return result;
}

/**
 * Wrapper for Firebase deleteDoc that also syncs to the backend SQLite DB
 */
export async function deleteDoc<AppModelType, DbModelType extends DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<void> {
  const result = await fsDeleteDoc(reference);
  
  const collectionName = reference.parent.id;
  syncToSqlite(collectionName, reference.id, 'delete');
  
  return result;
}
