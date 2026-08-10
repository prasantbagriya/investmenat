import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Trash2, Edit2, X, Filter, Sparkles, Clipboard, CheckCircle, MessageSquare, Camera, Lock,
  Building2, Users, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES, PendingPayment, RecurringBill } from '../types';
import { parseBankSMS } from '../utils/financeHelpers';
import { proxyFetch } from '../utils/proxyFetch';
import { isEntryLocked } from '../utils/dateUtils';
import InfoTooltip from './InfoTooltip';
import toast from 'react-hot-toast';

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

  const navigate = useNavigate();
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCsvWizardOpen, setIsCsvWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'cash_withdrawal'>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [toBankAccountId, setToBankAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SMS & Receipt Parser state
  const [smsText, setSmsText] = useState('');
  const [isSmsParsed, setIsSmsParsed] = useState(false);
  const [smsStatus, setSmsStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter and Search States
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBankAccountId, setFilterBankAccountId] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSmsParserOpen, setIsSmsParserOpen] = useState(false);

  const handleTypeChange = (newType: 'income' | 'expense' | 'transfer' | 'cash_withdrawal') => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else if (newType === 'expense') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else {
      setCategory('Transfer');
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
      setIsScanning(false);
    }, 4000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSmsText(text);
      }
    } catch (err) {
      console.error("Failed to read clipboard", err);
      toast.error("Clipboard access denied or failed");
    }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setSmsStatus('📷 Scanning receipt with AI...');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await proxyFetch('/api/parse-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image: base64Data })
          });
          
          if (!response.ok) throw new Error('Receipt parsing failed');
          
          const parsed = await response.json();
          let data;
          try {
            data = JSON.parse(parsed.result);
          } catch (e) {
            data = {};
          }
          
          if (data.amount) {
            setAmount(data.amount.toString());
            setType('expense');
            if (data.category && EXPENSE_CATEGORIES.includes(data.category)) {
              setCategory(data.category);
            } else {
              setCategory('Others');
            }
            if (data.date) setDate(data.date);
            if (data.note) setNotes(data.note);
            
            setSmsStatus(`✔ Successfully extracted ₹${data.amount} from receipt!`);
            setIsFormOpen(true);
          } else {
            setSmsStatus('❌ Could not parse amount from this receipt.');
          }
        } catch (err) {
          console.error(err);
          setSmsStatus('❌ AI Receipt Parsing error.');
        } finally {
          setIsScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setTimeout(() => setSmsStatus(''), 4000);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      setSmsStatus('❌ Error reading file.');
    }
  };

  // PWA Web Share Target Interceptor
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get('share_text');
    if (sharedText) {
      setSmsText(sharedText);
      // Clean URL search params immediately but PRESERVE the hash for HashRouter!
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      // Auto-trigger parse
      handleSmsParse(sharedText);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    // Robustly clean the amount to keep only numbers and decimals, stripping commas/symbols
    const cleanAmountStr = amount.replace(/[^\d.]/g, '');
    const parsedAmount = parseFloat(cleanAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive decimal amount.');
      return;
    }
    if (!category) {
      toast.error('Please select a category.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onEditTransaction(editingId, {
          type,
          category: type === 'transfer' || type === 'cash_withdrawal' ? 'Transfer' : category,
          amount: parsedAmount,
          date,
          notes: notes.trim() || undefined,
          bankAccountId: bankAccountId || undefined,
          toBankAccountId: (type === 'transfer' && toBankAccountId) ? toBankAccountId : undefined
        });
        setEditingId(null);
      } else {
        await onAddTransaction({
          type,
          category: type === 'transfer' || type === 'cash_withdrawal' ? 'Transfer' : category,
          amount: parsedAmount,
          date,
          notes: notes.trim() || undefined,
          bankAccountId: bankAccountId || undefined,
          toBankAccountId: (type === 'transfer' && toBankAccountId) ? toBankAccountId : undefined
        });
      }
      setIsFormOpen(false);
      setAmount('');
      setNotes('');
      setBankAccountId('');
      setToBankAccountId('');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setCategory(EXPENSE_CATEGORIES[0]);
      toast.success(editingId ? 'Log updated successfully!' : 'Log saved successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error updating transaction in cloud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    // 'refund' is system-generated and not manually editable — treat as expense in the edit form
    setType(t.type === 'refund' ? 'expense' : t.type);
    setCategory(t.category);
    setAmount(t.amount.toString());
    setDate(t.date);
    setNotes(t.notes || '');
    setBankAccountId(t.bankAccountId || '');
    setToBankAccountId(t.toBankAccountId || '');
    setIsFormOpen(true);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterBankAccountId !== 'all' && t.bankAccountId !== filterBankAccountId) return false;
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
  }, [transactions, filterType, filterCategory, filterBankAccountId, filterStartDate, filterEndDate, search]);

  const hasFiltersApplied = filterType !== 'all' || filterCategory !== 'all' || filterBankAccountId !== 'all' || filterStartDate !== '' || filterEndDate !== '' || search.trim() !== '';
  const displayedTransactions = hasFiltersApplied ? filteredTransactions : filteredTransactions.slice(0, 10);

  return (
    <div className="space-y-3" id="transaction-tab">

      {/* Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-3 px-1 mb-2">
        <div className="flex flex-col">
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            Transactions Ledger
            <InfoTooltip text="Log expenditures, salary, dividend rollups and other Indian financial trades." />
          </p>

        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-hide">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleReceiptScan}
            disabled={isScanning}
          />
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-indigo-100 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-indigo-700 font-bold text-xs hover:bg-white hover:shadow-sm cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Camera size={14} className={isScanning ? "animate-pulse" : ""} /> Scan Receipt
            </button>
            <div className="w-[1px] h-4 bg-slate-200 mx-0.5"></div>
            <button
              type="button"
              onClick={() => setIsSmsParserOpen(!isSmsParserOpen)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs cursor-pointer transition-all whitespace-nowrap ${isSmsParserOpen ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-indigo-700'}`}
            >
              <MessageSquare size={14} /> Paste SMS
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all shadow-sm whitespace-nowrap shrink-0"
          >
            <Plus size={14} /> Add Log
          </button>
          <button
            type="button"
            id="import-csv-button"
            onClick={() => setIsCsvWizardOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all border border-slate-200 whitespace-nowrap shrink-0"
          >
            <UploadCloud size={14} /> Bulk
          </button>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all border whitespace-nowrap shrink-0 ${isFiltersOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
          >
            <Filter size={14} className={isFiltersOpen ? "text-indigo-600" : "text-slate-500"} /> 
            Filters
          </button>
        </div>
      </div>

      {/* SMS Parser Card Box */}
      <AnimatePresence>
        {isSmsParserOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white p-2 rounded-lg border border-slate-150 shadow-sm mb-3"
          >
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600 animate-pulse" />
                  <span className="font-bold text-slate-800 text-xs ">Indian Bank SMS Parser</span>
                </div>
                <button onClick={() => setIsSmsParserOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium -mt-1">
                Paste a bank debit/credit message (HDFC, SBI, Axis, Paytm, GPay) below to instantly parse transaction value.
              </p>

              <div className="flex gap-1.5 pt-1">
                <input 
                  type="text" 
                  placeholder="e.g. HDFC Bank: Your A/c debited Rs. 500.00 for SWIGGY food orders on 2026-06-11..." 
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="flex-1 bg-slate-50/50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSmsParse();
                  }}
                />
                <button 
                  onClick={() => handleSmsParse()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Sparkles size={12} /> Parse
                </button>
                <button 
                  onClick={handlePaste}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-2 py-1.5 rounded-lg font-bold border border-slate-200 transition-colors shadow-sm cursor-pointer flex items-center justify-center"
                  title="Paste from clipboard"
                >
                  <Clipboard size={14} />
                </button>
              </div>
              
              {smsStatus && (
                <div className={`mt-1 text-xs font-bold ${smsStatus.includes('❌') ? 'text-red-600' : 'text-emerald-600'}`}>
                  {smsStatus}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Entry Form Panel */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-lg border border-slate-150 shadow-sm"
          >
            <form onSubmit={handleSubmit} className="p-2 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-800 text-xs capitalize ">
                  {editingId ? 'Edit Transaction Details' : 'Record New Income/Expense Log'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 capitalize block ">Flow Direction</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('expense')}
                      className={`py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${type === 'expense' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('income')}
                      className={`py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${type === 'income' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Income
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('transfer')}
                      className={`py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${type === 'transfer' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('cash_withdrawal')}
                      className={`py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${type === 'cash_withdrawal' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Cash W/D
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 capitalize block ">Sum (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 text-xs font-semibold">₹</span>
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
                  <label className="text-xs font-bold text-slate-500 capitalize block ">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={type === 'transfer' || type === 'cash_withdrawal'}
                    className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden"
                  >
                    {type === 'expense' 
                      ? EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : type === 'income' ? INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : <option value="Transfer">Transfer / Withdrawal</option>
                    }
                  </select>
                </div>

                {/* Bank Account */}
                {bankAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 capitalize block ">
                      {type === 'income' ? 'To Bank Account' : type === 'expense' || type === 'cash_withdrawal' ? 'From Bank Account' : 'From Bank Account'}
                    </label>
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

                {/* To Bank Account (For Transfers Only) */}
                {type === 'transfer' && bankAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 capitalize block ">
                      To Bank Account
                    </label>
                    <select
                      value={toBankAccountId}
                      onChange={(e) => setToBankAccountId(e.target.value)}
                      className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden font-mono"
                    >
                      <option value="">-- Select Bank Account --</option>
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
                  <label className="text-xs font-bold text-slate-500 capitalize block ">Date stamp</label>
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
                <label className="text-xs font-bold text-slate-500 capitalize block ">Narrative Description</label>
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
                  className="px-1.5 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs"
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

      {/* Filters (Options Panel) */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white p-2 rounded-lg border border-slate-150 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <span className="font-bold text-slate-800 text-xs ">Active Filters</span>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                {filteredTransactions.length} results found
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-500"><Search size={12} /></span>
                    <input
                      type="text"
                      placeholder="Search descriptions..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Categories</option>
                      {ALL_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={filterBankAccountId}
                      onChange={(e) => setFilterBankAccountId(e.target.value)}
                      className="w-full px-1 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-hidden font-mono truncate focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">All Bank Accounts</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs capitalize font-bold text-slate-500 min-w-[20px]">From</span>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-1 py-1 text-xs border border-slate-200 bg-white rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs capitalize font-bold text-slate-500 min-w-[20px]">To</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-1 py-1 text-xs border border-slate-200 bg-white rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ledger Table logs */}
      <div className="bg-white rounded-lg border border-slate-150 shadow-sm overflow-hidden" id="transactions-list-panel">
        <div className="px-2 py-1.5 border-b border-slate-150 flex justify-between items-center bg-slate-50/45">
          <span className="text-xs font-bold text-slate-700 capitalize">
            Active Journals ({displayedTransactions.length}{!hasFiltersApplied && filteredTransactions.length > 10 ? ` of ${filteredTransactions.length}` : ''})
          </span>
        </div>

        {displayedTransactions.length === 0 ? (
          <div className="p-6 text-center text-slate-450 bg-white text-xs">No records found.</div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20 text-xs font-bold text-slate-450 capitalize border-b border-slate-100">
                  <th className="p-2 px-2">Type</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2 font-mono">Date</th>
                  <th className="p-2">Description notes</th>
                  <th className="p-2 text-right">Delete/Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-750 ">
                {displayedTransactions.map((t) => {
                  const locked = isEntryLocked(t.date);
                  return (
                  <tr key={t.id} className="hover:bg-slate-50/30">
                    <td className="p-2 px-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${t.type === 'income' ? 'bg-emerald-100 text-emerald-800' : t.type === 'refund' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}`}>
                        {t.type === 'income' ? 'CREDIT' : t.type === 'refund' ? 'REFUND' : 'DEBIT'}
                      </span>
                    </td>
                    <td className="p-2 font-extrabold text-slate-800">{t.category}</td>
                    <td className="p-2 font-bold font-mono text-xs">₹{t.amount.toLocaleString()}</td>
                    <td className="p-2 text-slate-500 font-mono">{t.date}</td>
                    <td className="p-2 text-slate-450 max-w-xs truncate" title={t.notes || ''}>{t.notes || <span className="text-slate-300 italic">None</span>}</td>
                    <td className="p-2 text-right">
                      {locked ? (
                        <div className="flex justify-end gap-1.5 text-slate-300" title="Locked (older than 30 days)">
                          <Lock size={12} className="m-1" />
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5 text-slate-500">
                          <button onClick={() => startEdit(t)} className="p-1 hover:text-slate-900 rounded cursor-pointer"><Edit2 size={11} /></button>
                          <button onClick={() => onDeleteTransaction(t.id)} className="p-1 hover:text-red-650 rounded cursor-pointer"><Trash2 size={11} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
