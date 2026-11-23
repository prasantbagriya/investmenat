import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Calendar, AlertTriangle, ChevronLeft, ChevronRight,
  Sparkles, Wallet, PiggyBank, ArrowUpRight, Coins
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { Transaction, PendingPayment, SavingsGoal, BudgetLimit, Holding, Sip, Fd, CreditCardBill, EmiItem, PhysicalAsset } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  pendingPayments: PendingPayment[];
  savingsGoals: SavingsGoal[];
  budgetLimits: BudgetLimit[];
  holdings: Holding[];
  sips: Sip[];
  fds: Fd[];
  ccBills?: CreditCardBill[];
  ccEmis?: EmiItem[];
  physicalAssets?: PhysicalAsset[];
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onNavigateToTab: (tab: string) => void;
  livePrices?: Record<string, { currentPrice: number; dayChange: number; name: string }>;
  userId?: string; // For user-scoped localStorage keys
}

export default function Dashboard({
  transactions,
  pendingPayments,
  savingsGoals,
  budgetLimits,
  holdings,
  sips,
  fds,
  ccBills = [],
  ccEmis = [],
  physicalAssets = [],
  selectedMonth,
  onMonthChange,
  onNavigateToTab,
  livePrices = {},
  userId = 'default'
}: DashboardProps) {
  const lsPrefix = `dashboard_${userId}`;
  const [manualSavings, setManualSavings] = useState(() => Number(localStorage.getItem(`${lsPrefix}_manualSavings`) || 0));
  const [manualGold, setManualGold] = useState(() => Number(localStorage.getItem(`${lsPrefix}_manualGold`) || 0));
  const [manualProperty, setManualProperty] = useState(() => Number(localStorage.getItem(`${lsPrefix}_manualProperty`) || 0));
  const [manualCarLoan, setManualCarLoan] = useState(() => Number(localStorage.getItem(`${lsPrefix}_manualCarLoan`) || 0));
  const [manualHomeLoan, setManualHomeLoan] = useState(() => Number(localStorage.getItem(`${lsPrefix}_manualHomeLoan`) || 0));
  const [showPreferences, setShowPreferences] = useState(false);

  const saveAndSetSavings = (val: number) => {
    setManualSavings(val);
    localStorage.setItem(`${lsPrefix}_manualSavings`, String(val));
  };
  const saveAndSetGold = (val: number) => {
    setManualGold(val);
    localStorage.setItem(`${lsPrefix}_manualGold`, String(val));
  };
  const saveAndSetProperty = (val: number) => {
    setManualProperty(val);
    localStorage.setItem(`${lsPrefix}_manualProperty`, String(val));
  };
  const saveAndSetCarLoan = (val: number) => {
    setManualCarLoan(val);
    localStorage.setItem(`${lsPrefix}_manualCarLoan`, String(val));
  };
  const saveAndSetHomeLoan = (val: number) => {
    setManualHomeLoan(val);
    localStorage.setItem(`${lsPrefix}_manualHomeLoan`, String(val));
  };

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => t.date.substring(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  const financialMonthlyStats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let autoBillsAmount = 0;
    
    monthlyTransactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expenses += t.amount;
        if (t.notes?.startsWith('Auto-paid bill:')) {
          autoBillsAmount += t.amount;
        }
      }
    });
    
    const generalExpenses = expenses - autoBillsAmount;
    const rate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    
    return {
      income,
      expenses,
      autoBillsAmount,
      generalExpenses,
      savingsRate: Math.max(0, parseFloat(rate.toFixed(1)))
    };
  }, [monthlyTransactions]);

  const horizontalSpendingData = useMemo(() => {
    const categories: Record<string, number> = {};
    monthlyTransactions.forEach(t => {
      if (t.type === 'expense') {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  const holdingsValuation = useMemo(() => {
    let invested = 0;
    let current = 0;

    holdings.forEach(h => {
      const buyVal = h.buyPrice * h.quantity;
      invested += buyVal;

      const priceKey = h.type === 'stock' ? `stock_${h.symbol}` : h.type === 'crypto' ? `crypto_${h.name || h.symbol}` : `mf_${h.schemeCode}`;
      const liveData = livePrices[priceKey];
      
      const currentPrice = liveData?.currentPrice || h.buyPrice;
      current += (currentPrice * h.quantity);
    });

    const pnl = current - invested;
    const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

    return {
      invested,
      current,
      pnl,
      pnlPercent
    };
  }, [holdings, livePrices]);

  const fdsValuation = useMemo(() => {
    return fds.reduce((sum, f) => sum + f.principal, 0);
  }, [fds]);

  const lifetimeLedgerCash = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'transfer') return acc;
      return (t.type === 'income' || t.type === 'refund') ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const netWorthSummary = useMemo(() => {
    const physicalAssetsValuation = physicalAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalAssets = holdingsValuation.current + fdsValuation + manualSavings + manualGold + manualProperty + Math.max(0, lifetimeLedgerCash) + physicalAssetsValuation;
    
    const outstandingOwes = pendingPayments
      .filter(p => !p.completed && p.type === 'owe')
      .reduce((sum, p) => sum + p.amount, 0);

    const ccDebt = ccBills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);
    const emiDebt = ccEmis.reduce((sum, e) => sum + ((e.totalMonths - e.paidMonths) * e.emiAmount), 0);

    const totalLiabilities = outstandingOwes + manualCarLoan + manualHomeLoan + ccDebt + emiDebt + (lifetimeLedgerCash < 0 ? Math.abs(lifetimeLedgerCash) : 0);
    const netWorth = totalAssets - totalLiabilities;

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth
    };
  }, [holdingsValuation, fdsValuation, pendingPayments, manualSavings, manualGold, manualProperty, manualCarLoan, manualHomeLoan, lifetimeLedgerCash, ccBills, ccEmis, physicalAssets]);

  const activeSipsCount = sips.length;
  const pendingCollectionsCount = pendingPayments.filter(p => !p.completed && p.type === 'owed').length;
  
  const overdueCount = pendingPayments.filter(p => !p.completed && p.dueDate < todayStr).length;
  const unpaidCcBillsCount = ccBills.filter(b => !b.isPaid && b.dueDate >= todayStr).length;
  const overdueCcBillsCount = ccBills.filter(b => !b.isPaid && b.dueDate < todayStr).length;

  const activeEmis = ccEmis.filter(e => e.paidMonths < e.totalMonths);
  const totalMonthlyEmi = activeEmis.reduce((sum, e) => sum + e.emiAmount, 0);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 5);
  }, [transactions]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-');
    let parsedYear = parseInt(year);
    let parsedMonth = parseInt(month);

    if (direction === 'prev') {
      parsedMonth -= 1;
      if (parsedMonth < 1) {
        parsedMonth = 12;
        parsedYear -= 1;
      }
    } else {
      parsedMonth += 1;
      if (parsedMonth > 12) {
        parsedMonth = 1;
        parsedYear += 1;
      }
    }

    onMonthChange(`${parsedYear}-${String(parsedMonth).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-4" id="dashboard-tab">
      
      {/* Month Navigator Header */}
      <div className="flex flex-row justify-between items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-xs text-slate-500 font-medium">{monthLabel}</p>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => navigateMonth('prev')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Previous Month"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold font-mono tabular-nums text-slate-700 px-1">{selectedMonth}</span>
          <button 
            onClick={() => navigateMonth('next')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Next Month"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Overdue alert banner */}
      {(overdueCount > 0 || overdueCcBillsCount > 0) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-950 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-rose-600 shrink-0" size={16} />
            <div>
              <span className="font-semibold text-rose-900">Action Required:</span> You have <span className="font-semibold underline tabular-nums">{overdueCount + overdueCcBillsCount} overdue items</span> pending settlement.
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab(overdueCcBillsCount > 0 ? 'credit-cards' : 'pending')}
            className="text-xs font-medium bg-rose-900 hover:bg-rose-800 text-white px-3 py-1.5 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Settle Now
          </button>
        </div>
      )}

      {/* Net Worth & Portfolio Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Net Worth Card (Assets - Liabilities) */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-400">Total Net Worth</span>
            <p className="text-3xl font-semibold tracking-tight text-white mt-1 font-mono tabular-nums">
              ₹{netWorthSummary.netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 font-normal">Assets</span>
              <p className="font-medium text-slate-200 font-mono tabular-nums mt-0.5">
                ₹{netWorthSummary.assets.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-normal">Liabilities</span>
              <p className="font-medium text-slate-200 font-mono tabular-nums mt-0.5">
                ₹{netWorthSummary.liabilities.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              {showPreferences ? 'Hide Manual Declarations' : 'Configure Manual Balances →'}
            </button>
          </div>
        </div>

        {/* Portfolio Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-500">Liquid Portfolio Value</span>
            <p className="text-2xl font-semibold text-slate-900 mt-1 font-mono tabular-nums">
              ₹{holdingsValuation.current.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-slate-500">Invested:</span>
              <span className="text-slate-700 font-medium font-mono tabular-nums">₹{holdingsValuation.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Absolute P&L</span>
              <p className={`font-semibold font-mono tabular-nums mt-0.5 ${holdingsValuation.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {holdingsValuation.pnl >= 0 ? '+' : ''}₹{holdingsValuation.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Yield</span>
              <p className={`font-semibold font-mono tabular-nums mt-0.5 ${holdingsValuation.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {holdingsValuation.pnl >= 0 ? '+' : ''}{holdingsValuation.pnlPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('portfolio')}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <span>View Holdings</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* Monthly Cash Flow Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-500">Cash Flow</span>
            
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Income</span>
                <p className="text-base font-semibold text-emerald-700 font-mono tabular-nums">₹{financialMonthlyStats.income.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Expenses</span>
                <p className="text-base font-semibold text-slate-800 font-mono tabular-nums">₹{financialMonthlyStats.expenses.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-2.5 space-y-1 text-xs">
              <div className="flex justify-between items-center text-slate-600 py-0.5">
                <span className="text-slate-500">Auto-Bills</span>
                <span className="font-mono tabular-nums text-slate-700 font-medium">₹{financialMonthlyStats.autoBillsAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 py-0.5 border-t border-slate-100">
                <span className="text-slate-500">General Spend</span>
                <span className="font-mono tabular-nums text-slate-700 font-medium">₹{financialMonthlyStats.generalExpenses.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs font-medium text-slate-600 mb-1.5">
              <span>Savings Rate</span>
              <span className="text-slate-900 font-mono tabular-nums font-semibold">{financialMonthlyStats.savingsRate}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all"
                style={{ width: `${Math.min(financialMonthlyStats.savingsRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Expandable Manual Assets Declarations */}
      <AnimatePresence>
        {showPreferences && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs"
          >
            <div className="col-span-1 md:col-span-5 border-b border-slate-200 pb-2 flex justify-between items-end">
              <div>
                <h4 className="font-bold text-slate-900">Declare Physical Assets & Loans</h4>
                <p className="text-xs text-slate-500 mt-0.5">Ledger Cash (₹{lifetimeLedgerCash.toLocaleString()}) is automatically tracked in Net Worth.</p>
              </div>
            </div>
            
            <div>
              <label className="block text-slate-600 font-medium text-xs mb-1">External Savings (₹)</label>
              <input 
                type="number" 
                value={manualSavings} 
                onChange={(e) => saveAndSetSavings(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-xs mb-1">Gold Reserves (₹)</label>
              <input 
                type="number" 
                value={manualGold} 
                onChange={(e) => saveAndSetGold(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-xs mb-1">Property (₹)</label>
              <input 
                type="number" 
                value={manualProperty} 
                onChange={(e) => saveAndSetProperty(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-xs mb-1">Car Loan (₹)</label>
              <input 
                type="number" 
                value={manualCarLoan} 
                onChange={(e) => saveAndSetCarLoan(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-rose-600 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-xs mb-1">Home Loan (₹)</label>
              <input 
                type="number" 
                value={manualHomeLoan} 
                onChange={(e) => saveAndSetHomeLoan(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-rose-600 focus:outline-none focus:border-slate-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white border border-slate-200 p-3 rounded-xl text-xs">
        <div className="flex items-center gap-2.5 p-1.5">
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
            <PiggyBank size={15} />
          </div>
          <div>
            <span className="text-slate-500 font-normal">SIP Plans</span>
            <p className="font-semibold text-slate-900 tabular-nums">{activeSipsCount} active</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1.5">
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
            <Calendar size={15} />
          </div>
          <div>
            <span className="text-slate-500 font-normal">Receivables</span>
            <p className="font-semibold text-slate-900 tabular-nums">{pendingCollectionsCount} pending</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1.5 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors" onClick={() => onNavigateToTab('credit-cards')}>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
            <Wallet size={15} />
          </div>
          <div>
            <span className="text-slate-500 font-normal">CC Bills</span>
            <p className="font-semibold text-slate-900 tabular-nums">{unpaidCcBillsCount} due</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1.5 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors" onClick={() => onNavigateToTab('credit-cards')}>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
            <TrendingDown size={15} className="text-rose-600" />
          </div>
          <div>
            <span className="text-slate-500 font-normal">Running EMIs</span>
            <p className="font-semibold text-slate-900 tabular-nums">{activeEmis.length} plans <span className="text-[11px] font-mono tabular-nums text-slate-500">(-₹{totalMonthlyEmi}/mo)</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1.5 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors" onClick={() => onNavigateToTab('assets')}>
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-700">
            <Coins size={15} />
          </div>
          <div>
            <span className="text-slate-500 font-normal">Physical Assets</span>
            <p className="font-semibold text-slate-900 tabular-nums">{physicalAssets.length} tracked</p>
          </div>
        </div>
      </div>

      {/* Spending chart by Category & Recent Transactions list */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Horizontally oriented Recharts Bar Chart */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-900">Spending by Category</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">Current Month</span>
          </div>

          {horizontalSpendingData.length === 0 ? (
            <div className="h-64 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200">
              <span className="text-xs">No debit activity recorded in {monthLabel}.</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={horizontalSpendingData.slice(0, 5)} 
                  margin={{ left: 10, right: 30, top: 10, bottom: 5 }}
                >
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={80} tickLine={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ fontSize: '11px', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Spent']}
                  />
                  <Bar dataKey="value" fill="#0f172a" radius={[0, 4, 4, 0]}>
                    {horizontalSpendingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0f172a' : index === 1 ? '#334155' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Transactions List on Right */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-slate-900">Recent Transactions</h3>
              <button 
                onClick={() => onNavigateToTab('transactions')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl py-1 px-2.5 transition-colors cursor-pointer"
              >
                View Ledger
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Transactions ledger is currently empty.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="py-2.5 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-slate-800 leading-snug">{t.category}</p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">{t.date} {t.notes && `• ${t.notes}`}</p>
                    </div>
                    <span className={`font-semibold font-mono tabular-nums text-xs ${(t.type === 'income' || t.type === 'refund') ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === 'transfer' ? '' : (t.type === 'income' || t.type === 'refund') ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Reconciled Ledger</span>
            <span className="font-mono tabular-nums text-[11px]">Audit Safe</span>
          </div>
        </div>

      </div>

    </div>
  );
}
