import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  X, LayoutDashboard, ArrowLeftRight, Clock, Target, Sliders, 
  Bell, Users, Briefcase, Settings, TrendingUp, CalendarRange, 
  Landmark, Percent, Repeat, BarChart3, Activity, Wallet, ShieldCheck,
  Fingerprint, Building2, Receipt, Link as LinkIcon
} from 'lucide-react';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: 'ledger' | 'investmant' | 'research' | 'crypto' | 'quicko' | 'propfirm';
  setCurrentWorkspace: (workspace: 'ledger' | 'investmant' | 'research' | 'crypto' | 'quicko' | 'propfirm') => void;
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
  const navigate = useNavigate();

  const handleTabClick = () => {
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] lg:hidden"
          />

          {/* Slide Over Panel (Left) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-64 bg-slate-50 shadow-2xl z-[200] flex flex-col border-r border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
              <h2 className="font-extrabold text-slate-800 text-lg ">Navigation</h2>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
              
              {/* Workspace Switcher */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 capitalize ">Workspace</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setCurrentWorkspace('ledger');
                      handleTabClick();
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
                      navigate('/portfolio');
                      setCurrentWorkspace('investmant');
                      handleTabClick();
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

                  <button
                    onClick={() => {
                      navigate('/market');
                      setCurrentWorkspace('research');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      currentWorkspace === 'research'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Activity size={18} className={currentWorkspace === 'research' ? 'text-indigo-400' : 'text-slate-500'} />
                    Research Terminal
                  </button>

                  <button
                    onClick={() => {
                      navigate('/crypto-wallet');
                      setCurrentWorkspace('crypto');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      currentWorkspace === 'crypto'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet size={18} className={currentWorkspace === 'crypto' ? 'text-purple-400' : 'text-slate-500'} />
                    Crypto Space
                  </button>

                  <button
                    onClick={() => {
                      navigate('/quicko');
                      setCurrentWorkspace('quicko');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      currentWorkspace === 'quicko'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck size={18} className={currentWorkspace === 'quicko' ? 'text-blue-400' : 'text-slate-500'} />
                    Quicko Hub
                  </button>

                  <button
                    onClick={() => {
                      navigate('/propfirm-dashboard');
                      setCurrentWorkspace('propfirm');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      currentWorkspace === 'propfirm'
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Target size={18} className={currentWorkspace === 'propfirm' ? 'text-amber-400' : 'text-slate-500'} />
                    Prop Firm Space
                  </button>
                </div>
              </div>

              {/* Page Links */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 capitalize ">Pages</p>
                <div className="flex flex-col gap-1">
                  {currentWorkspace === 'ledger' ? (
                    <>
                      <NavButton active={activeTab === 'dashboard'} onClick={handleTabClick} to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
                      <NavButton active={activeTab === 'analytics'} onClick={handleTabClick} to="/analytics" icon={<Activity size={16} className="text-indigo-500" />} label="AI Analytics" />
                      <NavButton active={activeTab === 'bank-profiles'} onClick={handleTabClick} to="/bank-profiles" icon={<Landmark size={16} className="text-indigo-500" />} label="Bank Profiles" />
                      <NavButton active={activeTab === 'assets'} onClick={handleTabClick} to="/assets" icon={<Landmark size={16} className="text-yellow-500" />} label="Physical Assets" />
                      <NavButton active={activeTab === 'pending'} onClick={handleTabClick} to="/pending" icon={<Clock size={16} />} label="Len Den (Khata)" />
                      <NavButton active={activeTab === 'credit-cards'} onClick={handleTabClick} to="/credit-cards" icon={<Briefcase size={16} />} label="Credit Cards & EMIs" />
                      <NavButton active={activeTab === 'savings'} onClick={handleTabClick} to="/savings" icon={<Target size={16} />} label="Goals" />
                      <NavButton active={activeTab === 'forecaster'} onClick={handleTabClick} to="/forecaster" icon={<TrendingUp size={16} className="text-emerald-500" />} label="Wealth Forecaster" />
                      <NavButton active={activeTab === 'budgets'} onClick={handleTabClick} to="/budgets" icon={<Sliders size={16} />} label="Budgets" />
                      <NavButton active={activeTab === 'tasks'} onClick={handleTabClick} to="/tasks" icon={<Bell size={16} />} label="Reminders" />
                      <NavButton active={activeTab === 'contacts'} onClick={handleTabClick} to="/contacts" icon={<Users size={16} />} label="Contacts Sync" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'investmant' ? (
                    <>
                      <NavButton active={activeTab === 'portfolio'} onClick={handleTabClick} to="/portfolio" icon={<TrendingUp size={16} />} label="Stock & MFs" />
                      <NavButton active={activeTab === 'sips'} onClick={handleTabClick} to="/sips" icon={<CalendarRange size={16} />} label="Active SIPs" />
                      <NavButton active={activeTab === 'fds'} onClick={handleTabClick} to="/fds" icon={<Landmark size={16} />} label="FD/RD Lockers" />
                      <NavButton active={activeTab === 'tax'} onClick={handleTabClick} to="/tax" icon={<Percent size={16} />} label="Tax Capital Gains" />
                      <NavButton active={activeTab === 'brokers'} onClick={handleTabClick} to="/brokers" icon={<ArrowLeftRight size={16} className="text-indigo-500" />} label="Broker Connect" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'crypto' ? (
                    <>
                      <NavButton active={activeTab === 'crypto-wallet'} onClick={handleTabClick} to="/crypto-wallet" icon={<Wallet size={16} className="text-purple-500" />} label="Wallet Dashboard" />
                      <NavButton active={activeTab === 'crypto-send'} onClick={handleTabClick} to="/crypto-send" icon={<Activity size={16} />} label="Send Crypto" />
                      <NavButton active={activeTab === 'crypto-receive'} onClick={handleTabClick} to="/crypto-receive" icon={<Users size={16} />} label="Receive Crypto" />
                      <NavButton active={activeTab === 'crypto-security'} onClick={handleTabClick} to="/crypto-security" icon={<Settings size={16} />} label="Security" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'quicko' ? (
                    <>
                      <NavButton active={activeTab === 'quicko-kyc'} onClick={handleTabClick} to="/quicko-kyc" icon={<ShieldCheck size={16} className="text-blue-500" />} label="PAN Identity & KYC" />
                      <NavButton active={activeTab === 'quicko-aadhaar'} onClick={handleTabClick} to="/quicko-aadhaar" icon={<Fingerprint size={16} className="text-orange-500" />} label="Aadhaar KYC" />
                      <NavButton active={activeTab === 'tax'} onClick={handleTabClick} to="/tax" icon={<Percent size={16} className="text-purple-500" />} label="Tax & Planner" />
                      <NavButton active={activeTab === 'quicko-bank'} onClick={handleTabClick} to="/quicko-bank" icon={<Landmark size={16} className="text-emerald-500" />} label="Bank Penny Drop" />
                      <NavButton active={activeTab === 'quicko-gstin'} onClick={handleTabClick} to="/quicko-gstin" icon={<Building2 size={16} className="text-rose-500" />} label="GSTIN Search" />
                      <NavButton active={activeTab === 'quicko-brokerage'} onClick={handleTabClick} to="/quicko-brokerage" icon={<Receipt size={16} className="text-blue-600" />} label="Contract Parser" />
                      <NavButton active={activeTab === 'quicko-connect'} onClick={handleTabClick} to="/quicko-connect" icon={<LinkIcon size={16} className="text-teal-500" />} label="Quicko Connect" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'propfirm' ? (
                    <>
                      <NavButton active={activeTab === 'propfirm-dashboard'} onClick={handleTabClick} to="/propfirm-dashboard" icon={<LayoutDashboard size={16} className="text-amber-500" />} label="Overview" />
                      <NavButton active={activeTab === 'propfirm-challenges'} onClick={handleTabClick} to="/propfirm-challenges" icon={<Activity size={16} className="text-indigo-500" />} label="Challenges" />
                      <NavButton active={activeTab === 'propfirm-accounts'} onClick={handleTabClick} to="/propfirm-accounts" icon={<Wallet size={16} className="text-emerald-500" />} label="Funded Accounts" />
                      <NavButton active={activeTab === 'propfirm-payouts'} onClick={handleTabClick} to="/propfirm-payouts" icon={<Landmark size={16} className="text-rose-500" />} label="Payouts & Certs" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={16} />} label="Settings & Links" />
                    </>
                  ) : (
                    <>
                      <NavButton active={activeTab === 'market'} onClick={handleTabClick} to="/market" icon={<Activity size={16} className="text-blue-500" />} label="Research Terminal" />
                      <NavButton active={activeTab === 'market-data'} onClick={handleTabClick} to="/market-data" icon={<BarChart3 size={16} />} label="Live Market Data" />
                      <NavButton active={activeTab === 'terminal'} onClick={handleTabClick} to="/terminal" icon={<Activity size={16} className="text-indigo-500" />} label="Stock Terminal" />
                      <NavButton active={activeTab === 'forecaster'} onClick={handleTabClick} to="/forecaster" icon={<TrendingUp size={16} className="text-emerald-500" />} label="Wealth Forecaster" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={16} className="text-teal-500" />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={16} />} label="Settings & Links" />
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

function NavButton({ active, onClick, icon, label, isSuite = false, to }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isSuite?: boolean, to?: string }) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (to) {
      navigate(to);
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-semibold transition-all cursor-pointer relative ${
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
