import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Plus, Trash2, CalendarCheck, AlertTriangle, 
  Landmark, Clock, CheckCircle2, Edit2, Save, X
} from 'lucide-react';
import { Fd } from '../types';
import { calculateFdMaturity } from '../utils/financeHelpers';

interface FdRdTrackerProps {
  fds: Fd[];
  onAddFd: (fd: Omit<Fd, 'id' | 'userId'>) => Promise<void>;
  onDeleteFd: (id: string) => Promise<void>;
  onEditFd: (id: string, updates: Partial<Fd>) => Promise<void>;
}

export default function FdRdTracker({ fds, onAddFd, onDeleteFd, onEditFd }: FdRdTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingFd, setEditingFd] = useState<Fd | null>(null);

  // Add form state
  const [bankName, setBankName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [isRd, setIsRd] = useState(false);

  // Edit form state
  const [editBankName, setEditBankName] = useState('');
  const [editPrincipal, setEditPrincipal] = useState('');
  const [editInterestRate, setEditInterestRate] = useState('');
  const [editTenure, setEditTenure] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editIsRd, setEditIsRd] = useState(false);

  const computeMaturityDate = (start: string, months: number): string => {
    if (!start || isNaN(months)) return '';
    const date = new Date(start);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().substring(0, 10);
  };

  const openEditForm = (fd: Fd) => {
    setEditingFd(fd);
    setEditBankName(fd.bankName);
    setEditPrincipal(String(fd.principal));
    setEditInterestRate(String(fd.interestRate));
    setEditTenure(String(fd.tenure));
    setEditStartDate(fd.startDate);
    setEditIsRd(fd.isRd);
  };

  const closeEditForm = () => setEditingFd(null);

  const processedFds = fds.map(f => {
    const { maturityAmount, interestEarned } = calculateFdMaturity(f.principal, f.interestRate, f.tenure);
    const startObj = new Date(f.startDate);
    const maturityObj = new Date(f.maturityDate);
    const todayObj = new Date();
    const totalDays = Math.max(1, Math.ceil((maturityObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((maturityObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, totalDays - daysRemaining);
    const progressPercent = Math.min(100, (daysElapsed / totalDays) * 100);
    return { ...f, maturityAmount, interestEarned, daysRemaining, daysTotal: totalDays, progress: progressPercent, isMatured: daysRemaining === 0 };
  });

  const totals = processedFds.reduce((acc, f) => {
    acc.totalPrincipal += f.principal;
    acc.totalMaturity += f.maturityAmount;
    acc.interestGain += f.interestEarned;
    return acc;
  }, { totalPrincipal: 0, totalMaturity: 0, interestGain: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !principal || !interestRate || !tenure) return;
    const tenureMonths = parseInt(tenure);
    const matDate = computeMaturityDate(startDate, tenureMonths);
    await onAddFd({ bankName, principal: parseFloat(principal), interestRate: parseFloat(interestRate), tenure: tenureMonths, startDate, maturityDate: matDate, isRd });
    setIsAdding(false);
    setBankName(''); setPrincipal(''); setInterestRate(''); setTenure('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFd || !editBankName || !editPrincipal || !editInterestRate || !editTenure) return;
    const tenureMonths = parseInt(editTenure);
    const matDate = computeMaturityDate(editStartDate, tenureMonths);
    await onEditFd(editingFd.id, {
      bankName: editBankName.trim(),
      principal: parseFloat(editPrincipal),
      interestRate: parseFloat(editInterestRate),
      tenure: tenureMonths,
      startDate: editStartDate,
      maturityDate: matDate,
      isRd: editIsRd
    });
    closeEditForm();
  };

  return (
    <div className="space-y-3">
      {/* Edit FD Modal */}
      <AnimatePresence>
        {editingFd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-black text-slate-900 flex items-center gap-2">
                    <Edit2 size={16} className="text-indigo-600" /> Edit Deposit
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Update your Fixed / Recurring Deposit details.</p>
                </div>
                <button onClick={closeEditForm} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"><X size={16} /></button>
              </div>

              {/* FD/RD Type Toggle */}
              <div className="flex gap-1 mb-3 border-b border-slate-100 pb-3">
                <button type="button" onClick={() => setEditIsRd(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!editIsRd ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  Fixed Deposit (FD)
                </button>
                <button type="button" onClick={() => setEditIsRd(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${editIsRd ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  Recurring Deposit (RD)
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Bank / Institution Name</label>
                  <input required value={editBankName} onChange={e => setEditBankName(e.target.value)} placeholder="e.g., HDFC Bank, SBI"
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Principal Amount (₹)</label>
                  <input required type="number" value={editPrincipal} onChange={e => setEditPrincipal(e.target.value)} placeholder="100000"
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Interest Rate (% p.a.)</label>
                  <input required type="number" step="0.01" value={editInterestRate} onChange={e => setEditInterestRate(e.target.value)} placeholder="7.25"
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Tenure (Months)</label>
                  <input required type="number" value={editTenure} onChange={e => setEditTenure(e.target.value)} placeholder="12"
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                  <input required type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none" />
                </div>
                <div className="flex flex-col justify-end bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-500 font-semibold uppercase">AUTO COMPUTED MATURITY</span>
                  <span className="font-mono text-sm font-bold text-slate-700 mt-1">
                    {editTenure ? computeMaturityDate(editStartDate, parseInt(editTenure)) : '—'}
                  </span>
                </div>
                <div className="md:col-span-2 flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={closeEditForm}
                    className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm cursor-pointer hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Save size={14} /> Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-slate-900 text-white rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Bank Deposits</p>
          <p className="text-2xl font-black mt-1 font-display">₹{totals.totalPrincipal.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-1.5">Sum of all active bank deposits.</p>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-sans">Accumulated Interest</p>
          <p className="text-2xl font-black mt-1 font-display text-emerald-600">₹{totals.interestGain.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</p>
          <p className="text-[10px] text-slate-500 mt-1.5">Assured non-market interest earned.</p>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Projected Maturity Balance</p>
          <p className="text-2xl font-black mt-1 font-display text-slate-900">₹{totals.totalMaturity.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</p>
          <p className="text-[10px] text-slate-500 mt-1.5">Total due payout at term end.</p>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Upcoming FD Maturity</p>
            {processedFds.filter(f => !f.isMatured).length === 0 ? (
              <p className="text-xs font-bold text-slate-700 mt-1">No upcoming maturities</p>
            ) : (
              <div className="mt-1">
                <span className="text-xs font-black text-rose-500">{Math.min(...processedFds.filter(f => !f.isMatured).map(f => f.daysRemaining))} days</span>
                <span className="text-[10px] text-slate-500"> left for first locked release</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">Secure, non-volatile compounding investments.</p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-2 py-2 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-1">
                <Building2 className="text-slate-800" size={18} />
                <h3 className="font-bold text-sm text-slate-800 font-display">Fixed & Recurring Deposits</h3>
              </div>
              <button onClick={() => setIsAdding(!isAdding)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer">
                <Plus size={13} /> Log Deposit
              </button>
            </div>

            {/* Add FD Form */}
            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-100 bg-slate-50/20">
                  <form onSubmit={handleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-sans">
                    <div className="col-span-1 md:col-span-3 flex gap-1 border-b border-slate-100 pb-1">
                      <button type="button" onClick={() => setIsRd(false)} className={`px-1 py-1.5 rounded-md font-bold ${!isRd ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Fixed Deposit (FD)</button>
                      <button type="button" onClick={() => setIsRd(true)} className={`px-1 py-1.5 rounded-md font-bold ${isRd ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Recurring Deposit (RD)</button>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Bank / Institution Name</label>
                      <input type="text" required placeholder="e.g., HDFC Bank, SBI" value={bankName} onChange={e => setBankName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Principal Invested (₹)</label>
                      <input type="number" required placeholder="100000" value={principal} onChange={e => setPrincipal(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Interest Rate (% p.a.)</label>
                      <input type="number" step="0.01" required placeholder="7.25" value={interestRate} onChange={e => setInterestRate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tenure (In Months)</label>
                      <input type="number" required placeholder="12" value={tenure} onChange={e => setTenure(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Deposit Start Date</label>
                      <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs" />
                    </div>
                    <div className="flex flex-col justify-end bg-slate-50 p-1 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold">AUTO COMPUTED MATURITY</span>
                      <span className="font-mono text-xs font-bold text-slate-700 mt-1">{computeMaturityDate(startDate, parseInt(tenure))}</span>
                    </div>
                    <div className="col-span-1 md:col-span-3 flex justify-end gap-1 border-t border-slate-100 pt-1">
                      <button type="button" onClick={() => setIsAdding(false)} className="px-2 py-1 border border-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-2 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer">Save Deposit</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FD List */}
            {processedFds.length === 0 ? (
              <div className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <div className="p-1 bg-slate-50 rounded-full text-slate-500"><Landmark size={24} /></div>
                <h3 className="text-xs font-bold text-slate-700">No bank deposits registered</h3>
                <p className="text-[10px] text-slate-500 max-w-xs">Track Fixed and Recurring Deposits under a centralized overview.</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {processedFds.map((fd) => (
                  <div key={fd.id} className="border border-slate-150 rounded-2xl p-2.5 bg-slate-50/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-1 md:max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 px-1.5 bg-slate-900 text-white font-bold rounded-lg text-[9px] uppercase">{fd.isRd ? 'RD' : 'FD'}</span>
                        <h4 className="font-extrabold text-slate-800 text-xs truncate max-w-[150px]">{fd.bankName}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold font-mono">ROI: {fd.interestRate}% p.a. • tenure: {fd.tenure} months</p>
                      <div className="flex gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Start: {fd.startDate}</span><span>•</span>
                        <span className="font-bold text-slate-600">Mat: {fd.maturityDate}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5 max-w-md">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 font-mono">
                        <span>Progress Tracker</span>
                        <span>{fd.isMatured ? 'MATURED ✔' : `${fd.daysRemaining} days remaining`}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/55">
                        <div className={`h-full rounded-full transition-all duration-500 ${fd.isMatured ? 'bg-emerald-500' : 'bg-slate-900'}`} style={{ width: `${fd.progress}%` }} />
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium font-sans">
                        Term completed: {fd.progress.toFixed(1)}% ({Math.floor(fd.daysTotal - fd.daysRemaining)} / {fd.daysTotal} total days)
                      </p>
                    </div>

                    <div className="text-right flex md:flex-col justify-between items-center md:items-end gap-1 border-t md:border-t-0 border-slate-100 pt-1 md:pt-0">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Maturity Expectation</p>
                        <p className="font-black font-mono text-sm text-slate-800">₹{fd.maturityAmount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">₹{fd.interestEarned.toLocaleString('en-IN')} interest profit</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(fd)}
                          className="text-slate-350 hover:text-indigo-600 p-1.5 rounded-lg border border-slate-100 md:border-0 hover:bg-indigo-50 transition-all cursor-pointer" title="Edit Deposit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => onDeleteFd(fd.id)}
                          className="text-slate-350 hover:text-red-500 p-1.5 rounded-lg border border-slate-100 md:border-0 hover:bg-slate-50 transition-all cursor-pointer" title="Delete Deposit">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info/Notification digest card */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Clock size={16} className="text-slate-700" />
              <h3 className="font-bold text-xs text-slate-700 font-display">Deposit Maturity Digest</h3>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              We process automated scans on maturities. Users receive alerts 48 hours preceding maturities to organize encashment transfers.
            </p>
            {fds.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-2">No deposits active.</p>
            ) : (
              <div className="space-y-1 text-xs">
                {processedFds.map(fd => (
                  <div key={fd.id} className="p-1 border border-slate-100 rounded-xl flex gap-1 items-start bg-slate-50/20">
                    <div className={`p-1.5 rounded-lg text-white ${fd.isMatured ? 'bg-emerald-500' : fd.daysRemaining <= 30 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                      <CheckCircle2 size={13} />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-700">{fd.bankName} maturity</h5>
                      <p className="text-[10px] text-slate-500 font-semibold">Release Date: {fd.maturityDate}</p>
                      {fd.isMatured ? (
                        <span className="inline-block mt-1 font-bold text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md">Matured & Disbursable</span>
                      ) : fd.daysRemaining <= 30 ? (
                        <span className="inline-block mt-1 font-bold text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">⚠ {fd.daysRemaining} Days — Expiring Soon!</span>
                      ) : (
                        <span className="inline-block mt-1 font-bold text-[9px] bg-blue-50 text-blue-750 px-1.5 py-0.5 rounded-md">{fd.daysRemaining} Days To Go</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-linear-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-3 shadow-sm space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-indigo-300 font-black">Quick Stats</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-500">Active Deposits</p>
                <p className="text-xl font-black text-white font-mono">{fds.length}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500">Matured</p>
                <p className="text-xl font-black text-emerald-400 font-mono">{processedFds.filter(f => f.isMatured).length}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500">FDs</p>
                <p className="text-lg font-black text-blue-300 font-mono">{fds.filter(f => !f.isRd).length}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500">RDs</p>
                <p className="text-lg font-black text-purple-300 font-mono">{fds.filter(f => f.isRd).length}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-[9px] text-slate-500">Avg. Interest Rate</p>
              <p className="text-sm font-black text-amber-300 font-mono">
                {fds.length > 0 ? (fds.reduce((a, f) => a + f.interestRate, 0) / fds.length).toFixed(2) : '0.00'}% p.a.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
