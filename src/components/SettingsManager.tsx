import React, { useState, useEffect } from 'react';
import { 
  Settings, FileSpreadsheet, Users, ShieldCheck, ShieldAlert, Check, RefreshCw, 
  HelpCircle, Trash2, Key, Info, ExternalLink, Link2, Copy, AlertTriangle, Play,
  Calendar, FolderOpen, Mail, Video, CheckSquare, MessageSquare, FileText, GraduationCap, Presentation, Image
} from 'lucide-react';
import { getAccessToken, setAccessToken } from '../firebase';
import { UserSettings } from '../types';
import InfoTooltip from './InfoTooltip';
import GooglePicker from './GooglePicker';
import BrokerManager from './BrokerManager';
interface SettingsManagerProps {
  user: any;
  userSettings: UserSettings | null;
  onUpdateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

type ServiceType = 'sheets' | 'contacts' | 'calendar' | 'drive' | 'gmail' | 'meet' | 'tasks' | 'chat' | 'forms' | 'classroom' | 'docs' | 'slides' | 'photos';

interface ServiceConfig {
  id: ServiceType;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<any>;
  themeColor: 'emerald' | 'indigo' | 'rose' | 'blue' | 'red' | 'teal' | 'sky' | 'cyan' | 'violet' | 'amber' | 'yellow';
  tabName: string;
}

export default function SettingsManager({
  user,
  userSettings,
  onUpdateUserSettings,
  onNavigateToTab
}: SettingsManagerProps) {
  // Access token state
  const [token, setToken] = useState<string | null>(getAccessToken());
  
  // Link status states from localStorage 
  const [isSheetsLinked, setIsSheetsLinked] = useState(() => {
    const stored = localStorage.getItem('google_sheets_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isContactsLinked, setIsContactsLinked] = useState(() => {
    const stored = localStorage.getItem('google_contacts_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isCalendarLinked, setIsCalendarLinked] = useState(() => {
    const stored = localStorage.getItem('google_calendar_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isDriveLinked, setIsDriveLinked] = useState(() => {
    const stored = localStorage.getItem('google_drive_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isGmailLinked, setIsGmailLinked] = useState(() => {
    const stored = localStorage.getItem('google_gmail_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isMeetLinked, setIsMeetLinked] = useState(() => {
    const stored = localStorage.getItem('google_meet_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isTasksLinked, setIsTasksLinked] = useState(() => {
    const stored = localStorage.getItem('google_tasks_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isChatLinked, setIsChatLinked] = useState(() => {
    const stored = localStorage.getItem('google_chat_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isFormsLinked, setIsFormsLinked] = useState(() => {
    const stored = localStorage.getItem('google_forms_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isClassroomLinked, setIsClassroomLinked] = useState(() => {
    const stored = localStorage.getItem('google_classroom_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isDocsLinked, setIsDocsLinked] = useState(() => {
    const stored = localStorage.getItem('google_docs_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isSlidesLinked, setIsSlidesLinked] = useState(() => {
    const stored = localStorage.getItem('google_slides_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  const [isPhotosLinked, setIsPhotosLinked] = useState(() => {
    const stored = localStorage.getItem('google_photos_linked');
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  });

  // Google OAuth setup states
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('custom_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [customClientSecret, setCustomClientSecret] = useState(() => localStorage.getItem('custom_google_client_secret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '');
  const [manualAccessToken, setManualAccessToken] = useState('');
  
  // Spreadsheet settings configuration
  const [spreadsheetId, setSpreadsheetId] = useState(userSettings?.googleSpreadsheetId || '');
  const [savingSpreadsheetId, setSavingSpreadsheetId] = useState(false);
  
  // Status and logs state for transparency
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${message}`, ...prev].slice(0, 30));
  };

  useEffect(() => {
    const handleTokenChange = () => {
      const activeToken = getAccessToken();
      setToken(activeToken);
      if (!activeToken) {
        setIsSheetsLinked(false);
        setIsContactsLinked(false);
        setIsCalendarLinked(false);
        setIsDriveLinked(false);
        setIsGmailLinked(false);
        setIsMeetLinked(false);
        setIsTasksLinked(false);
        setIsChatLinked(false);
        setIsFormsLinked(false);
        setIsClassroomLinked(false);
        setIsDocsLinked(false);
        setIsSlidesLinked(false);
        setIsPhotosLinked(false);
        
        localStorage.setItem('google_sheets_linked', 'false');
        localStorage.setItem('google_contacts_linked', 'false');
        localStorage.setItem('google_calendar_linked', 'false');
        localStorage.setItem('google_drive_linked', 'false');
        localStorage.setItem('google_gmail_linked', 'false');
        localStorage.setItem('google_meet_linked', 'false');
        localStorage.setItem('google_tasks_linked', 'false');
        localStorage.setItem('google_chat_linked', 'false');
        localStorage.setItem('google_forms_linked', 'false');
        localStorage.setItem('google_classroom_linked', 'false');
        localStorage.setItem('google_docs_linked', 'false');
        localStorage.setItem('google_slides_linked', 'false');
        localStorage.setItem('google_photos_linked', 'false');
      } else {
        setIsSheetsLinked(localStorage.getItem('google_sheets_linked') === 'true');
        setIsContactsLinked(localStorage.getItem('google_contacts_linked') === 'true');
        setIsCalendarLinked(localStorage.getItem('google_calendar_linked') === 'true');
        setIsDriveLinked(localStorage.getItem('google_drive_linked') === 'true');
        setIsGmailLinked(localStorage.getItem('google_gmail_linked') === 'true');
        setIsMeetLinked(localStorage.getItem('google_meet_linked') === 'true');
        setIsTasksLinked(localStorage.getItem('google_tasks_linked') === 'true');
        setIsChatLinked(localStorage.getItem('google_chat_linked') === 'true');
        setIsFormsLinked(localStorage.getItem('google_forms_linked') === 'true');
        setIsClassroomLinked(localStorage.getItem('google_classroom_linked') === 'true');
        setIsDocsLinked(localStorage.getItem('google_docs_linked') === 'true');
        setIsSlidesLinked(localStorage.getItem('google_slides_linked') === 'true');
        setIsPhotosLinked(localStorage.getItem('google_photos_linked') === 'true');
      }
    };
    window.addEventListener('google-token-changed', handleTokenChange);
    return () => window.removeEventListener('google-token-changed', handleTokenChange);
  }, []);

  useEffect(() => {
    if (userSettings?.googleSpreadsheetId) {
      setSpreadsheetId(userSettings.googleSpreadsheetId);
    }
  }, [userSettings]);
  const getServiceLabel = (service: ServiceType): string => {
    switch (service) {
      case 'sheets': return 'Google Sheets';
      case 'contacts': return 'Google Contacts';
      case 'calendar': return 'Google Calendar';
      case 'drive': return 'Google Drive';
      case 'gmail': return 'Gmail';
      case 'meet': return 'Google Meet';
      case 'tasks': return 'Google Tasks';
      case 'chat': return 'Google Chat';
      case 'forms': return 'Google Forms';
      case 'docs': return 'Google Docs';
      case 'slides': return 'Google Slides';
      case 'photos': return 'Google Photos';
    }
  };

  const isLinked = (id: ServiceType): boolean => {
    switch (id) {
      case 'sheets': return isSheetsLinked;
      case 'contacts': return isContactsLinked;
      case 'calendar': return isCalendarLinked;
      case 'drive': return isDriveLinked;
      case 'gmail': return isGmailLinked;
      case 'meet': return isMeetLinked;
      case 'tasks': return isTasksLinked;
      case 'chat': return isChatLinked;
      case 'forms': return isFormsLinked;
      case 'docs': return isDocsLinked;
      case 'slides': return isSlidesLinked;
      case 'photos': return isPhotosLinked;
    }
  };

  const setServiceLinkedState = (service: ServiceType, state: boolean) => {
    switch (service) {
      case 'sheets': setIsSheetsLinked(state); break;
      case 'contacts': setIsContactsLinked(state); break;
      case 'calendar': setIsCalendarLinked(state); break;
      case 'drive': setIsDriveLinked(state); break;
      case 'gmail': setIsGmailLinked(state); break;
      case 'meet': setIsMeetLinked(state); break;
      case 'tasks': setIsTasksLinked(state); break;
      case 'chat': setIsChatLinked(state); break;
      case 'forms': setIsFormsLinked(state); break;
      case 'docs': setIsDocsLinked(state); break;
      case 'slides': setIsSlidesLinked(state); break;
      case 'photos': setIsPhotosLinked(state); break;
    }
  };

  // Standard Google Sign in Redirect Auth flow
  const handleOAuthLogin = async (targetService: ServiceType) => {
    const serviceName = getServiceLabel(targetService);

    // NATIVE FLOW
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      addLog(`📱 Native environment detected. Requesting Google Auth natively for ${serviceName}...`);
      try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        const { ALL_GOOGLE_SCOPES } = await import('../firebase');
        
        const result = await FirebaseAuthentication.signInWithGoogle({
          scopes: ALL_GOOGLE_SCOPES,
          customParameters: [
             { key: 'prompt', value: 'consent' },
             { key: 'access_type', value: 'offline' }
          ]
        });
        
        if (result.credential?.accessToken) {
          setAccessToken(result.credential.accessToken);
          setToken(result.credential.accessToken);
          
          setServiceLinkedState(targetService, true);
          localStorage.setItem(`google_${targetService}_linked`, 'true');
          
          window.dispatchEvent(new Event('google-token-changed'));
          addLog(`✅ Google Auth connection linked successfully via native flow.`);
          alert(`🎉 Successfully connected and configured ${serviceName}!`);
        } else {
          throw new Error("No access token returned from native Google Auth");
        }
      } catch (err: any) {
         addLog(`❌ Native Auth error: ${err.message}`);
         alert(`Native Google Sign-In Error: ${err.message}`);
      }
      return;
    }

    if (!customClientId) {
      alert("Please enter a valid Google Client ID first.");
      return;
    }
    localStorage.setItem('custom_google_client_id', customClientId.trim());
    localStorage.setItem('custom_google_client_secret', customClientSecret.trim());
    
    const redirectUri = window.location.origin;
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/spreadsheets ' + 
      'https://www.googleapis.com/auth/contacts ' + 
      'https://www.googleapis.com/auth/calendar ' + 
      'https://www.googleapis.com/auth/drive ' + 
      'https://www.googleapis.com/auth/drive.readonly ' + 
      'https://www.googleapis.com/auth/tasks ' +
      'https://www.googleapis.com/auth/gmail.send ' +
      'https://www.googleapis.com/auth/gmail.readonly ' +
      'https://www.googleapis.com/auth/chat.spaces.readonly ' +
      'https://www.googleapis.com/auth/chat.messages.create ' +
      'https://www.googleapis.com/auth/classroom.courses.readonly ' +
      'https://www.googleapis.com/auth/documents ' +
      'https://www.googleapis.com/auth/presentations ' +
      'https://www.googleapis.com/auth/photoslibrary.readonly'
    );
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${customClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopes}`;
    
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (isMobile) {
      addLog(`📱 Mobile environment detected. Redirecting to Google Auth for ${serviceName}...`);
      localStorage.setItem('oauth_target_service', targetService);
      localStorage.setItem('oauth_return_tab', 'settings');
      window.location.href = oauthUrl;
      return;
    }

    addLog(`🔗 Initiating Google OAuth Login Popup for ${serviceName}...`);
    const size = "width=600,height=700,left=150,top=100";
    const authWindow = window.open(oauthUrl, 'GoogleCustomOAuthLogin', size);
    
    if (authWindow) {
      const listener = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
          setAccessToken(event.data.token);
          setToken(event.data.token);
          
          setServiceLinkedState(targetService, true);
          localStorage.setItem(`google_${targetService}_linked`, 'true');
          
          window.dispatchEvent(new Event('google-token-changed'));
          addLog(`✅ Google Auth connection linked successfully via custom client ID.`);
          alert(`🎉 Successfully connected and configured ${serviceName}!`);
          window.removeEventListener('message', listener);
        }
      };
      window.addEventListener('message', listener);
    } else {
      addLog(`⚠️ Popup blocked. Falling back to direct redirect flow...`);
      if (confirm("Popup was blocked by your browser. Would you like to redirect directly to authorize Google Services?")) {
        localStorage.setItem('oauth_target_service', targetService);
        localStorage.setItem('oauth_return_tab', 'settings');
        window.location.href = oauthUrl;
      }
    }
  };

  // Manual pasting of OAuth Access Token
  const handleApplyManualToken = (targetService: ServiceType) => {
    const cleanToken = manualAccessToken.trim();
    if (!cleanToken) {
      alert("Please paste a valid Google Access Token.");
      return;
    }
    setAccessToken(cleanToken);
    setToken(cleanToken);
    
    setServiceLinkedState(targetService, true);
    localStorage.setItem(`google_${targetService}_linked`, 'true');
    
    window.dispatchEvent(new Event('google-token-changed'));
    const serviceName = getServiceLabel(targetService);
    addLog(`✅ Manual access token loaded for ${serviceName}.`);
    alert(`🎉 Success! Access Token activated for ${serviceName}.`);
    setManualAccessToken('');
  };

  // Save the custom Spreadsheet ID
  const handleSaveSpreadsheetId = async () => {
    if (!user) return;
    setSavingSpreadsheetId(true);
    addLog(`💾 Committing target Spreadsheet ID: ${spreadsheetId}`);
    try {
      await onUpdateUserSettings({
        googleSpreadsheetId: spreadsheetId.trim()
      });
      addLog(`✅ Target spreadsheet updated inside remote metadata.`);
      alert('📅 Google Spreadsheet ID updated successfully!');
    } catch (err: any) {
      addLog(`❌ Spreadsheet save failed: ${err.message}`);
      alert(`Error saving Spreadsheet ID: ${err.message}`);
    } finally {
      setSavingSpreadsheetId(false);
    }
  };

  // Unlinking / Disconnecting individual services
  const handleUnlink = (targetService: ServiceType) => {
    const serviceLabel = getServiceLabel(targetService);
    if (confirm(`Are you sure you want to unlink and disconnect ${serviceLabel}?`)) {
      addLog(`🔌 Disconnecting ${serviceLabel} sync...`);
      
      setServiceLinkedState(targetService, false);
      localStorage.setItem(`google_${targetService}_linked`, 'false');

      const services: ServiceType[] = ['sheets', 'contacts', 'calendar', 'drive', 'gmail', 'meet', 'tasks', 'chat', 'forms', 'classroom', 'docs', 'slides', 'photos'];
      const remainsAny = services.some(srv => localStorage.getItem(`google_${srv}_linked`) === 'true');
      
      if (!remainsAny) {
        setAccessToken(null);
        setToken(null);
        addLog(`🧹 All service modules unlinked. Central Google access token removed.`);
      }

      window.dispatchEvent(new Event('google-token-changed'));
      alert(`✅ ${serviceLabel} disconnected successfully!`);
    }
  };

  // 10 Services Array Mappings
  const serviceConfigs: ServiceConfig[] = [
    {
      id: 'sheets',
      name: 'Google Sheets Sync',
      category: 'Spreadsheet Cloud Export',
      description: 'Keep custom records synchronized dynamically. Export valuations, transaction records, and capital gains with instant live updates.',
      icon: FileSpreadsheet,
      themeColor: 'emerald',
      tabName: 'sheets'
    },
    {
      id: 'contacts',
      name: 'Google Contacts Sync',
      category: 'Rolodex Phone Directory',
      description: 'Synchronize contact books to identify clients, record client dues, load cell numbers, and link records seamlessly.',
      icon: Users,
      themeColor: 'indigo',
      tabName: 'contacts'
    },
    {
      id: 'calendar',
      name: 'Google Calendar Sync',
      category: 'Scheduling & Timeline',
      description: 'Sync your tasks as live, searchable events. Schedule due alerts and see outstanding payments on your main calendar.',
      icon: Calendar,
      themeColor: 'rose',
      tabName: 'tasks'
    },
    {
      id: 'drive',
      name: 'Google Drive Library',
      category: 'Cloud File Storage',
      description: 'Explore, manage, and upload file invoices, database backup records, or client text exports inside your secure cloud drive.',
      icon: FolderOpen,
      themeColor: 'blue',
      tabName: 'workspace'
    },
    {
      id: 'gmail',
      name: 'Gmail Mailbox',
      category: 'Secure Client Emails',
      description: 'Read the latest client emails, search inbox correspondence threads, and dispatch financial sheets as secure SMTP emails.',
      icon: Mail,
      themeColor: 'red',
      tabName: 'workspace'
    },
    {
      id: 'meet',
      name: 'Google Meet',
      category: 'Video Meetings Engine',
      description: 'Easily draft instant virtual meeting invite links in 1-click for quick consultations and live review meetings.',
      icon: Video,
      themeColor: 'teal',
      tabName: 'workspace'
    },
    {
      id: 'tasks',
      name: 'Google Tasks Sync',
      category: 'Personal Todo Boards',
      description: 'Draft central checklist boards, synchronize ongoing dues as items, and coordinate checkboxes with Google Tasks.',
      icon: CheckSquare,
      themeColor: 'sky',
      tabName: 'workspace'
    },
    {
      id: 'chat',
      name: 'Google Chat Spaces',
      category: 'Workspace Communications',
      description: 'Draft automated warning messages, post alerts to specified spacing chat rooms, and fetch public spaces.',
      icon: MessageSquare,
      themeColor: 'cyan',
      tabName: 'workspace'
    },
    {
      id: 'forms',
      name: 'Google Forms',
      category: 'Customer Survey Data',
      description: 'Expose feedback sheets, collect client details, and structure public survey responses in real-time.',
      icon: FileText,
      themeColor: 'violet',
      tabName: 'workspace'
    },
    {
      id: 'classroom',
      name: 'Google Classroom',
      category: 'Education Courses',
      description: 'Manage active student details, track investment training classes, and direct custom coursework outlines.',
      icon: GraduationCap,
      themeColor: 'amber',
      tabName: 'workspace'
    },
    {
      id: 'docs',
      name: 'Google Docs API',
      category: 'Cloud Document Engine',
      description: 'Auto-generate structured reports, export financial summaries, and create client text invoices dynamically.',
      icon: FileText,
      themeColor: 'blue',
      tabName: 'workspace'
    },
    {
      id: 'slides',
      name: 'Google Slides API',
      category: 'Presentations',
      description: 'Create dynamic presentation decks for clients and pitch updates automatically.',
      icon: Presentation,
      themeColor: 'yellow',
      tabName: 'workspace'
    },
    {
      id: 'photos',
      name: 'Google Photos API',
      category: 'Media & Albums',
      description: 'Access client media libraries, upload receipt images, and curate custom photo albums automatically.',
      icon: Image,
      themeColor: 'cyan',
      tabName: 'workspace'
    }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-3 shadow-xs font-sans max-w-7xl mx-auto space-y-3" id="settings-manager-panel">
      
      {/* Settings Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1">
          <div className="p-1 bg-slate-900 text-white rounded-2xl">
            <Settings size={26} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">App Settings & Core Links</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Central Integrations & Google Authorization Console</p>
          </div>
        </div>
        <div className="text-right hidden md:block bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 justify-end">
            <Users size={12} className="text-teal-600" />
            {user?.displayName || 'Authorized User'}
          </div>
          <div className="text-[10px] font-mono text-slate-700 mt-0.5">{user?.email || 'No email linked'}</div>
        </div>
      </div>

      {/* BROKER MANAGER INTEGRATION */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <BrokerManager user={user} />
      </div>

      {/* OPERATIONS LOG SCREEN */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 space-y-1">
        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            Real-time Credentials Status Log Handshaker
          </span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-[8px] text-slate-700 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
          >
            Clear Screen Logs
          </button>
        </div>
        
        <div className="font-mono text-[9px] md:text-[10px] text-emerald-400 space-y-1 max-h-[120px] overflow-y-auto scrollbar-hide py-1">
          {logs.length === 0 ? (
            <p className="text-slate-700 text-center italic py-1">Waiting for interaction. Authorize a service below to watch authorization handshakes...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="transition-all animate-fadeIn leading-relaxed border-b border-slate-850/30 pb-1 wrap-break-word">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
