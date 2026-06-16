import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalIcon, Plus, Trash2, ArrowUpRight, TrendingUp, Sparkles, 
  AlertCircle, ChevronLeft, ChevronRight, Bell, CheckCircle
} from 'lucide-react';
import { Sip } from '../types';
import { calculateXIRR } from '../utils/financeHelpers';

interface SipTrackerProps {
  sips: Sip[];
  onAddSip: (sip: Omit<Sip, 'id' | 'userId'>) => Promise<void>;
  onDeleteSip: (id: string) => Promise<void>;
}

export default function SipTracker({ sips, onAddSip, onDeleteSip }: SipTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [sipDate, setSipDate] = useState<number>(5);
  const [assetClass, setAssetClass] = useState<'Equity' | 'Debt' | 'Gold' | 'Cash'>('Equity');
  const [broker, setBroker] = useState('Zerodha');

  // Multi-toast alert simulations
  const [alertSent, setAlertSent] = useState<string | null>(null);

  // Function to calculate completed SIP payments
  const getSipInceptionStats = (sip: Sip) => {
    const start = new Date(sip.startDate);
    const today = new Date();

    // Months difference
    let months = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    
    // If today is equal to or past the monthly SIP deduction date, count it
    if (today.getDate() >= sip.sipDate) {
      months += 1;
    }
    months = Math.max(1, months);

    const totalInvested = sip.amount * months;

    // Simulate an organic returns sequence based on asset class typical yields:
    // Equity: 15% CAGR, Debt: 7.5% CAGR, Gold: 11% CAGR, Cash: 4.5% CAGR
    const yields = { Equity: 0.15, Debt: 0.075, Gold: 0.11, Cash: 0.045 };
    const annualRate = yields[sip.assetClass] || 0.12;
    const monthlyRate = annualRate / 12;

    // Future value of an ordinary annuity: FV = P * [((1 + r)^n - 1) / r] * (1 + r)
    let currentValue = 0;
    if (monthlyRate > 0) {
      currentValue = sip.amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    } else {
      currentValue = totalInvested;
    }

    // Clean up extreme rounding variances
    currentValue = parseFloat(currentValue.toFixed(2));
    const absReturn = currentValue - totalInvested;
    const absReturnPercent = totalInvested > 0 ? (absReturn / totalInvested) * 105 : 0;

    // Generate actual monthly dates matching the SIP deduction and feed to XIRR solver
    const cashflows: number[] = [];
    const datesStr: string[] = [];

    // Map each month index back to date
    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, sip.sipDate);
      // Ensure we don't map past today
      if (d <= today) {
        cashflows.push(-sip.amount);
        datesStr.push(d.toISOString().substring(0, 10));
      }
    }
    // Add current FV terminal inflow today
    cashflows.push(currentValue);
    datesStr.push(today.toISOString().substring(0, 10));

    const xirr = calculateXIRR(cashflows, datesStr);

    return {
      months,
      totalInvested,
      currentValue,
      absReturn,
      absReturnPercent,
      xirr
    };
  };

  const processedSips = sips.map(s => {
    const stats = getSipInceptionStats(s);
    return {
      ...s,
      ...stats
    };
  });

  // Aggregates
  const totals = processedSips.reduce((acc, s) => {
    acc.totalInvested += s.totalInvested;
    acc.totalCurrent += s.currentValue;
    acc.totalSipPerMonth += s.amount;
    return acc;
  }, { totalInvested: 0, totalCurrent: 0, totalSipPerMonth: 0 });

  const totalSipPnL = totals.totalCurrent - totals.totalInvested;
  const overallSipXirr = React.useMemo(() => {
    if (processedSips.length === 0) return 0;
    // Bundle all cashflows
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

    await onAddSip({
      name,
      amount: parseFloat(amount),
      startDate,
      sipDate: parseInt(sipDate as any),
      assetClass,
      broker
    });

    setIsAdding(false);
    setName('');
    setAmount('');
  };

  // Simulated Alert Notification Trigger
  const triggerNotificationAlert = (sipName: string, date: number) => {
    setAlertSent(sipName);
    setTimeout(() => {
      setAlertSent(null);
    }, 4500);

    // Note: Since SipTracker doesn't use usePushNotifications directly, we can fire a standard Notification if we want, or pass a handler from App.tsx. 
    // To avoid hooks rules errors or messing up the imports, I will dispatch a custom event.
    window.dispatchEvent(new CustomEvent('sip-notification-trigger', { detail: { sipName, date } }));

    // Beep acoustically if web audio API is loaded
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

  // Get current calendar highlight days
  const activeSipDays = sips.map(s => s.sipDate);

  return (
    <div className="space-y-3">
      {/* Toast Notification Simulation Box */}
      <AnimatePresence>
        {alertSent && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 border border-slate-800 text-white p-2 rounded-xl shadow-2xl flex items-center gap-1.5 max-w-sm"
          >
            <div className="p-1.5 bg-emerald-500 rounded-full text-white">
              <CheckCircle size={16} />
            </div>
            <div>
              <p className="font-bold text-xs font-sans text-emerald-400">SIP Reminder Scheduled (FCM)</p>
              <p className="text-[10px] text-slate-300 mt-0.5">We will notify you 2 days prior to "{alertSent}" SIP auto-debit window!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIP Net Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-slate-900 text-white rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Monthly SIP Outflow</p>
          <p className="text-2xl font-black mt-1 font-display">₹{totals.totalSipPerMonth.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Sum of all systematic commitments.</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">SIP Invested Capital</p>
          <p className="text-2xl font-black mt-1 font-display text-slate-900">₹{totals.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Total auto-accrued principal base.</p>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Current SIP Valuation</p>
          <p className="text-2xl font-black mt-1 font-display text-slate-900">₹{totals.totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-bold">
              ₹{totalSipPnL.toLocaleString('en-IN', { maximumFractionDigits: 1 })} gain
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Estimated SIP XIRR</p>
          <p className="text-2xl font-black mt-1 font-display text-emerald-600">
            {overallSipXirr > 0 ? '+' : ''}{overallSipXirr.toFixed(2)}%
          </p>
          <p className="text-[10px] text-slate-400 mt-1.5">Weighted average mutual fund annualized CAGR.</p>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Left SIP Listing Panel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-2 py-2 border-b border-slate-150 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-1">
                <CalIcon className="text-slate-800" size={18} />
                <h3 className="font-bold text-sm text-slate-800 font-display">Systematic Investment Portfolios</h3>
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-1 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={13} /> Add SIP
              </button>
            </div>

            {/* Expandable Add SIP form */}
            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-100 bg-slate-50/20"
                >
                  <form onSubmit={handleSubmit} className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-sans">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">SIP Scheme Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Parag Parikh Flexi Cap Fund"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Monthly Cost (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">SIP Day of Month (1-28)</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        required
                        placeholder="5"
                        value={sipDate}
                        onChange={(e) => setSipDate(parseInt(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">SIP Start Date</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Asset Allocation</label>
                      <select
                        value={assetClass}
                        onChange={(e) => setAssetClass(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      >
                        <option value="Equity">Equity (Growth Fund)</option>
                        <option value="Debt">Debt (Bond Fund, PPF)</option>
                        <option value="Gold">Gold Account (GBS)</option>
                        <option value="Cash">Cash (Liquid SIP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">Broker Platform</label>
                      <select
                        value={broker}
                        onChange={(e) => setBroker(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      >
                        <option value="Zerodha">Zerodha (Coin)</option>
                        <option value="Groww">Groww (MF)</option>
                        <option value="Upstox">Upstox (MF)</option>
                        <option value="Kuvera">Kuvera</option>
                        <option value="Direct">Direct AMC Portal</option>
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-3 flex justify-end gap-1 border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="px-2 py-1 border border-slate-200 text-slate-500 rounded-lg font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        Start New SIP
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            {processedSips.length === 0 ? (
              <div className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                <div className="p-1 bg-slate-50 rounded-full text-slate-400">
                  <CalIcon size={24} />
                </div>
                <h3 className="text-xs font-bold text-slate-700">No active SIPs</h3>
                <p className="text-[10px] text-slate-400 max-w-xs">Establish your monthly systematic investment schedules to auto-accrue portfolio valuations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 bg-slate-50/40 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                      <th className="p-2">SIP Information</th>
                      <th className="p-2">Execution Rules</th>
                      <th className="p-2 text-right">Amortized Cost</th>
                      <th className="p-2 text-right">Current Value</th>
                      <th className="p-2 text-center">Simulated IRR</th>
                      <th className="p-2 text-center">Alerts</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedSips.map((sip) => (
                      <tr key={sip.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-2 max-w-[180px]">
                          <p className="font-bold text-slate-800 truncate" title={sip.name}>{sip.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Asset: {sip.assetClass} • Platform: {sip.broker}</p>
                        </td>
                        <td className="p-2">
                          <p className="font-bold text-slate-700">Day {sip.sipDate} monthly</p>
                          <p className="text-[10px] text-slate-400">Elapsed: {sip.months} installments</p>
                        </td>
                        <td className="p-2 text-right font-semibold font-mono text-[11px]">
                          <div>₹{sip.totalInvested.toLocaleString('en-IN')}</div>
                          <div className="text-[9px] text-slate-400">₹{sip.amount.toLocaleString('en-IN')}/mo</div>
                        </td>
                        <td className="p-2 text-right">
                          <p className="font-bold font-mono text-[11px] text-slate-800">
                            ₹{sip.currentValue.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-600">
                            +{sip.absReturnPercent.toFixed(1)}% absolute
                          </p>
                        </td>
                        <td className="p-2 text-center font-bold font-mono text-[10px] text-blue-700">
                          <span className="px-1.5 py-0.5 bg-blue-50 rounded-md">
                            {sip.xirr > 0 ? '+' : ''}{sip.xirr.toFixed(1)}% XIRR
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => triggerNotificationAlert(sip.name, sip.sipDate)}
                            className="p-1 px-1 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                            title="Mock immediate SMS/Notification reminder test"
                          >
                            <Bell size={10} className="text-slate-400" /> Notify
                          </button>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => onDeleteSip(sip.id)}
                            className="text-slate-350 hover:text-red-500 p-1 rounded-md cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
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
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Below is a monthly matrix. Days on which a systematic plan executes are highlighted so you can budget your bank balance accordingly.
            </p>

            <div className="grid grid-cols-7 gap-1.5 text-center mt-1 font-mono">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const hasSip = activeSipDays.includes(day);
                const matchedSipsCount = sips.filter(s => s.sipDate === day).length;
                return (
                  <div
                    key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all text-[11px] font-bold ${hasSip ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}
                    title={hasSip ? `${matchedSipsCount} SIP(s) executing on Day ${day}` : `Day ${day}`}
                  >
                    <span>{day}</span>
                    {hasSip && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* List upcoming */}
            <div className="border-t border-slate-100 pt-1 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Sparkles size={11} className="text-emerald-500" />
                <span>UPCOMING DEBITS</span>
              </div>
              {sips.length === 0 ? (
                <p className="text-[10px] text-slate-400">No scheduled debits.</p>
              ) : (
                sips.map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-[11px] p-1 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-700 truncate max-w-[120px]">{s.name}</span>
                    <span className="font-bold text-right font-mono">₹{s.amount.toLocaleString()} <span className="text-[9px] font-normal text-slate-400">on Day {s.sipDate}</span></span>
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
