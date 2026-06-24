import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalIcon, Plus, Trash2, ArrowUpRight, TrendingUp, Sparkles, 
  AlertCircle, Bell, CheckCircle, Edit2, Save, X
} from 'lucide-react';
import { Sip } from '../types';
import { calculateXIRR } from '../utils/financeHelpers';

interface SipTrackerProps {
  sips: Sip[];
  onAddSip: (sip: Omit<Sip, 'id' | 'userId'>) => Promise<void>;
  onDeleteSip: (id: string) => Promise<void>;
  onEditSip: (id: string, updates: Partial<Sip>) => Promise<void>;
}

export default function SipTracker({ sips, onAddSip, onDeleteSip, onEditSip }: SipTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSip, setEditingSip] = useState<Sip | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [sipDate, setSipDate] = useState<number>(5);
  const [assetClass, setAssetClass] = useState<'Equity' | 'Debt' | 'Gold' | 'Cash'>('Equity');
  const [broker, setBroker] = useState('Zerodha');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editSipDate, setEditSipDate] = useState<number>(5);
  const [editAssetClass, setEditAssetClass] = useState<'Equity' | 'Debt' | 'Gold' | 'Cash'>('Equity');
  const [editBroker, setEditBroker] = useState('');

  // Multi-toast alert simulations
  const [alertSent, setAlertSent] = useState<string | null>(null);

  const openEditForm = (sip: Sip) => {
    setEditingSip(sip);
    setEditName(sip.name);
    setEditAmount(String(sip.amount));
    setEditStartDate(sip.startDate);
    setEditSipDate(sip.sipDate);
    setEditAssetClass(sip.assetClass);
    setEditBroker(sip.broker);
  };

  const closeEditForm = () => {
    setEditingSip(null);
  };

  // Function to calculate completed SIP payments
  const getSipInceptionStats = (sip: Sip) => {
    const start = new Date(sip.startDate);
    const today = new Date();

    let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    if (today.getDate() >= sip.sipDate) {
      months += 1;
    }
    months = Math.max(1, months);

    const totalInvested = sip.amount * months;

    const yields = { Equity: 0.15, Debt: 0.075, Gold: 0.11, Cash: 0.045 };
    const annualRate = yields[sip.assetClass] || 0.12;
    const monthlyRate = annualRate / 12;

    let currentValue = 0;
    if (monthlyRate > 0) {
      currentValue = sip.amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    } else {
      currentValue = totalInvested;
    }

    currentValue = parseFloat(currentValue.toFixed(2));
    const absReturn = currentValue - totalInvested;
    const absReturnPercent = totalInvested > 0 ? (absReturn / totalInvested) * 105 : 0;

    const cashflows: number[] = [];
    const datesStr: string[] = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, sip.sipDate);
      if (d <= today) {
        cashflows.push(-sip.amount);
        datesStr.push(d.toISOString().substring(0, 10));
      }
    }
    cashflows.push(currentValue);
    datesStr.push(today.toISOString().substring(0, 10));

    const xirr = calculateXIRR(cashflows, datesStr);

    return { months, totalInvested, currentValue, absReturn, absReturnPercent, xirr };
  };

  const processedSips = sips.map(s => ({ ...s, ...getSipInceptionStats(s) }));

  const totals = processedSips.reduce((acc, s) => {
    acc.totalInvested += s.totalInvested;
    acc.totalCurrent += s.currentValue;
    acc.totalSipPerMonth += s.amount;
    return acc;
  }, { totalInvested: 0, totalCurrent: 0, totalSipPerMonth: 0 });

  const totalSipPnL = totals.totalCurrent - totals.totalInvested;
  const overallSipXirr = React.useMemo(() => {
    if (processedSips.length === 0) return 0;
    const allCfs: number[] = [];
    const allDates: string[] = [];
    processedSips.forEach(s => {
      const start = new Date(s.startDate);
      const today = new Date();
      for (let i = 0; i < s.months; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, s.sipDate);
        if (d <= today) {
          allCfs.push(-s.amount);
          allDates.push(d.toISOString().substring(0, 10));
        }
      }
    });
    allCfs.push(totals.totalCurrent);
    allDates.push(new Date().toISOString().substring(0, 10));
    return calculateXIRR(allCfs, allDates);
  }, [processedSips, totals.totalCurrent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    await onAddSip({ name, amount: parseFloat(amount), startDate, sipDate: parseInt(sipDate as any), assetClass, broker });
    setIsAdding(false);
    setName(''); setAmount('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSip || !editName || !editAmount) return;
    await onEditSip(editingSip.id, {
      name: editName.trim(),
      amount: parseFloat(editAmount),
      startDate: editStartDate,
      sipDate: editSipDate,
      assetClass: editAssetClass,
      broker: editBroker
    });
    closeEditForm();
  };

  const triggerNotificationAlert = (sipName: string, date: number) => {
    setAlertSent(sipName);
    setTimeout(() => setAlertSent(null), 4500);
    window.dispatchEvent(new CustomEvent('sip-notification-trigger', { detail: { sipName, date } }));
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(640, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (_) {}
  };

  const activeSipDays = sips.map(s => s.sipDate);

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      <AnimatePresence>
        {alertSent && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 border border-slate-800 text-white p-2 rounded-xl shadow-2xl flex items-center gap-1.5 max-w-sm">
            <div className="p-1.5 bg-emerald-500 rounded-full text-white"><CheckCircle size={16} /></div>
            <div>
              <p className="font-bold text-xs font-sans text-emerald-400">SIP Reminder Scheduled</p>
              <p className="text-[10px] text-slate-300 mt-0.5">We will notify you before "{alertSent}" SIP auto-debit!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit SIP Modal */}
      <AnimatePresence>
        {editingSip && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <Edit2 size={16} className="text-indigo-600" /> Edit SIP
                </h3>
                <button onClick={closeEditForm} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"><X size={16} /></button>
              </div>
              <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">SIP Scheme Name</label>
                  <input required value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g., Parag Parikh Flexi Cap Fund"
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Monthly Amount (₹)</label>
                  <input required type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="5000"
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">SIP Day of Month (1-28)</label>
                  <input required type="number" min="1" max="28" value={editSipDate} onChange={e => setEditSipDate(parseInt(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                  <input required type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Asset Class</label>
                  <select value={editAssetClass} onChange={e => setEditAssetClass(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none">
                    <option value="Equity">Equity</option>
                    <option value="Debt">Debt</option>
                    <option value="Gold">Gold</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">Broker Platform</label>
                  <select value={editBroker} onChange={e => setEditBroker(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white focus:outline-none">
                    <option value="Zerodha">Zerodha (Coin)</option>
                    <option value="Groww">Groww</option>
                    <option value="Upstox">Upstox</option>
                    <option value="Kuvera">Kuvera</option>
                    <option value="Direct">Direct AMC</option>
                  </select>
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

      {/* SIP Net Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-slate-900 text-white rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Monthly SIP Outflow</p>
          <p className="text-2xl font-black mt-1 font-display">₹{totals.totalSipPerMonth.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-1.5">Sum of all systematic commitments.</p>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">SIP Invested Capital</p>
          <p className="text-2xl font-black mt-1 font-display text-slate-900">₹{totals.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-slate-500 mt-1.5">Total auto-accrued principal base.</p>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current SIP Valuation</p>
          <p className="text-2xl font-black mt-1 font-display text-slate-900">₹{totals.totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-bold">₹{totalSipPnL.toLocaleString('en-IN', { maximumFractionDigits: 1 })} gain</span>
          </div>
        </div>
        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Estimated SIP XIRR</p>
          <p className="text-2xl font-black mt-1 font-display text-emerald-600">{overallSipXirr > 0 ? '+' : ''}{overallSipXirr.toFixed(2)}%</p>
          <p className="text-[10px] text-slate-500 mt-1.5">Weighted average annualized CAGR.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-2 py-2 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-1">
                <CalIcon className="text-slate-800" size={18} />
                <h3 className="font-bold text-sm text-slate-800 font-display">Systematic Investment Portfolios</h3>
              </div>
              <button onClick={() => setIsAdding(!isAdding)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer">
                <Plus size={13} /> Add SIP
              </button>
            </div>

            {/* Add SIP form */}
            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-100 bg-slate-50/20">
                  <form onSubmit={handleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-sans">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">SIP Scheme Name</label>
                      <input type="text" required placeholder="e.g., Parag Parikh Flexi Cap Fund" value={name} onChange={e => setName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Monthly Cost (₹)</label>
                      <input type="number" required placeholder="5000" value={amount} onChange={e => setAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">SIP Day of Month (1-28)</label>
                      <input type="number" min="1" max="28" required placeholder="5" value={sipDate} onChange={e => setSipDate(parseInt(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">SIP Start Date</label>
                      <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs" />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Asset Allocation</label>
                      <select value={assetClass} onChange={e => setAssetClass(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs">
                        <option value="Equity">Equity (Growth Fund)</option>
                        <option value="Debt">Debt (Bond Fund, PPF)</option>
                        <option value="Gold">Gold Account (GBS)</option>
                        <option value="Cash">Cash (Liquid SIP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Broker Platform</label>
                      <select value={broker} onChange={e => setBroker(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs">
                        <option value="Zerodha">Zerodha (Coin)</option>
                        <option value="Groww">Groww (MF)</option>
                        <option value="Upstox">Upstox (MF)</option>
                        <option value="Kuvera">Kuvera</option>
                        <option value="Direct">Direct AMC Portal</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-3 flex justify-end gap-1 border-t border-slate-100 pt-1">
                      <button type="button" onClick={() => setIsAdding(false)} className="px-2 py-1 border border-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer">Cancel</button>
                      <button type="submit" className="px-2 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer">Start New SIP</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            {processedSips.length === 0 ? (
              <div className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <div className="p-1 bg-slate-50 rounded-full text-slate-500"><CalIcon size={24} /></div>
                <h3 className="text-xs font-bold text-slate-700">No active SIPs</h3>
                <p className="text-[10px] text-slate-500 max-w-xs">Establish monthly systematic investment schedules to auto-accrue portfolio valuations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/40 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                      <th className="p-2">SIP Information</th>
                      <th className="p-2">Execution Rules</th>
                      <th className="p-2 text-right">Amortized Cost</th>
                      <th className="p-2 text-right">Current Value</th>
                      <th className="p-2 text-center">Simulated IRR</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedSips.map((sip) => (
                      <tr key={sip.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-2 max-w-[180px]">
                          <p className="font-bold text-slate-800 truncate" title={sip.name}>{sip.name}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">Asset: {sip.assetClass} • Platform: {sip.broker}</p>
                        </td>
                        <td className="p-2">
                          <p className="font-bold text-slate-700">Day {sip.sipDate} monthly</p>
                          <p className="text-[10px] text-slate-500">Elapsed: {sip.months} installments</p>
                        </td>
                        <td className="p-2 text-right font-semibold font-mono text-[11px]">
                          <div>₹{sip.totalInvested.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-slate-500">₹{sip.amount.toLocaleString('en-IN')}/mo</div>
                        </td>
                        <td className="p-2 text-right">
                          <p className="font-bold font-mono text-[11px] text-slate-800">₹{sip.currentValue.toLocaleString('en-IN')}</p>
                          <p className="text-[9px] font-bold text-emerald-600">+{sip.absReturnPercent.toFixed(1)}% absolute</p>
                        </td>
                        <td className="p-2 text-center font-bold font-mono text-[10px] text-blue-700">
                          <span className="px-1.5 py-0.5 bg-blue-50 rounded-md">{sip.xirr > 0 ? '+' : ''}{sip.xirr.toFixed(1)}% XIRR</span>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => triggerNotificationAlert(sip.name, sip.sipDate)}
                              className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer" title="Schedule SIP Reminder">
                              <Bell size={10} className="text-slate-500" />
                            </button>
                            <button onClick={() => openEditForm(sip)}
                              className="p-1 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-md transition-colors cursor-pointer" title="Edit SIP">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => onDeleteSip(sip.id)}
                              className="text-slate-350 hover:text-red-500 p-1 rounded-md cursor-pointer transition-colors" title="Delete SIP">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Side Panel */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <CalIcon size={16} className="text-slate-700" />
              <h3 className="font-bold text-xs text-slate-700 font-display">SIP Calendar Highlight</h3>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">Days on which a systematic plan executes are highlighted so you can budget your bank balance accordingly.</p>
            <div className="grid grid-cols-7 gap-1.5 text-center mt-1 font-mono">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const hasSip = activeSipDays.includes(day);
                const matchedSipsCount = sips.filter(s => s.sipDate === day).length;
                return (
                  <div key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all text-[11px] font-bold ${hasSip ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
                    title={hasSip ? `${matchedSipsCount} SIP(s) on Day ${day}` : `Day ${day}`}>
                    <span>{day}</span>
                    {hasSip && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 animate-pulse" />}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 pt-1 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                <Sparkles size={11} className="text-emerald-500" />
                <span>UPCOMING DEBITS</span>
              </div>
              {sips.length === 0 ? (
                <p className="text-[10px] text-slate-500">No scheduled debits.</p>
              ) : (
                sips.map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-[11px] p-1 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{s.name}</span>
                    <span className="font-bold text-right font-mono">₹{s.amount.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">on Day {s.sipDate}</span></span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
