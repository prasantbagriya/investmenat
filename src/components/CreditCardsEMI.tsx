import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard, CalendarDays, PlusCircle, AlertCircle, CheckCircle,
  Trash2, Edit2, X, IndianRupee, TrendingDown, Clock, Wallet,
  ChevronDown, ChevronUp, Save, BarChart2, AlertTriangle, Lock
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, doc, serverTimestamp, deleteField
} from 'firebase/firestore';
import { db } from '../firebase';
import { setDoc, updateDoc, deleteDoc } from '../firebase-sync';
import { CreditCardBill, EmiItem } from '../types';
import { isEntryLocked } from '../utils/dateUtils';

interface CreditCardsEMIProps {
  user: any;
  ccBills?: CreditCardBill[];
  ccEmis?: EmiItem[];
  bankAccounts?: any[];
  onAddGlobalTransaction?: (tx: any) => Promise<void>;
}

const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'IDFC', 'Yes Bank', 'Paytm', 'Amazon Pay', 'Other'];

export function CreditCardsEMI({ user, ccBills = [], ccEmis = [], bankAccounts = [], onAddGlobalTransaction }: CreditCardsEMIProps) {
  const [activeTab, setActiveTab] = useState<'cards' | 'emis'>('cards');
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [emis, setEmis] = useState<EmiItem[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddEmi, setShowAddEmi] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardBill | null>(null);
  const [editingEmi, setEditingEmi] = useState<EmiItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Bank deduction state
  const [payingBill, setPayingBill] = useState<CreditCardBill | null>(null);
  const [payingEmi, setPayingEmi] = useState<EmiItem | null>(null);
  
  // -- EMIs States --
  const [expandedHistoryEmiId, setExpandedHistoryEmiId] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('');

  // Card form state
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardBankAccountId, setCardBankAccountId] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [cardDueDate, setCardDueDate] = useState('');
  const [cardNotes, setCardNotes] = useState('');
  const [cardDueEmi, setCardDueEmi] = useState('');
  const [cardPenalty, setCardPenalty] = useState('');
  const [cardAnnualCharges, setCardAnnualCharges] = useState('');

  // EMI form state
  const [emiItemName, setEmiItemName] = useState('');
  const [emiLoanNumber, setEmiLoanNumber] = useState('');
  const [emiLoanType, setEmiLoanType] = useState('Consumer Goods');
  const [emiFrequency, setEmiFrequency] = useState('monthly');
  const [emiTotal, setEmiTotal] = useState('');
  const [emiPenalty, setEmiPenalty] = useState('');
  const [emiOtherCharges, setEmiOtherCharges] = useState('');
  const [emiMonthly, setEmiMonthly] = useState('');
  const [emiTotalMonths, setEmiTotalMonths] = useState('');
  const [emiPaidMonths, setEmiPaidMonths] = useState('0');
  const [emiStartDate, setEmiStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [emiBank, setEmiBank] = useState('');
  const [emiBankAccountId, setEmiBankAccountId] = useState('');
  const [emiNotes, setEmiNotes] = useState('');

  const isGuest = user?.uid?.startsWith('guest_offline_');

  // Load data - Synchronize with props
  useEffect(() => {
    setBills(ccBills);
    setEmis(ccEmis);
    setLoading(false);
  }, [ccBills, ccEmis]);

  const resetCardForm = () => {
    setCardName(''); setCardBank(''); setCardBankAccountId(''); setCardAmount('');
    setCardDueEmi(''); setCardPenalty(''); setCardAnnualCharges('');
    setCardDueDate(''); setCardNotes(''); setEditingCard(null); setShowAddCard(false);
  };

  const resetEmiForm = () => {
    setEmiItemName(''); setEmiLoanNumber(''); setEmiLoanType('Consumer Goods'); setEmiFrequency('monthly'); setEmiTotal(''); 
    setEmiPenalty(''); setEmiOtherCharges(''); setEmiMonthly('');
    setEmiTotalMonths(''); setEmiPaidMonths('0');
    setEmiStartDate(new Date().toISOString().substring(0, 10));
    setEmiBank(''); setEmiBankAccountId(''); setEmiNotes(''); setEditingEmi(null); setShowAddEmi(false);
  };

  const fillCardForm = (bill: CreditCardBill) => {
    setEditingCard(bill);
    setCardName(bill.cardName);
    setCardBank(bill.bank);
    setCardBankAccountId(bill.bankAccountId || '');
    setCardAmount(String(bill.amount));
    setCardDueEmi(bill.dueEmi ? String(bill.dueEmi) : '');
    setCardPenalty(bill.penalty ? String(bill.penalty) : '');
    setCardAnnualCharges(bill.annualCharges ? String(bill.annualCharges) : '');
    setCardDueDate(bill.dueDate);
    setCardNotes(bill.notes || '');
    setShowAddCard(true);
  };

  const fillEmiForm = (emi: EmiItem) => {
    setEditingEmi(emi);
    setEmiItemName(emi.itemName);
    setEmiLoanNumber(emi.loanNumber || '');
    setEmiLoanType(emi.loanType || 'Consumer Goods');
    setEmiFrequency(emi.frequency || 'monthly');
    setEmiTotal(String(emi.totalAmount));
    setEmiPenalty(emi.penalty ? String(emi.penalty) : '');
    setEmiOtherCharges(emi.otherCharges ? String(emi.otherCharges) : '');
    setEmiMonthly(String(emi.emiAmount));
    setEmiTotalMonths(String(emi.totalMonths));
    setEmiPaidMonths(String(emi.paidMonths));
    setEmiStartDate(emi.startDate);
    setEmiBank(emi.bank || '');
    setEmiBankAccountId(emi.bankAccountId || '');
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
      bankAccountId: cardBankAccountId || undefined,
      amount: parseFloat(cardAmount) || 0,
      dueEmi: parseFloat(cardDueEmi) || 0,
      penalty: parseFloat(cardPenalty) || 0,
      annualCharges: parseFloat(cardAnnualCharges) || 0,
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

  const handleMarkPaidClick = (bill: CreditCardBill) => {
    if (bill.isPaid) {
      handleMarkUnpaid(bill);
    } else {
      if (bankAccounts && bankAccounts.length > 0) {
        setPayingBill(bill);
        setSelectedBank(bill.bankAccountId || '');
      } else {
        handleConfirmPayBill(bill, null);
      }
    }
  };

  const handleMarkUnpaid = async (bill: CreditCardBill) => {
    const updates: any = { isPaid: false, paidDate: deleteField() };
    if (isGuest) {
      const updatedBills = bills.map(b => b.id === bill.id ? { ...b, isPaid: false, paidDate: undefined } : b);
      localStorage.setItem(`ccbills_${user.uid}`, JSON.stringify(updatedBills));
      setBills(updatedBills);
    } else {
      await updateDoc(doc(db, 'ccbills', bill.id), updates);
    }
  };

  const handleConfirmPayBill = async (bill: CreditCardBill, bankId: string | null) => {
    if (bankId && onAddGlobalTransaction) {
      await onAddGlobalTransaction({
        type: 'expense',
        category: 'Credit Card Bill',
        amount: bill.amount + (bill.dueEmi || 0) + (bill.penalty || 0) + (bill.annualCharges || 0),
        date: new Date().toISOString().split('T')[0],
        notes: `Paid CC Bill: ${bill.cardName}`,
        bankAccountId: bankId
      });
    }

    const updates: any = {
      isPaid: true,
      paidDate: new Date().toISOString().split('T')[0]
    };
    if (isGuest) {
      const updatedBills = bills.map(b => b.id === bill.id ? { ...b, ...updates } : b);
      localStorage.setItem(`ccbills_${user.uid}`, JSON.stringify(updatedBills));
      setBills(updatedBills);
    } else {
      await updateDoc(doc(db, 'ccbills', bill.id), updates);
    }

    setPayingBill(null);
    setSelectedBank('');
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
      loanNumber: emiLoanNumber.trim() || undefined,
      loanType: emiLoanType as any,
      frequency: emiFrequency as any,
      totalAmount: parseFloat(emiTotal) || 0,
      penalty: parseFloat(emiPenalty) || 0,
      otherCharges: parseFloat(emiOtherCharges) || 0,
      emiAmount: parseFloat(emiMonthly) || 0,
      totalMonths: parseInt(emiTotalMonths),
      paidMonths: parseInt(emiPaidMonths),
      startDate: emiStartDate,
      bank: emiBank.trim() || undefined,
      bankAccountId: emiBankAccountId || undefined,
      notes: emiNotes.trim() || undefined,
      paymentHistory: editingEmi?.paymentHistory || [],
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

  const handlePayEmiClick = (emi: EmiItem) => {
    if (emi.paidMonths >= emi.totalMonths) return;
    if (bankAccounts && bankAccounts.length > 0) {
      setPayingEmi(emi);
      setSelectedBank(emi.bankAccountId || '');
    } else {
      handleConfirmPayEmi(emi, null);
    }
  };

  const handleConfirmPayEmi = async (emi: EmiItem, bankId: string | null) => {
    if (bankId && onAddGlobalTransaction) {
      await onAddGlobalTransaction({
        type: 'expense',
        category: 'EMI',
        amount: emi.emiAmount,
        date: new Date().toISOString().split('T')[0],
        notes: `Paid EMI: ${emi.itemName}`,
        bankAccountId: bankId
      });
    }

    const paymentLog = {
      id: 'pl_' + Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
      amount: emi.emiAmount,
      bankAccountId: bankId || undefined,
    };

    const updates = { 
      paidMonths: emi.paidMonths + 1,
      paymentHistory: [...(emi.paymentHistory || []), paymentLog]
    };

    if (isGuest) {
      const updatedEmis = emis.map(e => e.id === emi.id ? { ...e, ...updates, paidMonths: Math.min(e.totalMonths, e.paidMonths + 1) } : e);
      localStorage.setItem(`ccemis_${user.uid}`, JSON.stringify(updatedEmis));
      setEmis(updatedEmis);
    } else {
      await updateDoc(doc(db, 'ccemis', emi.id), updates);
    }
    
    setPayingEmi(null);
    setSelectedBank('');
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
  const totalOutstanding = bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.amount + (b.dueEmi || 0) + (b.penalty || 0) + (b.annualCharges || 0), 0);

  return (
    <div className="space-y-4 pb-10 relative">
      {/* Pay Modal Overlay */}
      <AnimatePresence>
        {(payingBill || payingEmi) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-md p-5 shadow-xl w-full max-w-sm"
            >
              <h3 className="font-bold text-slate-900 text-lg mb-2">
                Pay {payingBill ? payingBill.cardName : payingEmi?.itemName}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Amount: <span className="font-bold font-mono">₹{payingBill ? (payingBill.amount + (payingBill.dueEmi || 0) + (payingBill.penalty || 0) + (payingBill.annualCharges || 0)).toLocaleString('en-IN') : payingEmi?.emiAmount.toLocaleString('en-IN')}</span>
              </p>
              
              <div className="space-y-2 mb-5">
                <label className="block text-xs font-black text-slate-700 capitalize ">Select Bank Account to Deduct From</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full border border-slate-200 rounded-md p-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
                >
                  <option value="">-- No Bank (Cash/Other) --</option>
                  {bankAccounts?.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (₹{b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setPayingBill(null); setPayingEmi(null); setSelectedBank(''); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-md text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (payingBill) handleConfirmPayBill(payingBill, selectedBank);
                    else if (payingEmi) handleConfirmPayEmi(payingEmi, selectedBank);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-md text-sm transition-colors"
                >
                  Confirm Pay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals are handled below. History modal removed. */}


      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3 px-1 mb-2">
        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 capitalize">
          <CreditCard size={20} className="text-indigo-600 shrink-0" />
          Credit Cards & EMIs
        </p>
        <button
          type="button"
          onClick={() => activeTab === 'cards' ? setShowAddCard(true) : setShowAddEmi(true)}
          className="flex shrink-0 items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors cursor-pointer shadow-sm whitespace-nowrap w-auto"
        >
          <PlusCircle size={14} />
          Add {activeTab === 'cards' ? 'Card Bill' : 'Loan/EMI'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-100 rounded p-3 text-center">
          <p className="text-xs font-bold text-red-400 capitalize ">Overdue Bills</p>
          <p className="text-2xl font-black text-red-600">{overdueBills.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded p-3 text-center">
          <p className="text-xs font-bold text-amber-500 capitalize ">Due This Week</p>
          <p className="text-2xl font-black text-amber-600">{dueSoonBills.length}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
          <p className="text-xs font-bold text-slate-500 capitalize ">Outstanding</p>
          <p className="text-xl font-black text-slate-800 font-mono">₹{totalOutstanding.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded p-3 text-center">
          <p className="text-xs font-bold text-indigo-400 capitalize ">Ongoing EMIs</p>
          <p className="text-xl font-black text-indigo-700 font-mono">₹{totalEmiMonthly.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded w-full max-w-xs">
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-700'}`}
        >
          Credit Card Bills
        </button>
        <button
          onClick={() => setActiveTab('emis')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'emis' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700 hover:text-slate-700'}`}
        >
          Loans & EMIs
        </button>
      </div>

      {/* Add/Edit Card Form */}
      <AnimatePresence>
        {showAddCard && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-indigo-200 rounded-md p-4 shadow-md"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CreditCard size={16} className="text-indigo-600" />
                {editingCard ? 'Edit Card Bill' : 'Add New Card Bill'}
              </h3>
              <button onClick={resetCardForm} className="text-slate-500 hover:text-slate-600 p-1 rounded cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveCard} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Card Name</label>
                <input required value={cardName} onChange={e => setCardName(e.target.value)} placeholder="e.g. HDFC Millennia" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Bank</label>
                <select value={cardBank} onChange={e => setCardBank(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  {BANKS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Base Spends (₹)</label>
                <input required type="number" step="0.01" value={cardAmount} onChange={e => setCardAmount(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Due EMIs (₹) (Optional)</label>
                <input type="number" step="0.01" value={cardDueEmi} onChange={e => setCardDueEmi(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Penalties/Late Fee (₹) (Optional)</label>
                <input type="number" step="0.01" value={cardPenalty} onChange={e => setCardPenalty(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Annual Charges (₹) (Optional)</label>
                <input type="number" step="0.01" value={cardAnnualCharges} onChange={e => setCardAnnualCharges(e.target.value)} placeholder="0.00" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Due Date</label>
                <input required type="date" value={cardDueDate} onChange={e => setCardDueDate(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Notes (Optional)</label>
                <input value={cardNotes} onChange={e => setCardNotes(e.target.value)} placeholder="Minimum payment, etc." className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Linked Bank Account</label>
                <select value={cardBankAccountId} onChange={e => setCardBankAccountId(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  <option value="">-- No Linked Bank --</option>
                  {bankAccounts?.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-md text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
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
            className="bg-white border border-indigo-200 rounded-md p-4 shadow-md"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <BarChart2 size={16} className="text-indigo-600" />
                {editingEmi ? 'Edit EMI' : 'Add New EMI'}
              </h3>
              <button onClick={resetEmiForm} className="text-slate-500 hover:text-slate-600 p-1 rounded cursor-pointer"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveEmi} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Item / Loan Name</label>
                <input required value={emiItemName} onChange={e => setEmiItemName(e.target.value)} placeholder="e.g. iPhone 15, HDFC Personal Loan" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Loan / Account No. (Optional)</label>
                <input value={emiLoanNumber} onChange={e => setEmiLoanNumber(e.target.value)} placeholder="e.g. LON12345678" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Loan Type</label>
                <select value={emiLoanType} onChange={e => setEmiLoanType(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  <option value="Consumer Goods">Consumer Goods (Phone, Laptop, etc.)</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Home Loan">Home Loan</option>
                  <option value="Car Loan">Car / Vehicle Loan</option>
                  <option value="Education Loan">Education Loan</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Total Loan Amount (₹)</label>
                <input required type="number" step="0.01" value={emiTotal} onChange={e => setEmiTotal(e.target.value)} placeholder="75000" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Penalty / Late Fee (₹) (Optional)</label>
                <input type="number" step="0.01" value={emiPenalty} onChange={e => setEmiPenalty(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Other Charges (₹) (Optional)</label>
                <input type="number" step="0.01" value={emiOtherCharges} onChange={e => setEmiOtherCharges(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Payment Frequency</label>
                <select value={emiFrequency} onChange={e => setEmiFrequency(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Installment Amount (₹)</label>
                <input required type="number" step="0.01" value={emiMonthly} onChange={e => setEmiMonthly(e.target.value)} placeholder="6250" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Total Installments (Kishtein)</label>
                <input required type="number" min="1" value={emiTotalMonths} onChange={e => setEmiTotalMonths(e.target.value)} placeholder="12" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Paid Installments (so far)</label>
                <input type="number" min="0" value={emiPaidMonths} onChange={e => setEmiPaidMonths(e.target.value)} placeholder="0" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Start Date</label>
                <input required type="date" value={emiStartDate} onChange={e => setEmiStartDate(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Bank / Lender (Optional)</label>
                <input value={emiBank} onChange={e => setEmiBank(e.target.value)} placeholder="e.g. HDFC, Bajaj Finance" className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Notes (Optional)</label>
                <input value={emiNotes} onChange={e => setEmiNotes(e.target.value)} placeholder="0% interest, etc." className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 capitalize mb-1">Linked Bank Account</label>
                <select value={emiBankAccountId} onChange={e => setEmiBankAccountId(e.target.value)} className="w-full border border-slate-200 rounded-md p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none">
                  <option value="">-- No Linked Bank --</option>
                  {bankAccounts?.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-md text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
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
            <div className="bg-white border border-dashed border-slate-200 rounded-md py-16 text-center">
              <CreditCard size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium text-sm">No credit card bills added yet.</p>
              <button onClick={() => setShowAddCard(true)} className="mt-3 text-indigo-600 font-bold text-xs hover:underline cursor-pointer">+ Add your first bill</button>
            </div>
          ) : (
            bills.map(bill => {
              const isOverdue = !bill.isPaid && bill.dueDate < today;
              const isDueSoon = !bill.isPaid && bill.dueDate >= today && bill.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
              const locked = isEntryLocked(bill.dueDate);
              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded p-3 shadow-xs flex items-center justify-between gap-3 ${isOverdue ? 'border-red-200 bg-red-50/40' : isDueSoon ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${bill.isPaid ? 'bg-emerald-100 text-emerald-600' : isOverdue ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {bill.isPaid ? <CheckCircle size={18} /> : isOverdue ? <AlertCircle size={18} /> : <CreditCard size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{bill.cardName}</p>
                      <p className="text-xs text-slate-700 flex items-center gap-1">
                        <CalendarDays size={10} />
                        {bill.bank} · Due: {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {isOverdue && <span className="text-red-500 font-bold ml-1">· OVERDUE</span>}
                        {isDueSoon && !isOverdue && <span className="text-amber-600 font-bold ml-1">· Due Soon!</span>}
                      </p>
                      {bill.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{bill.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right flex flex-col justify-end">
                      <p className={`font-mono font-black text-base ${bill.isPaid ? 'text-slate-500 line-through' : 'text-slate-900'}`}>₹{(bill.amount + (bill.dueEmi || 0) + (bill.penalty || 0) + (bill.annualCharges || 0)).toLocaleString('en-IN')}</p>
                      {(bill.dueEmi || bill.penalty || bill.annualCharges) ? (
                        <p className="text-[8px] text-slate-500 font-bold max-w-[120px] leading-tight">
                          (Spends: {bill.amount.toLocaleString('en-IN')}{bill.dueEmi ? ` + EMI: ${bill.dueEmi}` : ''}{bill.penalty ? ` + Penalty: ${bill.penalty}` : ''}{bill.annualCharges ? ` + AMC: ${bill.annualCharges}` : ''})
                        </p>
                      ) : null}
                      {bill.isPaid && bill.paidDate && <p className="text-xs text-emerald-600 font-bold mt-0.5">Paid {bill.paidDate}</p>}
                    </div>
                    {!locked && (
                      <button onClick={() => handleMarkPaidClick(bill)} className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${bill.isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {bill.isPaid ? 'Unpay' : 'Mark Paid'}
                      </button>
                    )}
                    {locked ? (
                      <div className="p-1.5 text-slate-300 flex justify-center" title="Locked (older than 30 days)">
                        <Lock size={14} />
                      </div>
                    ) : (
                      <>
                        <button onClick={() => fillCardForm(bill)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteCard(bill.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={14} /></button>
                      </>
                    )}
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
            <div className="bg-white border border-dashed border-slate-200 rounded-md py-16 text-center">
              <TrendingDown size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium text-sm">No active EMIs tracked yet.</p>
              <button onClick={() => setShowAddEmi(true)} className="mt-3 text-indigo-600 font-bold text-xs hover:underline cursor-pointer">+ Add your first EMI</button>
            </div>
          ) : (
            emis.map(emi => {
              const remaining = emi.totalMonths - emi.paidMonths;
              
              const amountPaid = emi.paymentHistory && emi.paymentHistory.length > 0
                ? emi.paymentHistory.reduce((sum, p) => sum + p.amount, 0)
                : (emi.emiAmount * emi.paidMonths);
                
              const totalDue = emi.totalAmount + (emi.penalty || 0) + (emi.otherCharges || 0);
              const amountLeft = totalDue - amountPaid;
              const isComplete = emi.paidMonths >= emi.totalMonths || amountLeft <= 0;
              const progress = Math.min((amountPaid / totalDue) * 100, 100);
              const locked = isEntryLocked(emi.startDate);
              return (
                <motion.div
                  key={emi.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white border rounded-lg p-2.5 shadow-xs ${isComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}
                >
                  <div className="flex flex-col gap-2">
                    {/* Top Row: Name and Status */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-900 text-sm">{emi.itemName}</p>
                          {emi.loanType && (
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 capitalize shrink-0">
                              {emi.loanType}
                            </span>
                          )}
                          {isComplete && <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">COMPLETE ✓</span>}
                        </div>
                        
                        {(emi.bank || emi.loanNumber) && (
                          <p className="text-xs text-slate-700 mb-2 font-medium flex flex-wrap gap-1">
                            {emi.bank && <span>{emi.bank}</span>}
                            {emi.bank && emi.loanNumber && <span>•</span>}
                            {emi.loanNumber && <span className="font-mono text-slate-500">A/C: {emi.loanNumber}</span>}
                          </p>
                        )}
                        
                        {(emi.penalty || emi.otherCharges) ? (
                          <p className="text-xs text-slate-500 font-bold mb-2">
                            Base: ₹{emi.totalAmount.toLocaleString()}
                            {emi.penalty ? ` + Penalty: ₹${emi.penalty}` : ''}
                            {emi.otherCharges ? ` + Charges: ₹${emi.otherCharges}` : ''}
                            {' = Total: ₹' + totalDue.toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-50 rounded-md p-2.5">
                        <p className="text-xs font-bold text-slate-500 capitalize">{emi.frequency || 'Monthly'}</p>
                        <p className="font-black text-slate-800 text-sm font-mono">₹{emi.emiAmount.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 rounded-md p-2.5">
                        <p className="text-xs font-bold text-slate-500 capitalize">Paid</p>
                        <p className="font-black text-emerald-600 text-sm font-mono">₹{amountPaid.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 rounded-md p-2.5">
                        <p className="text-xs font-bold text-slate-500 capitalize">Remaining</p>
                        <p className="font-black text-red-500 text-sm font-mono">₹{amountLeft.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                        <span className="flex items-center gap-1">
                          {emi.paidMonths} / {emi.totalMonths} installments paid
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        />
                      </div>
                    </div>
                    
                    {/* Inline History & Actions */}
                    <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <button 
                          onClick={() => setExpandedHistoryEmiId(expandedHistoryEmiId === emi.id ? null : emi.id)} 
                          className="text-indigo-600 hover:text-indigo-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                        >
                          {expandedHistoryEmiId === emi.id ? 'Hide History' : 'View History'}
                        </button>
                        
                        <div className="flex gap-2">
                          {locked ? (
                            <div className="p-1.5 text-slate-300 flex justify-center" title="Locked (older than 30 days)">
                              <Lock size={14} />
                            </div>
                          ) : (
                            <>
                              <button onClick={() => fillEmiForm(emi)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteEmi(emi.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={14} /></button>
                            </>
                          )}
                          
                          {!locked && !isComplete && (
                            <button onClick={() => handlePayEmiClick(emi)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer transition-colors whitespace-nowrap">
                              Pay Installment
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded History View */}
                      <AnimatePresence>
                        {expandedHistoryEmiId === emi.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-1"
                          >
                            <div className="bg-slate-50 rounded-md p-3 border border-slate-100 space-y-2 max-h-40 overflow-y-auto">
                              {(!emi.paymentHistory || emi.paymentHistory.length === 0) ? (
                                <p className="text-center text-xs text-slate-500 py-2">No payments recorded yet.</p>
                              ) : (
                                [...emi.paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                                  <div key={log.id} className="flex justify-between items-center border-b border-slate-200/60 pb-1.5 last:border-0 last:pb-0">
                                    <div>
                                      <p className="text-xs font-bold text-slate-700">{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <p className="font-mono font-bold text-xs text-emerald-600">₹{log.amount.toLocaleString('en-IN')}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
