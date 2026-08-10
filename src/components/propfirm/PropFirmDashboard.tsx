import React from 'react';
import { Link } from 'react-router-dom';
import { PropFirmAccount, PropFirmPayout, PropFirmChallenge } from '../../types';
import { Target, Landmark, Activity, Wallet, TrendingUp, AlertTriangle, BellRing, Lock } from 'lucide-react';

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
    <div className="space-y-3">
      {/* Payout Notifications */}
      {duePayoutAccounts.map(account => (
        <div key={`alert-${account.id}`} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-sm flex items-start gap-3">
          <BellRing className="text-amber-500 mt-0.5 shrink-0" size={20} />
          <div>
            <h4 className="font-bold text-slate-800">Payout Reminder: {account.firmName} ({account.accountName})</h4>
            <p className="text-sm text-slate-600 font-medium">Your expected payout date was {new Date(account.nextPayoutDate!).toLocaleDateString()}. Did you request or receive a payout from this account?</p>
            <div className="mt-2 flex gap-2">
              <Link to="/propfirm-payouts" className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm">
                Yes, Log Payout
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-3 px-1 mb-2">
        <div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            Prop Firm Overview
          </p>
          <p className="text-xs text-slate-500 font-bold mt-0.5">Track your challenge performance and payouts</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard title="Total Spent" value={`$${totalSpent.toLocaleString()}`} icon={<Wallet className="text-slate-900" />} />
        <KPICard title="Total Payouts" value={`$${totalPayouts.toLocaleString()}`} icon={<Landmark className="text-emerald-500" />} />
        <KPICard title="Net Profit" value={`$${netProfit.toLocaleString()}`} icon={<TrendingUp className={netProfit >= 0 ? "text-emerald-500" : "text-slate-900"} />} color={netProfit >= 0 ? 'text-emerald-600' : 'text-slate-900'} />
        <KPICard title="Active Accounts" value={activeAccounts.toString()} icon={<Activity className="text-blue-500" />} />
        <KPICard title="Retained in Vault" value={`$${decentralizedAmount.toLocaleString()}`} icon={<Lock className="text-purple-500" />} color="text-purple-600" />
      </div>

      {/* Challenge Stats */}
      <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-3 text-xs flex items-center gap-2">
          <Activity size={14} className="text-indigo-500" />
          Challenge Win Rate
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <p className="text-xs text-slate-500 font-bold capitalize mb-0.5">Total</p>
            <p className="text-lg font-black text-slate-800">{challenges.length}</p>
          </div>
          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
            <p className="text-xs text-emerald-600 font-bold capitalize mb-0.5">Passed</p>
            <p className="text-lg font-black text-emerald-700">{passedChallenges}</p>
          </div>
          <div className="bg-rose-50 p-2 rounded-lg border border-rose-100">
            <p className="text-xs text-rose-600 font-bold capitalize mb-0.5">Failed</p>
            <p className="text-lg font-black text-rose-700">{failedChallenges}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Overall Win Rate</span>
          <span className="text-base font-black text-slate-900">{winRate}%</span>
        </div>
      </div>
      
      {/* Recent Payouts */}
      <div className="bg-white rounded-lg border border-slate-150 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-150 flex justify-between items-center bg-slate-50/45">
            <h3 className="text-xs font-bold text-slate-700 capitalize flex items-center gap-2">
                <Landmark size={14} className="text-emerald-500" />
                Recent Payouts
            </h3>
        </div>

        {payouts.length === 0 ? (
            <div className="p-6 text-center text-slate-450 bg-white text-xs">
                <Landmark size={24} className="mx-auto mb-2 opacity-30" />
                <p>No payouts recorded yet</p>
            </div>
        ) : (
            <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/20 text-xs font-bold text-slate-500 border-b border-slate-100">
                            <th className="p-2 px-3">Firm</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Amount</th>
                            <th className="p-2 font-mono">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-750 ">
                        {[...payouts].sort((a, b) => new Date(b.payoutDate).getTime() - new Date(a.payoutDate).getTime()).slice(0, 5).map((payout) => (
                            <tr key={payout.id} className="">
                                <td className="p-2 px-3">
                                    <div className="font-extrabold text-slate-800">{payout.firmName}</div>
                                </td>
                                <td className="p-2">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                                        payout.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                                        payout.status === 'Processing' ? 'bg-amber-100 text-amber-800' :
                                        'bg-slate-100 text-slate-800'
                                    }`}>
                                        {payout.status}
                                    </span>
                                </td>
                                <td className="p-2 font-bold font-mono text-xs text-emerald-600">
                                    +${payout.amount.toLocaleString()}
                                </td>
                                <td className="p-2 text-slate-500 font-mono text-xs">
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

function KPICard({ title, value, icon, color = 'text-slate-800' }: { title: string, value: string, icon: React.ReactNode, color?: string }) {
  return (
    <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 capitalize">{title}</span>
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 14 })}
      </div>
      <p className={`text-lg md:text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}



