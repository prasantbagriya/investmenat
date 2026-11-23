import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PropFirmPayout, PropFirmAccount, BankAccount, Transaction } from '../../types';
import { Landmark, Plus, Trash2, Edit2, X, CheckCircle, ExternalLink, Filter } from 'lucide-react';
import { db } from '../../firebase';
import { doc, collection } from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from '../../firebase-sync';
import GooglePicker from '../GooglePicker';

interface Props {
  payouts: PropFirmPayout[];
  accounts: PropFirmAccount[];
  bankAccounts?: BankAccount[];
  onAddTransaction?: (txData: Omit<Transaction, 'id' | 'userId'> & { id?: string }) => Promise<void>;
  user: any;
  setPayouts?: React.Dispatch<React.SetStateAction<PropFirmPayout[]>>;
  setAccounts?: React.Dispatch<React.SetStateAction<PropFirmAccount[]>>;
  firmNames?: string[];
}

export default function PropFirmPayouts({ payouts, accounts, bankAccounts = [], onAddTransaction, user, setPayouts, setAccounts, firmNames = [] }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterFirm, setFilterFirm] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  const [firmName, setFirmName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Requested' | 'Processing' | 'Paid'>('Paid');
  const [payoutMethod, setPayoutMethod] = useState<'Rise' | 'Deel' | 'Crypto' | 'Direct Bank' | 'Wallet' | 'Other'>('Crypto');
  const [cryptoCurrency, setCryptoCurrency] = useState<'USDT' | 'BTC' | 'ETH' | 'Other'>('USDT');
  const [exchangeRate, setExchangeRate] = useState<number | ''>(85);
  const [transferredTo, setTransferredTo] = useState<'Bank' | 'Cash' | 'Wallet' | 'None'>('None');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFirmName('');
    setAccountId('');
    setAmount('');
    setPayoutDate(new Date().toISOString().split('T')[0]);
    setStatus('Paid');
    setPayoutMethod('Crypto');
    setCryptoCurrency('USDT');
    setExchangeRate(85);
    setTransferredTo('None');
    setSelectedBankAccountId('');
    setCertificateUrl('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: PropFirmPayout) => {
    setEditingId(p.id);
    setFirmName(p.firmName);
    setAccountId(p.accountId || '');
    setAmount(p.amount);
    setPayoutDate(p.payoutDate);
    setStatus(p.status);
    setPayoutMethod(p.payoutMethod || 'Crypto');
    setCryptoCurrency(p.cryptoCurrency || 'USDT');
    setExchangeRate(p.exchangeRate || 85);
    setTransferredTo(p.transferredTo || 'None');
    setSelectedBankAccountId(p.bankAccountId || '');
    setCertificateUrl(p.certificateUrl || '');
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      const parsedAmount = Number(amount);
      const parsedExchangeRate = Number(exchangeRate);
      
      const data: any = {
        firmName, 
        accountId: accountId || undefined, 
        amount: parsedAmount, 
        payoutDate, 
        status, 
        certificateUrl: certificateUrl || undefined,
        notes: notes || undefined
      };

      let txIdToLink: string | undefined;

      if (status === 'Paid') {
        data.payoutMethod = payoutMethod;
        
        const destBank = transferredTo === 'Bank' ? bankAccounts?.find(b => b.id === selectedBankAccountId) : null;
        const isUsdWallet = destBank && (destBank.currency === 'USD' || destBank.currency === 'USDT');

        if (payoutMethod === 'Direct Bank') {
          data.exchangeRate = 1;
          data.finalAmountINR = parsedAmount;
        } else if (isUsdWallet) {
          data.exchangeRate = undefined;
          data.finalAmountINR = undefined;
        } else {
          data.exchangeRate = parsedExchangeRate || undefined;
          data.finalAmountINR = parsedAmount * (parsedExchangeRate || 85);
        }
        
        if (payoutMethod === 'Crypto') {
          data.cryptoCurrency = cryptoCurrency;
        }
        data.transferredTo = transferredTo;
        if (transferredTo === 'Bank' && selectedBankAccountId) {
          data.bankAccountId = selectedBankAccountId;
        }

        if (!editingId && transferredTo !== 'None') {
          if ((transferredTo === 'Bank' && selectedBankAccountId) || transferredTo === 'Cash') {
            txIdToLink = 'tx_' + Math.random().toString(36).substring(2, 11);
            data.transactionId = txIdToLink;
          }
        }
      }

      if (editingId) {
        const updated = payouts.map(p => p.id === editingId ? { ...p, ...data } : p);
        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmPayouts_${user.uid}`, JSON.stringify(updated));
        } else {
          try {
            await updateDoc(doc(db, 'propFirmPayouts', editingId), data);
          } catch (err) {
            console.error("Firestore update failed, falling back to local storage:", err);
            localStorage.setItem(`propFirmPayouts_${user.uid}`, JSON.stringify(updated));
          }
        }
        if (setPayouts) setPayouts(updated);
      } else {
        const docRef = doc(collection(db, 'propFirmPayouts'));
        const newPayout: PropFirmPayout = {
          id: docRef.id,
          userId: user.uid,
          ...data,
          createdAt: new Date().toISOString()
        };
        
        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmPayouts_${user.uid}`, JSON.stringify([...payouts, newPayout]));
        } else {
          try {
            await setDoc(docRef, newPayout);
          } catch (err) {
            console.error("Firestore save failed, falling back to local storage:", err);
            localStorage.setItem(`propFirmPayouts_${user.uid}`, JSON.stringify([...payouts, newPayout]));
          }
        }
        if (setPayouts) setPayouts(prev => [...prev.filter(p => p.id !== newPayout.id), newPayout]);

        if (txIdToLink && onAddTransaction) {
          const destBank = transferredTo === 'Bank' ? bankAccounts?.find(b => b.id === selectedBankAccountId) : null;
          const isUsdWallet = destBank && (destBank.currency === 'USD' || destBank.currency === 'USDT');
          
          if (isUsdWallet) {
            const isCryptoWallet = destBank.accountType === 'Crypto Wallet';
            const txCurrency = (isCryptoWallet && payoutMethod === 'Crypto') ? cryptoCurrency : destBank.currency;
            
            await onAddTransaction({
              id: txIdToLink,
              type: 'income',
              category: 'Prop Firm Payout',
              amount: parsedAmount,
              currency: txCurrency as any,
              date: payoutDate,
              notes: `Payout from ${firmName}${accountId ? ' account' : ''} via ${payoutMethod}`,
              bankAccountId: destBank.id
            });
          } else if (data.finalAmountINR) {
            await onAddTransaction({
              id: txIdToLink,
              type: 'income',
              category: 'Prop Firm Payout',
              amount: data.finalAmountINR,
              currency: 'INR',
              date: payoutDate,
              notes: `Payout from ${firmName}${accountId ? ' account' : ''} via ${payoutMethod}`,
              bankAccountId: transferredTo === 'Bank' ? selectedBankAccountId : undefined
            });
          }
        }

        if (accountId) {
          const account = accounts.find(a => a.id === accountId);
          if (account && account.payoutFrequency && account.payoutFrequency !== 'On-Demand') {
            const currentPayoutDate = new Date(payoutDate);
            let daysToAdd = 0;
            switch(account.payoutFrequency) {
              case 'Daily': daysToAdd = 1; break;
              case 'Weekly': daysToAdd = 7; break;
              case 'Bi-Weekly': daysToAdd = 14; break;
              case 'Monthly': daysToAdd = 30; break;
            }
            if (daysToAdd > 0) {
              currentPayoutDate.setDate(currentPayoutDate.getDate() + daysToAdd);
              const newNextPayoutDate = currentPayoutDate.toISOString().split('T')[0];
              
              const updatedAccs = accounts.map(a => a.id === accountId ? { ...a, nextPayoutDate: newNextPayoutDate } : a);
              if (user.uid.startsWith('guest_offline_')) {
                localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify(updatedAccs));
              } else {
                try {
                  await updateDoc(doc(db, 'propFirmAccounts', accountId), { nextPayoutDate: newNextPayoutDate });
                } catch (err) {
                  console.error("Firestore update failed, falling back to local storage:", err);
                  localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify(updatedAccs));
                }
              }
              if (setAccounts) setAccounts(updatedAccs);
            }
          }
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error saving payout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payout?')) return;
    try {
      const updated = payouts.filter(p => p.id !== id);
      if (user.uid.startsWith('guest_offline_')) {
        localStorage.setItem(`propFirmPayouts_${user.uid}`, JSON.stringify(updated));
      } else {
        try {
          await deleteDoc(doc(db, 'propFirmPayouts', id));
        } catch (err) {
          console.error("Firestore delete failed, falling back to local storage:", err);
          localStorage.setItem(`propFirmPayouts_${user.uid}`, JSON.stringify(updated));
        }
      }
      if (setPayouts) setPayouts(updated);
    } catch (err) {
      console.error(err);
      toast.error('Error deleting payout');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row justify-between items-center gap-3 px-0.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Payouts & Certs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Record your prop firm payouts and certificates</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 active:bg-slate-950 transition-colors shadow-xs text-xs sm:text-sm cursor-pointer whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Add Payout</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 gap-4">
          <span className="text-xs font-semibold text-slate-700 shrink-0">
            Payout History ({payouts.length})
          </span>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Search by firm or account..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="text-xs py-1.5 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 w-full max-w-[200px] bg-white text-slate-900 placeholder:text-slate-400 font-medium"
            />
            <button 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs cursor-pointer transition-colors border whitespace-nowrap shrink-0 ${isFiltersOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
            >
              <Filter size={13} className={isFiltersOpen ? "text-white" : "text-slate-500"} /> 
              Filters
            </button>
          </div>
        </div>

        {isFiltersOpen && (
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <div className="flex flex-col gap-3">
              <span className="font-semibold text-slate-900 text-xs">Active Filters</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Firm</label>
                  <select 
                    value={filterFirm}
                    onChange={(e) => setFilterFirm(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white font-medium text-slate-800"
                  >
                    <option value="all">All Firms</option>
                    {firmNames.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white font-medium text-slate-800"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Requested">Requested</option>
                    <option value="Processing">Processing</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <input 
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                  <input 
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 bg-white font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {payouts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white text-xs">
            <Landmark size={32} className="mx-auto mb-2 opacity-20" />
            <p>No payouts recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                  <th className="p-2.5 px-4 whitespace-nowrap">Firm / Acc</th>
                  <th className="p-2.5 whitespace-nowrap">Status</th>
                  <th className="p-2.5 whitespace-nowrap">Amount</th>
                  <th className="p-2.5 font-mono tabular-nums whitespace-nowrap">Date</th>
                  <th className="p-2.5 whitespace-nowrap">Proofs / Notes</th>
                  <th className="p-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[...payouts].sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime()).filter(p => {
                  if (filterFirm !== 'all' && p.firmName !== filterFirm) return false;
                  if (filterStatus !== 'all' && p.status !== filterStatus) return false;
                  if (filterStartDate && new Date(p.payoutDate) < new Date(filterStartDate)) return false;
                  if (filterEndDate && new Date(p.payoutDate) > new Date(filterEndDate)) return false;
                  if (searchQuery) {
                    const matchFirm = p.firmName.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchAcc = p.accountId && accounts.find(a => a.id === p.accountId)?.accountName.toLowerCase().includes(searchQuery.toLowerCase());
                    if (!matchFirm && !matchAcc) return false;
                  }
                  return true;
                }).slice(0, (showAll || searchQuery || filterFirm !== 'all' || filterStatus !== 'all' || filterStartDate || filterEndDate) ? undefined : 10).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{p.firmName}</div>
                      {p.accountId && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Acc: {accounts.find(a => a.id === p.accountId)?.accountName || p.accountId.substring(0,6)}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-xl text-[11px] font-medium border ${
                        p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold font-mono tabular-nums text-xs text-emerald-700 whitespace-nowrap">
                      ${p.amount.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-slate-500 font-mono tabular-nums text-xs whitespace-nowrap">
                      {p.payoutDate}
                    </td>
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">
                      {p.certificateUrl && (
                        <a href={p.certificateUrl} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-medium text-xs flex items-center gap-1">
                          View Cert <ExternalLink size={10} />
                        </a>
                      )}
                      {!p.certificateUrl && (
                        <span className="text-xs text-slate-400">{p.notes || '—'}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5 text-slate-500">
                        <button onClick={() => openEditModal(p)} className="p-1 hover:text-slate-900 rounded-xl cursor-pointer transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1 hover:text-rose-600 rounded-xl cursor-pointer transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!searchQuery && filterFirm === 'all' && filterStatus === 'all' && !filterStartDate && !filterEndDate && payouts.length > 10 && (
              <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex justify-center">
                <button onClick={() => setShowAll(!showAll)} className="text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-1.5 rounded-xl">
                  {showAll ? 'Show Less' : `View All (${payouts.length})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">{editingId ? 'Edit Payout' : 'Log Payout'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Firm Name</label>
                {firmNames.length > 0 ? (
                  <select required value={firmName} onChange={e => setFirmName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium">
                    <option value="">-- Select Firm --</option>
                    {firmNames.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                ) : (
                  <input required type="text" value={firmName} onChange={e => setFirmName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400" placeholder="FTMO, TopStep..." />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Link to Account (Optional)</label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium">
                  <option value="">None / General</option>
                  {accounts.filter(a => a.status !== 'Breached' && (!firmName || a.firmName === firmName)).map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} {a.accountNumber ? `(#${a.accountNumber})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount ($)</label>
                  <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400 text-emerald-700" placeholder="5000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Payout Date</label>
                  <input required type="date" value={payoutDate} onChange={e => setPayoutDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium">
                  <option value="Requested">Requested</option>
                  <option value="Processing">Processing</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              {status === 'Paid' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-2">
                  <h4 className="text-xs font-semibold text-slate-800">Payment Processing</h4>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Received Via</label>
                    <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 font-medium">
                      <option value="Crypto">Crypto (USDT/BTC)</option>
                      <option value="Rise">Rise</option>
                      <option value="Deel">Deel</option>
                      <option value="Direct Bank">Direct Bank Transfer</option>
                      <option value="Wallet">Digital Wallet (PayPal, Skrill)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {payoutMethod === 'Crypto' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Coin Type</label>
                      <select value={cryptoCurrency} onChange={e => setCryptoCurrency(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 font-medium">
                        <option value="USDT">USDT (Tether)</option>
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Transfer Funds To</label>
                    <select value={transferredTo} onChange={e => { setTransferredTo(e.target.value as any); if (e.target.value !== 'Bank') setSelectedBankAccountId(''); }} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 font-medium">
                      <option value="None">Keep in App / Vault</option>
                      <option value="Bank">Bank / Crypto Wallet</option>
                      <option value="Cash">Cash Wallet</option>
                    </select>
                  </div>

                  {transferredTo === 'Bank' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Account</label>
                      <select required value={selectedBankAccountId} onChange={e => setSelectedBankAccountId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 font-medium">
                        <option value="">-- Choose Account --</option>
                        {bankAccounts?.map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountName} {b.currency ? `(${b.currency})` : ''}</option>
                        ))}
                      </select>
                      {!editingId && <p className="text-[11px] text-emerald-700 mt-1 font-medium">This will automatically add to your balance.</p>}
                      {editingId && <p className="text-[11px] text-amber-700 mt-1 font-medium">Editing this will not retroactively update balances.</p>}
                    </div>
                  )}

                  {(() => {
                    const selectedBank = bankAccounts?.find(b => b.id === selectedBankAccountId);
                    const isUsdWallet = selectedBank && (selectedBank.currency === 'USD' || selectedBank.currency === 'USDT');
                    const showExchangeRate = payoutMethod !== 'Direct Bank' && !isUsdWallet && transferredTo !== 'None';

                    return showExchangeRate ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Exchange Rate (INR)</label>
                          <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 font-medium" placeholder="85.0" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Final Amount (INR)</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm font-mono tabular-nums">
                             ₹ {((Number(amount) || 0) * (Number(exchangeRate) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      payoutMethod === 'Direct Bank' ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Final Amount Logged</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm font-mono tabular-nums">
                             {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      ) : isUsdWallet ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">Amount Deposited to Wallet</label>
                          <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-semibold text-emerald-700 text-sm font-mono tabular-nums">
                             {Number(amount).toLocaleString()} {selectedBank.currency}
                          </div>
                        </div>
                      ) : null
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Certificate URL (Optional)</label>
                <div className="flex gap-2 items-center">
                  <input type="url" value={certificateUrl} onChange={e => setCertificateUrl(e.target.value)} className="flex-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 font-medium placeholder:text-slate-400" placeholder="https://..." />
                  <GooglePicker label="Drive" onSelect={(file) => setCertificateUrl(file.url)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 font-medium placeholder:text-slate-400" rows={2} placeholder="Any details..."></textarea>
              </div>
              
              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end shrink-0 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 font-medium bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-xs sm:text-sm transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer">
                  {isSaving ? <span className="text-xs">Saving...</span> : <><CheckCircle size={14} />Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
