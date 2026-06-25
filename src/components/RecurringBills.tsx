import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Calendar, AlertCircle, CheckCircle, Repeat, Sparkles, Mail } from 'lucide-react';
import { RecurringBill, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import { proxyFetch } from '../utils/proxyFetch';

interface RecurringBillsProps {
  recurringBills: RecurringBill[];
  onAddBill: (b: Omit<RecurringBill, 'id' | 'userId'>) => Promise<void>;
  onEditBill: (id: string, b: Partial<RecurringBill>) => Promise<void>;
  onDeleteBill: (id: string) => Promise<void>;
}

export default function RecurringBills({
  recurringBills,
  onAddBill,
  onEditBill,
  onDeleteBill
}: RecurringBillsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [isParsingEmail, setIsParsingEmail] = useState(false);

  // Handle type switch to reset category
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive decimal amount.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title for the bill.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onEditBill(editingId, {
          type,
          title: title.trim(),
          amount: parsedAmount,
          category,
          nextDueDate,
          frequency
        });
        setEditingId(null);
      } else {
        await onAddBill({
          type,
          title: title.trim(),
          amount: parsedAmount,
          category,
          nextDueDate,
          frequency
        });
      }
      setIsFormOpen(false);
      setTitle('');
      setAmount('');
      setNextDueDate(todayStr);
      setFrequency('monthly');
    } catch (err: any) {
      console.error(err);
      alert('Error saving recurring bill: ' + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (b: RecurringBill) => {
    setEditingId(b.id);
    setType(b.type || 'expense');
    setTitle(b.title);
    setAmount(b.amount.toString());
    setCategory(b.category);
    setNextDueDate(b.nextDueDate);
    setFrequency(b.frequency);
    setIsFormOpen(true);
  };

  const handleParseEmail = async () => {
    if (!emailText.trim()) return;
    setIsParsingEmail(true);
    try {
      const response = await proxyFetch('/api/parse-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSnippets: emailText })
      });
      if (!response.ok) throw new Error('Failed to parse subscriptions');
      const data = await response.json();
      const subs = JSON.parse(data.result);
      if (Array.isArray(subs) && subs.length > 0) {
        for (const sub of subs) {
          if (sub.name && sub.amount) {
            await onAddBill({
              title: sub.name,
              amount: parseFloat(sub.amount),
              category: sub.category || 'Others',
              frequency: 'monthly',
              nextDueDate: sub.dueDate || todayStr,
              type: 'expense'
            });
          }
        }
        setEmailText('');
        alert(`Successfully added ${subs.length} subscription(s)!`);
      } else {
        alert('No subscriptions found in the text.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error parsing email snippets: ' + (err.message || String(err)));
    } finally {
      setIsParsingEmail(false);
    }
  };

  const dueThisMonth = useMemo(() => {
    return recurringBills.filter(b => (b.nextDueDate || '').startsWith(currentMonthPrefix));
  }, [recurringBills, currentMonthPrefix]);

  const otherBills = useMemo(() => {
    return recurringBills.filter(b => !(b.nextDueDate || '').startsWith(currentMonthPrefix));
  }, [recurringBills, currentMonthPrefix]);

  return (
    <div className="space-y-3" id="recurring-bills-tab">
      {/* Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Automated Alerts</h2>
          <p className="text-xl font-bold text-slate-900 tracking-tight font-sans mt-0.5">Auto-Bills & Salary</p>
          <p className="text-xs text-slate-450 mt-1 font-sans font-medium">Track your recurring income and expenses.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setType('expense');
            setCategory(EXPENSE_CATEGORIES[0]);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white px-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer"
        >
          <Plus size={14} /> Add Bill
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-xs"
          >
            <form onSubmit={handleSubmit} className="p-2 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-900 font-sans text-xs uppercase tracking-wider">
                  {editingId ? 'Edit Configuration' : 'Configure New Record'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1.5 md:col-span-4 mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Flow Direction</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('expense')}
                      className={`py-1 text-xs font-semibold rounded cursor-pointer transition-all ${type === 'expense' ? 'bg-slate-950 text-white' : 'text-slate-650 hover:bg-slate-100'}`}
                    >
                      Expense (Bill)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('income')}
                      className={`py-1 text-xs font-semibold rounded cursor-pointer transition-all ${type === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-650 hover:bg-slate-100'}`}
                    >
                      Income (Salary)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Title / Name</label>
                  <input
                    type="text"
                    required
                    placeholder={type === 'income' ? "e.g. Salary, Rent Received..." : "e.g. Netflix, Electricity..."}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-none bg-white font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-450 text-xs font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-none bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-250 bg-white rounded-md focus:outline-none"
                  >
                    {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')}
                    className="w-full px-1 py-1.5 text-xs border border-slate-250 bg-white rounded-md focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Next Due Date</label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-none bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-1 border-t border-slate-100 pt-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-1 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded text-xs transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Subscription Scanner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-xs text-xs space-y-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-600 animate-pulse" />
          <h4 className="font-bold text-slate-800 text-xs font-sans uppercase tracking-widest">AI Subscriptions Scanner</h4>
        </div>
        <p className="text-[10px] text-slate-500">
          Paste promotional emails or invoices mentioning subscriptions (Netflix, AWS, Spotify). Our AI will automatically add them to your Auto-Bills.
        </p>
        <div className="flex flex-col gap-1.5">
          <textarea 
            placeholder="Paste email snippet here..." 
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 h-16 resize-none"
          />
          <div className="flex justify-end">
            <button 
              type="button" 
              onClick={handleParseEmail}
              disabled={isParsingEmail || !emailText.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isParsingEmail ? (
                <> <Sparkles size={12} className="animate-spin" /> Analyzing... </>
              ) : (
                <> <Mail size={12} /> Extract Subscriptions </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Due This Month Section */}
      <div className="bg-orange-50 rounded-xl border border-orange-200/80 shadow-xs overflow-hidden">
        <div className="px-2 py-1.5 flex items-center gap-1.5 bg-orange-100/50 border-b border-orange-200">
          <AlertCircle size={14} className="text-orange-600" />
          <span className="text-[11px] font-bold text-orange-800 uppercase tracking-widest font-sans">Due This Month ({dueThisMonth.length})</span>
        </div>
        
        {dueThisMonth.length === 0 ? (
          <div className="p-4 text-center text-orange-600/70 text-xs">No bills left for this month.</div>
        ) : (
          <div className="divide-y divide-orange-100">
            {dueThisMonth.sort((a,b) => (a.nextDueDate || '').localeCompare(b.nextDueDate || '')).map((b) => {
               const isOverdue = (b.nextDueDate || '') < todayStr;
               const isToday = b.nextDueDate === todayStr;
               return (
                <div key={b.id} className={`p-2 flex justify-between items-center ${isOverdue ? 'bg-red-50/50' : ''}`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 text-sm">{b.title}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded uppercase tracking-wider font-bold bg-slate-200 text-slate-700">{b.frequency}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs font-mono font-bold ${(!b.type || b.type === 'expense') ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {(!b.type || b.type === 'expense') ? '-' : '+'}₹{b.amount.toLocaleString()}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={`text-xs font-mono flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : isToday ? 'text-orange-600 font-bold' : 'text-slate-700'}`}>
                        <Calendar size={11} /> {b.nextDueDate}
                        {isOverdue && ' (Overdue)'}
                        {isToday && ' (Today)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 border-l border-orange-200 pl-2">
                    <button onClick={() => startEdit(b)} className="p-1 text-slate-500 hover:text-slate-900 rounded"><Edit2 size={12} /></button>
                    <button onClick={() => { if(confirm('Delete bill?')) onDeleteBill(b.id); }} className="p-1 text-slate-500 hover:text-red-600 rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>

      {/* Future / Other Bills Section */}
      {otherBills.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden mt-3">
          <div className="px-2 py-1.5 flex items-center gap-1.5 bg-slate-50/50 border-b border-slate-200">
            <Repeat size={14} className="text-slate-700" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest font-sans">Future / Other Bills ({otherBills.length})</span>
          </div>
          <div className="divide-y divide-slate-100">
            {otherBills.sort((a,b) => (a.nextDueDate || '').localeCompare(b.nextDueDate || '')).map((b) => (
              <div key={b.id} className="p-2 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-sm">{b.title}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded uppercase tracking-wider font-bold bg-slate-100 text-slate-700">{b.frequency}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs font-mono font-bold ${(!b.type || b.type === 'expense') ? 'text-slate-700' : 'text-emerald-600/80'}`}>
                      {(!b.type || b.type === 'expense') ? '-' : '+'}₹{b.amount.toLocaleString()}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <Calendar size={11} /> {b.nextDueDate}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 border-l border-slate-100 pl-2">
                  <button onClick={() => startEdit(b)} className="p-1 text-slate-300 hover:text-slate-700 rounded"><Edit2 size={12} /></button>
                  <button onClick={() => { if(confirm('Delete bill?')) onDeleteBill(b.id); }} className="p-1 text-slate-300 hover:text-red-500 rounded"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
