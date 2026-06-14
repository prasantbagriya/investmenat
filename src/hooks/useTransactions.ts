import { useState, useEffect } from 'react';
import { collection, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from '../firebase-sync';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction } from '../types';
import { User } from 'firebase/auth';

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
        setTransactions(txs);
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
    const docRef = doc(collection(db, 'transactions'));
    await setDoc(docRef, { ...txData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditTransaction = async (id: string, txData: Partial<Transaction>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = transactions.map(t => t.id === id ? { ...t, ...txData } as Transaction : t);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'transactions', id), txData);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'transactions', id));
  };

  return { transactions, handleAddTransaction, handleEditTransaction, handleDeleteTransaction };
}
