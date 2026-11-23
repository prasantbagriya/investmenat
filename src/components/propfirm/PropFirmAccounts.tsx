import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PropFirmAccount, PropFirmPayout } from '../../types';
import { Wallet, Plus, Trash2, Edit2, X, CheckCircle, TrendingDown, AlertTriangle, Lock } from 'lucide-react';
import { db } from '../../firebase';
import { doc, collection } from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from '../../firebase-sync';

interface Props {
  accounts: PropFirmAccount[];
  user: any;
  setAccounts?: React.Dispatch<React.SetStateAction<PropFirmAccount[]>>;
  firmNames?: string[];
  payouts?: PropFirmPayout[];
}

export default function PropFirmAccounts({ accounts, user, setAccounts, firmNames = [], payouts = [] }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [firmName, setFirmName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [accountSize, setAccountSize] = useState<number | ''>('');
  const [currentBalance, setCurrentBalance] = useState<number | ''>('');
  const [status, setStatus] = useState<'Active' | 'Breached' | 'Passed'>('Active');
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState<number | ''>('');
  const [dailyLossLimit, setDailyLossLimit] = useState<number | ''>('');
  const [profitTarget, setProfitTarget] = useState<number | ''>('');
  const [payoutFrequency, setPayoutFrequency] = useState<'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'On-Demand'>('Bi-Weekly');
  const [nextPayoutDate, setNextPayoutDate] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFirmName('');
    setAccountName('');
    setAccountNumber('');
    setAccountSize('');
    setCurrentBalance('');
    setStatus('Active');
    setMaxDrawdownLimit('');
    setDailyLossLimit('');
    setProfitTarget('');
    setPayoutFrequency('Bi-Weekly');
    setNextPayoutDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (a: PropFirmAccount) => {
    setEditingId(a.id);
    setFirmName(a.firmName);
    setAccountName(a.accountName);
    setAccountNumber(a.accountNumber || '');
    setAccountSize(a.accountSize);
    setCurrentBalance(a.currentBalance);
    setStatus(a.status);
    setMaxDrawdownLimit(a.maxDrawdownLimit);
    setDailyLossLimit(a.dailyLossLimit);
    setProfitTarget(a.profitTarget || '');
    setPayoutFrequency(a.payoutFrequency || 'Bi-Weekly');
    setNextPayoutDate(a.nextPayoutDate || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      const data = {
        firmName, accountName, accountNumber: accountNumber || undefined, accountSize: Number(accountSize), currentBalance: Number(currentBalance), status, maxDrawdownLimit: Number(maxDrawdownLimit), dailyLossLimit: Number(dailyLossLimit), profitTarget: profitTarget ? Number(profitTarget) : undefined, payoutFrequency, nextPayoutDate: nextPayoutDate || undefined
      };

      if (editingId) {
        const originalAccount = accounts.find(a => a.id === editingId);
        let newStatusUpdatedAt = originalAccount?.statusUpdatedAt;

        if (originalAccount && originalAccount.status !== 'Breached' && data.status === 'Breached') {
          newStatusUpdatedAt = new Date().toISOString().split('T')[0];
        }

        const dataToUpdate = {
          ...data,
          statusUpdatedAt: newStatusUpdatedAt || null
        };

        const updated = accounts.map(a => a.id === editingId ? { ...a, ...data, statusUpdatedAt: newStatusUpdatedAt } : a);
        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify(updated));
        } else {
          try {
            await updateDoc(doc(db, 'propFirmAccounts', editingId), dataToUpdate);
          } catch (err) {
            console.error("Firestore update failed, falling back to local storage:", err);
            localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify(updated));
          }
        }
        if (setAccounts) setAccounts(updated);
      } else {
        const docRef = doc(collection(db, 'propFirmAccounts'));
        const newAccount: PropFirmAccount = {
          id: docRef.id,
          userId: user.uid,
          ...data,
          statusUpdatedAt: data.status === 'Breached' ? new Date().toISOString().split('T')[0] : undefined,
          createdAt: new Date().toISOString()
        };
        
        if (user.uid.startsWith('guest_offline_')) {
          localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify([...accounts, newAccount]));
        } else {
          try {
            await setDoc(docRef, newAccount);
          } catch (err) {
            console.error("Firestore save failed, falling back to local storage:", err);
            localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify([...accounts, newAccount]));
          }
        }
        if (setAccounts) setAccounts(prev => [...prev.filter(a => a.id !== newAccount.id), newAccount]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error saving account. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      const updated = accounts.filter(a => a.id !== id);
      if (user.uid.startsWith('guest_offline_')) {
        localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify(updated));
      } else {
        try {
          await deleteDoc(doc(db, 'propFirmAccounts', id));
        } catch (err) {
          console.error("Firestore delete failed, falling back to local storage:", err);
          localStorage.setItem(`propFirmAccounts_${user.uid}`, JSON.stringify(updated));
        }
      }
      if (setAccounts) setAccounts(updated);
    } catch (err) {
      console.error(err);
      toast.error('Error deleting account. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row justify-between items-center gap-3 px-0.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Funded Accounts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Track your live funded accounts and drawdowns</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/60 gap-4">
          <span className="text-xs font-semibold text-slate-700 shrink-0">
            Active Accounts ({accounts.length})
          </span>
          <input 
            type="text" 
            placeholder="Search by firm or account..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="text-xs py-1.5 px-3 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 w-full max-w-[200px] bg-white text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white text-xs">
            <Wallet size={32} className="mx-auto mb-2 opacity-20" />
            <p>No funded accounts added yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                  <th className="p-2.5 px-4 whitespace-nowrap">Firm / Account</th>
                  <th className="p-2.5 whitespace-nowrap">Status</th>
                  <th className="p-2.5 whitespace-nowrap">Balance vs Start</th>
                  <th className="p-2.5 whitespace-nowrap">Drawdown Limits</th>
                  <th className="p-2.5 whitespace-nowrap">Total Payouts</th>
                  <th className="p-2.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {accounts
                  .filter(a => !searchQuery || 
                    a.firmName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    a.accountName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (a.accountNumber && a.accountNumber.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(a => {
                  const isDrawdownWarning = a.currentBalance <= a.maxDrawdownLimit * 1.05;
                  
                  let isLocked = false;
                  if (a.status === 'Breached') {
                    isLocked = true;
                  }

                  const accountPayouts = payouts.filter(p => p.accountId === a.id && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);

                  return (
                    <tr key={a.id} className={`hover:bg-slate-50/50 transition-colors ${isDrawdownWarning && a.status === 'Active' ? 'bg-rose-50/40' : ''}`}>
                      <td className="p-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{a.firmName}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">{a.accountName} {a.accountNumber ? `(#${a.accountNumber})` : ''}</div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                            a.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            a.status === 'Breached' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {a.status}
                          </span>
                          {isDrawdownWarning && a.status === 'Active' && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle size={8} /> Warning
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 w-48 whitespace-nowrap">
                        <div className="flex justify-between items-end mb-1">
                          <span className={`text-xs font-semibold font-mono tabular-nums ${a.currentBalance >= a.accountSize ? 'text-emerald-700' : 'text-slate-900'}`}>
                            ${a.currentBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full rounded-full ${a.currentBalance < a.accountSize ? 'bg-amber-500' : 'bg-emerald-600'}`} 
                            style={{ width: `${Math.max(0, Math.min(100, ((a.currentBalance - a.maxDrawdownLimit) / (a.accountSize - a.maxDrawdownLimit)) * 100))}%` }} 
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] font-medium text-slate-400">
                          <span className="text-rose-600">DD: ${a.maxDrawdownLimit.toLocaleString()}</span>
                          <span>Start: ${a.accountSize.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="text-xs space-y-0.5">
                          <p className="text-slate-500 font-medium flex items-center gap-1"><TrendingDown size={11} className="text-amber-500" /> Daily Loss: <span className="font-mono tabular-nums font-semibold text-slate-900">${a.dailyLossLimit.toLocaleString()}</span></p>
                          {a.profitTarget && (
                            <p className="text-slate-500 font-medium flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" /> Target: <span className="font-mono tabular-nums font-semibold text-slate-900">${a.profitTarget.toLocaleString()}</span></p>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="text-xs font-semibold font-mono tabular-nums text-emerald-700">
                          ${accountPayouts.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        {isLocked ? (
                          <div className="flex justify-end gap-1.5 text-slate-300" title="Locked (Account is Breached)">
                            <Lock size={12} className="m-1" />
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5 text-slate-500">
                            <button onClick={() => openEditModal(a)} className="p-1 hover:text-slate-900 rounded-md cursor-pointer transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete(a.id)} className="p-1 hover:text-rose-600 rounded-md cursor-pointer transition-colors"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">{editingId ? 'Edit Account' : 'New Account'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Firm Name</label>
                  <input required type="text" list="account-firm-names" value={firmName} onChange={e => setFirmName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400" placeholder="FTMO, TopStep..." />
                  <datalist id="account-firm-names">
                    {firmNames.map((firm, i) => <option key={i} value={firm} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Name</label>
                  <input required type="text" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400" placeholder="Acc-12345" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Number / Login (Optional)</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400" placeholder="e.g. 5051234" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Size ($)</label>
                  <input required type="number" value={accountSize} onChange={e => setAccountSize(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400" placeholder="100000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Current Balance ($)</label>
                  <input required type="number" step="0.01" value={currentBalance} onChange={e => setCurrentBalance(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium placeholder:text-slate-400 text-emerald-700" placeholder="100000" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium">
                  <option value="Active">Active</option>
                  <option value="Breached">Breached</option>
                  <option value="Passed">Passed</option>
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Risk Management</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Max Drawdown Limit ($)</label>
                    <input required type="number" value={maxDrawdownLimit} onChange={e => setMaxDrawdownLimit(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 font-medium" placeholder="90000" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Daily Loss Limit ($)</label>
                    <input required type="number" value={dailyLossLimit} onChange={e => setDailyLossLimit(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 font-medium" placeholder="95000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Profit Target ($) (Optional)</label>
                    <input type="number" value={profitTarget} onChange={e => setProfitTarget(e.target.value ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 font-medium" placeholder="110000" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Payout Format</label>
                    <select value={payoutFrequency} onChange={e => setPayoutFrequency(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium">
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Daily">Daily</option>
                      <option value="On-Demand">On-Demand</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Expected Payout Date (Optional)</label>
                  <input type="date" value={nextPayoutDate} onChange={e => setNextPayoutDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium" />
                </div>
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
