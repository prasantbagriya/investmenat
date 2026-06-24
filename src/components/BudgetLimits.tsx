import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  X, 
  Calendar, 
  Info, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Percent
} from 'lucide-react';
import { BudgetLimit, Transaction, EXPENSE_CATEGORIES } from '../types';

interface BudgetLimitsProps {
  budgetLimits: BudgetLimit[];
  transactions: Transaction[];
  onAddLimit: (b: Omit<BudgetLimit, 'id' | 'userId'>) => Promise<void>;
  onDeleteLimit: (id: string) => Promise<void>;
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

export default function BudgetLimits({
  budgetLimits,
  transactions,
  onAddLimit,
  onDeleteLimit,
  selectedMonth,
  onMonthChange
}: BudgetLimitsProps) {

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [limitAmount, setLimitAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month human label (e.g. YYYY-MM -> June 2026)
  const monthName = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Aggregate expenditures of transactions in the selected month
  const monthlyExpensesByCategory = useMemo(() => {
    const map: { [key: string]: number } = {};
    transactions
      .filter(t => t.type === 'expense' && t.date.substring(0, 7) === selectedMonth)
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return map;
  }, [transactions, selectedMonth]);

  // Budget Limits configured for THIS specific month
  const currentLimits = useMemo(() => {
    return budgetLimits.filter(b => b.month === selectedMonth);
  }, [budgetLimits, selectedMonth]);

  // Merge limits with spent info for live tracking
  const mergedBudgets = useMemo(() => {
    return currentLimits.map(limit => {
      const spent = monthlyExpensesByCategory[limit.category] || 0;
      const pct = limit.limitAmount > 0 ? (spent / limit.limitAmount) * 100 : 0;
      
      let status: 'green' | 'orange' | 'red' = 'green';
      if (pct >= 100) {
        status = 'red';
      } else if (pct >= 80) {
        status = 'orange';
      }

      return {
        ...limit,
        spent,
        pct,
        status
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [currentLimits, monthlyExpensesByCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitVal = parseFloat(limitAmount);

    if (isNaN(limitVal) || limitVal <= 0) {
      alert('Please enter a valid positive budget limit amount.');
      return;
    }

    // Check if category limit is already defined for this month
    const existing = currentLimits.some(l => l.category === category);
    if (existing) {
      alert(`A budget limit for '${category}' is already defined for ${selectedMonth}. Please delete that first to replace it.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddLimit({
        category,
        limitAmount: limitVal,
        month: selectedMonth
      });
      setIsFormOpen(false);
      setLimitAmount('');
    } catch (err) {
      console.error(err);
      alert('Error creating category limit budget. Check Firestore Rules.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Month slider navigator
  const adjustMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-');
    let py = parseInt(year);
    let pm = parseInt(month);

    if (direction === 'prev') {
      pm -= 1;
      if (pm < 1) {
        pm = 12;
        py -= 1;
      }
    } else {
      pm += 1;
      if (pm > 12) {
        pm = 1;
        py += 1;
      }
    }

    onMonthChange(`${py}-${String(pm).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-3" id="budgets-tab">
      
      {/* Navigator headers */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80 animate-fade-in">
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Monthly Budgets</h2>
          <p className="text-xl font-bold text-slate-900 tracking-tight font-sans mt-0.5">Category Allocations</p>
          <p className="text-xs text-slate-500 mt-1 font-sans">Current parameter: <span className="font-semibold text-slate-950">{monthName}</span></p>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => adjustMonth('prev')}
            className="px-1 py-1.5 text-xs font-semibold text-slate-650 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-md transition-colors border border-slate-200 cursor-pointer"
          >
            ← Previous
          </button>
          
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white px-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer"
            id="new-limit-button"
          >
            <Plus size={14} /> Allocate limit
          </button>

          <button 
            onClick={() => adjustMonth('next')}
            className="px-1 py-1.5 text-xs font-semibold text-slate-650 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-md transition-colors border border-slate-200 cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Slide down Allocate Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-xs"
            id="budgets-form-panel"
          >
            <form onSubmit={handleSubmit} className="p-2 space-y-2" id="limit-form">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-900 font-sans text-xs uppercase tracking-wider">
                  Allocate Budget Limit ({monthName})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                
                {/* Category Selection restriction to Expense categories only */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs font-medium border border-slate-250 bg-white rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-950/20 transition-all font-sans"
                    id="form-limit-category"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Limit Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Spending Limit (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-450 text-xs font-medium font-sans">₹</span>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="e.g. 500"
                      value={limitAmount}
                      onChange={(e) => setLimitAmount(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-sans"
                      id="form-limit-amount"
                    />
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
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
                  id="form-limit-submit"
                >
                  {isSubmitting ? 'Syncing...' : 'Establish Limit'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid displays */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden" id="budgets-details-container">
        <div className="px-2 py-1.5 flex border-b border-slate-200/50 justify-between items-center bg-slate-50/40">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Allocated spending caps ({mergedBudgets.length})</span>
        </div>

        {mergedBudgets.length === 0 ? (
          <div className="p-6 text-center text-slate-500/80 bg-white" id="no-limits-banner">
            <p className="text-xs">No active spending limits assigned for {monthName}. Use the button above to add limits.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mergedBudgets.map((b) => {
              const pillStyle = b.status === 'red' ? 'text-red-700 bg-red-50' : b.status === 'orange' ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-slate-50/80';
              const barColor = b.status === 'red' ? 'bg-red-500' : b.status === 'orange' ? 'bg-amber-400' : 'bg-slate-950';
              
              return (
                <div key={b.id} className="p-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  
                  {/* Category description */}
                  <div className="md:w-1/3 space-y-1">
                    <p className="font-bold text-slate-900 font-sans text-sm">{b.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${pillStyle}`}>
                        {b.status === 'red' ? 'Exceeded' : b.status === 'orange' ? 'Warning 80%+' : 'Within Limit'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Limit: {b.id.substring(0,6)}</span>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="md:w-1/2 w-full space-y-1">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-baseline gap-1 font-mono text-[11px]">
                        <span className="text-xs font-bold text-slate-900">₹{b.spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="text-slate-500"> of ₹{b.limitAmount.toLocaleString('en-IN')} Spend Cap</span>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-700">{b.pct.toFixed(0)}% Used</span>
                    </div>

                    <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(b.pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Absolute limit deletion */}
                  <div className="flex justify-end self-end md:self-auto pl-2">
                    <button
                      onClick={() => {
                        if (confirm(`Abolish limit budget parameters for '${b.category}' for the month ${selectedMonth}? This is irreversible.`)) {
                          onDeleteLimit(b.id).catch(console.error);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-650 hover:bg-neutral-50 rounded transition-colors cursor-pointer"
                      title="Deallocate budget limit"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
