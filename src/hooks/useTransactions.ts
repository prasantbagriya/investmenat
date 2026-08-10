import { useState, useEffect } from 'react';
import { collection, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from '../firebase-sync';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction } from '../types';
import { User } from 'firebase/auth';
import { mergeWithFallback } from '../utils/fallbackManager';

export function useTransactions(user: User | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      return;
    }
    if (user.uid.startsWith('guest_offline_')) {
      setTransactions(JSON.parse(localStorage.getItem(`tx_${user.uid}`) || '[]'));
      return;
    }
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs: Transaction[] = [];
        snapshot.forEach((d) => txs.push({ id: d.id, ...d.data() } as Transaction));
        
        // MERGE offline local fallback data so it doesn't disappear from UI
        const mergedTxs = mergeWithFallback(user, 'tx', txs);
        setTransactions(mergedTxs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
    );
    return () => unsubscribe();
  }, [user]);

  const handleAddTransaction = async (txData: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newTx: Transaction = {
        ...txData,
        id: 'tx_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...transactions, newTx];
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    try {
      const docRef = doc(collection(db, 'transactions'));
      await setDoc(docRef, { ...txData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
      // ✅ Success: clear any local fallback for this user since Firebase has it now
      const localFallback = JSON.parse(localStorage.getItem(`tx_${user.uid}`) || '[]') as Transaction[];
      if (localFallback.length > 0) {
        // The fallback flush will handle cleanup; we just log
        console.log('[useTransactions] ✅ Transaction saved to Firebase successfully.');
      }
    } catch (err: any) {
      console.error('[useTransactions] ❌ Firebase write failed, saving to local fallback:', err?.message || err);
      // Save to local fallback so flushFallbacksToCloud can retry later
      const newTx: Transaction = {
        ...txData,
        id: 'tx_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid,
        createdAt: new Date().toISOString() as any
      };
      const current = JSON.parse(localStorage.getItem(`tx_${user.uid}`) || '[]');
      const updated = [...transactions, newTx];
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify([...current, newTx]));
    }
  };

  const handleEditTransaction = async (id: string, txData: Partial<Transaction>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = transactions.map(t => t.id === id ? { ...t, ...txData } as Transaction : t);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    try {
      await updateDoc(doc(db, 'transactions', id), txData);
    } catch (err: any) {
      console.error('[useTransactions] ❌ Firebase updateDoc failed:', err?.message || err);
      const updated = transactions.map(t => t.id === id ? { ...t, ...txData } as Transaction : t);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err: any) {
      console.error('[useTransactions] ❌ Firebase deleteDoc failed:', err?.message || err);
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
    }
  };

  return { transactions, handleAddTransaction, handleEditTransaction, handleDeleteTransaction };
}
