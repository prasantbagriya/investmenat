import React, { useState, useEffect } from 'react';
import { 
  Settings, FileSpreadsheet, Users, ShieldCheck, ShieldAlert, Check, RefreshCw, 
  HelpCircle, Trash2, Key, Info, ExternalLink, Link2, Copy, AlertTriangle, Play,
  Calendar, FolderOpen, Mail, Video, CheckSquare, MessageSquare, FileText, GraduationCap, Presentation
} from 'lucide-react';
import { getAccessToken, setAccessToken } from '../firebase';
import { UserSettings } from '../types';
import InfoTooltip from './InfoTooltip';
import GooglePicker from './GooglePicker';

interface SettingsManagerProps {
  user: any;
  userSettings: UserSettings | null;
  onUpdateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

type ServiceType = 'sheets' | 'contacts' | 'calendar' | 'drive' | 'gmail' | 'meet' | 'tasks' | 'chat' | 'forms' | 'classroom' | 'docs' | 'slides';

interface ServiceConfig {
  id: ServiceType;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<any>;
  themeColor: 'emerald' | 'indigo' | 'rose' | 'blue' | 'red' | 'teal' | 'sky' | 'cyan' | 'violet' | 'amber';
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

  // Google OAuth setup states
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('custom_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [customClientSecret, setCustomClientSecret] = useState(() => localStorage.getItem('custom_google_client_secret') || import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '');
  const [manualAccessToken, setManualAccessToken] = useState('');
  
  // Service Account States
  const [isExchangingSA, setIsExchangingSA] = useState(false);
  const [saEmailInput, setSaEmailInput] = useState(() => localStorage.getItem('sa_email') || 'investment@gen-lang-client-0137730538.iam.gserviceaccount.com');
  const [saKeyInput, setSaKeyInput] = useState(() => localStorage.getItem('sa_key') || '');

  // Spreadsheet settings configuration
  const [spreadsheetId, setSpreadsheetId] = useState(userSettings?.googleSpreadsheetId || '');
  const [savingSpreadsheetId, setSavingSpreadsheetId] = useState(false);

  // Status and logs state for transparency
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedEmail, setCopiedEmail] = useState(false);

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

  // Copy helper
  const handleCopyEmail = () => {
    navigator.clipboard.writeText(saEmailInput.trim());
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    addLog("📋 Service Account email copied to clipboard.");
  };

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
    }
  };

  // Service Account handshake for an individual app
  const handleLinkService = async (serviceId: ServiceType) => {
    if (!saEmailInput.trim() || !saKeyInput.trim()) {
      alert("Please save your Google Service Account credentials in the panel above before continuing.");
      return;
    }
    setIsExchangingSA(true);
    const serviceName = getServiceLabel(serviceId);
    addLog(`🔐 Performing targeted handshake for ${serviceName}...`);
    try {
      localStorage.setItem('sa_email', saEmailInput.trim());
      localStorage.setItem('sa_key', saKeyInput.trim());

      const res = await fetch('/api/get-google-service-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: saEmailInput.trim(),
          privateKey: saKeyInput.trim()
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned ${res.status}`);
      }

      const resData = await res.json();
      if (resData.accessToken) {
        setAccessToken(resData.accessToken);
        setToken(resData.accessToken);
        
        setServiceLinkedState(serviceId, true);
        localStorage.setItem(`google_${serviceId}_linked`, 'true');
        addLog(`✅ Successfully linked ${serviceName} integration.`);
        alert(`🎉 Google ${serviceName} has been successfully authorized and enabled!`);
        
        window.dispatchEvent(new Event('google-token-changed'));
      } else {
        throw new Error('Empty access token negotiated.');
      }
    } catch (err: any) {
      addLog(`❌ Handshake failed: ${err.message || err}`);
      alert(`Bypass Error: ${err.message || String(err)}`);
    } finally {
      setIsExchangingSA(false);
    }
  };

  // Service Account handshake to authorize ALL 10 apps simultaneously
  const handleLinkAllServices = async () => {
    if (!saEmailInput.trim() || !saKeyInput.trim()) {
      alert("Please enter both Service Account Email and Private Key first!");
      return;
    }
    
    setIsExchangingSA(true);
    addLog(`🚀 Launching full-scope handshake for all 10 Google Suite APIs...`);
    try {
      localStorage.setItem('sa_email', saEmailInput.trim());
      localStorage.setItem('sa_key', saKeyInput.trim());

      const res = await fetch('/api/get-google-service-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: saEmailInput.trim(),
          privateKey: saKeyInput.trim()
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned ${res.status}`);
      }

      const resData = await res.json();
      if (resData.accessToken) {
        setAccessToken(resData.accessToken);
        setToken(resData.accessToken);
        
        const list: ServiceType[] = ['sheets', 'contacts', 'calendar', 'drive', 'gmail', 'meet', 'tasks', 'chat', 'forms', 'classroom', 'docs', 'slides'];
        list.forEach(srv => {
          setServiceLinkedState(srv, true);
          localStorage.setItem(`google_${srv}_linked`, 'true');
        });
        
        addLog(`✅ Full authorization success! 10 apps are now fully synchronized.`);
        alert(`🎉 Awesome! All 10 Google Workspace Suite applications have been successfully authorized and connected!`);
        window.dispatchEvent(new Event('google-token-changed'));
      } else {
        throw new Error('Empty access token negotiated.');
      }
    } catch (err: any) {
      addLog(`❌ Joint Handshake failed: ${err.message || err}`);
      alert(`Bypass Error: ${err.message || String(err)}`);
    } finally {
      setIsExchangingSA(false);
    }
  };

  // Standard Google Sign in Redirect Auth flow
  const handleOAuthLogin = (targetService: ServiceType) => {
    if (!customClientId) {
      alert("Please enter a valid Google Client ID first.");
      return;
    }
    localStorage.setItem('custom_google_client_id', customClientId.trim());
    localStorage.setItem('custom_google_client_secret', customClientSecret.trim());
    const serviceName = getServiceLabel(targetService);
    addLog(`🔗 Initiating Google OAuth Login Popup for ${serviceName}...`);
    
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
      'https://www.googleapis.com/auth/presentations'
    );
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${customClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopes}`;
    
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
      alert("Popup blocked! Please allow popups to complete the authentication stream.");
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

      const services: ServiceType[] = ['sheets', 'contacts', 'calendar', 'drive', 'gmail', 'meet', 'tasks', 'chat', 'forms', 'classroom', 'docs', 'slides'];
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Central Integrations & Google Authorization Console</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono hidden md:block">
          System Sync Room Localized
        </div>
      </div>

      {/* ERROR 403 / AUTH NOTICE BAR */}
      <div className="bg-linear-to-r from-teal-50 to-indigo-50 border border-teal-200/60 rounded-2xl p-2 flex gap-1 text-slate-800 text-xs shadow-xs">
        <ShieldCheck size={20} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            🔑 Google Services 10-App Linking System Installed
          </h4>
          <p className="leading-relaxed text-slate-600 mt-1">
            Configure your <b>Unified Google Service Account</b> credentials below just once, then select and activate any of the 10 services with 1-click! This prevents popup blockages and avoids 403 access codes.
          </p>
        </div>
      </div>

      {/* GUEST CONVERSION CARD */}
      {user && (user.uid.startsWith('guest_offline_') || user.isAnonymous) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-2 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-sm animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-amber-800">
              <ShieldAlert size={18} className="text-amber-600 animate-pulse shrink-0" />
              <h4 className="font-extrabold text-[13px] text-slate-800">
                🔒 आप अभी Offline Mode (Guest Account) पर हैं!
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans max-w-2xl">
              आपका सारा निवेश डेटा (Transactions, Stocks, Mutual Funds, SIPs, Goals) केवल इसी ब्राउज़र में सुरक्षित है। अगर आप ब्राउज़र कुकीज़ या डेटा साफ़ करेंगे तो डेटा उड़ सकता है। 
              सुरक्षित क्लाउड स्टोरेज और अन्य उपकरणों के साथ सिंक करने के लिए अपने वास्तविक <b>Google Account / Google Auth</b> से लिंक करें!
            </p>
            <div className="bg-amber-100/50 border border-amber-200/50 rounded-lg p-1.5 mt-1 text-[10px] text-amber-950/80 leading-relaxed">
              <strong>💡 महत्वपूर्ण जानकारी (iframe Popup Blocker):</strong> क्योंकि यह ऐप Google AI Studio iFrame में खुल रहा है, कृपया ध्यान दें कि सीधा लॉग इन ब्लॉक हो सकता है। अगर समस्या आये, तो स्क्रीन के ऊपरी दायें कोने में <strong>"Open in New Window" (Tab pointer)</strong> बटन पर क्लिक करके नए टैब में लोड करें। वहाँ पॉपअप ब्लॉक नहीं होगा और Google Auth लिंक सुचारू रूप से हो जायेगा!
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                // Clear the offline mode flag and invoke Google sign-in
                localStorage.removeItem('isOfflineMode');
                // Dispatch event
                window.dispatchEvent(new CustomEvent('trigger-google-sign-in'));
              }}
              className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold py-1 px-2 rounded-xl text-xs cursor-pointer transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.61 4.5 1.8l2.4-2.4C17.3 1.8 14.9 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.37 0 9.6-3.815 9.6-9.715 0-.585-.05-1.17-.15-1.74l-9.45.04z" />
              </svg>
              Standard Google Auth से लिंक करें
            </button>
          </div>
        </div>
      )}

      {/* UNIQUE CENTRAL SERVICE ACCOUNT PANEL */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-3xl p-2 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 border-b border-slate-200/60 pb-1">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 p-1 px-1 rounded-lg">🛡️ Central Credentials</span>
            <h3 className="font-extrabold text-slate-800 text-sm mt-1.5 flex items-center">
              Google Service Account Setup
              <InfoTooltip text="This credentials block powers secure, zero-interaction connections for all 10 apps below." />
            </h3>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleLinkAllServices}
              disabled={isExchangingSA}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-1.5 px-1 rounded-lg text-[10.5px] cursor-pointer transition-colors shadow-xs flex items-center gap-1"
            >
              <RefreshCw size={12} className={isExchangingSA ? 'animate-spin' : ''} />
              Link All 10 Services at Once ⚡
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
              1. Service Account Email
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={saEmailInput}
                onChange={(e) => {
                  setSaEmailInput(e.target.value);
                  localStorage.setItem('sa_email', e.target.value);
                }}
                placeholder="investment@gen-lang-client..."
                className="flex-1 bg-white border border-slate-200 rounded-xl p-1 text-[11px] font-mono text-slate-700 outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleCopyEmail}
                className="bg-white hover:bg-slate-100 border border-slate-200 p-1 rounded-xl text-slate-500 cursor-pointer"
                title="Copy Email"
              >
                {copiedEmail ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">Share your target Sheets, Drive folders, and calendars with this email as an <strong className="text-teal-700 font-extrabold">Editor</strong>.</p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                2. Private Key PEM (or entire Credentials .json string)
              </label>
              <span className="text-[8px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Normalize & Cleaned</span>
            </div>
            <textarea
              rows={2}
              value={saKeyInput}
              onChange={(e) => {
                setSaKeyInput(e.target.value);
                localStorage.setItem('sa_key', e.target.value);
              }}
              placeholder="Paste private key text starting with -----BEGIN PRIVATE KEY----- ... or paste downloaded JSON file contents"
              className="w-full bg-white border border-slate-200 rounded-xl p-1 text-[9.5px] font-mono text-slate-700 outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* SPREADSHEET TARGET PATH SPECIFICATION */}
      <div className="bg-emerald-50/40 border border-emerald-200/40 rounded-3xl p-2.5 space-y-1.5">
        <div className="flex items-center gap-1">
          <div className="p-1 px-1.5 bg-emerald-500 text-white rounded-lg text-xs font-extrabold">TARGET SHEET ID</div>
          <p className="text-xs text-slate-600 font-medium">Define which explicit Google Spreadsheet will hold exported transactions, valuations, and SIP files.</p>
        </div>
        <div className="flex gap-1 max-w-2xl">
          <input
            type="text"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="Paste 44-character Spreadsheet ID"
            className="flex-1 bg-white border border-slate-200 rounded-xl p-1.5 px-2 text-xs font-mono text-slate-800 focus:outline-emerald-500 outline-none"
          />
          <button
            type="button"
            onClick={handleSaveSpreadsheetId}
            disabled={savingSpreadsheetId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2 rounded-xl text-xs cursor-pointer transition-colors"
          >
            {savingSpreadsheetId ? "Saving..." : "Commit ID"}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-sans italic pl-1">The Spreadsheet ID is found inside the Google Sheets browser URL between <b>/d/</b> and <b>/edit</b>. Ensure you shared your sheet with the Service Account email above!</p>
      </div>

      {/* GOOGLE PICKER TEST PANEL */}
      <div className="bg-blue-50/40 border border-blue-200/40 rounded-3xl p-2.5 space-y-1.5">
        <div className="flex items-center gap-1">
          <div className="p-1 px-1.5 bg-blue-500 text-white rounded-lg text-xs font-extrabold">GOOGLE PICKER & DOCS API (TEST)</div>
          <p className="text-xs text-slate-600 font-medium">Select a Google file or generate a new Google Doc dynamically.</p>
        </div>
        <div className="flex gap-2 max-w-2xl mt-1">
          <GooglePicker 
            label="Open Google Drive Picker" 
            onSelect={(file) => {
              addLog(`📄 Selected file via Picker: ${file.name} (URL: ${file.url})`);
              alert(`You selected: ${file.name}\nURL: ${file.url}`);
            }} 
          />
          <button
            type="button"
            onClick={async () => {
              if (!isDocsLinked) {
                alert("Please authorize Google Docs API in the grid below first.");
                return;
              }
              try {
                addLog(`📄 Generating Sample Google Doc...`);
                const { generateSampleReportDoc } = await import('./GoogleDocsManager');
                const docId = await generateSampleReportDoc({ message: "Hello from InvestMant Test!" });
                addLog(`✅ Google Doc Created! ID: ${docId}`);
                window.open(`https://docs.google.com/document/d/${docId}/edit`, '_blank');
              } catch (err: any) {
                alert(`Error creating Google Doc: ${err.message}`);
                addLog(`❌ Google Docs creation failed: ${err.message}`);
              }
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
          >
            Create Test Google Doc
          </button>
        </div>
      </div>

      {/* ALL 10 APPS INTEGRATIONS GRID */}
      <div>
        <div className="pb-1 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">All 10 Integrations & Connection Checks</h3>
          <span className="text-[10px] font-bold text-indigo-600">Central Integration Framework active</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-3">
          {serviceConfigs.map((srv) => {
            const linked = isLinked(srv.id);
            const IconComponent = srv.icon;
            
            // Generate visual styles dynamically
            const themeColors = {
              emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', accent: 'text-emerald-600' },
              indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', accent: 'text-indigo-600' },
              rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', accent: 'text-rose-600' },
              blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', accent: 'text-blue-500' },
              red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', accent: 'text-red-600' },
              teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', accent: 'text-teal-600' },
              sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', accent: 'text-sky-500' },
              cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', accent: 'text-cyan-600' },
              violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', accent: 'text-violet-600' },
              amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', accent: 'text-amber-600' },
            }[srv.themeColor];

            return (
              <div 
                key={srv.id} 
                className="border border-slate-200 rounded-3xl p-2 hover:shadow-md transition-all space-y-2 flex flex-col justify-between"
                id={`card-${srv.id}`}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1.5 rounded-xl border ${themeColors.bg} ${themeColors.text} ${themeColors.border}`}>
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{srv.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{srv.category}</p>
                      </div>
                    </div>
                    <div>
                      {linked ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-250/50 p-1 px-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                          Linked
                        </span>
                      ) : (
                        <span className="bg-slate-50 text-slate-500 border border-slate-250/60 p-1 px-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          Ready
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11.5px] text-slate-500 leading-relaxed font-sans min-h-[50px]">
                    {srv.description}
                  </p>

                  <div className="pt-1">
                    {linked ? (
                      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-1 text-[10.5px] text-slate-600 flex items-center gap-1.5 font-medium">
                        <Check size={12} className="text-emerald-600 shrink-0" />
                        <span>Authorized & ready under global credentials.</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLinkService(srv.id)}
                        disabled={isExchangingSA}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-1 px-1 rounded-xl text-[10.5px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        ⚡ Authorize & Link App
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab(srv.tabName)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-1.5 px-1.5 rounded-xl text-[10px] text-center cursor-pointer transition-colors flex items-center justify-center gap-1"
                  >
                    <ExternalLink size={10} /> Launch View
                  </button>
                  {linked && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(srv.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-650 p-1.5 px-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1 border border-red-200/50"
                      title="Unlink connection"
                    >
                      <Trash2 size={10} /> Disconnect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALTERNATIVE EXPANDABLE AUTH TOGGLE */}
      <div className="pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowCustomConfig(!showCustomConfig)}
          className="text-[9.5px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-colors"
        >
          ⚙️ Alternative Auth Protocols (Manually Paste Temporary Bearer Token or Custom OAuth)
        </button>

        {showCustomConfig && (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-2 mt-2 space-y-2 animate-fadeIn">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <Key size={14} className="text-slate-600" /> Advanced Token Manual Importer
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Option A: Paste Bearer Token */}
              <div className="p-2 bg-white rounded-2xl border border-slate-150 space-y-1">
                <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200/50 uppercase tracking-widest p-1 rounded">
                  Method B: Manual OAuth Bearer Token Paste
                </span>
                <p className="text-[10px] text-slate-500 font-sans leading-normal">
                  Paste an active token obtained from Google OAuth Playground or Developer console (starts with <i>ya29...</i>) to connect instantly.
                </p>
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-bold text-slate-400">GOOGLE ACCESS TOKEN</label>
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      placeholder="Enter ya29... token"
                      value={manualAccessToken}
                      onChange={(e) => setManualAccessToken(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl p-1 px-1 text-[10px] font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyManualToken('sheets')}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-1 rounded-xl text-[10px] cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Option B: Custom OAuth client credentials */}
              <div className="p-2 bg-white rounded-2xl border border-slate-150 space-y-1">
                <span className="text-[8px] font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-widest p-1 rounded">
                  Method C: Custom Client ID OAuth Flow
                </span>
                <p className="text-[10px] text-slate-500 font-sans leading-normal">
                  Use custom authorized Google Cloud project variables inside alternative popup flows.
                </p>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <label className="block text-[8px] font-extrabold text-slate-400">CLIENT ID</label>
                      <input
                        type="text"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-[9px] font-mono text-slate-755"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold text-slate-400">CLIENT SECRET</label>
                      <input
                        type="password"
                        value={customClientSecret}
                        onChange={(e) => setCustomClientSecret(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-[9px] font-mono text-slate-755"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('sheets')}
                      className="flex-1 bg-slate-900 hover:bg-indigo-950 text-white font-extrabold py-1 px-1 rounded-xl text-[9px] cursor-pointer"
                    >
                      🔐 OAuth Link Setup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OPERATIONS LOG SCREEN */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 space-y-1">
        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            Real-time Credentials Status Log Handshaker
          </span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-[8px] text-slate-500 hover:text-slate-300 uppercase tracking-widest cursor-pointer"
          >
            Clear Screen Logs
          </button>
        </div>
        
        <div className="font-mono text-[9px] md:text-[10px] text-emerald-400 space-y-1 max-h-[120px] overflow-y-auto scrollbar-hide py-1">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-center italic py-1">Waiting for interaction. Configure a Service Account above to watch handshakes...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="transition-all animate-fadeIn leading-relaxed border-b border-slate-850/30 pb-1 break-words">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
