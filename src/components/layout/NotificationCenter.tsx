import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCircle, Calendar, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { RecurringBill, PendingPayment } from '../../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  recurringBills: RecurringBill[];
  pendingPayments: PendingPayment[];
  onPayBill: (bill: RecurringBill) => Promise<void>;
  onSkipBill: (bill: RecurringBill, newDate?: string) => Promise<void>;
  onPayPending: (payment: PendingPayment) => Promise<void>;
  onRejectPending: (payment: PendingPayment) => Promise<void>;
  onReschedulePending: (payment: PendingPayment, newDate: string) => Promise<void>;
}

export default function NotificationCenter({
  isOpen,
  onClose,
  recurringBills,
  pendingPayments,
  onPayBill,
  onSkipBill,
  onPayPending,
  onRejectPending,
  onReschedulePending
}: NotificationCenterProps) {
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const dueBills = useMemo(() => {
    return recurringBills.filter(b => b.nextDueDate <= todayStr);
  }, [recurringBills, todayStr]);

  const duePayments = useMemo(() => {
    return pendingPayments.filter(p => !p.completed && p.dueDate <= todayStr);
  }, [pendingPayments, todayStr]);

  const [rescheduleData, setRescheduleData] = useState<{id: string, date: string} | null>(null);
  const [skipData, setSkipData] = useState<{id: string, date: string} | null>(null);

  const totalNotifications = dueBills.length + duePayments.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />

          {/* Slide Over Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-50 shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell size={20} className="text-slate-800" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white" />
                  )}
                </div>
                <h2 className="font-extrabold text-slate-800 text-lg font-sans">Notifications</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {totalNotifications === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-60">
                  <Bell size={40} />
                  <p className="text-sm font-bold">All caught up!</p>
                </div>
              ) : (
                <>
                  {/* Due Bills & Salaries */}
                  {dueBills.map(b => {
                    const isIncome = b.type === 'income';
                    return (
                      <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isIncome ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                        <div className="pl-1">
                          <h4 className="font-bold text-sm text-slate-800">
                            {isIncome ? 'Salary / Income Due' : 'Bill Due'}: {b.title}
                          </h4>
                          <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                            Amount: <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                              {isIncome ? '+' : '-'}₹{b.amount.toLocaleString()}
                            </span>
                          </p>
                          {skipData?.id === b.id ? (
                            <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-1">
                              <input 
                                type="date" 
                                min={todayStr}
                                value={skipData.date}
                                onChange={(e) => setSkipData({ id: b.id, date: e.target.value })}
                                className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none"
                              />
                              <button 
                                onClick={() => {
                                  onSkipBill(b, skipData.date);
                                  setSkipData(null);
                                }}
                                className="bg-slate-900 text-white p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setSkipData(null)}
                                className="bg-slate-200 text-slate-600 p-1.5 rounded hover:bg-slate-300 transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => onPayBill(b)}
                                className={`flex-1 flex justify-center items-center gap-1 text-[11px] font-bold uppercase tracking-wider py-1.5 rounded text-white ${isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'} transition-colors cursor-pointer`}
                              >
                                <CheckCircle size={14} /> {isIncome ? 'Received' : 'Paid'}
                              </button>
                              <button
                                onClick={() => setSkipData({ id: b.id, date: todayStr })}
                                className="flex-1 flex justify-center items-center gap-1 text-[11px] font-bold uppercase tracking-wider py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                <Calendar size={14} /> Shift / Skip
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Due Pending Payments (Future One-off) */}
                  {duePayments.map(p => {
                    const isOwedToMe = p.type === 'owed';
                    const isRescheduling = rescheduleData?.id === p.id;
                    
                    return (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOwedToMe ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                        <div className="pl-1">
                          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                            <AlertTriangle size={14} className={isOwedToMe ? 'text-indigo-500' : 'text-rose-500'} />
                            {isOwedToMe ? 'Pending Income Due' : 'Pending Payment Due'}
                          </h4>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5">Person: {p.person}</p>
                          <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                            Amount: <span className={isOwedToMe ? 'text-indigo-600' : 'text-rose-600'}>
                              {isOwedToMe ? '+' : '-'}₹{p.amount.toLocaleString()}
                            </span>
                          </p>

                          {isRescheduling ? (
                            <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-1">
                              <input 
                                type="date" 
                                min={todayStr}
                                value={rescheduleData.date}
                                onChange={(e) => setRescheduleData({ id: p.id, date: e.target.value })}
                                className="flex-1 text-xs px-2 py-1.5 border border-slate-300 rounded focus:outline-none"
                              />
                              <button 
                                onClick={() => {
                                  onReschedulePending(p, rescheduleData.date);
                                  setRescheduleData(null);
                                }}
                                className="bg-slate-900 text-white p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => setRescheduleData(null)}
                                className="bg-slate-200 text-slate-600 p-1.5 rounded hover:bg-slate-300 transition-colors cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => onPayPending(p)}
                                className={`flex justify-center items-center gap-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded text-white ${isOwedToMe ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'} transition-colors cursor-pointer`}
                              >
                                <CheckCircle size={12} /> {isOwedToMe ? 'Got it' : 'Paid'}
                              </button>
                              <button
                                onClick={() => setRescheduleData({ id: p.id, date: todayStr })}
                                className="flex justify-center items-center gap-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                              >
                                <Calendar size={12} /> Shift
                              </button>
                              <button
                                onClick={() => onRejectPending(p)}
                                className="flex justify-center items-center gap-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
