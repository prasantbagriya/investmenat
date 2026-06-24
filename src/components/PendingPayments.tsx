import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  TrendingUp, 
  TrendingDown, 
  DollarSign 
} from 'lucide-react';
import { PendingPayment } from '../types';
import { useGoogleContacts } from '../hooks/useGoogleContacts';

interface PendingPaymentsProps {
  user?: any;
  pendingPayments: PendingPayment[];
  onAddPayment: (p: Omit<PendingPayment, 'id' | 'userId'>) => Promise<void>;
  onEditPayment: (id: string, p: Partial<PendingPayment>) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
}

export default function PendingPayments({
  user,
  pendingPayments,
  onAddPayment,
  onEditPayment,
  onDeletePayment
}: PendingPaymentsProps) {
  const { contacts } = useGoogleContacts(user);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'owe' | 'owed'>('owe');
  const [person, setPerson] = useState('');
  const [contactResourceName, setContactResourceName] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Tab View selectors (active/settled)
  const [activeTab, setActiveTab] = useState<'active' | 'settled'>('active');

  // Today boundary for calculations
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Form submission matching Add or Edit actions
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive decimal amount.');
      return;
    }
    if (!person.trim()) {
      alert('Please enter the name of the person.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onEditPayment(editingId, {
          type,
          person: person.trim(),
          contactResourceName: contactResourceName || undefined,
          amount: parsedAmount,
          dueDate,
          notes: notes.trim() || undefined
        });
        setEditingId(null);
      } else {
        await onAddPayment({
          type,
          person: person.trim(),
          contactResourceName: contactResourceName || undefined,
          amount: parsedAmount,
          dueDate,
          completed: false,
          notes: notes.trim() || undefined
        });
      }
      setIsFormOpen(false);
      setPerson('');
      setContactResourceName('');
      setAmount('');
      setNotes('');
      setDueDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      console.error(err);
      alert('Error syncing payment to cloud. Verify security rules.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger editing action
  const startEdit = (p: PendingPayment) => {
    setEditingId(p.id);
    setType(p.type);
    setPerson(p.person);
    setContactResourceName(p.contactResourceName || '');
    setAmount(p.amount.toString());
    setDueDate(p.dueDate);
    setNotes(p.notes || '');
    setIsFormOpen(true);
  };

  // Toggle mark as done
  const handleToggleCompleted = async (p: PendingPayment) => {
    try {
      await onEditPayment(p.id, { completed: !p.completed });
    } catch (err) {
      console.error(err);
      alert('Error updating status in Firestore.');
    }
  };

  // Aggregated Debt Summary Stats
  const stats = useMemo(() => {
    let totalOwe = 0; // Money we owe to others
    let totalOwed = 0; // Money others owe to us
    let activeOverdue = 0;

    pendingPayments.forEach(p => {
      if (!p.completed) {
        if (p.type === 'owe') {
          totalOwe += p.amount;
        } else {
          totalOwed += p.amount;
        }

        if (p.dueDate < todayStr) {
          activeOverdue += 1;
        }
      }
    });

    return {
      totalOwe,
      totalOwed,
      activeOverdue,
      netBalance: totalOwed - totalOwe
    };
  }, [pendingPayments, todayStr]);

  // Filtering list by current activeTab
  const filteredPayments = useMemo(() => {
    return pendingPayments
      .filter(p => activeTab === 'active' ? !p.completed : p.completed)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [pendingPayments, activeTab]);

  // Group by Person
  const groupedPayments = useMemo(() => {
    const groups: Record<string, PendingPayment[]> = {};
    filteredPayments.forEach(p => {
      const key = p.person || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredPayments]);

  return (
    <div className="space-y-3" id="payments-tab">
      
      {/* Header and Trigger button */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Payment Ledger</h2>
          <p className="text-xl font-bold text-slate-900 tracking-tight font-sans mt-0.5">Outstanding Balances</p>
          <p className="text-xs text-slate-450 mt-1 font-sans font-medium">Clear track of payments due or receivable, with date and alerts.</p>
        </div>
        
        <button
          onClick={() => {
            setEditingId(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white px-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer"
          id="new-payment-button"
        >
          <Plus size={14} /> Record Balance
        </button>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Money you owe */}
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">I owe others</span>
            <span className="text-[10px] bg-red-50 text-red-700 px-1 py-0.5 rounded-full uppercase tracking-wider font-semibold scale-90">Debit Ledger</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-950 font-sans block">
              ₹{stats.totalOwe.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Money owed to you */}
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Others owe me</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded-full uppercase tracking-wider font-semibold scale-90">Credit Ledger</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-950 font-sans block">
              ₹{stats.totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Net Outstanding Balance */}
        <div className="bg-white p-2 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Net Balance</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded-full uppercase tracking-wider font-semibold scale-90 font-sans">Ledger</span>
          </div>
          <div className="mt-1">
            <span className={`text-2xl font-bold tracking-tight font-sans block ${stats.netBalance >= 0 ? 'text-slate-950' : 'text-rose-600'}`}>
              {stats.netBalance < 0 ? '-' : ''}₹{Math.abs(stats.netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </div>

      {/* Slide-out Add/Edit form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-xs"
            id="payment-form-panel"
          >
            <form onSubmit={handleSubmit} className="p-2 space-y-2" id="payment-form">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-900 font-sans text-xs uppercase tracking-wider">
                  {editingId ? 'Edit Balance Record' : 'Record Outstanding Balance'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                
                {/* Owe / Owed type selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Ledger Classification</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setType('owe')}
                      className={`py-1 text-xs font-semibold rounded cursor-pointer transition-all ${type === 'owe' ? 'bg-slate-950 text-white' : 'text-slate-650 hover:bg-slate-100'}`}
                      id="form-payment-owe-type"
                    >
                      I Owe
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('owed')}
                      className={`py-1 text-xs font-semibold rounded cursor-pointer transition-all ${type === 'owed' ? 'bg-slate-950 text-white' : 'text-slate-650 hover:bg-slate-100'}`}
                      id="form-payment-owed-type"
                    >
                      Owed to Me
                    </button>
                  </div>
                </div>

                {/* Target Person */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Name / Entity</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel, Amazon..."
                      value={person}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      onChange={(e) => {
                        setPerson(e.target.value);
                        setIsDropdownOpen(true);
                        const matched = contacts.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                        if (matched) setContactResourceName(matched.resourceName);
                        else setContactResourceName('');
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-sans"
                      id="form-person-input"
                      autoComplete="off"
                    />
                    
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                        >
                          {contacts
                            .filter(c => c.name.toLowerCase().includes(person.toLowerCase()))
                            .map(c => (
                              <div 
                                key={c.resourceName} 
                                className="px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                onClick={() => {
                                  setPerson(c.name);
                                  setContactResourceName(c.resourceName);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <div className="font-bold text-slate-800">{c.name}</div>
                                {(c.phone || c.email) && (
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">{c.phone || c.email}</div>
                                )}
                              </div>
                            ))}
                          
                          {/* "Add New Name" Button if no exact match */}
                          {(!contacts.some(c => c.name.toLowerCase() === person.toLowerCase()) && person.trim().length > 0) && (
                            <div 
                              className="px-3 py-2.5 text-xs cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold flex items-center gap-1.5 transition-colors sticky bottom-0"
                              onClick={() => {
                                setContactResourceName('');
                                setIsDropdownOpen(false);
                              }}
                            >
                              <Plus size={12} className="shrink-0" /> Add "{person}" as new name
                            </div>
                          )}
                          
                          {(contacts.length === 0 && person.length === 0) && (
                            <div className="px-3 py-3 text-xs text-slate-700 italic text-center border-b border-slate-100">
                              Start typing to add a new name manually.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {contacts.length === 0 && (
                    <p className="text-[9px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
                      <AlertTriangle size={10} /> Google Contacts disconnected. Refresh token in Settings.
                    </p>
                  )}
                </div>

                {/* Due Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-450 text-xs font-sans font-semibold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white font-mono transition-all"
                      id="form-payment-amount-input"
                    />
                  </div>
                </div>

                {/* Calendar Due Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono"
                    id="form-payment-duedate"
                  />
                </div>

              </div>

              {/* Optional Memo Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Memo Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. dinner bill, refunds..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-sans"
                  id="form-payment-notes"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-1 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-1 py-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-2 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded text-xs transition-colors disabled:opacity-40 cursor-pointer"
                  id="form-payment-submit"
                >
                  {isSubmitting ? 'Syncing...' : editingId ? 'Update Ledger' : 'Create Record'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Display & Interactive Tab Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden" id="payments-ledger-container">
        
        {/* Toggle Headings */}
        <div className="px-2 py-1.5 flex border-b border-slate-250/60 justify-between items-center bg-slate-50/40">
          <div className="flex bg-slate-100/80 p-0.5 rounded-md">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-1.5 px-1 py-1 text-[11px] font-bold rounded-sm cursor-pointer transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
              id="active-tab-selector"
            >
              <Clock size={12} /> Active ({pendingPayments.filter(p => !p.completed).length})
            </button>
            <button
              onClick={() => setActiveTab('settled')}
              className={`flex items-center gap-1.5 px-1 py-1 text-[11px] font-bold rounded-sm cursor-pointer transition-all ${activeTab === 'settled' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-900'}`}
              id="settled-tab-selector"
            >
              <CheckCircle size={12} /> Settled ({pendingPayments.filter(p => p.completed).length})
            </button>
          </div>

          {activeTab === 'active' && stats.activeOverdue > 0 && (
            <span className="flex items-center gap-1 bg-red-50 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full border border-red-100 font-bold uppercase tracking-wider">
              <AlertTriangle size={11} /> {stats.activeOverdue} Overdue
            </span>
          )}
        </div>

        {/* Content list */}
        {filteredPayments.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white">
            <p className="text-xs">No ledger entries match this state.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(Object.entries(groupedPayments) as [string, PendingPayment[]][]).map(([personName, payments]) => {
              // Calculate group net balance
              let netGroup = 0;
              payments.forEach(p => {
                 if (p.type === 'owe') netGroup -= p.amount;
                 else netGroup += p.amount;
              });

              return (
                <div key={personName} className="p-2">
                  <div className="flex justify-between items-center mb-2 px-1 border-b border-slate-100 pb-1">
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><User size={14} className="text-slate-500"/> {personName}</span>
                    <span className={`text-xs font-bold ${netGroup > 0 ? 'text-emerald-600' : netGroup < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      Net: {netGroup < 0 ? '-' : ''}₹{Math.abs(netGroup).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {payments.map((p) => {
                      const isOverdue = !p.completed && p.dueDate < todayStr;
                      return (
                        <div 
                          key={p.id} 
                          className={`p-2 flex md:flex-row flex-col justify-between items-start md:items-center gap-2 rounded-lg transition-all ${isOverdue ? 'bg-red-50/50' : 'bg-slate-50/50'}`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => handleToggleCompleted(p)}
                              className={`mt-1 h-4 w-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${p.completed ? 'bg-slate-950 border-slate-950 text-white' : 'border-slate-300 hover:border-slate-400 bg-white'}`}
                              title={p.completed ? 'Mark pending' : 'Mark settled'}
                            >
                              {p.completed && <CheckCircle size={11} />}
                            </button>

                            <div>
                              <div className="flex items-center gap-1">
                                {p.type === 'owe' ? (
                                  <span className="bg-rose-100 text-rose-700 text-[9px] px-1 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-0.5"><TrendingDown size={9}/> I Owe</span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-0.5"><TrendingUp size={9}/> Claim</span>
                                )}
                              </div>
                              {p.notes && <p className="text-xs text-slate-600 mt-1">{p.notes}</p>}
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-700 font-mono">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} /> Due: {p.dueDate}
                                </span>
                                {isOverdue && (
                                  <span className="text-red-600 font-bold flex items-center gap-1">
                                    <AlertTriangle size={10} /> Overdue
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-auto">
                            <span className="text-sm font-bold font-mono text-slate-900">
                              ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 h-6">
                              {!p.completed && (
                                <button
                                  onClick={() => startEdit(p)}
                                  className="p-1 text-slate-500 hover:text-slate-950 rounded transition-colors cursor-pointer"
                                  title="Edit log details"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm('Delete outstanding balance ledger entry?')) {
                                    onDeletePayment(p.id).catch(console.error);
                                  }
                                }}
                                className="p-1 text-slate-500 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
