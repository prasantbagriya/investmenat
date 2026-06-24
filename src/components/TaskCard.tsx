import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle, AlertTriangle, Calendar, Check, Trash2 } from 'lucide-react';
import { ScheduledTask } from '../types';

interface TaskCardProps {
  task: ScheduledTask;
  onComplete: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  isCalendarLinked?: boolean;
  onSyncToCalendar?: (task: ScheduledTask) => void | Promise<void>;
  key?: React.Key;
}

/**
 * Highly polished single-card system featuring precise micro-animations,
 * a real-time reactive countdown timer, and automated overdrive red-flashing states.
 */
export default function TaskCard({ 
  task, 
  onComplete, 
  onDelete, 
  isCalendarLinked = false, 
  onSyncToCalendar 
}: TaskCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState<boolean>(false);
  const [isSyncedToCalendar, setIsSyncedToCalendar] = useState(() => {
    return localStorage.getItem(`task_synced_calendar_${task.id}`) === 'true';
  });

  // Track task.id changes
  useEffect(() => {
    setIsSyncedToCalendar(localStorage.getItem(`task_synced_calendar_${task.id}`) === 'true');
  }, [task.id]);

  // Parse due date timestamp
  const getDueDate = () => {
    if (!task.dueDate) return new Date();
    return task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
  };

  useEffect(() => {
    const dueDate = getDueDate();

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = dueDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsOverdue(true);
        return;
      }

      setIsOverdue(false);

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    };

    calculateTimeLeft(); // Initial compute
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [task.dueDate]);

  const dueDateObj = getDueDate();
  const isPending = task.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden rounded-2xl border transition-all p-2 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-xs ${
        !isPending
          ? 'bg-emerald-50/20 border-emerald-100/50'
          : isOverdue
          ? 'bg-rose-50/40 border-rose-300 shadow-md ring-1 ring-rose-500/20'
          : 'bg-white border-slate-200'
      }`}
      id={`task-card-${task.id}`}
    >
      {/* Left section: Info & Metadata */}
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-1">
          {!isPending ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-1 py-0.5 rounded-full uppercase tracking-wide">
              <Check className="w-2.5 h-2.5" /> Completed
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-1 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" /> ⚠️ Overdue
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold px-1 py-0.5 rounded-full uppercase tracking-wide">
              <Clock className="w-2.5 h-2.5" /> Pending
            </span>
          )}

          {/* Overdue Badge */}
          {isPending && isOverdue && (
            <span className="text-[10px] font-bold font-mono text-rose-600 bg-rose-100 px-1 py-0.5 rounded-md">
              Ka time is completed!
            </span>
          )}
        </div>

        <div>
          <h3 className={`text-sm font-bold leading-snug ${!isPending ? 'line-through text-slate-500' : 'text-slate-900'}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className={`text-xs mt-1 md:max-w-2xl leading-relaxed ${!isPending ? 'text-slate-500' : 'text-slate-700'}`}>
              {task.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-1 font-sans">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>Due: {dueDateObj.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Right section: Countdown / Timer & Actions */}
      <div className="flex items-center gap-2 border-t border-slate-100 pt-1 md:pt-0 md:border-t-0 justify-between md:justify-end">
        {/* Real-time Ticker countdown */}
        {isPending && (
          <div className="text-right flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Time Remaining</span>
            <span className={`text-xs font-mono font-bold tracking-tight px-1.5 py-1 rounded-md mt-0.5 ${
              isOverdue 
                ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-300' 
                : 'bg-slate-100 text-slate-700'
            }`}>
              {timeLeft}
            </span>
          </div>
        )}

        {/* Component Controller buttons */}
        <div className="flex items-center gap-1">
          {isCalendarLinked && isPending && (
            isSyncedToCalendar ? (
              <span className="inline-flex items-center gap-1 bg-rose-55 text-rose-700 text-[10px] font-bold px-1 py-1.5 rounded-xl border border-rose-100">
                <Check className="w-3 h-3 text-rose-600" /> Synced Cal
              </span>
            ) : (
              <button
                onClick={async () => {
                  if (onSyncToCalendar) {
                    await onSyncToCalendar(task);
                  }
                }}
                className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs py-1 px-1 rounded-xl transition-colors cursor-pointer border border-rose-200"
                title="Sync this task into Google Calendar"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-600" /> Sync Cal
              </button>
            )
          )}

          {isPending && (
            <button
              onClick={() => onComplete(task.id)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1 px-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Mark as completed in Real Time"
              id={`complete-task-${task.id}`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Real Time Done
            </button>
          )}

          <button
            onClick={() => onDelete(task.id)}
            className="p-1 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Delete task permanently"
            id={`delete-task-${task.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
