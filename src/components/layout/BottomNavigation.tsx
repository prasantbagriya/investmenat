import React from 'react';
import { 
  ArrowLeftRight, TrendingUp, LayoutDashboard, Clock, Target, Sliders, Bell, Users, 
  Briefcase, Settings, CalendarRange, Landmark, Percent, FileSpreadsheet, Repeat
} from 'lucide-react';

interface BottomNavigationProps {
  currentWorkspace: 'ledger' | 'investmant';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant') => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

import { useNavigate, useLocation } from 'react-router-dom';

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
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 lg:hidden flex justify-around py-1.5 px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] font-sans">
      
      {currentWorkspace === 'ledger' ? (
        <>
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'dashboard' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Overview</span>
          </button>
          <button
            onClick={() => handleTabChange('transactions')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'transactions' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <ArrowLeftRight size={18} className={activeTab === 'transactions' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Ledger</span>
          </button>
          <button
            onClick={() => handleTabChange('pending')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'pending' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <Clock size={18} className={activeTab === 'pending' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Dues</span>
          </button>
          <button
            onClick={() => handleTabChange('recurring-bills')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'recurring-bills' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <Repeat size={18} className={activeTab === 'recurring-bills' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Auto Bills</span>
          </button>
          <button
            onClick={() => handleTabChange('tasks')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'tasks' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <Bell size={18} className={activeTab === 'tasks' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Reminders</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => handleTabChange('portfolio')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'portfolio' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <TrendingUp size={18} className={activeTab === 'portfolio' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Portfolio</span>
          </button>
          <button
            onClick={() => handleTabChange('sips')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'sips' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <CalendarRange size={18} className={activeTab === 'sips' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">SIP Plans</span>
          </button>
          <button
            onClick={() => handleTabChange('fds')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'fds' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <Landmark size={18} className={activeTab === 'fds' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Lockers</span>
          </button>
          <button
            onClick={() => handleTabChange('tax')}
            className={`flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer flex-1 ${activeTab === 'tax' ? 'text-slate-950 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <Percent size={18} className={activeTab === 'tax' ? 'stroke-[2.5px] text-slate-950' : ''} />
            <span className="text-[10px] mt-1">Tax</span>
          </button>
        </>
      )}
    </div>
  );
}
