import React from 'react';
import { 
  Coins, ArrowLeftRight, TrendingUp, LayoutDashboard, Clock, Target, Sliders, Bell, Users, 
  Briefcase, Settings, CalendarRange, Landmark, Percent, FileSpreadsheet, Download, ShieldCheck, LogOut, Menu
} from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User;
  currentWorkspace: 'ledger' | 'investmant';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant') => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  exportFullLedgerToCSV: () => void;
  pinSetupActive: boolean;
  setPinSetupActive: (val: boolean) => void;
  userSettings: any;
  handleLogout: () => void;
  onOpenNotifications?: () => void;
  onOpenNavDrawer?: () => void;
  unreadCount?: number;
}

import { useNavigate, useLocation } from 'react-router-dom';

let globalDeferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  globalDeferredPrompt = e;
  window.dispatchEvent(new Event('pwa-install-ready'));
});

export default function Header({
  user,
  currentWorkspace,
  setCurrentWorkspace,
  exportFullLedgerToCSV,
  pinSetupActive,
  setPinSetupActive,
  userSettings,
  handleLogout,
  onOpenNotifications,
  onOpenNavDrawer,
  unreadCount = 0
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || (currentWorkspace === 'ledger' ? 'dashboard' : 'portfolio');
  
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(globalDeferredPrompt);

  React.useEffect(() => {
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }
    const handlePwaReady = () => setDeferredPrompt(globalDeferredPrompt);
    window.addEventListener('pwa-install-ready', handlePwaReady);
    
    // Fallback standard listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('pwa-install-ready', handlePwaReady);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleTabChange = (tab: string) => {
    navigate(`/${tab}`);
  };
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-8xl mx-auto px-2 sm:px-3 lg:px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and Menu Trigger */}
          <div className="flex items-center gap-2 select-none shrink-0">
            <button
              onClick={onOpenNavDrawer}
              className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer lg:flex"
              title="Open Navigation"
            >
              <Menu size={22} />
            </button>
            <div 
              className="flex items-center gap-1.5 cursor-pointer shrink-0" 
              onClick={() => { 
                setCurrentWorkspace('ledger'); 
                handleTabChange('dashboard'); 
              }}
            >
              <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                <Coins size={16} />
              </div>
              <span className="font-extrabold text-sm tracking-tight font-display text-slate-900 hidden sm:inline">
                InvestMant
              </span>
            </div>

            {/* Workspace Pill Switcher (Always visible) */}
            <div className="flex bg-slate-100/80 border border-slate-200/60 rounded-xl p-0.5 gap-0.5 ml-1 sm:ml-2" id="workspace-pill-switcher">
              <button
                id="workspace-ledger-btn"
                onClick={() => {
                  setCurrentWorkspace('ledger');
                  handleTabChange('dashboard');
                }}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                  currentWorkspace === 'ledger'
                    ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-950/5'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
                }`}
              >
                <ArrowLeftRight size={11} className={currentWorkspace === 'ledger' ? 'text-emerald-400' : 'text-slate-500'} /> 
                <span className="hidden xs:inline">Ledger</span>
              </button>
              <button
                id="workspace-investmant-btn"
                onClick={() => {
                  setCurrentWorkspace('investmant');
                  handleTabChange('portfolio');
                }}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                  currentWorkspace === 'investmant'
                    ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-950/5'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
                }`}
              >
                <TrendingUp size={11} className={currentWorkspace === 'investmant' ? 'text-emerald-400' : 'text-slate-500'} /> 
                <span className="hidden xs:inline">InvestMant</span>
              </button>
            </div>
          </div>

          {/* Profile Menu Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 px-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer shadow-sm animate-pulse mr-1"
                title="Install InvestMant App"
              >
                <Download size={12} /> <span className="hidden xs:inline">Install App</span>
              </button>
            )}

            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer text-slate-600 transition-colors mr-1"
              title="Notification Center"
            >
              <Bell size={14} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>

            <button
              onClick={() => exportFullLedgerToCSV()}
              className="hidden md:flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 p-1.5 px-1 rounded-lg border border-slate-200 font-bold text-[10px] transition-all cursor-pointer shadow-xs"
              id="export-csv-button"
            >
              <Download size={11} /> System Audit (CSV)
            </button>

            {/* Pin Setup Button */}
            <button
              onClick={() => setPinSetupActive(!pinSetupActive)}
              className="bg-slate-50 hover:bg-slate-100 p-1 rounded-lg border border-slate-200 cursor-pointer text-slate-600 transition-colors"
              title="Configure Security PIN Lock"
            >
              <ShieldCheck size={14} className={userSettings?.pin ? "text-emerald-600 animate-pulse" : "text-slate-700"} />
            </button>

            {/* Profile details */}
            <div className="hidden lg:flex items-center gap-1 border-l border-slate-200 pl-1">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full border border-slate-200" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white">U</div>
              )}
              <div className="text-left leading-tight text-[10px]">
                <p className="font-extrabold text-slate-800">{user?.displayName || 'Guest User'}</p>
                <p className="text-slate-500 font-mono scale-90 -translate-x-1 truncate max-w-[80px]">{user?.email}</p>
              </div>
            </div>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="p-1 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              title="Log out of application"
              id="logout-button"
            >
              <LogOut size={14} />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
