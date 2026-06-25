import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, LayoutDashboard, ArrowLeftRight, Clock, Target, Sliders, 
  Bell, Users, Briefcase, Settings, TrendingUp, CalendarRange, 
  Landmark, Percent, Repeat, BarChart3, Activity 
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: 'ledger' | 'investmant';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function NavigationDrawer({
  isOpen,
  onClose,
  currentWorkspace,
  setCurrentWorkspace,
  activeTab,
  setActiveTab
}: NavigationDrawerProps) {

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
          />

          {/* Slide Over Panel (Left) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-64 bg-slate-50 shadow-2xl z-50 flex flex-col border-r border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
              <h2 className="font-extrabold text-slate-800 text-lg font-sans">Navigation</h2>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
              
              {/* Workspace Switcher */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workspace</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setCurrentWorkspace('ledger');
                      handleTabClick('dashboard');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      currentWorkspace === 'ledger'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowLeftRight size={18} className={currentWorkspace === 'ledger' ? 'text-emerald-400' : 'text-slate-500'} />
                    Ledger Space
                  </button>
                  
                  <button
                    onClick={() => {
                      setCurrentWorkspace('investmant');
                      handleTabClick('portfolio');
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      currentWorkspace === 'investmant'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp size={18} className={currentWorkspace === 'investmant' ? 'text-emerald-400' : 'text-slate-500'} />
                    InvestMant Space
                  </button>
                </div>
              </div>

              {/* Page Links */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pages</p>
                <div className="flex flex-col gap-1">
                  {currentWorkspace === 'ledger' ? (
                    <>
                      <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabClick('dashboard')} icon={<LayoutDashboard size={16} />} label="Dashboard" />
                      <NavButton active={activeTab === 'analytics'} onClick={() => handleTabClick('analytics')} icon={<Activity size={16} className="text-indigo-500" />} label="AI Analytics" />
                      <NavButton active={activeTab === 'transactions'} onClick={() => handleTabClick('transactions')} icon={<ArrowLeftRight size={16} />} label="Journal ledger" />
                      <NavButton active={activeTab === 'bank-profiles'} onClick={() => handleTabClick('bank-profiles')} icon={<Landmark size={16} className="text-indigo-500" />} label="Bank Profiles" />
                      <NavButton active={activeTab === 'assets'} onClick={() => handleTabClick('assets')} icon={<Landmark size={16} className="text-yellow-500" />} label="Physical Assets (Net Worth)" />
                      <NavButton active={activeTab === 'pending'} onClick={() => handleTabClick('pending')} icon={<Clock size={16} />} label="Len Den (Dues)" />
                      <NavButton active={activeTab === 'recurring-bills'} onClick={() => handleTabClick('recurring-bills')} icon={<Repeat size={16} />} label="Auto Billing" />
                      <NavButton active={activeTab === 'credit-cards'} onClick={() => handleTabClick('credit-cards')} icon={<Briefcase size={16} />} label="Credit Cards & EMIs" />
                      <NavButton active={activeTab === 'savings'} onClick={() => handleTabClick('savings')} icon={<Target size={16} />} label="Goals" />
                      <NavButton active={activeTab === 'forecaster'} onClick={() => handleTabClick('forecaster')} icon={<TrendingUp size={16} className="text-emerald-500" />} label="Wealth Forecaster" />
                      <NavButton active={activeTab === 'budgets'} onClick={() => handleTabClick('budgets')} icon={<Sliders size={16} />} label="Budgets" />
                      <NavButton active={activeTab === 'tasks'} onClick={() => handleTabClick('tasks')} icon={<Bell size={16} />} label="Reminders" />
                      <NavButton active={activeTab === 'contacts'} onClick={() => handleTabClick('contacts')} icon={<Users size={16} />} label="Contacts Sync" />
                      <NavButton active={activeTab === 'workspace'} onClick={() => handleTabClick('workspace')} icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={() => handleTabClick('settings')} icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  ) : (
                    <>
                      <NavButton active={activeTab === 'portfolio'} onClick={() => handleTabClick('portfolio')} icon={<TrendingUp size={16} />} label="Stock & MFs" />
                      <NavButton active={activeTab === 'market-data'} onClick={() => handleTabClick('market-data')} icon={<BarChart3 size={16} />} label="Live Market Data" />
                      <NavButton active={activeTab === 'sips'} onClick={() => handleTabClick('sips')} icon={<CalendarRange size={16} />} label="Active SIPs" />
                      <NavButton active={activeTab === 'fds'} onClick={() => handleTabClick('fds')} icon={<Landmark size={16} />} label="FD/RD Lockers" />
                      <NavButton active={activeTab === 'tax'} onClick={() => handleTabClick('tax')} icon={<Percent size={16} />} label="Tax Capital Gains" />
                      <NavButton active={activeTab === 'brokers'} onClick={() => handleTabClick('brokers')} icon={<ArrowLeftRight size={16} className="text-indigo-500" />} label="Broker Connect" />
                      <NavButton active={activeTab === 'workspace'} onClick={() => handleTabClick('workspace')} icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={() => handleTabClick('settings')} icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NavButton({ active, onClick, icon, label, isSuite = false }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isSuite?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg text-sm font-semibold transition-all cursor-pointer relative ${
        active 
          ? (isSuite ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-900 text-white shadow-md') 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
      }`}
    >
      {icon}
      {label}
      {isSuite && <span className="absolute right-3 bg-red-500 text-white rounded-full text-[8px] p-0.5 px-1.5 font-bold animate-pulse">11 Apps</span>}
    </button>
  );
}
