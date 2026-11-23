import React from 'react';
import { Link } from 'react-router-dom';
import { PropFirmAccount, PropFirmPayout, PropFirmChallenge } from '../../types';
import { Landmark, Activity, Wallet, TrendingUp, BellRing, Lock } from 'lucide-react';

interface Props {
  accounts: PropFirmAccount[];
  payouts: PropFirmPayout[];
  challenges: PropFirmChallenge[];
}

export default function PropFirmDashboard({ accounts, payouts, challenges }: Props) {
  const totalSpent = challenges.reduce((acc, curr) => acc + curr.cost, 0);
  const totalPayouts = payouts.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalPayouts - totalSpent;
  const decentralizedAmount = payouts.filter(p => p.status === 'Paid' && p.transferredTo === 'None').reduce((acc, curr) => acc + curr.amount, 0);
  
  const activeAccounts = accounts.filter(a => a.status === 'Active').length;
  const passedChallenges = challenges.filter(c => c.phase === 'Funded').length;
  const failedChallenges = challenges.filter(c => c.phase === 'Failed').length;
  const winRate = challenges.length > 0 ? ((passedChallenges / challenges.length) * 100).toFixed(1) : '0.0';

  const today = new Date().toISOString().split('T')[0];
  const duePayoutAccounts = accounts.filter(a => a.status === 'Active' && a.nextPayoutDate && a.nextPayoutDate <= today);

  return (
    <div className="space-y-4">
      {/* Payout Notifications */}
      {duePayoutAccounts.map(account => (
        <div key={`alert-${account.id}`} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
            <BellRing size={16} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 text-sm">Payout Reminder: {account.firmName} ({account.accountName})</h4>
            <p className="text-xs text-slate-600 mt-0.5">Your expected payout date was {new Date(account.nextPayoutDate!).toLocaleDateString()}. Did you request or receive a payout from this account?</p>
            <div className="mt-2.5">
              <Link 
                to="/propfirm-payouts" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-medium text-xs transition-colors shadow-xs"
              >
                Log Payout
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="flex justify-between items-center px-0.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Prop Firm Overview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Track evaluations, active accounts, and recorded payouts</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard title="Total Spent" value={`$${totalSpent.toLocaleString()}`} icon={<Wallet size={15} className="text-slate-700" />} />
        <KPICard title="Total Payouts" value={`$${totalPayouts.toLocaleString()}`} icon={<Landmark size={15} className="text-emerald-600" />} color="text-emerald-700" />
        <KPICard title="Net Profit" value={`$${netProfit.toLocaleString()}`} icon={<TrendingUp size={15} className={netProfit >= 0 ? "text-emerald-600" : "text-rose-600"} />} color={netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
        <KPICard title="Active Accounts" value={activeAccounts.toString()} icon={<Activity size={15} className="text-slate-700" />} />
        <KPICard title="Retained in Vault" value={`$${decentralizedAmount.toLocaleString()}`} icon={<Lock size={15} className="text-slate-700" />} />
      </div>

      {/* Challenge Stats */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-slate-700" />
          <h3 className="font-semibold text-slate-900 text-sm">Challenge Win Rate</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-[11px] text-slate-500 font-medium mb-0.5">Total</p>
            <p className="text-lg font-bold font-mono tabular-nums text-slate-900">{challenges.length}</p>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
            <p className="text-[11px] text-emerald-700 font-medium mb-0.5">Passed</p>
            <p className="text-lg font-bold font-mono tabular-nums text-emerald-800">{passedChallenges}</p>
          </div>
          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200">
            <p className="text-[11px] text-rose-700 font-medium mb-0.5">Failed</p>
            <p className="text-lg font-bold font-mono tabular-nums text-rose-800">{failedChallenges}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Overall Win Rate</span>
          <span className="font-semibold font-mono tabular-nums text-slate-900 text-sm">{winRate}%</span>
        </div>
      </div>
      
      {/* Recent Payouts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
          <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
            <Landmark size={14} className="text-slate-700" />
            Recent Payouts
          </h3>
        </div>

        {payouts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white text-xs">
            <Landmark size={24} className="mx-auto mb-2 opacity-30" />
            <p>No payouts recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                  <th className="p-2.5 px-4">Firm</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Amount</th>
                  <th className="p-2.5 font-mono tabular-nums">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {[...payouts].sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime()).slice(0, 5).map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2.5 px-4">
                      <div className="font-semibold text-slate-900">{payout.firmName}</div>
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-xl text-[11px] font-medium border ${
                        payout.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        payout.status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold font-mono tabular-nums text-xs text-emerald-700">
                      +${payout.amount.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-slate-500 font-mono tabular-nums text-xs">
                      {payout.payoutDate}
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

function KPICard({ title, value, icon, color = 'text-slate-900' }: { title: string, value: string, icon: React.ReactNode, color?: string }) {
  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500">{title}</span>
        {icon}
      </div>
      <p className={`text-base sm:text-lg font-bold font-mono tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
