import React, { useState, useEffect } from 'react';
import { 
  Settings, FileSpreadsheet, Users, ShieldCheck, ShieldAlert, Check, RefreshCw, 
  HelpCircle, Trash2, Key, Info, ExternalLink, Link2, Copy, AlertTriangle, Play,
  Calendar, FolderOpen, Mail, Video, CheckSquare, MessageSquare, FileText, GraduationCap, Presentation, Image, AlertCircle
} from 'lucide-react';
import { getAccessToken, setAccessToken, signInWithGoogle, linkGoogleAccount, auth } from '../firebase';
import { UserSettings } from '../types';
import InfoTooltip from './InfoTooltip';
import GooglePicker from './GooglePicker';
import BrokerManager from './BrokerManager';
import toast from 'react-hot-toast';
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
  const getIntegrationState = (service: ServiceType): boolean => {
    if (userSettings?.integrations && userSettings.integrations[service] !== undefined) {
      return userSettings.integrations[service] && !!getAccessToken();
    }
    const stored = localStorage.getItem(`google_${service}_linked`);
    if (stored === null) return !!getAccessToken();
    return stored === 'true' && !!getAccessToken();
  };

  const [isSheetsLinked, setIsSheetsLinked] = useState(() => getIntegrationState('sheets'));
  const [isContactsLinked, setIsContactsLinked] = useState(() => getIntegrationState('contacts'));
  const [isCalendarLinked, setIsCalendarLinked] = useState(() => getIntegrationState('calendar'));
  const [isDriveLinked, setIsDriveLinked] = useState(() => getIntegrationState('drive'));
  const [isGmailLinked, setIsGmailLinked] = useState(() => getIntegrationState('gmail'));
  const [isMeetLinked, setIsMeetLinked] = useState(() => getIntegrationState('meet'));
  const [isTasksLinked, setIsTasksLinked] = useState(() => getIntegrationState('tasks'));
  const [isChatLinked, setIsChatLinked] = useState(() => getIntegrationState('chat'));
  const [isFormsLinked, setIsFormsLinked] = useState(() => getIntegrationState('forms'));
  const [isClassroomLinked, setIsClassroomLinked] = useState(() => getIntegrationState('classroom'));
  const [isDocsLinked, setIsDocsLinked] = useState(() => getIntegrationState('docs'));
  const [isSlidesLinked, setIsSlidesLinked] = useState(() => getIntegrationState('slides'));
  const [isPhotosLinked, setIsPhotosLinked] = useState(() => getIntegrationState('photos'));

  useEffect(() => {
    setIsSheetsLinked(getIntegrationState('sheets'));
    setIsContactsLinked(getIntegrationState('contacts'));
    setIsCalendarLinked(getIntegrationState('calendar'));
    setIsDriveLinked(getIntegrationState('drive'));
    setIsGmailLinked(getIntegrationState('gmail'));
    setIsMeetLinked(getIntegrationState('meet'));
    setIsTasksLinked(getIntegrationState('tasks'));
    setIsChatLinked(getIntegrationState('chat'));
    setIsFormsLinked(getIntegrationState('forms'));
    setIsClassroomLinked(getIntegrationState('classroom'));
    setIsDocsLinked(getIntegrationState('docs'));
    setIsSlidesLinked(getIntegrationState('slides'));
    setIsPhotosLinked(getIntegrationState('photos'));
  }, [userSettings?.integrations]);

  // Removed custom config states since Firebase handles OAuth automatically
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
        
        const services: ServiceType[] = ['sheets', 'contacts', 'calendar', 'drive', 'gmail', 'meet', 'tasks', 'chat', 'forms', 'classroom', 'docs', 'slides', 'photos'];
        const integrations: Record<string, boolean> = {};
        services.forEach(srv => {
          localStorage.setItem(`google_${srv}_linked`, 'false');
          integrations[srv] = false;
        });
        if (onUpdateUserSettings) {
          onUpdateUserSettings({ integrations });
        }
      } else {
        setIsSheetsLinked(getIntegrationState('sheets'));
        setIsContactsLinked(getIntegrationState('contacts'));
        setIsCalendarLinked(getIntegrationState('calendar'));
        setIsDriveLinked(getIntegrationState('drive'));
        setIsGmailLinked(getIntegrationState('gmail'));
        setIsMeetLinked(getIntegrationState('meet'));
        setIsTasksLinked(getIntegrationState('tasks'));
        setIsChatLinked(getIntegrationState('chat'));
        setIsFormsLinked(getIntegrationState('forms'));
        setIsClassroomLinked(getIntegrationState('classroom'));
        setIsDocsLinked(getIntegrationState('docs'));
        setIsSlidesLinked(getIntegrationState('slides'));
        setIsPhotosLinked(getIntegrationState('photos'));
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
    addLog(`🔗 Connecting ${serviceName} using standard Firebase Auth...`);
    try {
      const userProviders = auth.currentUser?.providerData?.map(p => p.providerId) || [];
      if (!userProviders.includes('google.com')) {
        addLog(`🔗 Linking Google Account to existing profile...`);
        await linkGoogleAccount();
      } else {
        await signInWithGoogle();
      }
      
      setServiceLinkedState(targetService, true);
      localStorage.setItem(`google_${targetService}_linked`, 'true');
      if (onUpdateUserSettings) {
        onUpdateUserSettings({ 
          integrations: { ...(userSettings?.integrations || {}), [targetService]: true } 
        });
      }
      
      window.dispatchEvent(new Event('google-token-changed'));
      addLog(`✅ Google Auth connection linked successfully.`);
      toast.success(`🎉 Successfully connected and configured ${serviceName}!`);
    } catch (err: any) {
       addLog(`❌ Auth error: ${err.message}`);
       toast.error(`Sign-In Error: ${err.message}`);
    }
  };

  // Manual pasting of OAuth Access Token
  const handleApplyManualToken = (targetService: ServiceType) => {
    const cleanToken = manualAccessToken.trim();
    if (!cleanToken) {
      toast.error("Please paste a valid Google Access Token.");
      return;
    }
    setAccessToken(cleanToken);
    setToken(cleanToken);
    
    setServiceLinkedState(targetService, true);
    localStorage.setItem(`google_${targetService}_linked`, 'true');
    if (onUpdateUserSettings) {
      onUpdateUserSettings({ 
        integrations: { ...(userSettings?.integrations || {}), [targetService]: true } 
      });
    }
    
    window.dispatchEvent(new Event('google-token-changed'));
    const serviceName = getServiceLabel(targetService);
    addLog(`✅ Manual access token loaded for ${serviceName}.`);
    toast.success(`🎉 Success! Access Token activated for ${serviceName}.`);
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
      toast.success('📅 Google Spreadsheet ID updated successfully!');
    } catch (err: any) {
      addLog(`❌ Spreadsheet save failed: ${err.message}`);
      toast.error(`Error saving Spreadsheet ID: ${err.message}`);
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
      if (onUpdateUserSettings) {
        onUpdateUserSettings({ 
          integrations: { ...(userSettings?.integrations || {}), [targetService]: false } 
        });
      }

      const services: ServiceType[] = ['sheets', 'contacts', 'calendar', 'drive', 'gmail', 'meet', 'tasks', 'chat', 'forms', 'classroom', 'docs', 'slides', 'photos'];
      const remainsAny = services.some(srv => localStorage.getItem(`google_${srv}_linked`) === 'true');
      
      if (!remainsAny) {
        setAccessToken(null);
        setToken(null);
        addLog(`🧹 All service modules unlinked. Central Google access token removed.`);
      }

      window.dispatchEvent(new Event('google-token-changed'));
      toast.success(`✅ ${serviceLabel} disconnected successfully!`);
    }
  };

  // 10 Services Array Mappings
  const serviceConfigs: ServiceConfig[] = [
    {
      id: 'sheets',
      name: 'Google Sheets sync',
      category: 'Spreadsheet cloud export',
      description: '',
      icon: FileSpreadsheet,
      themeColor: 'emerald',
      tabName: 'sheets'
    },
    {
      id: 'contacts',
      name: 'Google Contacts sync',
      category: 'Rolodex phone directory',
      description: '',
      icon: Users,
      themeColor: 'indigo',
      tabName: 'contacts'
    },
    {
      id: 'calendar',
      name: 'Google Calendar sync',
      category: 'Scheduling & timeline',
      description: '',
      icon: Calendar,
      themeColor: 'rose',
      tabName: 'tasks'
    },
    {
      id: 'drive',
      name: 'Google Drive library',
      category: 'Cloud file storage',
      description: '',
      icon: FolderOpen,
      themeColor: 'blue',
      tabName: 'workspace'
    },
    {
      id: 'gmail',
      name: 'Gmail mailbox',
      category: 'Secure client emails',
      description: '',
      icon: Mail,
      themeColor: 'red',
      tabName: 'workspace'
    },
    {
      id: 'meet',
      name: 'Google Meet',
      category: 'Video meetings engine',
      description: '',
      icon: Video,
      themeColor: 'teal',
      tabName: 'workspace'
    },
    {
      id: 'tasks',
      name: 'Google Tasks sync',
      category: 'Personal todo boards',
      description: '',
      icon: CheckSquare,
      themeColor: 'sky',
      tabName: 'workspace'
    },
    {
      id: 'chat',
      name: 'Google Chat spaces',
      category: 'Workspace communications',
      description: '',
      icon: MessageSquare,
      themeColor: 'cyan',
      tabName: 'workspace'
    },
    {
      id: 'forms',
      name: 'Google Forms',
      category: 'Customer survey data',
      description: '',
      icon: FileText,
      themeColor: 'violet',
      tabName: 'workspace'
    },
    {
      id: 'classroom',
      name: 'Google Classroom',
      category: 'Education courses',
      description: '',
      icon: GraduationCap,
      themeColor: 'amber',
      tabName: 'workspace'
    },
    {
      id: 'docs',
      name: 'Google Docs API',
      category: 'Cloud document engine',
      description: '',
      icon: FileText,
      themeColor: 'blue',
      tabName: 'workspace'
    },
    {
      id: 'slides',
      name: 'Google Slides API',
      category: 'Presentations',
      description: '',
      icon: Presentation,
      themeColor: 'yellow',
      tabName: 'workspace'
    },
    {
      id: 'photos',
      name: 'Google Photos API',
      category: 'Media & albums',
      description: '',
      icon: Image,
      themeColor: 'cyan',
      tabName: 'workspace'
    }
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 shadow-xs w-full space-y-4" id="settings-manager-panel">
      
      {/* Settings Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1">
          <div className="p-1 bg-slate-900 text-white rounded-lg">
            <Settings size={26} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">App settings & core links</h2>
            <p className="text-xs text-slate-600 mt-0.5">Central integrations & Google authorization console</p>
          </div>
        </div>
        <div className="text-right hidden md:block bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
          <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 justify-end">
            <Users size={12} className="text-teal-600" />
            {user?.displayName || 'Authorized User'}
          </div>
          <div className="text-xs font-mono text-slate-700 mt-0.5">{user?.email || 'No email linked'}</div>
        </div>
      </div>

      {/* GOOGLE INTEGRATIONS LIST */}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-extrabold text-slate-900">Google Workspace integrations</h3>
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {serviceConfigs.length} modules
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceConfigs.map((config) => (
            <div key={config.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col justify-between hover:border-slate-200 hover:bg-white transition-all hover:shadow-xs">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2 rounded-xl bg-${config.themeColor}-100 text-${config.themeColor}-600`}>
                    <config.icon size={18} />
                  </div>
                  {isLinked(config.id) ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      <Check size={12} /> Connected
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      Disconnected
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900">{config.name}</h4>
                <p className="text-xs font-medium text-slate-600 mt-0.5 mb-2">{config.category}</p>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{config.description}</p>
              </div>
              
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between mt-auto">
                {isLinked(config.id) ? (
                  <>
                    <button
                      onClick={() => onNavigateToTab(config.tabName)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Open Tool
                    </button>
                    <button
                      onClick={() => handleUnlink(config.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOAuthLogin(config.id)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle size={14} /> Connect via Google auth
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BROKER MANAGER INTEGRATION */}
      <div className="mt-4 border-t border-slate-200 pt-4">

      </div>

    </div>
  );
}
