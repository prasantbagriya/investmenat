import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { SavingsGoal } from '../types';

interface SavingsGoalsProps {
  savingsGoals: SavingsGoal[];
  onAddGoal: (g: Omit<SavingsGoal, 'id' | 'userId'>) => Promise<void>;
  onEditGoal: (id: string, g: Partial<SavingsGoal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export default function SavingsGoals({
  savingsGoals,
  onAddGoal,
  onEditGoal,
  onDeleteGoal
}: SavingsGoalsProps) {

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [deadline, setDeadline] = useState(new Date().getFullYear() + '-12-31');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick contribute panel trigger inside cards
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [quickAmount, setQuickAmount] = useState('');

  // Handle addition or modification submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(targetAmount);
    const savingsVal = parseFloat(currentSavings || '0');

    if (isNaN(targetVal) || targetVal <= 0) {
      alert('Please enter a valid positive target amount.');
      return;
    }
    if (isNaN(savingsVal) || savingsVal < 0) {
      alert('Current savings must be a valid non-negative number.');
      return;
    }
    if (savingsVal > targetVal) {
      alert('Savings cannot exceed your goal target amount.');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a name for your savings goal.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onEditGoal(editingId, {
          title: title.trim(),
          targetAmount: targetVal,
          currentSavings: savingsVal,
          deadline
        });
        setEditingId(null);
      } else {
        await onAddGoal({
          title: title.trim(),
          targetAmount: targetVal,
          currentSavings: savingsVal,
          deadline
        });
      }
      setIsFormOpen(false);
      setTitle('');
      setTargetAmount('');
      setCurrentSavings('');
      setDeadline(new Date().getFullYear() + '-12-31');
    } catch (err) {
      console.error(err);
      alert('Error updating savings target. Check Firestore Rules.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick add savings contribution submit
  const handleQuickContribution = async (goal: SavingsGoal) => {
    const contribution = parseFloat(quickAmount);
    if (isNaN(contribution) || contribution <= 0) {
      alert('Please enter a valid positive contribution amount.');
      return;
    }

    const calculatedSavings = goal.currentSavings + contribution;
    if (calculatedSavings > goal.targetAmount) {
      alert('This amount would overflow your target maximum!');
      return;
    }

    try {
      await onEditGoal(goal.id, { currentSavings: calculatedSavings });
      setContributingId(null);
      setQuickAmount('');
    } catch (err) {
      console.error(err);
      alert('Error updating goal balance.');
    }
  };

  // Trigger editing action
  const startEdit = (g: SavingsGoal) => {
    setEditingId(g.id);
    setTitle(g.title);
    setTargetAmount(g.targetAmount.toString());
    setCurrentSavings(g.currentSavings.toString());
    setDeadline(g.deadline);
    setIsFormOpen(true);
  };

  // Cumulative statistics for goals
  const aggregations = useMemo(() => {
    let totalTarget = 0;
    let totalSaved = 0;
    let completedGoals = 0;

    savingsGoals.forEach(g => {
      totalTarget += g.targetAmount;
      totalSaved += g.currentSavings;
      if (g.currentSavings >= g.targetAmount) {
        completedGoals += 1;
      }
    });

    const netPercentage = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    return {
      totalTarget,
      totalSaved,
      completedGoals,
      netPercentage
    };
  }, [savingsGoals]);

  return (
    <div className="space-y-3" id="savings-tab">
      
      {/* Header element */}
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80">
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Accumulation targets</h2>
          <p className="text-xl font-bold text-slate-900 tracking-tight font-sans mt-0.5">Savings Campaigns</p>
          <p className="text-xs text-slate-450 mt-1 font-sans">Establish goal metrics and track capital progression dynamically.</p>
        </div>
        
        <button
          onClick={() => {
            setEditingId(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-white px-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer"
          id="new-goal-button"
        >
          <Plus size={14} /> Establish Goal
        </button>
      </div>

      {/* Aggregate Overview progress board */}
      {savingsGoals.length > 0 && (
        <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3" id="goals-total-overview">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 font-sans">Active Savings Portfolio</h3>
            <p className="text-2xl font-bold tracking-tight text-slate-950 font-sans">
              ₹{aggregations.totalSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              <span className="text-slate-500 text-sm font-normal"> saved of </span>
              ₹{aggregations.totalTarget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-500 font-sans font-medium mt-1">Reconciled {aggregations.completedGoals} of {savingsGoals.length} targets currently</p>
          </div>

          <div className="md:w-64 w-full space-y-1.5 font-sans">
            <div className="flex justify-between text-[11px] font-bold text-slate-450 uppercase tracking-wider font-sans">
              <span>Overall Progress</span>
              <span className="font-mono">{aggregations.netPercentage.toFixed(0)}%</span>
            </div>
            <div className="relative w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-slate-950 transition-all duration-700"
                style={{ width: `${aggregations.netPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide down form drawer */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-xs"
            id="goals-form-panel"
          >
            <form onSubmit={handleSubmit} className="p-2 space-y-2" id="goal-form">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <h3 className="font-bold text-slate-900 font-sans text-xs uppercase tracking-wider">
                  {editingId ? 'Edit Savings Target' : 'State New Savings Goal'}
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
                
                {/* Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Goal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dream Tokyo Vacation, Emergency Fund..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white font-sans transition-all"
                    id="form-goal-title"
                  />
                </div>

                {/* Target amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Total Target (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-450 text-xs font-semibold">₹</span>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="5000"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white font-mono transition-all"
                      id="form-goal-target"
                    />
                  </div>
                </div>

                {/* Current Savings */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Initial Savings (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-450 text-xs font-semibold">₹</span>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={currentSavings}
                      onChange={(e) => setCurrentSavings(e.target.value)}
                      className="w-full pl-7 pr-1 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white font-mono transition-all"
                      id="form-goal-current"
                    />
                  </div>
                </div>

                {/* Target Deadline */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-1 py-1.5 text-xs border border-slate-255 rounded-md focus:outline-hidden bg-white font-mono transition-all"
                    id="form-goal-deadline"
                  />
                </div>

              </div>

              {/* Action Buttons */}
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
                  id="form-goal-submit"
                >
                  {isSubmitting ? 'Syncing...' : editingId ? 'Update Target' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid listing goals */}
      {savingsGoals.length === 0 ? (
        <div className="bg-white p-6 text-center text-slate-500 rounded-xl border border-slate-205 border-slate-200/80" id="no-goals-container">
          <p className="text-xs">You have not established savings metrics yet. Create your first goal metric above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" id="goals-list-grid">
          {savingsGoals.map((g) => {
            const pct = g.targetAmount > 0 ? (g.currentSavings / g.targetAmount) * 100 : 0;
            const completed = g.currentSavings >= g.targetAmount;

            return (
              <motion.div 
                key={g.id}
                whileHover={{ y: -1 }}
                className={`bg-white rounded-xl p-2 border relative flex flex-col justify-between overflow-hidden shadow-xs transition-shadow ${completed ? 'border-slate-300 bg-slate-50/20' : 'border-slate-200/80'}`}
              >
                
                {/* Completion indicator crown */}
                {completed && (
                  <div className="absolute top-0 right-0 bg-slate-950 text-white px-1 py-0.5 rounded-bl-sm flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest font-sans">
                    <Sparkles size={8} /> Achieved
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-1 pr-4">
                    <h3 className="font-bold text-slate-900 font-sans text-sm leading-tight">
                      {g.title}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1 mt-1 font-mono text-[11px]">
                    <span className="text-sm font-bold text-slate-955">₹{g.currentSavings.toLocaleString('en-IN')}</span>
                    <span className="text-slate-500"> of ₹{g.targetAmount.toLocaleString('en-IN')} Target</span>
                  </div>

                  {/* Deadline countdown */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-mono">
                    <Calendar size={11} /> Deadline: {g.deadline}
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="space-y-1.5 mt-2 font-sans">
                    <div className="flex justify-between text-[10px] font-bold text-slate-700 font-mono">
                      <span>Utilization</span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="relative w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-slate-950/40' : 'bg-slate-955'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Foot/Actions zone */}
                <div className="mt-3 pt-1 border-t border-slate-100 flex flex-col gap-1">
                  
                  {/* Quick Contribution subform inside card */}
                  {contributingId === g.id ? (
                    <div className="flex gap-1 items-center">
                      <div className="relative shrink min-w-0">
                        <span className="absolute left-2 top-1 text-[10px] text-slate-500 font-semibold">₹</span>
                        <input
                          type="number"
                          placeholder="Sum"
                          value={quickAmount}
                          onChange={(e) => setQuickAmount(e.target.value)}
                          className="w-full pl-2 pr-1 py-1 text-xs border border-slate-200 rounded focus:outline-hidden"
                          id={`quick-input-${g.id}`}
                        />
                      </div>
                      <button
                        onClick={() => handleQuickContribution(g)}
                        className="bg-slate-900 hover:bg-slate-950 text-white font-semibold text-[10px] px-1 py-1 rounded cursor-pointer"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => setContributingId(null)}
                        className="text-slate-500 hover:text-slate-955 p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    !completed && (
                      <button
                        onClick={() => {
                          setContributingId(g.id);
                          setQuickAmount('');
                        }}
                        className="text-[10px] text-slate-700 hover:text-slate-950 font-semibold text-left flex items-center gap-1 cursor-pointer font-sans"
                      >
                        <Plus size={12} /> Live capital deposit
                      </button>
                    )
                  )}

                  <div className="flex justify-between items-center text-[10px] mt-1 text-slate-500 font-mono">
                    <span>ID: {g.id.substring(0,6)}</span>
                    
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => startEdit(g)}
                        className="p-1 text-slate-500 hover:text-slate-955 transition-colors cursor-pointer"
                        title="Edit target fields"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Abolish this savings goal campaign permanently?')) {
                            onDeleteGoal(g.id).catch(console.error);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-red-655 transition-colors cursor-pointer"
                        title="Delete goal"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                </div>

              </motion.div>
            );
          })}
        </div>
      )}

    </div>
  );
}
