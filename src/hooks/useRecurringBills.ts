import { useState, useEffect } from 'react';
import { collection, doc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from '../firebase-sync';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { RecurringBill } from '../types';
import { User } from 'firebase/auth';

export function useRecurringBills(user: User | null) {
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);

  useEffect(() => {
    if (!user) {
      setRecurringBills([]);
      return;
    }
    if (user.uid.startsWith('guest_offline_')) {
      setRecurringBills(JSON.parse(localStorage.getItem(`rb_${user.uid}`) || '[]'));
      return;
    }
    const q = query(collection(db, 'recurringBills'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bills: RecurringBill[] = [];
        snapshot.forEach((d) => bills.push({ id: d.id, ...d.data() } as RecurringBill));
        setRecurringBills(bills);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'recurringBills')
    );
    return () => unsubscribe();
  }, [user]);

  const handleAddRecurringBill = async (billData: Omit<RecurringBill, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newBill: RecurringBill = {
        ...billData,
        id: 'rb_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...recurringBills, newBill];
      setRecurringBills(updated);
      localStorage.setItem(`rb_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'recurringBills'));
    await setDoc(docRef, { ...billData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditRecurringBill = async (id: string, billData: Partial<RecurringBill>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = recurringBills.map(b => b.id === id ? { ...b, ...billData } as RecurringBill : b);
      setRecurringBills(updated);
      localStorage.setItem(`rb_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'recurringBills', id), billData);
  };

  const handleDeleteRecurringBill = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = recurringBills.filter(b => b.id !== id);
      setRecurringBills(updated);
      localStorage.setItem(`rb_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'recurringBills', id));
  };

  return { recurringBills, handleAddRecurringBill, handleEditRecurringBill, handleDeleteRecurringBill };
}
