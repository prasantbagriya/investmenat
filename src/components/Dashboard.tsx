import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Calendar, AlertTriangle, ArrowRight,
  Sparkles, Wallet, Landmark, PiggyBank, ShieldCheck} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import { Transaction, PendingPayment, SavingsGoal, BudgetLimit, Holding, Sip, Fd, CreditCardBill, EmiItem } from '../types';


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
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onNavigateToTab: (tab: string) => void;
  livePrices?: Record<string, { currentPrice: number; dayChange: number; name: string }>;
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
  selectedMonth,
  onMonthChange,
  onNavigateToTab,
  livePrices = {}
}: DashboardProps) {
  // Manual Balance values (Saved locally for high fidelity with ZERO default demo data!)
  const [manualSavings, setManualSavings] = useState(() => Number(localStorage.getItem('manualSavings') || 0));
  const [manualGold, setManualGold] = useState(() => Number(localStorage.getItem('manualGold') || 0));
  const [manualProperty, setManualProperty] = useState(() => Number(localStorage.getItem('manualProperty') || 0));
  const [manualCarLoan, setManualCarLoan] = useState(() => Number(localStorage.getItem('manualCarLoan') || 0));
  const [manualHomeLoan, setManualHomeLoan] = useState(() => Number(localStorage.getItem('manualHomeLoan') || 0));
  const [showPreferences, setShowPreferences] = useState(false);

  const saveAndSetSavings = (val: number) => {
    setManualSavings(val);
    localStorage.setItem('manualSavings', String(val));
  };
  const saveAndSetGold = (val: number) => {
    setManualGold(val);
    localStorage.setItem('manualGold', String(val));
  };
  const saveAndSetProperty = (val: number) => {
    setManualProperty(val);
    localStorage.setItem('manualProperty', String(val));
  };
  const saveAndSetCarLoan = (val: number) => {
    setManualCarLoan(val);
    localStorage.setItem('manualCarLoan', String(val));
  };
  const saveAndSetHomeLoan = (val: number) => {
    setManualHomeLoan(val);
    localStorage.setItem('manualHomeLoan', String(val));
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
      } else {
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
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  // Net Worth (Total Assets - Total Liabilities)
  const netWorthSummary = useMemo(() => {
    // Assets: Stock & MF Portfolio + FD Deposits + Manual Gold/Savings/Property + Lifetime Ledger Cash
    const totalAssets = holdingsValuation.current + fdsValuation + manualSavings + manualGold + manualProperty + Math.max(0, lifetimeLedgerCash);
    
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
  }, [holdingsValuation, fdsValuation, pendingPayments, manualSavings, manualGold, manualProperty, manualCarLoan, manualHomeLoan, lifetimeLedgerCash, ccBills, ccEmis]);

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
    <div className="space-y-3" id="dashboard-tab">
      
      {/* Month Navigator Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/85">
        <div>
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-sans">InvestMant Dashboard</h2>
          <p className="text-lg font-extrabold text-slate-900 tracking-tight font-sans mt-0.5">Financial Year Overview • {monthLabel}</p>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => navigateMonth('prev')}
            className="px-1.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            ← Prev Month
          </button>
          <button 
            onClick={() => navigateMonth('next')}
            className="px-1.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            Next Month →
          </button>
        </div>
      </div>

      {/* Overdue alert banner */}
      {(overdueCount > 0 || overdueCcBillsCount > 0) && (
        <div className="bg-red-50 border border-red-200/50 text-red-950 p-2 rounded-xl flex items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-1">
            <AlertTriangle className="text-red-600 shrink-0 select-none" size={16} />
            <div>
              <span className="font-bold text-slate-900">Attention:</span> You have <span className="underline font-bold text-red-900">{overdueCount + overdueCcBillsCount} overdue items</span> pending settlement (payments or CC bills).
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab(overdueCcBillsCount > 0 ? 'credit-cards' : 'pending')}
            className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 px-1 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Settle Now
          </button>
        </div>
      )}

      {/* Net Worth & Portfolio Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Net Worth Card (Assets - Liabilities) */}
        <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-md border border-slate-800 flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Net Worth</span>
              <p className="text-3xl font-black font-display text-white mt-1">
                ₹{netWorthSummary.netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold">Total Assets</span>
              <p className="font-extrabold text-slate-100">₹{netWorthSummary.assets.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold">Total Liabilities</span>
              <p className="font-extrabold text-slate-100">₹{netWorthSummary.liabilities.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="pt-1 -ml-2 -mb-2">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-[10px] text-slate-500 hover:text-white active:text-white font-bold underline cursor-pointer px-2 py-2"
            >
              {showPreferences ? 'Close Asset Declarations' : 'Configure Manual Balances'}
            </button>
          </div>
        </div>



        {/* Portfolio Summary Card */}
        <div className="bg-white border border-slate-150 rounded-2xl p-3 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-700 font-black">Liquid Portfolio current value</span>
            <p className="text-2xl font-black font-display text-slate-900 mt-1">
              ₹{holdingsValuation.current.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-slate-600 font-semibold bg-slate-50 px-1 py-0.5 rounded">Invested: ₹{holdingsValuation.invested.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-700 font-black uppercase">Absolute Return (P&L)</span>
              <p className={`font-black font-mono ${holdingsValuation.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₹{holdingsValuation.pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-700 font-black uppercase">Percent Yield</span>
              <p className={`font-black font-mono ${holdingsValuation.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {holdingsValuation.pnl >= 0 ? '+' : ''}{holdingsValuation.pnlPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab('portfolio')}
            className="w-full text-center py-1 bg-slate-100/80 hover:bg-slate-200 rounded-lg text-[11px] font-black text-slate-800 transition-colors cursor-pointer"
          >
            Investments Ledger →
          </button>
        </div>

        {/* Monthly Budget Performance Card */}
        <div className="bg-white border border-slate-150 rounded-2xl p-3 shadow-sm flex flex-col justify-between space-y-2">
          <div className="flex justify-between items-start">
            <div className="w-full">
              <span className="text-[10px] uppercase tracking-wider text-slate-700 font-black">Cash Flow Breakdown</span>
              
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
                  <span className="text-[9px] text-emerald-600 font-bold uppercase">Total Income</span>
                  <p className="text-sm font-black text-emerald-900">₹{financialMonthlyStats.income.toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 rounded-lg p-1.5 border border-rose-100">
                  <span className="text-[9px] text-rose-600 font-bold uppercase">Total Expense</span>
                  <p className="text-sm font-black text-rose-900">₹{financialMonthlyStats.expenses.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-2 text-xs font-sans">
                <div className="flex justify-between items-center text-slate-600 py-0.5">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Auto-Bills</span>
                  <span className="font-mono font-bold text-slate-800">₹{financialMonthlyStats.autoBillsAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 py-0.5 border-t border-slate-100 mt-0.5 pt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Gen. Expenses</span>
                  <span className="font-mono font-bold text-slate-800">₹{financialMonthlyStats.generalExpenses.toLocaleString()}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-[10px] text-slate-750 font-black uppercase mb-1">
              <span>Savings Benchmark</span>
              <span className="text-blue-700">{financialMonthlyStats.savingsRate}% Saved</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all"
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
            className="overflow-hidden bg-slate-50 p-2 rounded-2xl border border-slate-150 grid grid-cols-1 md:grid-cols-5 gap-2 text-xs font-sans"
          >
            <div className="col-span-1 md:col-span-5 border-b border-slate-200/50 pb-1 flex justify-between items-end">
              <div>
                <h4 className="font-extrabold text-slate-800">Declare Physical Assets & Loan Accounts</h4>
                <p className="text-[10px] text-slate-500">Ledger Cash (₹{lifetimeLedgerCash.toLocaleString()}) is already auto-included in Net Worth.</p>
              </div>
            </div>
            
            <div>
              <label className="block text-slate-700 font-bold text-[10px] mb-1">EXTERNAL SAVINGS (₹)</label>
              <input 
                type="number" 
                value={manualSavings} 
                onChange={(e) => saveAndSetSavings(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-[10px] mb-1">GOLD RESERVES (₹)</label>
              <input 
                type="number" 
                value={manualGold} 
                onChange={(e) => saveAndSetGold(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-[10px] mb-1">PROPERTY VALUATION (₹)</label>
              <input 
                type="number" 
                value={manualProperty} 
                onChange={(e) => saveAndSetProperty(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-[10px] mb-1">CAR LOAN (LIABILITY - ₹)</label>
              <input 
                type="number" 
                value={manualCarLoan} 
                onChange={(e) => saveAndSetCarLoan(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-red-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-[10px] mb-1">HOME LOAN (LIABILITY - ₹)</label>
              <input 
                type="number" 
                value={manualHomeLoan} 
                onChange={(e) => saveAndSetHomeLoan(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold text-red-600"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick stats grid bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 border border-slate-150 p-2 rounded-2xl text-xs font-sans text-slate-800">
        <div className="flex items-center gap-1.5 p-1">
          <div className="p-1 bg-white rounded-xl shadow-xs text-slate-900 border border-slate-100">
            <PiggyBank size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold">ACTIVE SIP COUNT</span>
            <p className="font-extrabold text-[13px]">{activeSipsCount} systematic plans</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1">
          <div className="p-1 bg-white rounded-xl shadow-xs text-slate-900 border border-slate-100">
            <Calendar size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold font-sans">PENDING COLLECTIONS</span>
            <p className="font-extrabold text-[13px]">{pendingCollectionsCount} receivables</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1">
          <div className="p-1 bg-white rounded-xl shadow-xs text-slate-900 border border-slate-100 cursor-pointer hover:bg-indigo-50" onClick={() => onNavigateToTab('credit-cards')}>
            <Wallet size={16} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold">CREDIT CARDS</span>
            <p className="font-extrabold text-[13px]">{unpaidCcBillsCount} pending bills</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1">
          <div className="p-1 bg-white rounded-xl shadow-xs text-slate-900 border border-slate-100 cursor-pointer hover:bg-indigo-50" onClick={() => onNavigateToTab('credit-cards')}>
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold">ACTIVE EMIs</span>
            <p className="font-extrabold text-[13px]">{activeEmis.length} running <span className="text-[10px] font-mono text-slate-500">(-₹{totalMonthlyEmi}/mo)</span></p>
          </div>
        </div>
      </div>

      {/* Spending chart by Category & Recent Transactions list */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        
        {/* Horizontally oriented Recharts Bar Chart */}
        <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-slate-150 shadow-sm space-y-2">
          <h3 className="font-bold text-sm text-slate-800 font-display">Spending by Budget Category</h3>
          {horizontalSpendingData.length === 0 ? (
            <div className="h-64 bg-slate-50/50 rounded-xl flex flex-col items-center justify-center text-slate-405 border border-dashed border-slate-150">
              <span className="text-xs">No debit activity inside this month calendar scope.</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={horizontalSpendingData.slice(0, 5)} 
                  margin={{ left: 10, right: 30, top: 10, bottom: 5 }}
                >
                  <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={10} width={80} tickLine={false} />
                  <XAxis type="number" stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                    formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Spent']}
                  />
                  <Bar dataKey="value" fill="#111827" radius={[0, 4, 4, 0]}>
                    {horizontalSpendingData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#111827' : index === 1 ? '#374151' : '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Transactions List on Right */}
        <div className="lg:col-span-2 bg-white p-3 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-2">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-slate-800 font-display">Recent Activity</h3>
              <button 
                onClick={() => onNavigateToTab('transactions')}
                className="text-[10px] font-bold text-slate-450 hover:text-slate-900 border border-slate-100 hover:border-slate-200 rounded-md p-1 px-1.5 transition-colors cursor-pointer"
              >
                All ledger
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-[10px] text-slate-500 py-3 text-center">Your transactions ledger is currently empty.</p>
            ) : (
              <div className="divide-y divide-slate-100/80 font-sans text-xs">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="py-1.5 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <p className="font-bold text-slate-800 leading-normal">{t.category}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t.date} {t.notes && `• ${t.notes}`}</p>
                    </div>
                    <span className={`font-bold font-mono text-[11px] ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-1">
            <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider font-sans">AUDIT CONTROL ASSURANCE</span>
          </div>
        </div>

      </div>

    </div>
  );
}
