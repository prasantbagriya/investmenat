import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Calendar, AlertTriangle, ArrowRight,
  Sparkles, Wallet, Landmark, PiggyBank, ShieldCheck} from 'lucide-react';
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
  // User-scoped localStorage prefix to prevent cross-user data leakage
  const lsPrefix = `dashboard_${userId}`;
  // Manual Balance values (Saved locally for high fidelity with ZERO default demo data!)
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

  // Month Human translation
  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered transactions for the current month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => t.date.substring(0, 7) === selectedMonth);
  }, [transactions, selectedMonth]);

  // Income, Expenses, Savings rate calculations
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

  // Horizontal bar spending chart data
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

  // Holdings valuation aggregates
  const holdingsValuation = useMemo(() => {
    let invested = 0;
    let current = 0;

    holdings.forEach(h => {
      const buyVal = h.buyPrice * h.quantity;
      invested += buyVal;

      const priceKey = h.type === 'stock' ? `stock_${h.symbol}` : `mf_${h.schemeCode}`;
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

  // FDs valuation aggregates
  const fdsValuation = useMemo(() => {
    return fds.reduce((sum, f) => sum + f.principal, 0);
  }, [fds]);

  // Calculate Lifetime Uninvested Cash from all transactions
  const lifetimeLedgerCash = useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.type === 'transfer') return acc;
      return (t.type === 'income' || t.type === 'refund') ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  // Net Worth (Total Assets - Total Liabilities)
  const netWorthSummary = useMemo(() => {
    const physicalAssetsValuation = physicalAssets.reduce((sum, a) => sum + a.currentValue, 0);

    // Assets: Stock & MF Portfolio + FD Deposits + Manual Gold/Savings/Property + Lifetime Ledger Cash + Physical Assets
    const totalAssets = holdingsValuation.current + fdsValuation + manualSavings + manualGold + manualProperty + Math.max(0, lifetimeLedgerCash) + physicalAssetsValuation;
    
    // Liabilities: Owe type debts + Manual Home Loan / Car Loan + Negative Ledger Cash (if any)
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

  // Quick stats
  const activeSipsCount = sips.length;
  const pendingCollectionsCount = pendingPayments.filter(p => !p.completed && p.type === 'owed').length;
  
  const upcomingFDsCount = useMemo(() => {
    return fds.filter(f => {
      const days = Math.ceil((new Date(f.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 60;
    }).length;
  }, [fds]);

  // Overdue check
  const overdueCount = pendingPayments.filter(p => !p.completed && p.dueDate < todayStr).length;

  const unpaidCcBillsCount = ccBills.filter(b => !b.isPaid && b.dueDate >= todayStr).length;
  const overdueCcBillsCount = ccBills.filter(b => !b.isPaid && b.dueDate < todayStr).length;

  // Active EMIs
  const activeEmis = ccEmis.filter(e => e.paidMonths < e.totalMonths);
  const totalMonthlyEmi = activeEmis.reduce((sum, e) => sum + e.emiAmount, 0);

  // Recent 5 transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 5);
  }, [transactions]);

  // Navigationmonth
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
      <div className="flex flex-row justify-between items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Overview • {monthLabel}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigateMonth('prev')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
          >
            ? Previous
          </button>
          <button 
            onClick={() => navigateMonth('next')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
          >
            Next ?
          </button>
        </div>
      </div>

      {/* Overdue alert banner */}
      {(overdueCount > 0 || overdueCcBillsCount > 0) && (
        <div className="bg-rose-50/80 border border-rose-200/70 text-rose-950 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-rose-600 shrink-0" size={16} strokeWidth={1.75} />
            <div>
              <span className="font-semibold text-rose-900">Attention:</span> You have <span className="font-semibold text-rose-700">{overdueCount + overdueCcBillsCount} overdue items</span> pending settlement.
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab(overdueCcBillsCount > 0 ? 'credit-cards' : 'pending')}
            className="text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Settle now
          </button>
        </div>
      )}

      {/* Net Worth & Portfolio Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Net Worth Card (Assets - Liabilities) */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs text-slate-400 font-medium">Net worth</span>
            <p className="text-3xl font-semibold font-mono tabular-nums text-white mt-1 tracking-tight">
              ?{netWorthSummary.netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">Total assets</span>
              <p className="font-medium font-mono tabular-nums text-slate-200">
                ?{netWorthSummary.assets.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">Total liabilities</span>
              <p className="font-medium font-mono tabular-nums text-slate-200">
                ?{netWorthSummary.liabilities.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-xs text-slate-400 hover:text-white font-medium underline underline-offset-2 transition-colors cursor-pointer"
            >
              {showPreferences ? 'Hide asset declarations' : 'Configure manual balances'}
            </button>
          </div>
        </div>

        {/* Portfolio Summary Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs text-slate-500 font-medium">Liquid portfolio value</span>
            <p className="text-2xl font-semibold font-mono tabular-nums text-slate-900 mt-1 tracking-tight">
              ?{holdingsValuation.current.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-slate-500 font-mono tabular-nums">
                Invested: ?{holdingsValuation.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">Absolute return</span>
              <p className={`font-semibold font-mono tabular-nums ${holdingsValuation.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {holdingsValuation.pnl >= 0 ? '+' : ''}?{holdingsValuation.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block mb-0.5">Yield</span>
              <p className={`font-semibold font-mono tabular-nums ${holdingsValuation.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {holdingsValuation.pnl >= 0 ? '+' : ''}{holdingsValuation.pnlPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('portfolio')}
            className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
          >
            Investments ledger ?
          </button>
        </div>

        {/* Monthly Budget Performance Card */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-4">
          <div className="w-full">
            <span className="text-xs text-slate-500 font-medium">Cash flow</span>
            
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="bg-emerald-50/60 rounded-lg p-2.5 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block mb-0.5">Income</span>
                <p className="text-sm font-semibold font-mono tabular-nums text-emerald-950">?{financialMonthlyStats.income.toLocaleString()}</p>
              </div>
              <div className="bg-rose-50/60 rounded-lg p-2.5 border border-rose-100">
                <span className="text-[11px] text-rose-700 block mb-0.5">Expenses</span>
                <p className="text-sm font-semibold font-mono tabular-nums text-rose-950">?{financialMonthlyStats.expenses.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-3 text-xs space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Recurring bills</span>
                <span className="font-mono tabular-nums text-slate-900 font-medium">?{financialMonthlyStats.autoBillsAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Other expenses</span>
                <span className="font-mono tabular-nums text-slate-900 font-medium">?{financialMonthlyStats.generalExpenses.toLocaleString()}</span>
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5">
              <span>Savings benchmark</span>
              <span className="font-mono tabular-nums font-medium text-slate-900">{financialMonthlyStats.savingsRate}% saved</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 rounded-full transition-all duration-300"
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
            className="overflow-hidden bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs"
          >
            <div className="col-span-1 md:col-span-5 border-b border-slate-200 pb-2 flex justify-between items-end">
              <div>
                <h4 className="font-semibold text-slate-900">Declare physical assets & loans</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">Ledger cash (?{lifetimeLedgerCash.toLocaleString()}) is automatically factored into net worth.</p>
              </div>
            </div>
            
            <div>
              <label className="block text-slate-600 font-medium text-[11px] mb-1">External savings (?)</label>
              <input 
                type="number" 
                value={manualSavings} 
                onChange={(e) => saveAndSetSavings(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-[11px] mb-1">Gold reserves (?)</label>
              <input 
                type="number" 
                value={manualGold} 
                onChange={(e) => saveAndSetGold(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-[11px] mb-1">Property valuation (?)</label>
              <input 
                type="number" 
                value={manualProperty} 
                onChange={(e) => saveAndSetProperty(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-[11px] mb-1">Car loan (Liability ?)</label>
              <input 
                type="number" 
                value={manualCarLoan} 
                onChange={(e) => saveAndSetCarLoan(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono tabular-nums text-rose-600 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium text-[11px] mb-1">Home loan (Liability ?)</label>
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

      {/* Quick stats grid bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white border border-slate-200/80 p-3 rounded-xl text-xs text-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 p-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <PiggyBank size={16} strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Active SIPs</span>
            <p className="font-semibold text-xs font-mono tabular-nums text-slate-900">{activeSipsCount} plans</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Calendar size={16} strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Receivables</span>
            <p className="font-semibold text-xs font-mono tabular-nums text-slate-900">{pendingCollectionsCount} pending</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors" onClick={() => onNavigateToTab('credit-cards')}>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Wallet size={16} strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Credit cards</span>
            <p className="font-semibold text-xs font-mono tabular-nums text-slate-900">{unpaidCcBillsCount} bills</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors" onClick={() => onNavigateToTab('credit-cards')}>
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <TrendingDown size={16} strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Active EMIs</span>
            <p className="font-semibold text-xs font-mono tabular-nums text-slate-900">{activeEmis.length} running <span className="text-[10px] text-slate-500">(-?{totalMonthlyEmi})</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-1 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors" onClick={() => onNavigateToTab('assets')}>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Sparkles size={16} strokeWidth={1.75} />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Physical assets</span>
            <p className="font-semibold text-xs font-mono tabular-nums text-slate-900">{physicalAssets.length} tracked</p>
          </div>
        </div>
      </div>

      {/* Spending chart by Category & Recent Transactions list */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* Horizontally oriented Recharts Bar Chart */}
        <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900 tracking-tight">Spending by category</h3>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">Top 5</span>
          </div>
          {horizontalSpendingData.length === 0 ? (
            <div className="h-64 bg-slate-50/50 rounded-lg flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200">
              <span className="text-xs">No debit activity recorded for this period.</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={horizontalSpendingData.slice(0, 5)} 
                  margin={{ left: 10, right: 30, top: 10, bottom: 5 }}
                >
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={85} tickLine={false} axisLine={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `?${val.toLocaleString()}`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    formatter={(val: number) => [`?${val.toLocaleString()}`, 'Spent']}
                  />
                  <Bar dataKey="value" fill="#0f172a" radius={[0, 4, 4, 0]}>
                    {horizontalSpendingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0f172a' : index === 1 ? '#334155' : index === 2 ? '#475569' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Transactions List on Right */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-slate-900 tracking-tight">Recent activity</h3>
              <button 
                onClick={() => onNavigateToTab('transactions')}
                className="text-xs text-slate-600 hover:text-slate-950 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
              >
                Full ledger ?
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Your transactions ledger is currently empty.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="py-2 flex justify-between items-center first:pt-0 last:pb-0">
                    <div className="pr-2">
                      <p className="font-medium text-slate-900 leading-snug">{t.category}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{t.date} {t.notes && `• ${t.notes}`}</p>
                    </div>
                    <span className={`font-mono tabular-nums font-semibold text-xs whitespace-nowrap ${(t.type === 'income' || t.type === 'refund') ? 'text-emerald-600' : t.type === 'transfer' ? 'text-blue-600' : 'text-slate-900'}`}>
                      {t.type === 'transfer' ? '' : (t.type === 'income' || t.type === 'refund') ? '+' : '-'}?{t.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Audit control</span>
            <span className="font-mono">Live Sync</span>
          </div>
        </div>

      </div>

    </div>
  );
}