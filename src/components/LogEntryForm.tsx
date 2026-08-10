import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import toast from 'react-hot-toast';

interface LogEntryFormProps {
  onAddTransaction?: (tx: any) => Promise<void>;
  bankAccounts?: any[];
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
}

export default function LogEntryForm({ onAddTransaction, bankAccounts = [], isFormOpen, setIsFormOpen }: LogEntryFormProps) {
  const [type, setType] = useState<'income' | 'expense' | 'transfer' | 'cash_withdrawal'>('expense');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [toBankAccountId, setToBankAccountId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
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

    if (!onAddTransaction) {
      toast.error('Transaction logging is unavailable.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        type,
        category: type === 'transfer' || type === 'cash_withdrawal' ? 'Transfer' : category,
        amount: parsedAmount,
        date,
        notes: notes.trim() || undefined,
        bankAccountId: bankAccountId || undefined,
        toBankAccountId: (type === 'transfer' && toBankAccountId) ? toBankAccountId : undefined
      });
      setIsFormOpen(false);
      setAmount('');
      setNotes('');
      setBankAccountId('');
      setToBankAccountId('');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setCategory(EXPENSE_CATEGORIES[0]);
      toast.success('Log saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Error saving transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-sm mb-3"
          >
            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-800 text-xs capitalize ">
                  Record New Income/Expense Log
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 capitalize block ">Flow Direction</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-0.5 rounded-lg">
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
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 capitalize block ">Asset Category</label>
                  <input
                    list="log-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={type === 'transfer' || type === 'cash_withdrawal'}
                    placeholder="Select or type new category"
                    className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all "
                  />
                  <datalist id="log-categories">
                    {type === 'expense' 
                      ? EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : type === 'income' ? INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : <option value="Transfer">Transfer / Withdrawal</option>
                    }
                  </datalist>
                </div>

                {/* Bank Account */}
                {bankAccounts && bankAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 capitalize block ">
                      {type === 'income' ? 'To Bank Account' : 'From Bank Account'}
                    </label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
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
                {type === 'transfer' && bankAccounts && bankAccounts.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 capitalize block ">
                      To Bank Account
                    </label>
                    <select
                      value={toBankAccountId}
                      onChange={(e) => setToBankAccountId(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
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
                    className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 capitalize block ">Narrative Description</label>
                <input
                  type="text"
                  placeholder="e.g., specific notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all "
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs rounded transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? 'Syncing...' : 'Save Log'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
