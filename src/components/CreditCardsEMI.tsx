import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, CalendarDays, PlusCircle, AlertCircle, CheckCircle,
  Trash2, Edit2, X, IndianRupee, TrendingDown, Clock, Wallet,
  ChevronDown, ChevronUp, Save, BarChart2, AlertTriangle
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { setDoc, updateDoc, deleteDoc } from '../firebase-sync';
import { CreditCardBill, EmiItem } from '../types';

interface CreditCardsEMIProps {
  user: any;
  ccBills?: CreditCardBill[];
  ccEmis?: EmiItem[];
}

const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'IDFC', 'Yes Bank', 'Paytm', 'Amazon Pay', 'Other'];

export function CreditCardsEMI({ user, ccBills = [], ccEmis = [] }: CreditCardsEMIProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'emis'>('cards');
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [emis, setEmis] = useState<EmiItem[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddEmi, setShowAddEmi] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardBill | null>(null);
  const [editingEmi, setEditingEmi] = useState<EmiItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('HDFC');
  const [cardAmount, setCardAmount] = useState('');
  const [cardDueDate, setCardDueDate] = useState('');
  const [cardNotes, setCardNotes] = useState('');

  // EMI form state
  const [emiItemName, setEmiItemName] = useState('');
  const [emiTotal, setEmiTotal] = useState('');
  const [emiMonthly, setEmiMonthly] = useState('');
  const [emiTotalMonths, setEmiTotalMonths] = useState('');
  const [emiPaidMonths, setEmiPaidMonths] = useState('0');
  const [emiStartDate, setEmiStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [emiBank, setEmiBank] = useState('');
  const [emiNotes, setEmiNotes] = useState('');

  const isGuest = user?.uid?.startsWith('guest_offline_');

  // Load data - Synchronize with props
  useEffect(() => {
    setBills(ccBills);
    setEmis(ccEmis);
    setLoading(false);
  }, [ccBills, ccEmis]);

  const resetCardForm = () => {
    setCardName(''); setCardBank('HDFC'); setCardAmount('');
    setCardDueDate(''); setCardNotes(''); setEditingCard(null); setShowAddCard(false);
  };

  const resetEmiForm = () => {
    setEmiItemName(''); setEmiTotal(''); setEmiMonthly('');
    setEmiTotalMonths(''); setEmiPaidMonths('0');
    setEmiStartDate(new Date().toISOString().substring(0, 10));
    setEmiBank(''); setEmiNotes(''); setEditingEmi(null); setShowAddEmi(false);
  };

  const fillCardForm = (bill: CreditCardBill) => {
    setEditingCard(bill);
    setCardName(bill.cardName);
    setCardBank(bill.bank);
    setCardAmount(String(bill.amount));
    setCardDueDate(bill.dueDate);
    setCardNotes(bill.notes || '');
    setShowAddCard(true);
  };

  const fillEmiForm = (emi: EmiItem) => {
    setEditingEmi(emi);
    setEmiItemName(emi.itemName);
    setEmiTotal(String(emi.totalAmount));
    setEmiMonthly(String(emi.emiAmount));
    setEmiTotalMonths(String(emi.totalMonths));
    setEmiPaidMonths(String(emi.paidMonths));
    setEmiStartDate(emi.startDate);
    setEmiBank(emi.bank || '');
    setEmiNotes(emi.notes || '');
    setShowAddEmi(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const data: Omit<CreditCardBill, 'id'> = {
      userId: user.uid,
      cardName: cardName.trim(),
      bank: cardBank,
      amount: parseFloat(cardAmount),
      dueDate: cardDueDate,
      isPaid: editingCard?.isPaid || false,
      notes: cardNotes.trim() || undefined,
    };

    if (isGuest) {
      const id = editingCard?.id || 'cb_' + Math.random().toString(36).substring(2, 11);
      const updated = editingCard ? bills.map((b: any) => b.id === id ? { ...b, ...data, id } : b)
        : [...bills, { ...data, id }];
      localStorage.setItem(`ccbills_${user.uid}`, JSON.stringify(updated));
      setBills(updated);
    } else if (editingCard) {
      await updateDoc(doc(db, 'ccbills', editingCard.id), data);
    } else {
      const ref = doc(collection(db, 'ccbills'));
      await setDoc(ref, { ...data, id: ref.id, createdAt: serverTimestamp() });
    }
    resetCardForm();
  };

  const handleMarkPaid = async (bill: CreditCardBill) => {
    const updates = { isPaid: !bill.isPaid, paidDate: !bill.isPaid ? new Date().toISOString().split('T')[0] : undefined };
    if (isGuest) {
      const updatedBills = bills.map(b => b.id === bill.id ? { ...b, isPaid: !b.isPaid, paidDate: !b.isPaid ? new Date().toISOString() : undefined } : b);
      localStorage.setItem(`ccbills_${user.uid}`, JSON.stringify(updatedBills));
      setBills(updatedBills);
    } else {
      await updateDoc(doc(db, 'ccbills', bill.id), updates);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('इस card bill को delete करें?')) return;
    if (isGuest) {
      const updated = bills.filter(b => b.id !== id);
      localStorage.setItem(`ccbills_${user.uid}`, JSON.stringify(updated));
      setBills(updated);
    } else {
      await deleteDoc(doc(db, 'ccbills', id));
    }
  };

  const handleSaveEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const data: Omit<EmiItem, 'id'> = {
      userId: user.uid,
      itemName: emiItemName.trim(),
      totalAmount: parseFloat(emiTotal),
      emiAmount: parseFloat(emiMonthly),
      totalMonths: parseInt(emiTotalMonths),
      paidMonths: parseInt(emiPaidMonths),
      startDate: emiStartDate,
      bank: emiBank.trim() || undefined,
      notes: emiNotes.trim() || undefined,
    };

    if (isGuest) {
      const id = editingEmi?.id || 'emi_' + Math.random().toString(36).substring(2, 11);
      const updated = editingEmi ? emis.map((e: any) => e.id === id ? { ...e, ...data, id } : e)
        : [...emis, { ...data, id }];
      localStorage.setItem(`ccemis_${user.uid}`, JSON.stringify(updated));
      setEmis(updated);
    } else if (editingEmi) {
      await updateDoc(doc(db, 'ccemis', editingEmi.id), data);
    } else {
      const ref = doc(collection(db, 'ccemis'));
      await setDoc(ref, { ...data, id: ref.id, createdAt: serverTimestamp() });
    }
    resetEmiForm();
  };

  const handlePayEmiInstallment = async (emi: EmiItem) => {
    if (emi.paidMonths >= emi.totalMonths) return;
    const updates = { paidMonths: emi.paidMonths + 1 };
    if (isGuest) {
      const updatedEmis = emis.map(e => e.id === emi.id ? { ...e, paidMonths: Math.min(e.totalMonths, e.paidMonths + 1) } : e);
      localStorage.setItem(`ccemis_${user.uid}`, JSON.stringify(updatedEmis));
      setEmis(updatedEmis);
    } else {
      await updateDoc(doc(db, 'ccemis', emi.id), updates);
    }
  };

  const handleDeleteEmi = async (id: string) => {
    if (!confirm('इस EMI को delete करें?')) return;
    if (isGuest) {
      const updated = emis.filter(e => e.id !== id);
      localStorage.setItem(`ccemis_${user.uid}`, JSON.stringify(updated));
      setEmis(updated);
    } else {
      await deleteDoc(doc(db, 'ccemis', id));
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueBills = bills.filter(b => !b.isPaid && b.dueDate < today);
  const dueSoonBills = bills.filter(b => !b.isPaid && b.dueDate >= today && b.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const totalEmiMonthly = emis.filter(e => e.paidMonths < e.totalMonths).reduce((acc, e) => acc + e.emiAmount, 0);
  const totalOutstanding = bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="space-y-4 pb-10 font-sans">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Finance Manager</p>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CreditCard size={20} className="text-indigo-600" />
            Credit Cards & EMIs
          </h2>
        </div>
        <button
          onClick={() => activeTab === 'cards' ? setShowAddCard(true) : setShowAddEmi(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-sm"
        >
          <PlusCircle size={14} />
          Add {activeTab === 'cards' ? 'Card Bill' : 'EMI'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Overdue Bills</p>
          <p className="text-2xl font-black text-red-600">{overdueBills.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Due This Week</p>
          <p className="text-2xl font-black text-amber-600">{dueSoonBills.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outstanding</p>
          <p className="text-xl font-black text-slate-800 font-mono">₹{totalOutstanding.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Monthly EMIs</p>
          <p className="text-xl font-black text-indigo-700 font-mono">₹{totalEmiMonthly.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-full max-w-xs">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-700'}`}
        >
          Credit Card Bills
        </button>
        <button
          onClick={() => setActiveTab('emis')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'emis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-700'}`}
        >
          Active EMIs
        </button>
      </div>

      {/* Add/Edit Card Form */}
      <AnimatePresence>
        {showAddCard && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-indigo-200 rounded-3xl p-4 shadow-md"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard size={16} className="text-indigo-600" />
                {editingCard ? 'Edit Card Bill' : 'Add New Card Bill'}
              </h3>
              <button onClick={resetCardForm} className="text-slate-500 hover:text-slate-600 p-1 rounded-lg cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveCard} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Card Name</label>
                <input required value={cardName} onChange={e => setCardName(e.target.value)} placeholder="e.g. HDFC Millennia" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Bank</label>
                <select value={cardBank} onChange={e => setCardBank(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  {BANKS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Bill Amount (₹)</label>
                <input required type="number" step="0.01" value={cardAmount} onChange={e => setCardAmount(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Due Date</label>
                <input required type="date" value={cardDueDate} onChange={e => setCardDueDate(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Notes (Optional)</label>
                <input value={cardNotes} onChange={e => setCardNotes(e.target.value)} placeholder="Minimum payment, etc." className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Save size={14} /> {editingCard ? 'Update Bill' : 'Save Bill'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit EMI Form */}
      <AnimatePresence>
        {showAddEmi && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-violet-200 rounded-3xl p-4 shadow-md"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <BarChart2 size={16} className="text-violet-600" />
                {editingEmi ? 'Edit EMI' : 'Add New EMI'}
              </h3>
              <button onClick={resetEmiForm} className="text-slate-500 hover:text-slate-600 p-1 rounded-lg cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveEmi} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Item Name</label>
                <input required value={emiItemName} onChange={e => setEmiItemName(e.target.value)} placeholder="e.g. iPhone 15, Laptop" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Total Amount (₹)</label>
                <input required type="number" step="0.01" value={emiTotal} onChange={e => setEmiTotal(e.target.value)} placeholder="75000" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Monthly EMI (₹)</label>
                <input required type="number" step="0.01" value={emiMonthly} onChange={e => setEmiMonthly(e.target.value)} placeholder="6250" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Total Months</label>
                <input required type="number" min="1" value={emiTotalMonths} onChange={e => setEmiTotalMonths(e.target.value)} placeholder="12" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Paid Months (so far)</label>
                <input type="number" min="0" value={emiPaidMonths} onChange={e => setEmiPaidMonths(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                <input required type="date" value={emiStartDate} onChange={e => setEmiStartDate(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Bank / Lender (Optional)</label>
                <input value={emiBank} onChange={e => setEmiBank(e.target.value)} placeholder="e.g. HDFC, Bajaj Finance" className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Notes (Optional)</label>
                <input value={emiNotes} onChange={e => setEmiNotes(e.target.value)} placeholder="0% interest, etc." className="w-full border border-slate-200 rounded-xl p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Save size={14} /> {editingEmi ? 'Update EMI' : 'Save EMI'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- CARDS TAB ---- */}
      {activeTab === 'cards' && (
        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl py-16 text-center">
              <CreditCard size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium text-sm">No credit card bills added yet.</p>
              <button onClick={() => setShowAddCard(true)} className="mt-3 text-indigo-600 font-bold text-xs hover:underline cursor-pointer">+ Add your first bill</button>
            </div>
          ) : (
            bills.map(bill => {
              const isOverdue = !bill.isPaid && bill.dueDate < today;
              const isDueSoon = !bill.isPaid && bill.dueDate >= today && bill.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 ${isOverdue ? 'border-red-200 bg-red-50/40' : isDueSoon ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${bill.isPaid ? 'bg-emerald-100 text-emerald-600' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {bill.isPaid ? <CheckCircle size={18} /> : isOverdue ? <AlertCircle size={18} /> : <CreditCard size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{bill.cardName}</p>
                      <p className="text-[10px] text-slate-700 flex items-center gap-1">
                        <CalendarDays size={10} />
                        {bill.bank} · Due: {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {isOverdue && <span className="text-red-500 font-bold ml-1">· OVERDUE</span>}
                        {isDueSoon && !isOverdue && <span className="text-amber-600 font-bold ml-1">· Due Soon!</span>}
                      </p>
                      {bill.notes && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{bill.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`font-mono font-black text-base ${bill.isPaid ? 'text-slate-500 line-through' : 'text-slate-900'}`}>₹{bill.amount.toLocaleString('en-IN')}</p>
                      {bill.isPaid && bill.paidDate && <p className="text-[9px] text-emerald-600 font-bold">Paid {bill.paidDate}</p>}
                    </div>
                    <button onClick={() => handleMarkPaid(bill)} className={`px-2.5 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${bill.isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {bill.isPaid ? 'Unpay' : 'Mark Paid'}
                    </button>
                    <button onClick={() => fillCardForm(bill)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteCard(bill.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* ---- EMI TAB ---- */}
      {activeTab === 'emis' && (
        <div className="space-y-3">
          {emis.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-3xl py-16 text-center">
              <TrendingDown size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium text-sm">No active EMIs tracked yet.</p>
              <button onClick={() => setShowAddEmi(true)} className="mt-3 text-violet-600 font-bold text-xs hover:underline cursor-pointer">+ Add your first EMI</button>
            </div>
          ) : (
            emis.map(emi => {
              const remaining = emi.totalMonths - emi.paidMonths;
              const progress = (emi.paidMonths / emi.totalMonths) * 100;
              const amountPaid = emi.emiAmount * emi.paidMonths;
              const amountLeft = emi.totalAmount - amountPaid;
              const isComplete = emi.paidMonths >= emi.totalMonths;
              return (
                <motion.div
                  key={emi.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded-2xl p-4 shadow-xs ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-900 text-sm">{emi.itemName}</p>
                        {isComplete && <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">COMPLETE ✓</span>}
                      </div>
                      {emi.bank && <p className="text-[10px] text-slate-700 mb-2">{emi.bank}</p>}

                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Monthly</p>
                          <p className="font-black text-slate-800 text-sm font-mono">₹{emi.emiAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Paid</p>
                          <p className="font-black text-emerald-600 text-sm font-mono">₹{amountPaid.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Remaining</p>
                          <p className="font-black text-red-500 text-sm font-mono">₹{amountLeft.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-700">
                          <span>{emi.paidMonths} months paid</span>
                          <span>{remaining > 0 ? `${remaining} months left` : 'Completed!'}</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-violet-500'}`}
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 text-right font-mono">{progress.toFixed(1)}% complete</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {!isComplete && (
                        <button onClick={() => handlePayEmiInstallment(emi)} className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors whitespace-nowrap">
                          + Pay Month
                        </button>
                      )}
                      <button onClick={() => fillEmiForm(emi)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-center"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteEmi(emi.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer flex justify-center"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
