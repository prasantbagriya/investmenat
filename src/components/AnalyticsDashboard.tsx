import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
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

  // ECharts Theme/Options configuration
  const pieOptions = useMemo(() => {
    return {
      tooltip: { trigger: 'item', backgroundColor: '#0f172a', textStyle: { color: '#fff' }, borderColor: '#334155' },
      legend: { orient: 'vertical', right: 10, top: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, fontWeight: 'bold' } },
      series: [
        {
          name: 'Expenses',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 5,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: { show: false },
          labelLine: { show: false },
          data: expensesByCategory.map((d, i) => ({ value: d.value, name: d.name, itemStyle: { color: COLORS[i % COLORS.length] } }))
        }
      ]
    };
  }, [expensesByCategory]);

  const barOptions = useMemo(() => {
    return {
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', textStyle: { color: '#fff' }, borderColor: '#334155' },
      legend: { bottom: 0, textStyle: { fontSize: 10, fontWeight: 'bold' }, icon: 'circle' },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: { 
        type: 'category', 
        data: monthlyTrend.map(d => d.month), 
        axisLine: { show: false }, 
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      yAxis: { 
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { formatter: (val: number) => `₹${(val/1000).toFixed(0)}k`, color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      series: [
        { name: 'Income', type: 'bar', barMaxWidth: 40, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, data: monthlyTrend.map(d => d.Income) },
        { name: 'Expense', type: 'bar', barMaxWidth: 40, itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] }, data: monthlyTrend.map(d => d.Expense) }
      ]
    };
  }, [monthlyTrend]);

  const areaOptions = useMemo(() => {
    return {
      tooltip: { trigger: 'axis', backgroundColor: '#0f172a', textStyle: { color: '#fff' }, borderColor: '#334155' },
      grid: { left: '3%', right: '4%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: { 
        type: 'category', 
        boundaryGap: false, 
        data: monthlyTrend.map(d => d.month),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      yAxis: { 
        type: 'value',
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { formatter: (val: number) => `₹${(val/1000).toFixed(0)}k`, color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      series: [
        {
          name: 'Expense Velocity',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#ef4444', width: 3 },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(239, 68, 68, 0.3)' }, { offset: 1, color: 'rgba(239, 68, 68, 0)' }]
            }
          },
          data: monthlyTrend.map(d => d.Expense)
        }
      ]
    };
  }, [monthlyTrend]);

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
              <ReactECharts option={pieOptions} style={{ height: '100%', width: '100%' }} />
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
              <ReactECharts option={barOptions} style={{ height: '100%', width: '100%' }} />
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
              <ReactECharts option={areaOptions} style={{ height: '100%', width: '100%' }} />
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
