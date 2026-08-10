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
  RefreshCw,
  Bold,
  Italic,
  List as ListIcon
} from 'lucide-react';
import { ScheduledTask } from '../types';
import TaskCard from './TaskCard';
import InfoTooltip from './InfoTooltip';
import { getMessaging, getToken } from 'firebase/messaging';
import { app, db, auth, getAccessToken } from '../firebase';
import { doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { setDoc } from '../firebase-sync';
import toast from 'react-hot-toast';
import { proxyFetch } from '../utils/proxyFetch';

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
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
      toast.error("Authentication token expired. Please re-authenticate inside settings tab.");
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

      if (onUpdateTask) {
        await onUpdateTask(task.id, { syncedToCalendar: true });
      } else {
        localStorage.setItem(`task_synced_calendar_${task.id}`, 'true');
      }
      toast.success(`✅ Successfully synced "${task.title}" to your Google Calendar!`);
      fetchCalendarEvents();
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Sync failed: Unable to connect to Google Calendar API.`);
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

  const handleOptimizeDescription = async () => {
    if (!title.trim()) {
      toast.error('Please enter a Task Name first so the AI knows what to optimize.');
      return;
    }
    setIsOptimizing(true);
    try {
      const prompt = `Act as a productivity assistant. I have a task titled "${title}". 
Current notes/description: "${description}". 
Please write a short, professional, and optimized description (2-3 sentences max) outlining actionable steps or providing a neat template for this task. Do not include quotes.`;
      
      const response = await proxyFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      
      if (!response.ok) throw new Error('Failed to optimize description');
      const data = await response.json();
      if (data && data.reply) {
        setDescription(data.reply.trim());
        toast.success('Description optimized by AI!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('AI Optimization failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

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
    if (isSubmitting) return;
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
          await onUpdateTask(newTaskId, { googleTaskId, syncedToTasks: true });
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

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('task-desc-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = description;
    
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    
    setDescription(newText);
    
    // Set focus back and adjust selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
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
    <div className="space-y-2 text-slate-800 " id="tasks-section-root">

      {/* Upper Area Summary / Vitals bar */}
      <div className="bg-white rounded-lg p-2 md:p-3 border border-slate-200/80 flex items-center justify-between gap-1 sm:gap-2 shadow-xs flex-nowrap overflow-hidden">
        <div className="space-y-1 shrink-0">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="text-yellow-500 w-4 h-4" /> Reminders & Tasks
          </h2>
        </div>

        {/* Display Push Authorization Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1 bg-slate-950 hover:bg-slate-900 text-white px-2 py-1 rounded-md font-semibold text-xs sm:text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Plus size={12} /> {isFormOpen ? 'Cancel' : 'Add Reminder'}
          </button>

          {notificationStatus === 'granted' ? (
            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
              <Bell className="w-3 h-3 text-emerald-600" /> Notifications Active
            </div>
          ) : notificationStatus === 'denied' ? (
            <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs sm:text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">
              <BellOff className="w-3 h-3 text-amber-500" /> Notifications Blocked
            </div>
          ) : (
            <button
              onClick={handleEnableNotifications}
              disabled={isRegisteringToken}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-xs py-1 px-2 rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap"
              id="fcm-activate-button"
            >
              <Bell className="w-3 h-3" /> Enable Alerts
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Creating task form Card (Left Panel) */}
        {isFormOpen && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200/80 p-3 shadow-xs sticky top-24 animate-fadeIn">
              <div className="flex justify-between items-center pb-1">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1">
                  Create reminder
                </h3>
                <div className="flex items-center gap-2">
                  <InfoTooltip text="Tasks will shift Overdue and trigger browser alerts in real time once their target timeline is breached." />
                </div>
              </div>

              <div className="overflow-hidden">
                {formError && (
                  <div className="mb-2 p-1 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-1 text-rose-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-2 mt-2">
                  {/* Task Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 block ">Task name / alert</label>
                    <input
                      type="text"
                      placeholder="e.g. Electricity Bill payment, Credit payment"
                      maxLength={128}
                      value={title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTitle(val ? val.charAt(0).toUpperCase() + val.slice(1) : '');
                      }}
                      autoCapitalize="sentences"
                      className="w-full text-xs px-1.5 py-1.5 rounded-md border border-slate-200 outline-none focus:border-slate-300 font-medium"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 block ">Description (optional)</label>
                      <button
                        type="button"
                        onClick={handleOptimizeDescription}
                        disabled={isOptimizing || !title.trim()}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isOptimizing ? (
                          <><div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /> Optimizing...</>
                        ) : (
                          <><Sparkles size={10} /> AI optimize</>
                        )}
                      </button>
                    </div>

                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-b-0 border-slate-200 rounded-t-xl px-2 py-1">
                      <button type="button" onClick={() => insertFormatting('**', '**')} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Bold">
                        <Bold size={12} />
                      </button>
                      <button type="button" onClick={() => insertFormatting('*', '*')} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Italic">
                        <Italic size={12} />
                      </button>
                      <button type="button" onClick={() => insertFormatting('- ')} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="Bullet List">
                        <ListIcon size={12} />
                      </button>
                    </div>

                    <textarea
                      id="task-desc-textarea"
                      placeholder="Provide payment URL or reference numbers here... (Markdown supported)"
                      maxLength={1000}
                      value={description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDescription(val ? val.charAt(0).toUpperCase() + val.slice(1) : '');
                      }}
                      autoCapitalize="sentences"
                      rows={3}
                      className="w-full text-xs px-1.5 py-1.5 rounded-b-md border border-slate-200 outline-none focus:border-slate-300 min-h-[60px] resize-y"
                    />
                  </div>

                  {/* Due Date & Time Picker Group */}
                  <div className="grid grid-cols-2 gap-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block ">Due date</label>
                      <input
                        type="date"
                        value={dueDateStr}
                        onChange={(e) => setDueDateStr(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200 outline-none focus:border-slate-300 font-mono font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block ">Due time</label>
                      <input
                        type="time"
                        value={dueTimeStr}
                        onChange={(e) => setDueTimeStr(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200 outline-none focus:border-slate-300 font-mono font-medium"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-950 hover:bg-slate-850 disabled:bg-slate-300 text-white font-bold py-1 px-3 rounded-xl transition-all cursor-pointer shadow-md text-xs flex items-center justify-center gap-1"
                    id="submit-new-task-button"
                  >
                    {isSubmitting ? (
                      <div className="h-3 w-3 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Establish task trigger
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}




        {/* List of active/inactive tasks (Right Panels) */}
        <div className={`${
          isFormOpen 
            ? (isCalendarLinked ? 'lg:col-span-1' : 'lg:col-span-2') 
            : (isCalendarLinked ? 'lg:col-span-2' : 'lg:col-span-3')
        } space-y-2`}>

          {/* Header layout controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            {/* Search inputs */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1.5 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-2 py-1 text-xs rounded-md border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-slate-950 font-medium"
              />
            </div>

            {/* Filter buttons tabs */}
            <div className="flex bg-slate-100/80 p-0.5 rounded-md border border-slate-200/50 w-full sm:w-auto overflow-x-auto shrink-0 animate-fadeIn">
              {(['all', 'pending', 'completed', 'overdue'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-1 py-1 rounded-md text-xs font-bold capitalize transition-all cursor-pointer shrink-0 truncate ${
                    filter === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
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
                  className="bg-white border border-slate-100 rounded-lg p-6 text-center flex flex-col items-center justify-center space-y-1 "
                >
                  <div className="p-1 bg-slate-100 text-slate-500 rounded-full">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">No active tasks logged</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
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
            <div className="bg-white rounded-lg border border-rose-100/80 p-2 shadow-xs sticky top-24">
              <div className="flex justify-between items-center border-b border-rose-50 pb-1 mb-2">
                <div className="flex items-center gap-1">
                  <div className="p-1 px-1.5 bg-rose-50 text-rose-700 rounded-lg text-[10.5px] font-black capitalize flex items-center gap-1 border border-rose-100/30">
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
                  <p className="text-xs font-bold text-slate-700 ">Querying Calendar API...</p>
                </div>
              ) : eventsError ? (
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200 leading-relaxed ">
                  ⚠️ Connection Alert: {eventsError}
                </div>
              ) : calendarEvents.length > 0 ? (
                <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
                  {calendarEvents.map((event) => {
                    const startRaw = event.start?.dateTime || event.start?.date;
                    const startDate = startRaw ? new Date(startRaw) : null;
                    return (
                      <div key={event.id} className="p-1.5 bg-slate-50/40 border border-slate-100/80 rounded-lg space-y-1.5 hover:border-rose-200 transition-all ">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1 leading-tight">{event.summary || 'None Title Event'}</h4>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <ExternalLink size={10} /> View
                            </a>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{event.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1 border-t border-slate-100/50">
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
                                toast.success('Task imported to Scheduler successfully.');
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
                <div className="py-6 border border-dashed border-slate-200 rounded-lg text-center space-y-1 ">
                  <Calendar size={28} className="text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No upcoming events detected</p>
                  <p className="text-xs text-slate-700 max-w-xs mx-auto px-2 leading-relaxed">
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
