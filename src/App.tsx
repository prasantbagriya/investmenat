import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  signInGuestAnonymously,
  logout as firebaseLogout, 
  handleFirestoreError, 
  OperationType,
  setAccessToken,
  getAccessToken
} from './firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  serverTimestamp,
  writeBatch,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { setDoc, updateDoc, deleteDoc } from './firebase-sync';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ArrowLeftRight, Clock, Target, Sliders, LogOut, 
  Download, Coins, User as UserIcon, HelpCircle, TrendingUp, Bell, X, 
  AlertTriangle, Landmark, Landmark as FdIcon, CalendarRange, Percent, 
  Lock, ShieldCheck, RefreshCw, Key, FileSpreadsheet, Users, Settings, Compass, Briefcase, CheckCircle
} from 'lucide-react';

import { 
  Transaction, PendingPayment, SavingsGoal, BudgetLimit, ScheduledTask,
  Holding, Sip, Fd, WatchlistItem, UserSettings, RealizedTrade, RecurringBill, BankAccount, CreditCardBill, EmiItem
} from './types';

import Dashboard from './components/Dashboard';
import TransactionTracker from './components/TransactionTracker';
import PendingPayments from './components/PendingPayments';
import SavingsGoals from './components/SavingsGoals';
import BudgetLimits from './components/BudgetLimits';
import TasksSection from './components/TasksSection';
import RecurringBills from './components/RecurringBills';
import PortfolioTracker from './components/PortfolioTracker';
import SipTracker from './components/SipTracker';
import FdRdTracker from './components/FdRdTracker';
import MarketView from './components/MarketView';
import TaxCapitalGains from './components/TaxCapitalGains';
import { WealthForecaster } from './components/WealthForecaster';
import GoogleSheetsSync from './components/GoogleSheetsSync';
import ContactsManager from './components/ContactsManager';
import SettingsManager from './components/SettingsManager';
import WorkspaceSuite from './components/WorkspaceSuite';
import BrokerManager from './components/BrokerManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { CreditCardsEMI } from './components/CreditCardsEMI';
import BankProfiles from './components/BankProfiles';
import { exportFullLedgerToCSV } from './utils/csvExport';
import { useTaskReminder } from './utils/useTaskReminder';


import LoginScreen from './components/auth/LoginScreen';
import PinLockScreen from './components/auth/PinLockScreen';
import MigrationModal from './components/auth/MigrationModal';
import Header from './components/layout/Header';
import BottomNavigation from './components/layout/BottomNavigation';
import NotificationCenter from './components/layout/NotificationCenter';
import NavigationDrawer from './components/layout/NavigationDrawer';
import { useRecurringBills } from './hooks/useRecurringBills';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useSmsListener } from './hooks/useSmsListener';
import { useLivePrices } from './hooks/useLivePrices';
import { useSmsTracker } from './hooks/useSmsTracker';
import { useBrokerSync } from './hooks/useBrokerSync';
import { useBankAccounts } from './hooks/useBankAccounts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Business States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);

  // New InvestMant States
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [realizedTrades, setRealizedTrades] = useState<RealizedTrade[]>([]);
  const [sips, setSips] = useState<Sip[]>([]);
  const [fds, setFds] = useState<Fd[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [ccBills, setCcBills] = useState<CreditCardBill[]>([]);
  const [ccEmis, setCcEmis] = useState<EmiItem[]>([]);

  // Security Locking States
  const [isLocked, setIsLocked] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinSetupActive, setPinSetupActive] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const { recurringBills, handleAddRecurringBill, handleEditRecurringBill, handleDeleteRecurringBill } = useRecurringBills(user);
  const { handleAddBankAccount, handleEditBankAccount, handleDeleteBankAccount } = useBankAccounts(user);

  const { brokerFunds, brokerHoldings, brokerRealizedTrades, isSyncing, refreshBrokerData } = useBrokerSync(user?.uid);

  const unifiedHoldings = useMemo(() => {
    return [...holdings, ...(brokerHoldings || [])];
  }, [holdings, brokerHoldings]);

  // Capacitor Background SMS Listener
  useSmsListener(async (smsText) => {
    if (!user) return;
    try {
      const response = await fetch('/api/parse-sms-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: smsText, 
          pendingPayments: pendingPayments.filter(p => !p.completed),
          recurringBills,
          bankAccounts 
        })
      });
      if (response.ok) {
        const parsed = await response.json();
        if (parsed.amount && parsed.amount > 0) {
          await handleAddTransaction({
            type: parsed.type === 'CR' || parsed.type === 'income' ? 'income' : 'expense',
            category: parsed.category || 'Others',
            amount: parsed.amount,
            date: new Date().toISOString().split('T')[0],
            notes: parsed.description || `[${parsed.merchant || 'Auto-SMS'}] ${smsText.substring(0, 30)}...`,
            bankAccountId: parsed.matched_bank_account_id || undefined
          });

          // Auto-pay logic
          if (parsed.matched_pending_id) {
            const p = pendingPayments.find(x => x.id === parsed.matched_pending_id);
            if (p) await handleEditPayment(p.id, { completed: true });
          } else if (parsed.matched_recurring_id) {
            const b = recurringBills.find(x => x.id === parsed.matched_recurring_id);
            if (b) {
              const nextDate = new Date(b.nextDueDate);
              if (b.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
              else nextDate.setFullYear(nextDate.getFullYear() + 1);
              await handleEditRecurringBill(b.id, { nextDueDate: nextDate.toISOString().split('T')[0] });
            }
          }
          // Trigger a silent visual toast or notification (optional)
        }
      }
    } catch (e) {
      console.error('Background SMS Parsing failed:', e);
    }
  });

  const { livePrices, refreshPrices, loadingPrices } = useLivePrices(unifiedHoldings, watchlist);

  // Workspace controller: 'ledger' (Daily Finance) vs 'investmant' (Investment Suite)
  const [currentWorkspace, setCurrentWorkspace] = useState<'ledger' | 'investmant'>('ledger');

  // Tab & month controller
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || (currentWorkspace === 'ledger' ? 'dashboard' : 'portfolio');
  const setActiveTab = (tab: string) => navigate(`/${tab}`);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<{ id: string; title: string; message: string }[]>([]);
  const { permission, requestPermission, sendNotification } = usePushNotifications();

  // Snooze modal state
  const [snoozingTask, setSnoozingTask] = useState<{ id: string; title: string } | null>(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeTime, setSnoozeTime] = useState('');

  // Listen for SIP Notifications
  useEffect(() => {
    const handleSipNotification = (e: any) => {
      const { sipName } = e.detail;
      sendNotification(`SIP Auto-Debit Reminder`, { 
        body: `We will notify you 2 days prior to "${sipName}" SIP auto-debit window!`,
        requireInteraction: true
      });
    };
    window.addEventListener('sip-notification-trigger', handleSipNotification);
    return () => window.removeEventListener('sip-notification-trigger', handleSipNotification);
  }, [sendNotification]);

  // Migration structures for offline guest data to Google Firebase
  const [pendingMigrationData, setPendingMigrationData] = useState<any | null>(null);
  const [migrationProgress, setMigrationProgress] = useState<string>('');

  // Advanced Custom settings state for Welcome screen OAuth
  const [showCustomLoginConfig, setShowCustomLoginConfig] = useState(false);
  const [customLoginClientId, setCustomLoginClientId] = useState(() => localStorage.getItem('custom_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [customLoginClientSecret, setCustomLoginClientSecret] = useState(() => localStorage.getItem('custom_google_client_secret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '');
  const [loginManualToken, setLoginManualToken] = useState('');

  const handleCustomOauthLogin = () => {
    if (!customLoginClientId) {
      alert("Please enter a valid Google Client ID.");
      return;
    }
    localStorage.setItem('custom_google_client_id', customLoginClientId.trim());
    localStorage.setItem('custom_google_client_secret', customLoginClientSecret.trim());
    
    const redirectUri = window.location.origin;
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/presentations');
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${customLoginClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopes}&prompt=consent`;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (isMobile) {
      localStorage.setItem('oauth_trigger_guest_sign_in', 'true');
      localStorage.setItem('oauth_return_tab', 'settings');
      window.location.href = oauthUrl;
      return;
    }

    const size = "width=600,height=700,left=150,top=100";
    const authWindow = window.open(oauthUrl, 'GoogleCustomOAuthLogin', size);
    if (authWindow) {
      handleGuestSignIn();
    } else {
      if (confirm("Popup blocked! Would you like to use redirect instead to connect Google services?")) {
        localStorage.setItem('oauth_trigger_guest_sign_in', 'true');
        localStorage.setItem('oauth_return_tab', 'settings');
        window.location.href = oauthUrl;
      }
    }
  };

  const handleApplyLoginManualToken = () => {
    if (!loginManualToken) {
      alert("Please paste a valid Google Access Token.");
      return;
    }
    setAccessToken(loginManualToken.trim());
    localStorage.setItem('custom_google_access_token', loginManualToken.trim());
    window.dispatchEvent(new Event('google-token-changed'));
    handleGuestSignIn();
    alert("✅ Manual Access Token applied! Dynamic syncing is now enabled for your Session.");
  };

  // Sound alarms for overdue events
  const handleTaskOverdueClientAlert = (task: ScheduledTask) => {
    const isAlreadyToasted = activeToasts.some(t => t.id === task.id);
    if (isAlreadyToasted) return;

    setActiveToasts((prev) => [
      ...prev,
      {
        id: task.id,
        title: task.title,
        message: `⏰ [${task.title}] — Attention required immediately!`
      }
    ]);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.log('Audio notification sound bypassed.');
    }

    sendNotification(`Task Overdue: ${task.title}`, {
      body: `This task requires your attention immediately!`,
      tag: `task_overdue_${task.id}`,
      requireInteraction: true
    });
  };

  const { tasks: scheduledTasks } = useTaskReminder(user?.uid, handleTaskOverdueClientAlert);

  // Google OAuth implicit callback URL hash parse listener
  useEffect(() => {
    const handleHashAndToken = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          setAccessToken(token);
          // Standard state cleanup: remove token from URL immediately for clean design
          window.history.replaceState(null, '', window.location.pathname);
          console.log("🎯 Google Implicit access token grabbed and stored.");
          
          // Check for redirect state:
          const targetService = localStorage.getItem('oauth_target_service');
          if (targetService) {
            localStorage.setItem(`google_${targetService}_linked`, 'true');
            localStorage.removeItem('oauth_target_service');
            console.log(`✅ Automatically linked ${targetService} from redirect state.`);
          }
          
          // Dispatch custom event to notify all listening components
          window.dispatchEvent(new Event('google-token-changed'));

          const shouldTriggerGuest = localStorage.getItem('oauth_trigger_guest_sign_in');
          if (shouldTriggerGuest) {
            localStorage.removeItem('oauth_trigger_guest_sign_in');
            handleGuestSignIn();
          }

          const returnTab = localStorage.getItem('oauth_return_tab');
          if (returnTab) {
            localStorage.removeItem('oauth_return_tab');
            setActiveTab(returnTab);
          }

          // If this window is a popup authentication child, notify the opener layout and close
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token }, '*');
              window.close();
            } catch (err) {
              console.error("Popup window opener communicate error:", err);
            }
          }
        }
      }
    };

    handleHashAndToken();
    window.addEventListener('hashchange', handleHashAndToken);
    return () => window.removeEventListener('hashchange', handleHashAndToken);
  }, []);

  // Frame cross-tab popup listener
  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      // Allow relative or standard run.app origins
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
        setAccessToken(event.data.token);
        // Dispatch custom event to trigger instant status updates in layout
        window.dispatchEvent(new Event('google-token-changed'));
        console.log("🎉 Custom Google login received from popup listener successfully.");
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, []);

  // Auto Logout timer - 10 minutes of complete inactivity
  useEffect(() => {
    if (!user) return;
    let logoutTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        if (userSettings?.pin) {
          setIsLocked(true);
        }
      }, 10 * 60 * 1000); // 10 mins
    };

    const trackedEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    trackedEvents.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();

    return () => {
      clearTimeout(logoutTimer);
      trackedEvents.forEach(e => window.removeEventListener(e, resetInactivityTimer));
    };
  }, [user]);

  // Authenticate monitor track
  useEffect(() => {
    const handleGoogleTrigger = () => {
      handleGoogleSignIn();
    };
    window.addEventListener('trigger-google-sign-in', handleGoogleTrigger);
    return () => {
      window.removeEventListener('trigger-google-sign-in', handleGoogleTrigger);
    };
  }, []);

  useEffect(() => {
    const isOffline = localStorage.getItem('isOfflineMode') === 'true';
    if (isOffline) {
      const guestId = localStorage.getItem('guest_user_id') || ('guest_offline_' + Math.random().toString(36).substring(2, 11));
      localStorage.setItem('guest_user_id', guestId);
      setUser({
        uid: guestId,
        email: 'guest@investmant.local',
        displayName: 'Guest Account',
        isAnonymous: true,
        emailVerified: false,
        photoURL: ''
      } as any);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        // Evaluate if there is offline guest data that we should ask the user to migrate/link
        const guestId = localStorage.getItem('guest_user_id');
        if (guestId) {
          const guestTxs = JSON.parse(localStorage.getItem(`tx_${guestId}`) || '[]');
          const guestPay = JSON.parse(localStorage.getItem(`pay_${guestId}`) || '[]');
          const guestGoals = JSON.parse(localStorage.getItem(`goals_${guestId}`) || '[]');
          const guestLimits = JSON.parse(localStorage.getItem(`limits_${guestId}`) || '[]');
          const guestHoldings = JSON.parse(localStorage.getItem(`holdings_${guestId}`) || '[]');
          const guestRealized = JSON.parse(localStorage.getItem(`realized_trades_${guestId}`) || '[]');
          const guestSips = JSON.parse(localStorage.getItem(`sips_${guestId}`) || '[]');
          const guestFds = JSON.parse(localStorage.getItem(`fds_${guestId}`) || '[]');
          const guestWatch = JSON.parse(localStorage.getItem(`watchlist_${guestId}`) || '[]');
          const guestSettings = JSON.parse(localStorage.getItem(`settings_${guestId}`) || 'null');

          const hasData = guestTxs.length || guestPay.length || guestGoals.length || guestLimits.length || 
                          guestHoldings.length || guestRealized.length || guestSips.length || guestFds.length || 
                          guestWatch.length;

          if (hasData) {
            setPendingMigrationData({
              uid: usr.uid,
              guestId,
              data: {
                transactions: guestTxs,
                pendingPayments: guestPay,
                savingsGoals: guestGoals,
                budgetLimits: guestLimits,
                holdings: guestHoldings,
                realizedTrades: guestRealized,
                sips: guestSips,
                fds: guestFds,
                watchlist: guestWatch,
                userSettings: guestSettings
              }
            });
          } else {
            localStorage.removeItem('isOfflineMode');
            localStorage.removeItem('guest_user_id');
          }
        }
      }
      setUser(usr);
      setAuthLoading(false);

      // Check and restore return tab after OAuth redirect
      const returnTab = localStorage.getItem('oauth_return_tab');
      if (returnTab) {
        localStorage.removeItem('oauth_return_tab');
        setActiveTab(returnTab);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore syncs
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setPendingPayments([]);
      setSavingsGoals([]);
      setBudgetLimits([]);
      setHoldings([]);
      setSips([]);
      setFds([]);
      setWatchlist([]);
      setUserSettings(null);
      setIsLocked(false);
      setBankAccounts([]);
      setCcBills([]);
      setCcEmis([]);
      return;
    }

    if (user.uid.startsWith('guest_offline_')) {
      const loadLocalData = () => {
        setTransactions(JSON.parse(localStorage.getItem(`tx_${user.uid}`) || '[]'));
        setPendingPayments(JSON.parse(localStorage.getItem(`pay_${user.uid}`) || '[]'));
        setSavingsGoals(JSON.parse(localStorage.getItem(`goals_${user.uid}`) || '[]'));
        setBudgetLimits(JSON.parse(localStorage.getItem(`limits_${user.uid}`) || '[]'));
        setHoldings(JSON.parse(localStorage.getItem(`holdings_${user.uid}`) || '[]'));
        setRealizedTrades(JSON.parse(localStorage.getItem(`realized_trades_${user.uid}`) || '[]'));
        setSips(JSON.parse(localStorage.getItem(`sips_${user.uid}`) || '[]'));
        setFds(JSON.parse(localStorage.getItem(`fds_${user.uid}`) || '[]'));
        setWatchlist(JSON.parse(localStorage.getItem(`watchlist_${user.uid}`) || '[]'));
        setBankAccounts(JSON.parse(localStorage.getItem(`bankAccounts_${user.uid}`) || '[]'));
        setCcBills(JSON.parse(localStorage.getItem(`ccbills_${user.uid}`) || '[]'));
        setCcEmis(JSON.parse(localStorage.getItem(`ccemis_${user.uid}`) || '[]'));

        const savedSettings: UserSettings = JSON.parse(localStorage.getItem(`settings_${user.uid}`) || 'null') || {
          id: user.uid,
          smartApiAppName: 'Guest Account',
          smartApiRedirectUrl: 'https://guest.online/',
          smartApiPostbackUrl: '-',
          smartApiPrimaryIp: '127.0.0.1',
          smartApiSecondaryIp: '-',
          smartApiKey: 'fy2JiRJ2',
          smartApiClientId: '',
          smartApiTotpSecret: '',
          smartApiIsActive: false
        };
        setUserSettings(savedSettings);
        if (savedSettings.pin) {
          setIsLocked(true);
        } else {
          setIsLocked(false);
        }
      };
      loadLocalData();
      return () => {};
    }

    // Subscribe UserSettings (PIN lock profile)
    const unsubscribeSettings = onSnapshot(
      doc(db, 'usersettings', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const sets = snapshot.data() as UserSettings;
          setUserSettings(sets);
          if (sets.pin) {
            setIsLocked(true); // Secure Lock is on!
          }
        } else {
          // Preset default credentials for the user in firestore on initial signup
          const defaultSets: UserSettings = {
            id: user.uid,
            smartApiAppName: 'prasant bagriya',
            smartApiRedirectUrl: 'https://prasantbagriya.online/',
            smartApiPostbackUrl: '-',
            smartApiPrimaryIp: '47.15.92.237',
            smartApiSecondaryIp: '-',
            smartApiKey: 'fy2JiRJ2',
            smartApiClientId: '',
            smartApiTotpSecret: '',
            smartApiIsActive: false
          };
          setDoc(doc(db, 'usersettings', user.uid), defaultSets)
            .then(() => {
              setUserSettings(defaultSets);
            })
            .catch(err => console.warn('Error auto-seeding user settings:', err));
          setIsLocked(false);
        }
      },
      (error) => console.warn('Could not read user PIN settings:', error)
    );

    // Standard transactions
    const txQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribeTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const txs: Transaction[] = [];
        snapshot.forEach((d) => txs.push({ id: d.id, ...d.data() } as Transaction));
        setTransactions(txs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
    );

    // Bank Accounts
    const bankAccountsQuery = query(collection(db, 'bankAccounts'), where('userId', '==', user.uid));
    const unsubscribeBankAccounts = onSnapshot(
      bankAccountsQuery,
      (snapshot) => {
        const accounts: BankAccount[] = [];
        snapshot.forEach((d) => accounts.push({ id: d.id, ...d.data() } as BankAccount));
        setBankAccounts(accounts);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bankAccounts')
    );

    // CC Bills
    const billsQuery = query(collection(db, 'ccbills'), where('userId', '==', user.uid));
    const unsubscribeBills = onSnapshot(
      billsQuery,
      (snapshot) => {
        const b: CreditCardBill[] = [];
        snapshot.forEach((d) => b.push({ id: d.id, ...d.data() } as CreditCardBill));
        setCcBills(b);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'ccbills')
    );

    // CC EMIs
    const emisQuery = query(collection(db, 'ccemis'), where('userId', '==', user.uid));
    const unsubscribeEmis = onSnapshot(
      emisQuery,
      (snapshot) => {
        const e: EmiItem[] = [];
        snapshot.forEach((d) => e.push({ id: d.id, ...d.data() } as EmiItem));
        setCcEmis(e);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'ccemis')
    );

    // Pending payments
    const payQuery = query(collection(db, 'pendingPayments'), where('userId', '==', user.uid));
    const unsubscribePay = onSnapshot(
      payQuery,
      (snapshot) => {
        const pays: PendingPayment[] = [];
        snapshot.forEach((d) => pays.push({ id: d.id, ...d.data() } as PendingPayment));
        setPendingPayments(pays);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'pendingPayments')
    );

    // Savings goals
    const goalQuery = query(collection(db, 'savingsGoals'), where('userId', '==', user.uid));
    const unsubscribeGoals = onSnapshot(
      goalQuery,
      (snapshot) => {
        const goals: SavingsGoal[] = [];
        snapshot.forEach((d) => goals.push({ id: d.id, ...d.data() } as SavingsGoal));
        setSavingsGoals(goals);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'savingsGoals')
    );

    // Budget Limits
    const limitQuery = query(collection(db, 'budgetLimits'), where('userId', '==', user.uid));
    const unsubscribeLimits = onSnapshot(
      limitQuery,
      (snapshot) => {
        const limits: BudgetLimit[] = [];
        snapshot.forEach((d) => limits.push({ id: d.id, ...d.data() } as BudgetLimit));
        setBudgetLimits(limits);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'budgetLimits')
    );

    // Holdings (Stocks & MFs)
    const holdingsQuery = query(collection(db, 'holdings'), where('userId', '==', user.uid));
    const unsubscribeHoldings = onSnapshot(
      holdingsQuery,
      (snapshot) => {
        const hs: Holding[] = [];
        snapshot.forEach((d) => hs.push({ id: d.id, ...d.data() } as Holding));
        setHoldings(hs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'holdings')
    );

    // SIPs
    const sipsQuery = query(collection(db, 'sips'), where('userId', '==', user.uid));
    const unsubscribeSips = onSnapshot(
      sipsQuery,
      (snapshot) => {
        const ss: Sip[] = [];
        snapshot.forEach((d) => ss.push({ id: d.id, ...d.data() } as Sip));
        setSips(ss);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'sips')
    );

    // FDs
    const fdsQuery = query(collection(db, 'fds'), where('userId', '==', user.uid));
    const unsubscribeFds = onSnapshot(
      fdsQuery,
      (snapshot) => {
        const fs: Fd[] = [];
        snapshot.forEach((d) => fs.push({ id: d.id, ...d.data() } as Fd));
        setFds(fs);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'fds')
    );

    // Watchlist items
    const watchlistQuery = query(collection(db, 'watchlist'), where('userId', '==', user.uid));
    const unsubscribeWatchlist = onSnapshot(
      watchlistQuery,
      (snapshot) => {
        const ws: WatchlistItem[] = [];
        snapshot.forEach((d) => ws.push({ id: d.id, ...d.data() } as WatchlistItem));
        setWatchlist(ws);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'watchlist')
    );

    // Realized Trades
    const realizedQuery = query(collection(db, 'realizedTrades'), where('userId', '==', user.uid));
    const unsubscribeRealized = onSnapshot(
      realizedQuery,
      (snapshot) => {
        const rt: RealizedTrade[] = [];
        snapshot.forEach((d) => rt.push({ id: d.id, ...d.data() } as RealizedTrade));
        setRealizedTrades(rt);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'realizedTrades')
    );

    return () => {
      unsubscribeSettings();
      unsubscribeTx();
      unsubscribePay();
      unsubscribeGoals();
      unsubscribeLimits();
      unsubscribeHoldings();
      unsubscribeSips();
      unsubscribeFds();
      unsubscribeWatchlist();
      unsubscribeRealized();
      unsubscribeBankAccounts();
      unsubscribeBills();
      unsubscribeEmis();
    };
  }, [user]);

  // mutations
  const handleAddTransaction = async (txData: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user) return;
    
    // Adjust Bank Account balance if linked
    if (txData.bankAccountId) {
      const bank = bankAccounts.find(b => b.id === txData.bankAccountId);
      if (bank) {
        const diff = txData.type === 'income' ? txData.amount : -txData.amount;
        await handleEditBankAccount(bank.id, { currentBalance: bank.currentBalance + diff });
      }
    }

    if (user.uid.startsWith('guest_offline_')) {
      const newTx: Transaction = {
        ...txData,
        id: 'tx_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...transactions, newTx];
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'transactions'));
    await setDoc(docRef, { ...txData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditTransaction = async (id: string, txData: Partial<Transaction>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = transactions.map(t => t.id === id ? { ...t, ...txData } as Transaction : t);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'transactions', id), txData);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    const tx = transactions.find(t => t.id === id);
    if (tx?.bankAccountId) {
      const bank = bankAccounts.find(b => b.id === tx.bankAccountId);
      if (bank) {
        const reverseDiff = tx.type === 'income' ? -tx.amount : tx.amount;
        await handleEditBankAccount(bank.id, { currentBalance: bank.currentBalance + reverseDiff });
      }
    }

    if (user.uid.startsWith('guest_offline_')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'transactions', id));
  };

  const handleAddPayment = async (payData: Omit<PendingPayment, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newPay: PendingPayment = {
        ...payData,
        id: 'pay_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...pendingPayments, newPay];
      setPendingPayments(updated);
      localStorage.setItem(`pay_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'pendingPayments'));
    await setDoc(docRef, { ...payData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditPayment = async (id: string, payData: Partial<PendingPayment>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = pendingPayments.map(p => p.id === id ? { ...p, ...payData } as PendingPayment : p);
      setPendingPayments(updated);
      localStorage.setItem(`pay_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'pendingPayments', id), payData);
  };

  const handleDeletePayment = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = pendingPayments.filter(p => p.id !== id);
      setPendingPayments(updated);
      localStorage.setItem(`pay_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'pendingPayments', id));
  };

  const handleAddGoal = async (goalData: Omit<SavingsGoal, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newGoal: SavingsGoal = {
        ...goalData,
        id: 'goal_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...savingsGoals, newGoal];
      setSavingsGoals(updated);
      localStorage.setItem(`goals_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'savingsGoals'));
    await setDoc(docRef, { ...goalData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleEditGoal = async (id: string, goalData: Partial<SavingsGoal>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = savingsGoals.map(g => g.id === id ? { ...g, ...goalData } as SavingsGoal : g);
      setSavingsGoals(updated);
      localStorage.setItem(`goals_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'savingsGoals', id), goalData);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = savingsGoals.filter(g => g.id !== id);
      setSavingsGoals(updated);
      localStorage.setItem(`goals_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'savingsGoals', id));
  };

  const handleAddLimit = async (limitData: Omit<BudgetLimit, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newLimit: BudgetLimit = {
        ...limitData,
        id: 'limit_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...budgetLimits, newLimit];
      setBudgetLimits(updated);
      localStorage.setItem(`limits_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'budgetLimits'));
    await setDoc(docRef, { ...limitData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleDeleteLimit = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = budgetLimits.filter(l => l.id !== id);
      setBudgetLimits(updated);
      localStorage.setItem(`limits_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'budgetLimits', id));
  };

  // ==========================================
  // PUSH NOTIFICATION EFFECTS
  // ==========================================
  useEffect(() => {
    // Request permission once user signs in
    if (user && permission === 'default') {
      requestPermission();
    }
  }, [user, permission, requestPermission]);

  useEffect(() => {
    if (!user || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check due bills
    const dueBills = recurringBills.filter(b => b.nextDueDate <= todayStr);
    dueBills.forEach(b => {
      const isIncome = b.type === 'income';
      const storageKey = `notif_bill_${b.id}_${todayStr}`;
      if (!localStorage.getItem(storageKey)) {
        sendNotification(`${isIncome ? 'Income Due' : 'Bill Due'}: ${b.title}`, {
          body: `Amount: ₹${b.amount?.toLocaleString() || b.amount}\nClick to manage via Notification Center`,
          tag: storageKey
        });
        localStorage.setItem(storageKey, 'true');
      }
    });

    // Check due pending payments
    const duePayments = pendingPayments.filter(p => !p.completed && p.dueDate <= todayStr);
    duePayments.forEach(p => {
      const isOwed = p.type === 'owed';
      const storageKey = `notif_pay_${p.id}_${todayStr}`;
      if (!localStorage.getItem(storageKey)) {
        sendNotification(`Pending ${isOwed ? 'Collection' : 'Payment'} Due: ${p.person}`, {
          body: `Amount: ₹${p.amount?.toLocaleString() || p.amount}\nClick to manage via Notification Center`,
          tag: storageKey
        });
        localStorage.setItem(storageKey, 'true');
      }
    });

  }, [recurringBills, pendingPayments, user, sendNotification]);


  const handleAddTask = async (taskData: { title: string; description: string; dueDate: Date }): Promise<string> => {
    if (!user) return '';
    if (user.uid.startsWith('guest_offline_')) {
      const rawTasks = JSON.parse(localStorage.getItem(`tasks_${user.uid}`) || '[]');
      const newId = 'task_' + Math.random().toString(36).substring(2, 11);
      const newTask = {
        id: newId,
        userId: user.uid,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate.toISOString(),
        status: 'pending',
        notified: false
      };
      const updated = [...rawTasks, newTask];
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      return newId;
    }
    const docRef = doc(collection(db, 'tasks'));
    await setDoc(docRef, {
      id: docRef.id,
      userId: user.uid,
      title: taskData.title,
      description: taskData.description,
      dueDate: Timestamp.fromDate(taskData.dueDate),
      status: 'pending',
      notified: false,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  };

  const handleCompleteTask = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const rawTasks = JSON.parse(localStorage.getItem(`tasks_${user.uid}`) || '[]');
      const updated = rawTasks.map((t: any) => t.id === id ? { ...t, status: 'completed' } : t);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      return;
    }
    await updateDoc(doc(db, 'tasks', id), { status: 'completed' });
  };

  const handleUpdateTask = async (id: string, updates: Partial<ScheduledTask>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const rawTasks = JSON.parse(localStorage.getItem(`tasks_${user.uid}`) || '[]');
      const updated = rawTasks.map((t: any) => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      return;
    }
    await updateDoc(doc(db, 'tasks', id), updates);
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const rawTasks = JSON.parse(localStorage.getItem(`tasks_${user.uid}`) || '[]');
      const updated = rawTasks.filter((t: any) => t.id !== id);
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      return;
    }
    await deleteDoc(doc(db, 'tasks', id));
  };

  // Holding mutations
  const handleAddHolding = async (holdingData: Omit<Holding, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newHolding: Holding = {
        ...holdingData,
        id: 'h_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...holdings, newHolding];
      setHoldings(updated);
      localStorage.setItem(`holdings_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'holdings'));
    await setDoc(docRef, { ...holdingData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleDeleteHolding = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = holdings.filter(h => h.id !== id);
      setHoldings(updated);
      localStorage.setItem(`holdings_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'holdings', id));
  };

  const handleUpdateHolding = async (id: string, updatedData: Partial<Holding>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = holdings.map(h => h.id === id ? { ...h, ...updatedData } : h);
      setHoldings(updated);
      localStorage.setItem(`holdings_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(db, 'holdings', id);
    await updateDoc(docRef, updatedData);
  };

  const handleAddRealizedTrade = async (tradeData: Omit<RealizedTrade, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newTrade: RealizedTrade = {
        ...tradeData,
        id: 'rt_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...realizedTrades, newTrade];
      setRealizedTrades(updated);
      localStorage.setItem(`realized_trades_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'realizedTrades'));
    await setDoc(docRef, { ...tradeData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleAddToWatchlist = async (wData: Omit<WatchlistItem, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newW: WatchlistItem = {
        ...wData,
        id: 'w_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...watchlist, newW];
      setWatchlist(updated);
      localStorage.setItem(`watchlist_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'watchlist'));
    await setDoc(docRef, { ...wData, id: docRef.id, userId: user.uid });
  };

  const handleRemoveFromWatchlist = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = watchlist.filter(w => w.id !== id);
      setWatchlist(updated);
      localStorage.setItem(`watchlist_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'watchlist', id));
  };

  // SIP mutations
  const handleAddSip = async (sData: Omit<Sip, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newSip: Sip = {
        ...sData,
        id: 's_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...sips, newSip];
      setSips(updated);
      localStorage.setItem(`sips_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'sips'));
    await setDoc(docRef, { ...sData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleDeleteSip = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = sips.filter(s => s.id !== id);
      setSips(updated);
      localStorage.setItem(`sips_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'sips', id));
  };

  const handleEditSip = async (id: string, updates: Partial<Sip>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = sips.map(s => s.id === id ? { ...s, ...updates } : s);
      setSips(updated);
      localStorage.setItem(`sips_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'sips', id), updates);
  };

  // FD mutations
  const handleAddFd = async (fData: Omit<Fd, 'id' | 'userId'>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const newFd: Fd = {
        ...fData,
        id: 'f_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      };
      const updated = [...fds, newFd];
      setFds(updated);
      localStorage.setItem(`fds_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(collection(db, 'fds'));
    await setDoc(docRef, { ...fData, id: docRef.id, userId: user.uid, createdAt: serverTimestamp() });
  };

  const handleDeleteFd = async (id: string) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = fds.filter(f => f.id !== id);
      setFds(updated);
      localStorage.setItem(`fds_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, 'fds', id));
  };

  const handleEditFd = async (id: string, updates: Partial<Fd>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = fds.map(f => f.id === id ? { ...f, ...updates } : f);
      setFds(updated);
      localStorage.setItem(`fds_${user.uid}`, JSON.stringify(updated));
      return;
    }
    await updateDoc(doc(db, 'fds', id), updates);
  };

  // SmartAPI settings update
  const handleUpdateSmartApiSettings = async (settingsData: Partial<UserSettings>) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = { ...userSettings, ...settingsData } as UserSettings;
      setUserSettings(updated);
      localStorage.setItem(`settings_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const docRef = doc(db, 'usersettings', user.uid);
    await setDoc(docRef, { id: user.uid, ...settingsData }, { merge: true });
  };

  // Google Sheets integration overwrite mutations
  const handleOverwriteTransactions = async (newTrans: Omit<Transaction, 'id' | 'userId'>[]) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = newTrans.map(t => ({
        ...t,
        id: 'tx_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      } as Transaction));
      setTransactions(updated);
      localStorage.setItem(`tx_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const batch = writeBatch(db);
    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    snap.forEach((d) => batch.delete(d.ref));
    newTrans.forEach((t) => {
      const docRef = doc(collection(db, 'transactions'));
      batch.set(docRef, { ...t, id: docRef.id, userId: user.uid });
    });
    await batch.commit();
  };

  const handleOverwriteHoldings = async (newHoldings: Omit<Holding, 'id' | 'userId'>[]) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = newHoldings.map(h => ({
        ...h,
        id: 'h_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      } as Holding));
      setHoldings(updated);
      localStorage.setItem(`holdings_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const batch = writeBatch(db);
    const q = query(collection(db, 'holdings'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    snap.forEach((d) => batch.delete(d.ref));
    newHoldings.forEach((h) => {
      const docRef = doc(collection(db, 'holdings'));
      batch.set(docRef, { ...h, id: docRef.id, userId: user.uid });
    });
    await batch.commit();
  };

  const handleOverwriteSips = async (newSips: Omit<Sip, 'id' | 'userId'>[]) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = newSips.map(s => ({
        ...s,
        id: 's_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      } as Sip));
      setSips(updated);
      localStorage.setItem(`sips_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const batch = writeBatch(db);
    const q = query(collection(db, 'sips'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    snap.forEach((d) => batch.delete(d.ref));
    newSips.forEach((s) => {
      const docRef = doc(collection(db, 'sips'));
      batch.set(docRef, { ...s, id: docRef.id, userId: user.uid });
    });
    await batch.commit();
  };

  const handleOverwriteFds = async (newFds: Omit<Fd, 'id' | 'userId'>[]) => {
    if (!user) return;
    if (user.uid.startsWith('guest_offline_')) {
      const updated = newFds.map(f => ({
        ...f,
        id: 'f_' + Math.random().toString(36).substring(2, 11),
        userId: user.uid
      } as Fd));
      setFds(updated);
      localStorage.setItem(`fds_${user.uid}`, JSON.stringify(updated));
      return;
    }
    const batch = writeBatch(db);
    const q = query(collection(db, 'fds'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    snap.forEach((d) => batch.delete(d.ref));
    newFds.forEach((f) => {
      const docRef = doc(collection(db, 'fds'));
      batch.set(docRef, { ...f, id: docRef.id, userId: user.uid });
    });
    await batch.commit();
  };

  // PIN security operations
  const handleSavePin = async () => {
    if (!user) return;
    if (newPin.length !== 4 || isNaN(parseInt(newPin))) {
      alert('PIN must be 4 digits numeric.');
      return;
    }
    if (newPin !== confirmPin) {
      alert('PIN confirms mismatch.');
      return;
    }
    if (user.uid.startsWith('guest_offline_')) {
      const updated = { ...userSettings, pin: newPin } as UserSettings;
      setUserSettings(updated);
      localStorage.setItem(`settings_${user.uid}`, JSON.stringify(updated));
      setPinSetupActive(false);
      setNewPin('');
      setConfirmPin('');
      alert('Security PIN configured successfully!');
      return;
    }
    const docRef = doc(db, 'usersettings', user.uid);
    await setDoc(docRef, { id: user.uid, pin: newPin }, { merge: true });
    setPinSetupActive(false);
    setNewPin('');
    setConfirmPin('');
    alert('Security PIN configured successfully!');
  };

  const handleVerifyUnlock = () => {
    if (userSettings && userSettings.pin) {
      if (pinValue === userSettings.pin) {
        setIsLocked(false);
        setPinValue('');
      } else {
        alert('Oops, security authorization invalid. Retry PIN entry.');
        setPinValue('');
      }
    }
  };

  const handleBiometricUnlock = () => {
    setIsLocked(false);
    setPinValue('');
  };

  const handleNumpadPress = (num: string) => {
    if (pinValue.length < 4) {
      const nextPin = pinValue + num;
      setPinValue(nextPin);
      // Auto trigger verification if enters 4 digit
      if (nextPin.length === 4) {
        setTimeout(() => {
          if (userSettings && nextPin === userSettings.pin) {
            setIsLocked(false);
            setPinValue('');
          } else {
            alert('Incorrect security PIN. Access denied.');
            setPinValue('');
          }
        }, 150);
      }
    }
  };

  // Sign-In Google action wrapper
  const handleGoogleSignIn = () => {
    signInWithGoogle().catch((err) => {
      console.error(err);
      const errorMsg = err?.message || '';
      if (errorMsg.includes('unauthorized-domain')) {
        alert('Domain Not Authorized: Please add this website URL to Firebase Console -> Authentication -> Settings -> Authorized Domains.');
      } else {
        alert(`Authentication Error: ${errorMsg}\n\nMake sure popups are allowed and try again.`);
      }
    });
  };

  const handleMigrateGuestData = async () => {
    if (!pendingMigrationData || !user) return;
    setMigrationProgress('Migrating details to cloud...');
    try {
      const targetUid = user.uid;
      const { data } = pendingMigrationData;

      // Firestore Batch write
      const batch = writeBatch(db);

      // Migrate transactions
      data.transactions.forEach((tx: any) => {
        const docRef = doc(collection(db, 'transactions'));
        const { id, userId, ...rest } = tx;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate pendingPayments
      data.pendingPayments.forEach((pay: any) => {
        const docRef = doc(collection(db, 'pendingPayments'));
        const { id, userId, ...rest } = pay;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate savingsGoals
      data.savingsGoals.forEach((goal: any) => {
        const docRef = doc(collection(db, 'savingsGoals'));
        const { id, userId, ...rest } = goal;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate budgetLimits
      data.budgetLimits.forEach((lim: any) => {
        const docRef = doc(collection(db, 'budgetLimits'));
        const { id, userId, ...rest } = lim;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate holdings
      data.holdings.forEach((h: any) => {
        const docRef = doc(collection(db, 'holdings'));
        const { id, userId, ...rest } = h;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate realizedTrades
      data.realizedTrades.forEach((rt: any) => {
        const docRef = doc(collection(db, 'realizedTrades'));
        const { id, userId, ...rest } = rt;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate sips
      data.sips.forEach((s: any) => {
        const docRef = doc(collection(db, 'sips'));
        const { id, userId, ...rest } = s;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate fds
      data.fds.forEach((f: any) => {
        const docRef = doc(collection(db, 'fds'));
        const { id, userId, ...rest } = f;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate watchlist
      data.watchlist.forEach((w: any) => {
        const docRef = doc(collection(db, 'watchlist'));
        const { id, userId, ...rest } = w;
        batch.set(docRef, { ...rest, id: docRef.id, userId: targetUid });
      });

      // Migrate settings if there is custom settings
      if (data.userSettings) {
        const docRef = doc(db, 'usersettings', targetUid);
        const { id, ...rest } = data.userSettings;
        batch.set(docRef, { ...rest, id: targetUid }, { merge: true });
      }

      await batch.commit();

      // Clear local memory data
      const oldGuestId = pendingMigrationData.guestId;
      localStorage.removeItem(`tx_${oldGuestId}`);
      localStorage.removeItem(`pay_${oldGuestId}`);
      localStorage.removeItem(`goals_${oldGuestId}`);
      localStorage.removeItem(`limits_${oldGuestId}`);
      localStorage.removeItem(`holdings_${oldGuestId}`);
      localStorage.removeItem(`realized_trades_${oldGuestId}`);
      localStorage.removeItem(`sips_${oldGuestId}`);
      localStorage.removeItem(`fds_${oldGuestId}`);
      localStorage.removeItem(`watchlist_${oldGuestId}`);
      localStorage.removeItem(`settings_${oldGuestId}`);
      localStorage.removeItem('isOfflineMode');
      localStorage.removeItem('guest_user_id');

      setPendingMigrationData(null);
      setMigrationProgress('');
      alert('Congratulations! All your guest data has been successfully migrated to your Google Account. Offline mode deactivated and secured in Cloud Firestore.');
    } catch (e: any) {
      console.error(e);
      setMigrationProgress('');
      alert('Error during data migration: ' + e.message);
    }
  };

  const handleCancelMigration = () => {
    localStorage.removeItem('isOfflineMode');
    localStorage.removeItem('guest_user_id');
    setPendingMigrationData(null);
  };

  const handleGuestSignIn = () => {
    let guestId = localStorage.getItem('guest_user_id');
    if (!guestId) {
      guestId = 'guest_offline_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('guest_user_id', guestId);
    }
    const guestUserObj = {
      uid: guestId,
      email: 'guest@investmant.local',
      displayName: 'Guest Account',
      isAnonymous: true,
      emailVerified: false,
      photoURL: ''
    } as any;

    localStorage.setItem('isOfflineMode', 'true');
    setUser(guestUserObj);
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isOfflineMode');
    firebaseLogout().then(() => {
      setUser(null);
    }).catch((err) => {
      console.warn("Logout error:", err);
      setUser(null);
    });
  };

  // Fullscreen Loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="h-10 w-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        <p className="mt-2 text-xs font-bold text-slate-500">Securing environment...</p>
      </div>
    );
  }

  // Login View
  if (!user) {
    return (
      <LoginScreen
        handleGuestSignIn={handleGuestSignIn}
        handleGoogleSignIn={handleGoogleSignIn}
        showCustomLoginConfig={showCustomLoginConfig}
        setShowCustomLoginConfig={setShowCustomLoginConfig}
        customLoginClientId={customLoginClientId}
        setCustomLoginClientId={setCustomLoginClientId}
        handleCustomOauthLogin={handleCustomOauthLogin}
        loginManualToken={loginManualToken}
        setLoginManualToken={setLoginManualToken}
        handleApplyLoginManualToken={handleApplyLoginManualToken}
      />
    );
  }

  // Interactive Local PIN Lock Dialog
  if (isLocked && userSettings?.pin) {
    return (
      <PinLockScreen
        pinValue={pinValue}
        setPinValue={setPinValue}
        handleNumpadPress={handleNumpadPress}
        handleLogout={handleLogout}
        handleUnlock={handleBiometricUnlock}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-8 font-sans text-slate-900">
      
      {/* Guest Mode Notification Bar Removed */}
      
      {/* Top Navigation */}
      <Header
        user={user}
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        exportFullLedgerToCSV={() => exportFullLedgerToCSV(transactions, unifiedHoldings, sips, fds)}
        pinSetupActive={pinSetupActive}
        setPinSetupActive={setPinSetupActive}
        userSettings={userSettings}
        handleLogout={handleLogout}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenNavDrawer={() => setIsNavDrawerOpen(true)}
        unreadCount={
          recurringBills.filter(b => b.nextDueDate <= new Date().toISOString().split('T')[0]).length + 
          pendingPayments.filter(p => !p.completed && p.dueDate <= new Date().toISOString().split('T')[0]).length
        }
      />

      {/* PIN Lock Settings Form (Expandable Popover Dialog) */}
      <AnimatePresence>
        {pinSetupActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border-b border-slate-200 bg-linear-to-b from-slate-50 to-white py-2.5 px-2.5 z-40 relative shadow-sm"
          >
            <div className="max-w-md mx-auto grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-sans items-end">
              <div>
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1">
                  <Lock size={12} className="text-indigo-600" /> 
                  {userSettings?.pin ? 'Modify Security Lock PIN' : 'Initialize App Protection PIN'}
                </h4>
                <p className="text-[9px] text-slate-400 mt-0.5">Protect your investment sheets. Input exactly 4 digits.</p>
              </div>

              <div>
                <label className="block text-slate-500 font-bold text-[10px] mb-1">CHOOSE 4-DIGIT PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="••••"
                  value={newPin} 
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold tracking-widest text-center"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold text-[10px] mb-1">CONFIRM PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin} 
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 font-bold tracking-widest text-center"
                />
              </div>

              <div className="md:col-span-3 flex justify-end gap-1 border-t border-slate-100 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => setPinSetupActive(false)}
                  className="px-1.5 py-1.5 border border-slate-205 text-slate-500 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-1.5 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-slate-800"
                >
                  Save PIN
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Sticky Bar - Redesigned to show the Workspace Switcher + Horizontally scrollable row containing all tabs */}
      <BottomNavigation
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Primary Display Content Container */}
      <main className="max-w-8xl mx-auto px-2 sm:px-3 lg:px-4 mt-3 w-full grow pb-24 lg:pb-4">
        <div className="transition-all duration-300">
          <Routes>
            <Route path="/" element={<Navigate to={currentWorkspace === 'ledger' ? '/dashboard' : '/portfolio'} replace />} />
          <Route path="/dashboard" element={<Dashboard
              transactions={transactions}
              pendingPayments={pendingPayments}
              savingsGoals={savingsGoals}
              budgetLimits={budgetLimits}
              holdings={unifiedHoldings}
              sips={sips}
              fds={fds}
              ccBills={ccBills}
              ccEmis={ccEmis}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onNavigateToTab={setActiveTab}
              livePrices={livePrices}
            />} />

          <Route path="/analytics" element={<AnalyticsDashboard
              transactions={transactions}
              bankAccounts={bankAccounts}
              holdings={unifiedHoldings}
              fds={fds}
              sips={sips}
              pendingPayments={pendingPayments}
              brokerFunds={brokerFunds}
              ccBills={ccBills}
              ccEmis={ccEmis}
            />} />

          <Route path="/portfolio" element={<PortfolioTracker
                    holdings={unifiedHoldings}
                    realizedTrades={[...realizedTrades, ...(brokerRealizedTrades || [])]}
                    watchlist={watchlist}
                    onAddHolding={handleAddHolding}
                    onDeleteHolding={handleDeleteHolding}
                    onUpdateHolding={handleUpdateHolding}
                    onAddRealizedTrade={handleAddRealizedTrade}
                    onAddToWatchlist={handleAddToWatchlist}
                    onRemoveFromWatchlist={handleRemoveFromWatchlist}
                    userSettings={userSettings}
                    onUpdateSmartApiSettings={handleUpdateSmartApiSettings}
                    livePrices={livePrices}
                    refreshPrices={refreshPrices}
                    loadingPrices={loadingPrices}
                    brokerFunds={brokerFunds}
                    isSyncingBrokerData={isSyncing}
                    onRefreshBrokerData={refreshBrokerData}
                  />} />

          <Route path="/market-data" element={<MarketView />} />

          <Route path="/sips" element={<SipTracker
              sips={sips}
              onAddSip={handleAddSip}
              onDeleteSip={handleDeleteSip}
              onEditSip={handleEditSip}
            />} />

          <Route path="/fds" element={<FdRdTracker
              fds={fds}
              onAddFd={handleAddFd}
              onDeleteFd={handleDeleteFd}
              onEditFd={handleEditFd}
            />} />

          <Route path="/tax" element={<TaxCapitalGains
              holdings={unifiedHoldings}
              livePrices={livePrices}
            />} />

          <Route path="/forecaster" element={<WealthForecaster 
              fds={fds} 
              sips={sips} 
              holdings={unifiedHoldings} 
              livePrices={livePrices}
            />} />

          <Route path="/transactions" element={<TransactionTracker
              transactions={transactions}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              pendingPayments={pendingPayments}
              recurringBills={recurringBills}
              bankAccounts={bankAccounts}
              onAddBankAccount={handleAddBankAccount}
              onEditBankAccount={handleEditBankAccount}
              onDeleteBankAccount={handleDeleteBankAccount}
              onAutoPayPending={async (id) => {
                const p = pendingPayments.find(x => x.id === id);
                if (p) await handleEditPayment(id, { completed: true });
              }}
              onAutoPayRecurring={async (id) => {
                const b = recurringBills.find(x => x.id === id);
                if (b) {
                  const nextDate = new Date(b.nextDueDate);
                  if (b.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                  else nextDate.setFullYear(nextDate.getFullYear() + 1);
                  await handleEditRecurringBill(b.id, { nextDueDate: nextDate.toISOString().split('T')[0] });
                }
              }}
            />} />

          <Route path="/pending" element={<PendingPayments
              user={user}
              pendingPayments={pendingPayments}
              onAddPayment={handleAddPayment}
              onEditPayment={handleEditPayment}
              onDeletePayment={handleDeletePayment}
            />} />

          <Route path="/savings" element={<SavingsGoals
              savingsGoals={savingsGoals}
              onAddGoal={handleAddGoal}
              onEditGoal={handleEditGoal}
              onDeleteGoal={handleDeleteGoal}
            />} />

          <Route path="/credit-cards" element={<CreditCardsEMI user={user} ccBills={ccBills} ccEmis={ccEmis} />} />

          <Route path="/bank-profiles" element={<BankProfiles
              bankAccounts={bankAccounts}
              transactions={transactions}
              onAddBankAccount={handleAddBankAccount}
              onEditBankAccount={handleEditBankAccount}
              onDeleteBankAccount={handleDeleteBankAccount}
            />} />

          <Route path="/budgets" element={<BudgetLimits
              budgetLimits={budgetLimits}
              transactions={transactions}
              onAddLimit={handleAddLimit}
              onDeleteLimit={handleDeleteLimit}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />} />

          <Route path="/sheets" element={<GoogleSheetsSync
              transactions={transactions}
               holdings={unifiedHoldings}
               sips={sips}
               fds={fds}
               userSettings={userSettings}
               onUpdateUserSettings={handleUpdateSmartApiSettings}
               onReloadData={() => {
                 console.log('Google Sheets Sync completed data refresh.');
               }}
               onNavigateToTab={setActiveTab}
               onOverwriteTransactions={handleOverwriteTransactions}
               onOverwriteHoldings={handleOverwriteHoldings}
               onOverwriteSips={handleOverwriteSips}
               onOverwriteFds={handleOverwriteFds}
            />} />

          <Route path="/contacts" element={<ContactsManager
              user={user}
              pendingPayments={pendingPayments}
              transactions={transactions}
              onAddPayment={handleAddPayment}
              onNavigateToTab={setActiveTab}
            />} />

          <Route path="/settings" element={<SettingsManager
              user={user}
              userSettings={userSettings}
              onUpdateUserSettings={handleUpdateSmartApiSettings}
              onNavigateToTab={setActiveTab}
            />} />

          <Route path="/tasks" element={<TasksSection
              tasks={scheduledTasks}
              onAddTask={handleAddTask}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
              onUpdateTask={handleUpdateTask}
              userEmail={user?.email || ''}
            />} />

          <Route path="/recurring-bills" element={<RecurringBills
              recurringBills={recurringBills}
              onAddBill={handleAddRecurringBill}
              onEditBill={handleEditRecurringBill}
              onDeleteBill={handleDeleteRecurringBill}
            />} />

          <Route path="/workspace" element={<WorkspaceSuite
              user={user}
              onNavigateToTab={setActiveTab}
            />} />
            
          <Route path="/brokers" element={<BrokerManager 
              user={user} 
            />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* Toasts overlay notifications on overdue task alarms */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-1 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              className="bg-slate-900 text-white rounded-2xl p-2 shadow-xl border border-slate-700 pointer-events-auto flex gap-1.5 items-start justify-between"
            >
              <div className="grow space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                  <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>DUE RELEASE WARNING</span>
                </div>
                <p className="text-xs font-medium leading-relaxed font-sans text-slate-100">
                  {toast.message}
                </p>
              </div>
              <div className="flex flex-col gap-1 ml-2">
                <button
                  onClick={() => {
                     setSnoozingTask({ id: toast.id, title: toast.title });
                     const now = new Date();
                     setSnoozeDate(now.toISOString().substring(0, 10));
                     setSnoozeTime(now.toTimeString().substring(0, 5));
                     setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
                  }}
                  className="px-2 py-1 text-[10px] font-bold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 rounded transition-colors cursor-pointer"
                >
                  Snooze
                </button>
                <button
                  onClick={() => setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer flex justify-center items-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Snooze Modal */}
      <AnimatePresence>
        {snoozingTask && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-2xl space-y-3">
              <h3 className="font-bold text-slate-900">Snooze Task</h3>
              <p className="text-xs text-slate-500">Select a new date and time for: <br/><b className="text-slate-800">{snoozingTask.title}</b></p>
              <div className="space-y-2 pt-1">
                <input type="date" value={snoozeDate} onChange={e => setSnoozeDate(e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <input type="time" value={snoozeTime} onChange={e => setSnoozeTime(e.target.value)} className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
                <button onClick={() => setSnoozingTask(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer">Cancel</button>
                <button 
                  onClick={async () => {
                     if (!snoozeDate || !snoozeTime) return alert("Please select date and time.");
                     try {
                       const d = new Date(`${snoozeDate}T${snoozeTime}`);
                       await updateDoc(doc(db, 'tasks', snoozingTask.id), { 
                         dueDate: Timestamp.fromDate(d), 
                         notified: false 
                       });
                       setActiveToasts((prev) => prev.filter(t => t.id !== snoozingTask.id));
                       setSnoozingTask(null);
                     } catch(e) { alert("Failed to snooze: " + e); }
                  }} 
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
                  Save & Snooze
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        recurringBills={recurringBills}
        pendingPayments={pendingPayments}
        onPayBill={async (b) => {
          await handleAddTransaction({
            type: b.type || 'expense',
            category: b.category,
            amount: b.amount,
            date: new Date().toISOString().split('T')[0],
            notes: b.type === 'income' ? `Auto-logged income: ${b.title}` : `Auto-paid bill: ${b.title}`
          });
          const nextDate = new Date(b.nextDueDate);
          if (b.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else nextDate.setFullYear(nextDate.getFullYear() + 1);
          await handleEditRecurringBill(b.id, { nextDueDate: nextDate.toISOString().split('T')[0] });
        }}
        onSkipBill={async (b, customDate) => {
          let nextDateStr = '';
          if (customDate) {
            nextDateStr = customDate;
          } else {
            const nextDate = new Date(b.nextDueDate);
            if (b.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            else nextDate.setFullYear(nextDate.getFullYear() + 1);
            nextDateStr = nextDate.toISOString().split('T')[0];
          }
          await handleEditRecurringBill(b.id, { nextDueDate: nextDateStr });
        }}
        onPayPending={async (p) => {
          await handleAddTransaction({
            type: p.type === 'owed' ? 'income' : 'expense',
            category: 'Others',
            amount: p.amount,
            date: new Date().toISOString().split('T')[0],
            notes: `Settled pending: ${p.person} - ${p.notes || ''}`
          });
          await handleEditPayment(p.id, { completed: true });
        }}
        onRejectPending={async (p) => {
          await handleDeletePayment(p.id);
        }}
        onReschedulePending={async (p, newDate) => {
          await handleEditPayment(p.id, { dueDate: newDate });
        }}
      />

      <NavigationDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* MODAL: Guest to Cloud Firestore Database Migration Wizard */}
      <MigrationModal
        pendingMigrationData={pendingMigrationData}
        user={user}
        migrationProgress={migrationProgress}
        handleCancelMigration={handleCancelMigration}
        handleMigrateGuestData={handleMigrateGuestData}
      />

    </div>
  );
}

