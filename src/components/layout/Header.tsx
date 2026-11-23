import React from 'react';
import { 
  Coins, ArrowLeftRight, TrendingUp, Bell, 
  Settings, Download, ShieldCheck, LogOut, Menu, Wallet
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  user: User;
  currentWorkspace: 'ledger' | 'investmant' | 'research' | 'crypto' | 'quicko' | 'propfirm';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant' | 'research' | 'crypto' | 'quicko' | 'propfirm') => void;
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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14">
          
          {/* Logo and Menu Trigger */}
          <div className="flex items-center gap-2 select-none shrink-0">
            <button
              onClick={onOpenNavDrawer}
              className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Open Navigation"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>
            <div 
              className="flex items-center gap-2 cursor-pointer shrink-0" 
              onClick={() => { 
                setCurrentWorkspace('ledger'); 
                handleTabChange('dashboard'); 
              }}
            >
              <div className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                <Coins size={15} className="text-emerald-400" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 hidden sm:inline">
                Invest<span className="text-emerald-600">Mant</span>
              </span>
            </div>

            {/* Workspace Pills */}
            <nav className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 ml-2" id="workspace-pill-switcher" aria-label="Workspaces">
              <Link
                id="workspace-ledger-btn"
                onClick={() => setCurrentWorkspace('ledger')}
                to="/dashboard"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  currentWorkspace === 'ledger'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ArrowLeftRight size={12} className={currentWorkspace === 'ledger' ? 'text-emerald-400' : 'text-slate-400'} /> 
                <span className="hidden xs:inline">Ledger</span>
              </Link>

              <Link
                id="workspace-investmant-btn"
                onClick={() => setCurrentWorkspace('investmant')}
                to="/portfolio"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  currentWorkspace === 'investmant'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <TrendingUp size={12} className={currentWorkspace === 'investmant' ? 'text-emerald-400' : 'text-slate-400'} /> 
                <span className="hidden xs:inline">Portfolio</span>
              </Link>

              <Link
                id="workspace-crypto-btn"
                onClick={() => setCurrentWorkspace('crypto')}
                to="/crypto-wallet"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  currentWorkspace === 'crypto'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Wallet size={12} className={currentWorkspace === 'crypto' ? 'text-indigo-400' : 'text-slate-400'} /> 
                <span className="hidden xs:inline">Crypto</span>
              </Link>

              <Link
                id="workspace-quicko-btn"
                onClick={() => setCurrentWorkspace('quicko')}
                to="/quicko-kyc"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  currentWorkspace === 'quicko'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShieldCheck size={12} className={currentWorkspace === 'quicko' ? 'text-blue-400' : 'text-slate-400'} /> 
                <span className="hidden xs:inline">Quicko</span>
              </Link>
            </nav>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white px-2.5 py-1 rounded-xl font-medium text-xs transition-colors cursor-pointer shadow-2xs"
                title="Install InvestMant App"
              >
                <Download size={12} />
                <span className="hidden xs:inline">Install App</span>
              </button>
            )}

            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer text-slate-700 transition-colors"
              title="Notification Center"
              aria-label="Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute 0.5 top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => exportFullLedgerToCSV()}
              className="hidden md:flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 font-medium text-xs transition-colors cursor-pointer shadow-2xs"
              id="export-csv-button"
              title="Export complete ledger as CSV"
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>

            {/* Pin Lock Button */}
            <button
              onClick={() => setPinSetupActive(!pinSetupActive)}
              className="p-1.5 hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer text-slate-700 transition-colors"
              title="Configure Security PIN Lock"
              aria-label="Security PIN Lock"
            >
              <ShieldCheck size={15} className={userSettings?.pin ? "text-emerald-600" : "text-slate-500"} />
            </button>

            {/* Profile Info */}
            <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-2.5 ml-1">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full border border-slate-200" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-slate-900 flex items-center justify-center font-medium text-xs text-white">
                  {(user?.displayName || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="text-left leading-tight">
                <p className="font-semibold text-xs text-slate-800 truncate max-w-[110px]">{user?.displayName || 'Guest User'}</p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums truncate max-w-[110px]">{user?.email || 'offline'}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              title="Log out of application"
              id="logout-button"
              aria-label="Log Out"
            >
              <LogOut size={15} />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
