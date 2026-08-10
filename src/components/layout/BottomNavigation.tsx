import React from 'react';
import { 
  ArrowLeftRight, TrendingUp, LayoutDashboard, Clock, 
  Bell, Repeat, CalendarRange, Landmark, Percent,
  ChevronLeft, ChevronRight, Activity, LineChart, Users, Eye, Wallet, ShieldCheck,
  Fingerprint, Building2, Receipt, Link as LinkIcon
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BottomNavigationProps {
  currentWorkspace: 'ledger' | 'investmant' | 'research' | 'crypto' | 'quicko' | 'propfirm';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant' | 'research' | 'crypto' | 'quicko' | 'propfirm') => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function BottomNavigation({
  currentWorkspace,
  setCurrentWorkspace,
}: BottomNavigationProps) {
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || (currentWorkspace === 'ledger' ? 'dashboard' : 'portfolio');

  const ledgerTabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Expenses', icon: ArrowLeftRight },
    { id: 'pending', label: 'Khata', icon: Users },
    { id: 'tasks', label: 'Alerts', icon: Bell },
  ];

  const investmantTabs = [
    { id: 'portfolio', label: 'Portfolio', icon: TrendingUp },
    { id: 'watchlist', label: 'Watchlist', icon: Eye },
    { id: 'sips', label: 'SIP', icon: CalendarRange },
    { id: 'fds', label: 'Lockers', icon: Landmark },
    { id: 'tax', label: 'Tax', icon: Percent },
  ];

  const researchTabs = [
    { id: 'market', label: 'Terminal', icon: LineChart },
    { id: 'market-data', label: 'Live Data', icon: Activity },
    { id: 'terminal', label: 'Stock', icon: TrendingUp },
    { id: 'forecaster', label: 'Forecaster', icon: Percent },
  ];

  const cryptoTabs = [
    { id: 'crypto-wallet', label: 'Dashboard', icon: Wallet },
    { id: 'crypto-send', label: 'Send', icon: Activity },
    { id: 'crypto-receive', label: 'Receive', icon: Users },
    { id: 'crypto-security', label: 'Security', icon: Eye },
  ];

  const quickoTabs = [
    { id: 'quicko-kyc', label: 'PAN', icon: ShieldCheck },
    { id: 'quicko-aadhaar', label: 'Aadhaar', icon: Fingerprint },
    { id: 'quicko-gstin', label: 'GSTIN', icon: Building2 },
    { id: 'quicko-brokerage', label: 'Parser', icon: Receipt },
    { id: 'quicko-bank', label: 'Bank', icon: Landmark },
    { id: 'tax', label: 'Tax', icon: Percent },
    { id: 'quicko-connect', label: 'Connect', icon: LinkIcon },
  ];

  const propfirmTabs = [
    { id: 'propfirm-dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'propfirm-challenges', label: 'Challenges', icon: Activity },
    { id: 'propfirm-accounts', label: 'Accounts', icon: Wallet },
    { id: 'propfirm-payouts', label: 'Payouts', icon: Landmark },
  ];

  const tabs = currentWorkspace === 'ledger' ? ledgerTabs : currentWorkspace === 'investmant' ? investmantTabs : currentWorkspace === 'research' ? researchTabs : currentWorkspace === 'crypto' ? cryptoTabs : currentWorkspace === 'propfirm' ? propfirmTabs : quickoTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-t border-slate-200/80 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] ">

      {/* Tab Row */}
      <div className="flex justify-around py-3 px-2 pb-safe">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <Link
              key={id}
              to={`/${id}`}
              className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 relative ${
                isActive ? 'text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-slate-900 rounded-full" />
              )}
              <Icon size={20} className={isActive ? 'stroke-[2.5px] text-slate-950 scale-110' : ''} />
              <span className="text-xs mt-1 leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
