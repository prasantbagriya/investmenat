import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Transaction, BankAccount, Holding, Fd, Sip, PendingPayment, CreditCardBill, EmiItem } from '../types';
import { BrokerFunds } from '../hooks/useBrokerSync';
import { Activity, TrendingUp, PieChart as PieChartIcon, IndianRupee, ShieldAlert } from 'lucide-react';

interface AnalyticsDashboardProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  holdings: Holding[];
  fds: Fd[];
  sips: Sip[];
  pendingPayments: PendingPayment[];
  brokerFunds: BrokerFunds | undefined;
  ccBills?: CreditCardBill[];
  ccEmis?: EmiItem[];
}

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#64748b'];

export default function AnalyticsDashboard({
  transactions,
  bankAccounts,
  holdings,
  fds,
  sips,
  pendingPayments,
  brokerFunds,
  ccBills = [],
  ccEmis = []
}: AnalyticsDashboardProps) {

  // Net Worth Calculation
  const { totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    // Assets
    const bankBalance = bankAccounts.reduce((acc, curr) => acc + curr.currentBalance, 0);
    const holdingsValue = holdings.reduce((acc, curr) => acc + (curr.quantity * curr.buyPrice), 0);
    const fdValue = fds.reduce((acc, curr) => acc + curr.principal, 0);
    // Fix: Calculate actual total SIP invested capital based on months elapsed
    const sipValue = sips.reduce((acc, sip) => {
      const start = new Date(sip.startDate);
      const today = new Date();
      let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
      if (today.getDate() >= sip.sipDate) months += 1;
      months = Math.max(1, months);
      return acc + (sip.amount * months);
    }, 0);

    
    // Total Broker Funds (Available)
    const brokerCash = brokerFunds ? brokerFunds.totalAvailable : 0;
    
    // Money owed TO you
    const receivables = pendingPayments.filter(p => p.type === 'owed' && !p.completed).reduce((acc, curr) => acc + curr.amount, 0);

    // Liabilities
    // Money owed BY you
    const payables = pendingPayments.filter(p => p.type === 'owe' && !p.completed).reduce((acc, curr) => acc + curr.amount, 0);
    const ccDebt = ccBills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);
    const emiDebt = ccEmis.reduce((sum, e) => sum + ((e.totalMonths - e.paidMonths) * e.emiAmount), 0);

    const assets = bankBalance + holdingsValue + fdValue + sipValue + brokerCash + receivables;
    const liabilities = payables + ccDebt + emiDebt;
    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities
    };
  }, [bankAccounts, holdings, fds, sips, pendingPayments, brokerFunds, ccBills, ccEmis]);

  // Expenses by Category (Last 30 Days or All Time? Let's do All Time for now, or group by month)
  const expensesByCategory = useMemo(() => {
    const expenseData: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
    });

    return Object.entries(expenseData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Monthly Income vs Expense Trend
  const monthlyTrend = useMemo(() => {
    const monthsData: Record<string, { month: string; Income: number; Expense: number }> = {};
    
    transactions.forEach(t => {
      // YYYY-MM format
      const monthKey = t.date.substring(0, 7); 
      if (!monthsData[monthKey]) {
        monthsData[monthKey] = { month: monthKey, Income: 0, Expense: 0 };
      }
      if (t.type === 'income') {
        monthsData[monthKey].Income += t.amount;
      } else {
        monthsData[monthKey].Expense += t.amount;
      }
    });

    return Object.values(monthsData).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs font-sans">
          <p className="font-bold mb-1 opacity-80">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} className="flex justify-between gap-4 font-mono">
              <span style={{ color: p.color }}>{p.name}:</span>
              <span className="font-bold">₹{p.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 font-sans pb-10">
      
      {/* Header */}
      <div className="flex flex-col gap-1 bg-white p-4 rounded-3xl border border-slate-200/85 shadow-xs">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Financial Intelligence</h2>
        <p className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Activity size={20} className="text-indigo-600" />
          AI Analytics Dashboard
        </p>
      </div>

      {/* Net Worth Summary Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-slate-900 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500 rounded-full blur-3xl opacity-30"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <IndianRupee size={12} /> Live Net Worth
          </p>
          <p className="text-3xl font-black font-mono tracking-tight">₹{netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" /> Total Assets
          </p>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">₹{totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <ShieldAlert size={12} className="text-red-500" /> Total Liabilities
          </p>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">₹{totalLiabilities.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Expenses by Category */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 p-4 rounded-3xl shadow-xs"
        >
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <PieChartIcon size={16} className="text-indigo-500" /> Expenses by Category
          </h3>
          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-20">No expense data available.</p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Monthly Trend */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="bg-white border border-slate-200 p-4 rounded-3xl shadow-xs"
        >
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <Activity size={16} className="text-indigo-500" /> Monthly Cashflow Trend
          </h3>
          {monthlyTrend.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-20">No monthly data available.</p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} iconType="circle" />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Area Chart: Expense Growth Curve */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
          className="bg-white border border-slate-200 p-4 rounded-3xl shadow-xs lg:col-span-2"
        >
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
            <TrendingUp size={16} className="text-pink-500" /> Expense Velocity Curve
          </h3>
          {monthlyTrend.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-20">No monthly data available.</p>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
