import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Trash2, Edit2, X, Filter, Sparkles, Clipboard, CheckCircle 
} from 'lucide-react';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES, PendingPayment, RecurringBill } from '../types';
import { parseBankSMS } from '../utils/financeHelpers';
import { proxyFetch } from '../utils/proxyFetch';
import InfoTooltip from './InfoTooltip';

import BankProfiles from './BankProfiles';
import CsvImportWizard from './CsvImportWizard';
import { UploadCloud } from 'lucide-react';

interface TransactionTrackerProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  onEditTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  pendingPayments?: PendingPayment[];
  recurringBills?: RecurringBill[];
  bankAccounts?: any[]; // Array of BankAccount
  onAddBankAccount?: (acc: any) => Promise<void>;
  onEditBankAccount?: (id: string, updates: any) => Promise<void>;
  onDeleteBankAccount?: (id: string) => Promise<void>;
  onAutoPayPending?: (id: string) => Promise<void>;
  onAutoPayRecurring?: (id: string) => Promise<void>;
}

export default function TransactionTracker({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  pendingPayments = [],
  recurringBills = [],
  bankAccounts = [],
  onAddBankAccount,
  onEditBankAccount,
  onDeleteBankAccount,
  onAutoPayPending,
  onAutoPayRecurring
}: TransactionTrackerProps) {

  // Form State
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCsvWizardOpen, setIsCsvWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SMS Parser state
  const [smsText, setSmsText] = useState('');
  const [isSmsParsed, setIsSmsParsed] = useState(false);
  const [smsStatus, setSmsStatus] = useState('');

  // Filter and Search States
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  };

  const handleSmsParse = async (textToParse?: string) => {
    const text = textToParse || smsText;
    if (!text.trim()) return;
    
    setSmsStatus('🤖 Parsing with AI...');
    try {
      const response = await proxyFetch('/api/parse-sms-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          pendingPayments: pendingPayments.filter(p => !p.completed),
          recurringBills,
          bankAccounts 
        })
      });
      
      if (!response.ok) {
        throw new Error('AI parsing failed');
      }
      
      const parsed = await response.json();
      
      if (parsed.amount && parsed.amount > 0) {
        setAmount(parsed.amount.toString());
        setType(parsed.type === 'CR' || parsed.type === 'income' ? 'income' : 'expense');
        setCategory(parsed.category || 'Others');
        setNotes(parsed.description || `[${parsed.merchant || 'SMS'}] ${text.substring(0, 30)}...`);
        if (parsed.matched_bank_account_id) {
          setBankAccountId(parsed.matched_bank_account_id);
        }
        setIsSmsParsed(true);
        
        let matchMsg = '';
        if (parsed.matched_pending_id && onAutoPayPending) {
           await onAutoPayPending(parsed.matched_pending_id);
           matchMsg = ' 🌟 Auto-Paid Pending Payment!';
        } else if (parsed.matched_recurring_id && onAutoPayRecurring) {
           await onAutoPayRecurring(parsed.matched_recurring_id);
           matchMsg = ' 🌟 Auto-Paid Recurring Bill!';
        }

        setSmsStatus(`✔ Successfully extracted ₹${parsed.amount} for ${parsed.merchant || 'Unknown'}${matchMsg}`);
        // Open form
        setIsFormOpen(true);
      } else {
        setSmsStatus('❌ Could not parse amount or type from this text format.');
      }
    } catch (err) {
      console.error(err);
      setSmsStatus('❌ AI Parsing error or GEMINI_API_KEY missing.');
    }
    
    setSmsText('');
    setTimeout(() => {
      setIsSmsParsed(false);
      setSmsStatus('');
    }, 4000);
  };

  // PWA Web Share Target Interceptor
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get('share_text');
    if (sharedText) {
      setSmsText(sharedText);
      // Clean URL immediately
      window.history.replaceState(null, '', window.location.pathname);
      // Auto-trigger parse
      handleSmsParse(sharedText);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Robustly clean the amount to keep only numbers and decimals, stripping commas/symbols
    const cleanAmountStr = amount.replace(/[^\d.]/g, '');
    const parsedAmount = parseFloat(cleanAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive decimal amount.');
      return;
    }
    if (!category) {
      alert('Please select a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onEditTransaction(editingId, {
          type,
          category,
          amount: parsedAmount,
          date,
          notes: notes.trim() || undefined,
          bankAccountId: bankAccountId || undefined
        });
        setEditingId(null);
      } else {
        await onAddTransaction({
          type,
          category,
          amount: parsedAmount,
          date,
          notes: notes.trim() || undefined,
          bankAccountId: bankAccountId || undefined
        });
      }
      setIsFormOpen(false);
      setAmount('');
      setNotes('');
      setBankAccountId('');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setCategory(EXPENSE_CATEGORIES[0]);
    } catch (err) {
      console.error(err);
      alert('Error updating transaction in cloud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setType(t.type);
    setCategory(t.category);
    setAmount(t.amount.toString());
    setDate(t.date);
    setNotes(t.notes || '');
    setBankAccountId(t.bankAccountId || '');
    setIsFormOpen(true);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterStartDate && t.date < filterStartDate) return false;
      if (filterEndDate && t.date > filterEndDate) return false;

      if (search.trim()) {
        const keyword = search.toLowerCase();
        const categoryMatch = t.category.toLowerCase().includes(keyword);
        const notesMatch = t.notes?.toLowerCase().includes(keyword) || false;
        if (!categoryMatch && !notesMatch) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterType, filterCategory, filterStartDate, filterEndDate, search]);

  return (
    <div className="space-y-3" id="transaction-tab">

      {/* Bank Profiles Hub */}
      {onAddBankAccount && onEditBankAccount && onDeleteBankAccount && (
        <BankProfiles 
          bankAccounts={bankAccounts}
          transactions={transactions}
          onAddBankAccount={onAddBankAccount}
          onEditBankAccount={onEditBankAccount}
          onDeleteBankAccount={onDeleteBankAccount}
        />
      )}
      
      {/* Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/85">
        <div>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-sans">Indian ledger flow</h2>
          <p className="text-xl font-black text-slate-900 tracking-tight font-sans mt-0.5 flex items-center">
            Transactions Ledger
            <InfoTooltip text="Log expenditures, salary, dividend rollups and other Indian financial trades." />
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            id="import-csv-button"
            onClick={() => setIsCsvWizardOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-1.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all border border-slate-200"
          >
            <UploadCloud size={14} /> Bulk Import
          </button>
          <button
            id="new-transaction-button"
            onClick={() => {
              setEditingId(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-1.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all shadow-xs"
          >
            <Plus size={14} /> Log Entry
          </button>
        </div>
      </div>

      {/* SMS Parser Card Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 shadow-xs text-xs space-y-1">
        <div className="flex items-center gap-1">
          <Sparkles size={15} className="text-indigo-600 animate-pulse" />
          <h4 className="font-extrabold text-slate-800 text-xs font-display">Indian Bank SMS Parser Tool</h4>
        </div>
        <p className="text-[10px] text-slate-400">
          Paste a bank debit/credit message (HDFC, SBI, Axis, Paytm, GPay) below to instantly parse transaction value.
        </p>

        <div className="flex gap-1.5">
          <input 
            type="text" 
            placeholder="e.g. HDFC Bank: Your A/c debited Rs. 500.00 for SWIGGY food orders on 2026-06-11..." 
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
          />
          <button 
            type="button" 
            onClick={handleSmsParse}
            className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Clipboard size={12} /> Parse
          </button>
        </div>

        {smsStatus && (
          <p className="text-[10px] font-bold text-indigo-700 bg-indigo-50/50 p-1 rounded-lg animate-pulse">{smsStatus}</p>
        )}
      </div>

      {/* Transaction Entry Form Panel */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-2xl border border-slate-150 shadow-sm"
          >
            <form onSubmit={handleSubmit} className="p-2 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-800 font-sans text-xs uppercase tracking-wider">
                  {editingId ? 'Edit Transaction Details' : 'Record New Income/Expense Log'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Flow Direction</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('expense')}
                      className={`py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${type === 'expense' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Expense (Debit)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('income')}
                      className={`py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${type === 'income' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Income (Credit)
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Sum (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden"
                  >
                    {type === 'expense' 
                      ? EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                    }
                  </select>
                </div>

                {/* Bank Account */}
                {bankAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Bank Account</label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden font-mono"
                    >
                      <option value="">-- No Bank (Cash/Other) --</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountName} (₹{b.currentBalance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Date stamp</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                  />
                </div>

              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Narrative Description</label>
                <input
                  type="text"
                  placeholder="e.g., Zerodha brokerage charges, grocery, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-1 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-1.5 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? 'Syncing...' : editingId ? 'Update Log' : 'Save Log'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Wizard Modal */}
      <AnimatePresence>
        {isCsvWizardOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCsvWizardOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl px-4"
            >
              <CsvImportWizard 
                onAddTransaction={onAddTransaction} 
                bankAccounts={bankAccounts}
                onClose={() => setIsCsvWizardOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white p-2 rounded-2xl border border-slate-150 shadow-sm" id="transaction-filters-panel">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <Filter size={12} className="text-slate-400" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Filters & Queries</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5">
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-slate-400"><Search size={12} /></span>
              <input
                type="text"
                placeholder="Search descriptions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-sans"
              />
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden"
              >
                <option value="all">All Directions</option>
                <option value="income">Credits (Income)</option>
                <option value="expense">Debits (Expenses)</option>
              </select>
            </div>

            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 min-w-[20px]">From</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-1 py-1 text-xs border border-slate-200 bg-white rounded-lg font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 min-w-[20px]">To</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-1 py-1 text-xs border border-slate-200 bg-white rounded-lg font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table logs */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden" id="transactions-list-panel">
        <div className="px-2 py-1.5 border-b border-slate-150 flex justify-between items-center bg-slate-50/45">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Active Journals ({filteredTransactions.length})</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-6 text-center text-slate-450 bg-white text-xs">No records found.</div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 text-[9px] font-bold text-slate-450 uppercase tracking-wider border-b border-slate-100">
                  <th className="p-2 px-2">Type</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2 font-mono">Date</th>
                  <th className="p-2">Description notes</th>
                  <th className="p-2 text-right">Delete/Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-750 font-sans">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/30">
                    <td className="p-2 px-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${t.type === 'income' ? 'bg-emerald-55 text-emerald-800' : 'bg-slate-100 text-slate-705'}`}>
                        {t.type === 'income' ? 'CREDIT' : 'DEBIT'}
                      </span>
                    </td>
                    <td className="p-2 font-extrabold text-slate-800">{t.category}</td>
                    <td className="p-2 font-bold font-mono text-[11px]">₹{t.amount.toLocaleString()}</td>
                    <td className="p-2 text-slate-400 font-mono">{t.date}</td>
                    <td className="p-2 text-slate-450 max-w-xs truncate" title={t.notes || ''}>{t.notes || <span className="text-slate-300 italic">None</span>}</td>
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-1.5 text-slate-400">
                        <button onClick={() => startEdit(t)} className="p-1 hover:text-slate-900 rounded cursor-pointer"><Edit2 size={11} /></button>
                        <button onClick={() => onDeleteTransaction(t.id)} className="p-1 hover:text-red-650 rounded cursor-pointer"><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
