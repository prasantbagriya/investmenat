import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { BankAccount } from '../types';
import { User } from 'firebase/auth';

export function useBankAccounts(user: User | null) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    if (!user) {
      setBankAccounts([]);
      return;
    }

    if (user.uid.startsWith('guest_offline_')) {
      const stored = JSON.parse(localStorage.getItem(`bankAccounts_${user.uid}`) || '[]');
      setBankAccounts(stored);
      return;
    }

    const q = query(collection(db, 'bankAccounts'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount));
      setBankAccounts(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddBankAccount = async (accData: Omit<BankAccount, 'id' | 'userId' | 'currentBalance'>) => {
    if (!user) return;
    const newAcc = {
      ...accData,
      currentBalance: accData.initialBalance
    };

    if (user.uid.startsWith('guest_offline_')) {
      const fullAcc: BankAccount = {
        ...newAcc,
        id: 'bank_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...bankAccounts, fullAcc];
      setBankAccounts(updated);
      localStorage.setItem(`bankAccounts_${user.uid}`, JSON.stringify(updated));
      return;
    }

    const docRef = doc(collection(db, 'bankAccounts'));
    await setDoc(docRef, { ...newAcc, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditBankAccount = async (id: string, updates: Partial<BankAccount>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = bankAccounts.map(b => b.id === id ? { ...b, ...updates } : b);
      setBankAccounts(updated);
      localStorage.setItem(`bankAccounts_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(db, 'bankAccounts', id);
    await updateDoc(docRef, updates);
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = bankAccounts.filter(b => b.id !== id);
      setBankAccounts(updated);
      localStorage.setItem(`bankAccounts_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'bankAccounts', id));
  };

  return { bankAccounts, handleAddBankAccount, handleEditBankAccount, handleDeleteBankAccount };
}
