import React, { useState } from 'react';
import { 
  ArrowLeftRight, TrendingUp, LayoutDashboard, Clock, 
  Bell, Repeat, CalendarRange, Landmark, Percent,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomNavigationProps {
  currentWorkspace: 'ledger' | 'investmant';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant') => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function BottomNavigation({
  currentWorkspace,
  setCurrentWorkspace,
}: BottomNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || (currentWorkspace === 'ledger' ? 'dashboard' : 'portfolio');
  
  const handleTabChange = (tab: string) => {
    navigate(`/${tab}`);
  };

  const toggleWorkspace = () => {
    const next = currentWorkspace === 'ledger' ? 'investmant' : 'ledger';
    setCurrentWorkspace(next);
    navigate(next === 'ledger' ? '/dashboard' : '/portfolio');
  };

  const ledgerTabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Ledger', icon: ArrowLeftRight },
    { id: 'pending', label: 'Dues', icon: Clock },
    { id: 'recurring-bills', label: 'AutoBills', icon: Repeat },
    { id: 'tasks', label: 'Alerts', icon: Bell },
  ];

  const investmantTabs = [
    { id: 'portfolio', label: 'Portfolio', icon: TrendingUp },
    { id: 'sips', label: 'SIP Plans', icon: CalendarRange },
    { id: 'fds', label: 'Lockers', icon: Landmark },
    { id: 'tax', label: 'Tax', icon: Percent },
  ];

  const tabs = currentWorkspace === 'ledger' ? ledgerTabs : investmantTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-t border-slate-200/80 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] font-sans">
      {/* Workspace Switcher Row */}
      <div className="flex items-center justify-center gap-1 pt-1 pb-0.5">
        <button
          onClick={toggleWorkspace}
          className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wide transition-all ${
            currentWorkspace === 'ledger'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {currentWorkspace === 'investmant' && <ChevronLeft size={11} />}
          💳 Ledger
        </button>
        <div className="w-px h-3 bg-slate-200" />
        <button
          onClick={toggleWorkspace}
          className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wide transition-all ${
            currentWorkspace === 'investmant'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          📈 Invest
          {currentWorkspace === 'ledger' && <ChevronRight size={11} />}
        </button>
      </div>

      {/* Tab Row */}
      <div className="flex justify-around py-1.5 px-2">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 relative ${
                isActive ? 'text-slate-950 font-extrabold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-slate-900 rounded-full" />
              )}
              <Icon size={18} className={isActive ? 'stroke-[2.5px] text-slate-950 scale-110' : ''} />
              <span className="text-[9px] mt-0.5 leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
