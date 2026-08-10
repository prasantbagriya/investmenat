import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ScheduledTask } from '../types';

export interface OverdueAlert {
  id: string;
  title: string;
  dueDate: Date;
  triggeredAt: Date;
}

/**
 * Custom React client hook that maintains a real-time Firestore synchronization with
 * the tasks database. It automatically raises in-app alarms and notifications the moment
 * a pending task crosses its due date on the client.
 */
export function useTaskReminder(userId: string | undefined, onTaskOverdueTrigger?: (task: ScheduledTask) => void) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const warnedTasksRef = useRef<Set<string>>(new Set<string>());

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    if (userId.startsWith('guest_offline_')) {
      const loadTasks = () => {
        const raw = localStorage.getItem(`tasks_${userId}`) || '[]';
        if (warnedTasksRef.current.has(`_raw_cache_${userId}`)) {
          if (warnedTasksRef.current.has(`_raw_cache_data_${raw}`)) {
            return; // No change
          }
        }
        try {
          const parsed = JSON.parse(raw);
          const fetched = parsed.map((t: any) => ({
            ...t,
            dueDate: {
              toDate: () => new Date(t.dueDate)
            }
          }));
          warnedTasksRef.current.add(`_raw_cache_${userId}`);
          warnedTasksRef.current.add(`_raw_cache_data_${raw}`);
          setTasks(fetched);
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      };
      loadTasks();

      const localInterval = setInterval(loadTasks, 1500);
      return () => clearInterval(localInterval);
    }

    setLoading(true);

    // Secure Firestore onSnapshot listener as mandated by the eight pillars
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const syncedTasks: ScheduledTask[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          syncedTasks.push({
            id: doc.id,
            ...data,
          } as ScheduledTask);
        });

        // Pre-fill warnedTasksRef: tasks already marked notified in Firestore should
        // never trigger in-app alerts again — prevents duplicate toasts on load/re-subscribe
        syncedTasks.forEach((t) => {
          if (t.status === 'completed') {
            warnedTasksRef.current.delete(t.id);
          } else {
            // If already notified via FCM, mark as warned so interval won't re-trigger
            if (t.notified) {
              warnedTasksRef.current.add(t.id);
            } else {
              // If it is already overdue on first load but not yet notified,
              // still mark it to prevent rapid firing before Cloud Function catches up
              const dueTime = t.dueDate?.toDate ? t.dueDate.toDate().getTime() : new Date(t.dueDate).getTime();
              if (dueTime <= Date.now()) {
                warnedTasksRef.current.add(t.id);
              }
            }
          }
        });

        setTasks(syncedTasks);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // High-performance interval ticking to check deadlines on the client-side in real time
  useEffect(() => {
    if (!userId || tasks.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      tasks.forEach((task) => {
        if (task.status !== 'pending') return;

        const dueTime = task.dueDate?.toDate 
          ? task.dueDate.toDate().getTime() 
          : new Date(task.dueDate).getTime();

        // If task has just crossed the deadline and we haven't warned about it client-side yet
        if (dueTime <= now && !warnedTasksRef.current.has(task.id)) {
          warnedTasksRef.current.add(task.id);
          
          if (onTaskOverdueTrigger) {
            onTaskOverdueTrigger(task);
          }
        }
      });
    }, 1000); // 1-second ticks for precise alarms

    return () => clearInterval(interval);
  }, [tasks, userId, onTaskOverdueTrigger]);

  return { tasks, loading };
}
