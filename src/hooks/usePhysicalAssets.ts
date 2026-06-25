import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PhysicalAsset } from '../types';
import { User } from 'firebase/auth';

export function usePhysicalAssets(user: User | null) {
  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>([]);

  useEffect(() => {
    if (!user) {
      setPhysicalAssets([]);
      return;
    }

    if (user.uid.startsWith('guest_offline_')) {
      const stored = JSON.parse(localStorage.getItem(`physicalAssets_${user.uid}`) || '[]');
      setPhysicalAssets(stored);
      return;
    }

    const q = query(collection(db, 'physicalAssets'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysicalAsset));
      setPhysicalAssets(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddPhysicalAsset = async (assetData: Omit<PhysicalAsset, 'id' | 'userId'>) => {
    if (!user) return;

    if (user.uid.startsWith('guest_offline_')) {
      const fullAsset: PhysicalAsset = {
        ...assetData,
        id: 'asset_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...physicalAssets, fullAsset];
      setPhysicalAssets(updated);
      localStorage.setItem(`physicalAssets_${user.uid}`, JSON.stringify(updated));
      return;
    }

    const docRef = doc(collection(db, 'physicalAssets'));
    await setDoc(docRef, { ...assetData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditPhysicalAsset = async (id: string, updates: Partial<PhysicalAsset>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = physicalAssets.map(a => a.id === id ? { ...a, ...updates } : a);
      setPhysicalAssets(updated);
      localStorage.setItem(`physicalAssets_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(db, 'physicalAssets', id);
    await updateDoc(docRef, updates);
  };

  const handleDeletePhysicalAsset = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = physicalAssets.filter(a => a.id !== id);
      setPhysicalAssets(updated);
      localStorage.setItem(`physicalAssets_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'physicalAssets', id));
  };

  return { physicalAssets, handleAddPhysicalAsset, handleEditPhysicalAsset, handleDeletePhysicalAsset };
}
