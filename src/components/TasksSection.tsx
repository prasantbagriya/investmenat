import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellOff,
  Plus,
  Sparkles,
  AlertTriangle,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  Trash2,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { ScheduledTask } from '../types';
import TaskCard from './TaskCard';
import InfoTooltip from './InfoTooltip';
import { getMessaging, getToken } from 'firebase/messaging';
import { app, db, auth, getAccessToken } from '../firebase';
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { setDoc } from '../firebase-sync';

interface TasksSectionProps {
  tasks: ScheduledTask[];
  onAddTask: (taskData: { title: string; description: string; dueDate: Date }) => Promise<string>;
  onCompleteTask: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTask?: (id: string, updates: Partial<ScheduledTask>) => Promise<void>;
  userEmail?: string | null;
}

/**
 * TasksSection provides a high-fidelity workspace for scheduled reminders.
 * Centered on full responsive compliance, elegant forms, state tabs, and real-time trackers.
 */
export default function TasksSection({
  tasks,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onUpdateTask,
  userEmail
}: TasksSectionProps) {
  // Navigation filters
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Notification States
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [vapidKeyString, setVapidKeyString] = useState('BBID7d5bsQ8KqrEfVPUwdVogI8u7Un9mZP1WTEA6R8BfTxL_8m9Dx2Q1IO4dYVFr70b56hSjCCqinHM3Y-_J6gU'); // User's custom VAPID key
  const [isRegisteringToken, setIsRegisteringToken] = useState(false);
  const [tokenStatusMessage, setTokenStatusMessage] = useState('');

  // Google Calendar States & Live Fetching
  const [isCalendarLinked, setIsCalendarLinked] = useState(() => {
    return localStorage.getItem('google_calendar_linked') === 'true' && !!getAccessToken();
  });
  const [isTasksLinked, setIsTasksLinked] = useState(() => {
    return localStorage.getItem('google_tasks_linked') === 'true' && !!getAccessToken();
  });
  const [autoSyncToCalendar, setAutoSyncToCalendar] = useState(false);
  const [autoSyncToTasks, setAutoSyncToTasks] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState('');
  const [syncingTasks, setSyncingTasks] = useState<{[key: string]: boolean}>({});

  const fetchCalendarEvents = async () => {
    const token = getAccessToken();
    if (!token) return;
    setIsLoadingEvents(true);
    setEventsError('');
    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=' + new Date().toISOString() + '&maxResults=8', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to secure calendar events list.');
      }
      const data = await res.json();
      setCalendarEvents(data.items || []);
    } catch (err: any) {
      console.error(err);
      setEventsError(err.message || 'Connecting with Google Calendar timed out.');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const syncTaskToGoogleCalendar = async (task: ScheduledTask, silent = false) => {
    if (!silent) {
      const confirmed = window.confirm(`Sync task "${task.title}" to your primary Google Calendar as an event?`);
      if (!confirmed) return;
    }

    const token = getAccessToken();
    if (!token) {
      alert("Authentication token expired. Please re-authenticate inside settings tab.");
      return;
    }

    setSyncingTasks(prev => ({ ...prev, [task.id]: true }));

    try {
      const taskDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
      const startTime = taskDate.toISOString();
      const endTime = new Date(taskDate.getTime() + 60 * 60 * 1000).toISOString();

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: task.title,
          description: task.description || 'Synced from App Task Scheduler',
          start: {
            dateTime: startTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          end: {
            dateTime: endTime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          reminders: {
            useDefault: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error.`);
      }

      alert(`✅ Successfully synced "${task.title}" to your Google Calendar!`);
      localStorage.setItem(`task_synced_calendar_${task.id}`, 'true');
      fetchCalendarEvents();
    } catch (err: any) {
      console.error(err);
      alert(`❌ Sync failed: Unable to connect to Google Calendar API.`);
    } finally {
      setSyncingTasks(prev => ({ ...prev, [task.id]: false }));
    }
  };

  React.useEffect(() => {
    if (isCalendarLinked) {
      fetchCalendarEvents();
    }
  }, [isCalendarLinked]);

  React.useEffect(() => {
    const handleTokenChange = () => {
      const linkedCal = localStorage.getItem('google_calendar_linked') === 'true' && !!getAccessToken();
      setIsCalendarLinked(linkedCal);
      const linkedTasks = localStorage.getItem('google_tasks_linked') === 'true' && !!getAccessToken();
      setIsTasksLinked(linkedTasks);
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, []);

  const createGoogleTask = async (taskTitle: string, taskNotes: string, taskDueDate: Date, syncId: string): Promise<string | null> => {
    const token = getAccessToken();
    if (!token) return null;

    try {
      // Get default task list
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!listsRes.ok) return null;
      const listsData = await listsRes.json();
      const defaultList = listsData.items?.[0]?.id;
      if (!defaultList) return null;

      const rfc3339DueDate = taskDueDate.toISOString();

      const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: taskTitle,
          notes: taskNotes,
          due: rfc3339DueDate
        })
      });
      
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem(`task_synced_tasks_${syncId}`, 'true');
      return data.id;
    } catch (err) {
      console.error("Google Tasks sync failed", err);
      return null;
    }
  };

  const completeGoogleTask = async (googleTaskId: string) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!listsRes.ok) return;
      const listsData = await listsRes.json();
      const defaultList = listsData.items?.[0]?.id;
      if (!defaultList) return;

      // Tasks API requires the task to be updated with status = 'completed'
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${defaultList}/tasks/${googleTaskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed'
        })
      });
    } catch (err) {
      console.error("Google Tasks completion sync failed", err);
    }
  };

  // Retrieve browser status on load and auto-register if granted
  React.useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(Notification.permission as any);
      if (Notification.permission === 'granted') {
        // Automatically attempt to register token if already granted
        const registerToken = async () => {
          try {
            const messaging = getMessaging(app);
            const token = await getToken(messaging, { vapidKey: vapidKeyString });
            if (token) {
              const tokenRef = doc(db, 'fcmTokens', token);
              await setDoc(tokenRef, {
                token: token,
                userId: auth.currentUser?.uid || 'shared_user_session',
                deviceType: 'Web Console',
                registeredAt: serverTimestamp(),
                lastActive: serverTimestamp()
              });
            }
          } catch (e) {
            console.error('Auto-registration of FCM token failed:', e);
          }
        };
        registerToken();
      }
    }
  }, [vapidKeyString, tasks]);

  // Request notifications of device registry
  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported');
      return;
    }

    setIsRegisteringToken(true);
    setTokenStatusMessage('Requesting permission from system...');

    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission as any);

      if (permission === 'granted') {
        setTokenStatusMessage('Registering device token with Firebase onSnapshot messaging...');
        const messaging = getMessaging(app);

        // Retrieve messaging Token
        const token = await getToken(messaging, { vapidKey: vapidKeyString });

        if (token) {
          // Store token in user's /fcmTokens collection securely
          const tokenRef = doc(db, 'fcmTokens', token);
          const currentUser = app.name ? app : null;

          await setDoc(tokenRef, {
            token: token,
            userId: auth.currentUser?.uid || 'shared_user_session',
            deviceType: 'Web Console',
            registeredAt: serverTimestamp(),
            lastActive: serverTimestamp()
          });

          setTokenStatusMessage('✅ Push Alerts registered successfully on this device!');
        } else {
          setTokenStatusMessage('⚠️ Authorization generated but couldn\'t secure FCM registration token.');
        }
      } else {
        setTokenStatusMessage('❌ Push authorization denied by the browser.');
      }
    } catch (err) {
      console.error('Failed to configure Web Push:', err);
      setTokenStatusMessage(`❌ Setup Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRegisteringToken(false);
    }
  };

  // Submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Task title is required.');
      return;
    }
    if (!dueDateStr) {
      setFormError('Due date is required.');
      return;
    }
    if (!dueTimeStr) {
      setFormError('Due time is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const datetime = new Date(`${dueDateStr}T${dueTimeStr}`);
      if (isNaN(datetime.getTime())) {
        throw new Error('Invalid date or time formatted.');
      }

      const newTaskId = await onAddTask({
        title: title.trim(),
        description: description.trim(),
        dueDate: datetime
      });

      // Automatically dispatch event to Google Calendar if selected
      if (autoSyncToCalendar && isCalendarLinked) {
        try {
          const startTime = datetime.toISOString();
          const endTime = new Date(datetime.getTime() + 60 * 60 * 1000).toISOString();
          const token = getAccessToken();
          if (token) {
            await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                summary: title.trim(),
                description: description.trim() || 'Synced from App Task Scheduler',
                start: {
                  dateTime: startTime,
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                  dateTime: endTime,
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                reminders: {
                  useDefault: true
                }
              })
            });
            console.log("Successfully auto-synced newly scheduled task to Google Calendar.");
            fetchCalendarEvents();
          }
        } catch (calendarErr) {
          console.error("Auto Calendar sync failed:", calendarErr);
        }
      }

      // Automatically dispatch event to Google Tasks if selected
      if (autoSyncToTasks && isTasksLinked) {
        const googleTaskId = await createGoogleTask(title.trim(), description.trim() || 'Synced from App Task Scheduler', datetime, 'temp_'+Date.now());
        if (googleTaskId && onUpdateTask && newTaskId) {
          await onUpdateTask(newTaskId, { googleTaskId });
        }
      }

      // Reset form on success
      setTitle('');
      setDescription('');
      setDueDateStr('');
      setDueTimeStr('');
    } catch (error: any) {
      setFormError(error.message || 'Failed to create Scheduled Task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if each task is overdue
  const checkIsOverdue = (task: ScheduledTask) => {
    if (task.status !== 'pending') return false;
    const dueTime = task.dueDate?.toDate
      ? task.dueDate.toDate().getTime()
      : new Date(task.dueDate).getTime();
    return dueTime <= Date.now();
  };

  // Filter tasks based on selected tab and search bar
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const isOverdue = checkIsOverdue(t);

    if (filter === 'pending') {
      return t.status === 'pending' && !isOverdue;
    }
    if (filter === 'completed') {
      return t.status === 'completed';
    }
    if (filter === 'overdue') {
      return t.status === 'pending' && isOverdue;
    }
    return true; // Filter 'all'
  });

  return (
    <div className="space-y-3 text-slate-800 font-sans" id="tasks-section-root">

      {/* Upper Area Summary / Vitals bar */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1">
            <Sparkles className="text-yellow-500 w-5 h-5 animate-pulse" /> Task Scheduler & Reminders
            <InfoTooltip text="Set robust time-critical triggers. Our minute-precision daemon alerts you and dispatches warning mail 30 minutes before due time." />
          </h2>
        </div>

        {/* Display Push Authorization Status Badge */}
        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Web-Push Protocol</span>
          {notificationStatus === 'granted' ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-1 py-1.5 rounded-xl">
              <Bell className="w-3.5 h-3.5 text-emerald-600" /> Notifications Active
            </div>
          ) : notificationStatus === 'denied' ? (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-1 py-1.5 rounded-xl">
              <BellOff className="w-3.5 h-3.5 text-amber-500" /> Blocked by Browser
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={isRegisteringToken}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs py-1.5 px-1 rounded-xl transition-all shadow-xs cursor-pointer"
              id="fcm-activate-button"
            >
              <Bell className="w-3.5 h-3.5 animate-bounce" /> Enable Push Alerts
            </button>
          )}

          {tokenStatusMessage && (
            <span className="text-[10px] font-medium text-slate-400 leading-none mt-1">
              {tokenStatusMessage}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Creating task form Card (Left Panel) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-3 shadow-xs sticky top-24">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-1 border-b border-slate-100 pb-1">
              <Plus className="text-slate-500 w-4 h-4" /> Schedule New Reminder
            </h3>

            {formError && (
              <div className="mb-2 p-1 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-1 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Task Name / Alert</label>
                <input
                  type="text"
                  placeholder="e.g. Electricity Bill payment, Credit payment"
                  maxLength={128}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-1.5 py-1.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-950 font-medium"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans font-medium">Description (Optional)</label>
                <textarea
                  placeholder="Provide payment URL or reference numbers here..."
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-1.5 py-1.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-950 font-medium resize-none"
                />
              </div>

              {/* Due Date & Time Picker Group */}
              <div className="grid grid-cols-2 gap-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans font-medium">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDateStr}
                      onChange={(e) => setDueDateStr(e.target.value)}
                      className="w-full text-xs pl-1.5 pr-5 py-1.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-950 font-mono font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans font-medium">Due Time</label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="time"
                      value={dueTimeStr}
                      onChange={(e) => setDueTimeStr(e.target.value)}
                      className="w-full text-xs pl-1.5 pr-5 py-1.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-950 font-mono font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Google Calendar Auto Sync Checkbox Toggle */}
              <div className="p-1.5 bg-slate-50 border border-slate-150 rounded-2xl space-y-1.5 my-1">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSyncToCalendar && isCalendarLinked}
                    onChange={(e) => setAutoSyncToCalendar(e.target.checked)}
                    disabled={!isCalendarLinked}
                    className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer border-slate-300 accent-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] font-extrabold text-slate-700">Auto-Sync to Google Calendar</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSyncToTasks && isTasksLinked}
                    onChange={(e) => setAutoSyncToTasks(e.target.checked)}
                    disabled={!isTasksLinked}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer border-slate-300 accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] font-extrabold text-slate-700">Auto-Sync to Google Tasks</span>
                </label>
                {(!isCalendarLinked && !isTasksLinked) ? (
                  <p className="text-[9px] text-slate-400 leading-normal font-sans">
                    * Link Google Calendar or Google Tasks on the Settings page to unlock automatic, instant, real-time publishing as tasks are added.
                  </p>
                ) : (
                  <p className="text-[9px] text-rose-600 font-bold leading-normal font-sans">
                    * Automatically creates linked representations across your selected Google ecosystem targets.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-950 hover:bg-slate-850 disabled:bg-slate-300 text-white font-bold py-1 px-3 rounded-xl transition-all cursor-pointer shadow-md text-xs tracking-wide uppercase mt-1 flex items-center justify-center gap-1"
                id="submit-new-task-button"
              >
                {isSubmitting ? (
                  <div className="h-3 w-3 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Establish Task Trigger
                  </>
                )}
              </button>
            </form>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2 mt-2 text-[10px] text-slate-400 flex items-start gap-1">
              <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-600 block">Reminder Automation Matrix</span>
                Tasks will shift <span className="text-rose-500 font-bold">Overdue</span> and trigger browser alerts in real time once their target timeline is breached.
              </div>
            </div>
          </div>
        </div>

        {/* List of active/inactive tasks (Right Panels) */}
        <div className={`${isCalendarLinked ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-2`}>

          {/* Header layout controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            {/* Search inputs */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-2 py-1 text-xs rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-slate-950 font-medium"
              />
            </div>

            {/* Filter buttons tabs */}
            <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50 w-full sm:w-auto overflow-x-auto shrink-0 animate-fadeIn">
              {(['all', 'pending', 'completed', 'overdue'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-1 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer shrink-0 truncate ${
                    filter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-400 hover:text-slate-800'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* List display */}
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onComplete={async (id) => {
                      if (t.googleTaskId) {
                        completeGoogleTask(t.googleTaskId);
                      }
                      await onCompleteTask(id);
                    }}
                    onDelete={onDeleteTask}
                    isCalendarLinked={isCalendarLinked}
                    onSyncToCalendar={syncTaskToGoogleCalendar}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-slate-100 rounded-3xl p-6 text-center flex flex-col items-center justify-center space-y-1 font-sans"
                >
                  <div className="p-1 bg-slate-100 text-slate-400 rounded-full">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">No active tasks logged</h4>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      No tasks matched the filter "{filter}". Create a tasks schedule with combined timers to configure a daemon tracker.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Live Google Calendar Timeline Panel */}
        {isCalendarLinked && (
          <div className="lg:col-span-1 space-y-2 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-rose-100/80 p-2 shadow-xs sticky top-24">
              <div className="flex justify-between items-center border-b border-rose-50 pb-1 mb-2">
                <div className="flex items-center gap-1">
                  <div className="p-1 px-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-100/30">
                    <span className="h-1.5 w-1.5 bg-rose-600 rounded-full animate-ping"></span>
                    Live Google Calendar
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchCalendarEvents}
                  disabled={isLoadingEvents}
                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer border border-rose-100/20"
                  title="Force Refresh Live Feed"
                >
                  <RefreshCw size={12} className={isLoadingEvents ? 'animate-spin' : ''} />
                </button>
              </div>

              {isLoadingEvents ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-1">
                  <RefreshCw size={24} className="animate-spin text-rose-500" />
                  <p className="text-xs font-bold text-slate-500 font-sans">Querying Calendar API...</p>
                </div>
              ) : eventsError ? (
                <div className="p-2 bg-amber-50 text-amber-700 rounded-2xl text-[11px] font-semibold border border-amber-200 leading-relaxed font-sans">
                  ⚠️ Connection Alert: {eventsError}
                </div>
              ) : calendarEvents.length > 0 ? (
                <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
                  {calendarEvents.map((event) => {
                    const startRaw = event.start?.dateTime || event.start?.date;
                    const startDate = startRaw ? new Date(startRaw) : null;
                    return (
                      <div key={event.id} className="p-1.5 bg-slate-50/40 border border-slate-100/80 rounded-2xl space-y-1.5 hover:border-rose-200 transition-all font-sans">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1 leading-tight">{event.summary || 'None Title Event'}</h4>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-bold text-rose-600 hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <ExternalLink size={10} /> View
                            </a>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{event.description}</p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100/50">
                          <div className="flex items-center gap-1">
                            <Clock size={11} className="text-rose-400" />
                            <span>{startDate ? startDate.toLocaleString() : 'No Scheduled Time'}</span>
                          </div>
                          {startDate && (
                            <button
                              onClick={() => {
                                onAddTask({
                                  title: event.summary || 'Imported Event',
                                  description: event.description || '',
                                  dueDate: startDate
                                });
                                alert('Task imported to Scheduler successfully.');
                              }}
                              className="text-indigo-600 font-bold hover:underline"
                            >
                              + Import to Scheduler
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 border border-dashed border-slate-200 rounded-2xl text-center space-y-1 font-sans">
                  <Calendar size={28} className="text-slate-300 mx-auto" />
                  <p className="text-[11px] font-bold text-slate-400">No upcoming events detected</p>
                  <p className="text-[9px] text-slate-500 max-w-xs mx-auto px-2 leading-relaxed">
                    Your scheduled tasks synced using the "Sync Cal" badge will pop up here instantly!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
