import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { User } from 'firebase/auth';

export function useCollectionSync<T>(
  collectionName: string, 
  user: User | null, 
  localPrefix: string
) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!user) {
      setData([]);
      return;
    }

    if (user.uid.startsWith('guest_offline_')) {
      const localData = JSON.parse(localStorage.getItem(`${localPrefix}_${user.uid}`) || '[]');
      setData(localData);
      return () => {};
    }

    const q = query(collection(db, collectionName), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((d) => items.push({ id: d.id, ...d.data() } as unknown as T));
        setData(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, collectionName)
    );

    return () => unsubscribe();
  }, [user, collectionName, localPrefix]);

  return data;
}
