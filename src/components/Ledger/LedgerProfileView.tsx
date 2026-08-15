import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { setDoc, deleteDoc, updateDoc } from '../../firebase-sync';
import { db } from '../../firebase';
import { LedgerProfile, LedgerTransaction } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Trash2, Calendar, TrendingDown, TrendingUp, DollarSign, Lock } from 'lucide-react';
import { isEntryLocked } from '../../utils/dateUtils';

interface LedgerProfileViewProps {
  profile: LedgerProfile;
  userId?: string;
  onBack?: () => void;
  bankAccounts?: any[];
  onAddGlobalTransaction?: (tx: any) => Promise<void>;
  onDeleteGlobalTransaction?: (id: string) => Promise<void>;
}

export const LedgerProfileView: React.FC<LedgerProfileViewProps> = ({ 
  profile, 
  userId, 
  onBack,
  bankAccounts = [],
  onAddGlobalTransaction,
  onDeleteGlobalTransaction
}) => {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showTxForm, setShowTxForm] = useState<'gave' | 'got' | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSaving, setIsSaving] = useState(false);
  const [profileBalance, setProfileBalance] = useState(profile.netBalance);

  useEffect(() => {
    if (!userId) return;

    const localData = JSON.parse(localStorage.getItem(`ledger_tx_${profile.id}`) || '[]');
    if (localData.length > 0) {
      setTransactions(localData);
      setLoading(false);
    } else {
      setTimeout(() => setLoading(false), 1000);
    }

    const q = query(
      collection(db, 'ledger_transactions'),
      where('userId', '==', userId),
      where('ledgerId', '==', profile.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: LedgerTransaction[] = [];
      snapshot.forEach(doc => data.push(doc.data() as LedgerTransaction));
      // Sort newest first based on exact time (createdAt) instead of just date
      data.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setTransactions(data);
      localStorage.setItem(`ledger_tx_${profile.id}`, JSON.stringify(data));
      setLoading(false);
    }, (error) => {
      console.warn("Firestore error in LedgerProfileView", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId, profile.id]);

  const handleAddTransaction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId || !showTxForm) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (isSaving) return;
    setIsSaving(true);

    let globalTxId: string | undefined = undefined;

    // Generate global transaction if bank/cash is selected
    if (onAddGlobalTransaction) {
      globalTxId = uuidv4();
      const globalTx = {
        id: globalTxId,
        userId: userId,
        type: showTxForm === 'gave' ? 'expense' : 'income',
        category: 'Ledger Settlement',
        amount: numAmount,
        date: date,
        notes: `Khata: ${profile.name}${memo.trim() ? ` - ${memo.trim()}` : ''}`,
        bankAccountId: paymentMethod === 'cash' ? undefined : paymentMethod,
        createdAt: new Date().toISOString()
      };
      
      try {
        await onAddGlobalTransaction(globalTx);
      } catch (err) {
        console.error("Failed to add global transaction", err);
        // If it fails, we still proceed with ledger tx, but clear the linked ID
        globalTxId = undefined;
      }
    }

    const newTx: LedgerTransaction = {
      id: uuidv4(),
      ledgerId: profile.id,
      userId: userId,
      type: showTxForm,
      amount: numAmount,
      date: date,
      memo: memo.trim(),
      paymentMethod: paymentMethod,
      linkedGlobalTxId: globalTxId,
      createdAt: new Date().toISOString()
    };

    const balanceChange = newTx.type === 'gave' ? numAmount : -numAmount;
    const newBalance = profileBalance + balanceChange;

    try {
      await setDoc(doc(db, 'ledger_transactions', newTx.id), newTx);
      await updateDoc(doc(db, 'ledger_profiles', profile.id), {
        netBalance: newBalance
      });
    } catch (err) {
      console.warn("Failed to add transaction to cloud, saving locally", err);
    }
    
    setTransactions(prev => {
      // Prevent duplicates if onSnapshot already fired
      if (prev.some(t => t.id === newTx.id)) return prev;
      
      const updated = [newTx, ...prev].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      localStorage.setItem(`ledger_tx_${profile.id}`, JSON.stringify(updated));
      return updated;
    });

    const allProfiles = JSON.parse(localStorage.getItem(`ledger_profiles_${userId}`) || '[]');
    const updatedProfiles = allProfiles.map((p: any) => p.id === profile.id ? { ...p, netBalance: newBalance } : p);
    localStorage.setItem(`ledger_profiles_${userId}`, JSON.stringify(updatedProfiles));
    
    profile.netBalance = newBalance;
    setProfileBalance(newBalance);

    setAmount('');
    setMemo('');
    setShowTxForm(null);
    setIsSaving(false);
  };

  const handleDeleteTransaction = async (tx: LedgerTransaction) => {
    if (isSaving) return;
    if (!confirm("Delete this transaction? The net balance will be adjusted accordingly.")) return;
    
    setIsSaving(true);
    
    const balanceChange = tx.type === 'gave' ? -tx.amount : tx.amount;
    const newBalance = profileBalance + balanceChange;

    try {
      await deleteDoc(doc(db, 'ledger_transactions', tx.id));
      await updateDoc(doc(db, 'ledger_profiles', profile.id), {
        netBalance: newBalance
      });
    } catch (err) {
      console.warn("Failed to delete from cloud", err);
    }

    if (tx.linkedGlobalTxId && onDeleteGlobalTransaction) {
      await onDeleteGlobalTransaction(tx.linkedGlobalTxId);
    }

    profile.netBalance = newBalance;

    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== tx.id);
      localStorage.setItem(`ledger_tx_${profile.id}`, JSON.stringify(updated));
      return updated;
    });

    const allProfiles = JSON.parse(localStorage.getItem(`ledger_profiles_${userId}`) || '[]');
    const updatedProfiles = allProfiles.map((p: any) => p.id === profile.id ? { ...p, netBalance: newBalance } : p);
    localStorage.setItem(`ledger_profiles_${userId}`, JSON.stringify(updatedProfiles));
    
    setProfileBalance(newBalance);
    setIsSaving(false);
  };

  return (
    <div className="space-y-3 pb-5">
      {/* Compact Header */}
      <div className={`p-3 rounded-md shadow-xs border flex items-center justify-between gap-2 ${profileBalance === 0 ? 'bg-slate-50 border-slate-200/80' : profileBalance > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 bg-white rounded-md text-slate-500 hover:text-slate-900 shadow-xs border border-slate-200"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h3 className="font-bold text-slate-900 tracking-tight leading-tight max-w-[120px] truncate">{profile.name}</h3>
            {profile.phone && <p className="text-xs text-slate-500 ">{profile.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold opacity-80 block leading-none mb-0.5 text-slate-900">
             {profileBalance === 0 ? 'Settled Up' : profileBalance > 0 ? 'You will get' : 'You owe'}
          </span>
          <span className={`text-lg font-black tracking-tight block leading-none ${profileBalance === 0 ? 'text-slate-900' : profileBalance > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
            ₹{Math.abs(profileBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Transaction List (Chat Style) */}
      <div className="mt-4 bg-slate-50/50 p-4 rounded-md border border-slate-200/50 flex flex-col gap-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="text-center text-slate-500 text-xs py-10">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            <p className="text-xs font-medium bg-slate-200/50 inline-block px-3 py-1 rounded-full">No transactions yet. Start by adding one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* We want to show oldest at top, newest at bottom like a chat, so we reverse the array for display */}
            {[...transactions].reverse().map(tx => {
              const isGave = tx.type === 'gave';
              const locked = isEntryLocked(tx.date);
              return (
                <div key={tx.id} className={`flex flex-col max-w-[85%] ${isGave ? 'self-end items-end' : 'self-start items-start'}`}>
                  
                  <div className={`p-3 rounded shadow-xs border group relative min-w-[140px] ${isGave ? 'bg-rose-50 border-rose-100 rounded-tr-sm' : 'bg-emerald-50 border-emerald-100 rounded-tl-sm'}`}>
                    
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-lg font-bold font-mono ${isGave ? 'text-rose-700' : 'text-emerald-700'}`}>
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {locked ? (
                        <div className="p-1.5 text-slate-300" title="Locked (older than 30 days)">
                          <Lock size={12} />
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-full hover:bg-slate-50 cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    
                    {tx.memo && (
                      <p className={`text-sm mt-1.5 leading-snug ${isGave ? 'text-rose-800' : 'text-emerald-800'}`}>
                        {tx.memo}
                      </p>
                    )}
                    
                    <div className={`flex items-center gap-1 mt-1.5 text-xs font-mono ${isGave ? 'text-rose-400 justify-end' : 'text-emerald-500 justify-start'}`}>
                      {new Date(tx.date).toLocaleDateString()}
                      {isGave ? <span className="ml-1 text-rose-500/80">SENT</span> : <span className="ml-1 text-emerald-400/80">RECEIVED</span>}
                    </div>

                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Fixed Bottom Action Area */}
      <div className="fixed bottom-[65px] lg:bottom-0 left-0 right-0 z-[40] bg-white border-t border-slate-200/80 p-3 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto">
          {!showTxForm ? (
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTxForm('gave'); }}
                className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2.5 px-3 rounded shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <TrendingDown size={14} className="text-rose-600" /> 
                <span className="text-xs ">You Gave <span className="opacity-70 font-normal">(-)</span></span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTxForm('got'); }}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold py-2.5 px-3 rounded shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <TrendingUp size={14} className="text-emerald-600" /> 
                <span className="text-xs ">You Got <span className="opacity-70 font-normal">(+)</span></span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
               <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-xs ">
                    {showTxForm === 'gave' ? 'Record Money Given' : 'Record Money Received'}
                  </h3>
               </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block ">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-450 text-xs font-semibold">₹</span>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      autoComplete="off"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block ">Date</label>
                  <input 
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block ">Notes</label>
                  <textarea 
                    placeholder="e.g. Dinner bill, loan..."
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={1}
                    className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all resize-y min-h-[30px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 block ">Payment Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all "
                  >
                    <option value="cash">Cash (Default)</option>
                    {bankAccounts.map((bank: any) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.bankName} - {bank.accountName} {bank.accountNumber ? `(...${bank.accountNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowTxForm(null)}
                  className="px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleAddTransaction as any}
                  className={`px-4 py-1.5 font-semibold text-white rounded text-xs transition-colors cursor-pointer ${showTxForm === 'gave' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  Save Record
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
