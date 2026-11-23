import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  X, LayoutDashboard, ArrowLeftRight, Clock, Target, Sliders, 
  Bell, Users, Briefcase, Settings, TrendingUp, CalendarRange, 
  Landmark, Percent, BarChart3, Activity, Wallet, ShieldCheck,
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
  activeTab
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200] lg:hidden"
          />

          {/* Slide Over Panel (Left) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-[200] flex flex-col border-r border-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
              <span className="font-semibold text-slate-900 text-sm">Navigation</span>
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Close Navigation"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
              
              {/* Workspace Switcher */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Workspaces</p>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setCurrentWorkspace('ledger');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      currentWorkspace === 'ledger'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <ArrowLeftRight size={14} className={currentWorkspace === 'ledger' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>Ledger Space</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/portfolio');
                      setCurrentWorkspace('investmant');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      currentWorkspace === 'investmant'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <TrendingUp size={14} className={currentWorkspace === 'investmant' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>InvestMant Portfolio</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/market');
                      setCurrentWorkspace('research');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      currentWorkspace === 'research'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Activity size={14} className={currentWorkspace === 'research' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>Research Terminal</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/crypto-wallet');
                      setCurrentWorkspace('crypto');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      currentWorkspace === 'crypto'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Wallet size={14} className={currentWorkspace === 'crypto' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>Crypto Space</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/quicko-kyc');
                      setCurrentWorkspace('quicko');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      currentWorkspace === 'quicko'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <ShieldCheck size={14} className={currentWorkspace === 'quicko' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>Quicko Hub</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/propfirm-dashboard');
                      setCurrentWorkspace('propfirm');
                      handleTabClick();
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      currentWorkspace === 'propfirm'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Target size={14} className={currentWorkspace === 'propfirm' ? 'text-emerald-400' : 'text-slate-400'} />
                    <span>Prop Firm Space</span>
                  </button>
                </div>
              </div>

              {/* Page Links */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Pages</p>
                <div className="flex flex-col gap-0.5">
                  {currentWorkspace === 'ledger' ? (
                    <>
                      <NavButton active={activeTab === 'dashboard'} onClick={handleTabClick} to="/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" />
                      <NavButton active={activeTab === 'analytics'} onClick={handleTabClick} to="/analytics" icon={<Activity size={15} />} label="AI Analytics" />
                      <NavButton active={activeTab === 'bank-profiles'} onClick={handleTabClick} to="/bank-profiles" icon={<Landmark size={15} />} label="Bank Profiles" />
                      <NavButton active={activeTab === 'assets'} onClick={handleTabClick} to="/assets" icon={<Landmark size={15} />} label="Physical Assets" />
                      <NavButton active={activeTab === 'pending'} onClick={handleTabClick} to="/pending" icon={<Clock size={15} />} label="Len Den (Khata)" />
                      <NavButton active={activeTab === 'credit-cards'} onClick={handleTabClick} to="/credit-cards" icon={<Briefcase size={15} />} label="Credit Cards & EMIs" />
                      <NavButton active={activeTab === 'savings'} onClick={handleTabClick} to="/savings" icon={<Target size={15} />} label="Goals" />
                      <NavButton active={activeTab === 'forecaster'} onClick={handleTabClick} to="/forecaster" icon={<TrendingUp size={15} />} label="Wealth Forecaster" />
                      <NavButton active={activeTab === 'budgets'} onClick={handleTabClick} to="/budgets" icon={<Sliders size={15} />} label="Budgets" />
                      <NavButton active={activeTab === 'tasks'} onClick={handleTabClick} to="/tasks" icon={<Bell size={15} />} label="Reminders" />
                      <NavButton active={activeTab === 'contacts'} onClick={handleTabClick} to="/contacts" icon={<Users size={15} />} label="Contacts Sync" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={15} />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={15} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'investmant' ? (
                    <>
                      <NavButton active={activeTab === 'portfolio'} onClick={handleTabClick} to="/portfolio" icon={<TrendingUp size={15} />} label="Stock & MFs" />
                      <NavButton active={activeTab === 'sips'} onClick={handleTabClick} to="/sips" icon={<CalendarRange size={15} />} label="Active SIPs" />
                      <NavButton active={activeTab === 'fds'} onClick={handleTabClick} to="/fds" icon={<Landmark size={15} />} label="FD/RD Lockers" />
                      <NavButton active={activeTab === 'tax'} onClick={handleTabClick} to="/tax" icon={<Percent size={15} />} label="Tax Capital Gains" />
                      <NavButton active={activeTab === 'brokers'} onClick={handleTabClick} to="/brokers" icon={<ArrowLeftRight size={15} />} label="Broker Connect" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={15} />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={15} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'crypto' ? (
                    <>
                      <NavButton active={activeTab === 'crypto-wallet'} onClick={handleTabClick} to="/crypto-wallet" icon={<Wallet size={15} />} label="Wallet Dashboard" />
                      <NavButton active={activeTab === 'crypto-send'} onClick={handleTabClick} to="/crypto-send" icon={<Activity size={15} />} label="Send Crypto" />
                      <NavButton active={activeTab === 'crypto-receive'} onClick={handleTabClick} to="/crypto-receive" icon={<Users size={15} />} label="Receive Crypto" />
                      <NavButton active={activeTab === 'crypto-security'} onClick={handleTabClick} to="/crypto-security" icon={<Settings size={15} />} label="Security" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={15} />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={15} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'quicko' ? (
                    <>
                      <NavButton active={activeTab === 'quicko-kyc'} onClick={handleTabClick} to="/quicko-kyc" icon={<ShieldCheck size={15} />} label="PAN Identity & KYC" />
                      <NavButton active={activeTab === 'quicko-aadhaar'} onClick={handleTabClick} to="/quicko-aadhaar" icon={<Fingerprint size={15} />} label="Aadhaar KYC" />
                      <NavButton active={activeTab === 'tax'} onClick={handleTabClick} to="/tax" icon={<Percent size={15} />} label="Tax & Planner" />
                      <NavButton active={activeTab === 'quicko-bank'} onClick={handleTabClick} to="/quicko-bank" icon={<Landmark size={15} />} label="Bank Penny Drop" />
                      <NavButton active={activeTab === 'quicko-gstin'} onClick={handleTabClick} to="/quicko-gstin" icon={<Building2 size={15} />} label="GSTIN Search" />
                      <NavButton active={activeTab === 'quicko-brokerage'} onClick={handleTabClick} to="/quicko-brokerage" icon={<Receipt size={15} />} label="Contract Parser" />
                      <NavButton active={activeTab === 'quicko-connect'} onClick={handleTabClick} to="/quicko-connect" icon={<LinkIcon size={15} />} label="Quicko Connect" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={15} />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={15} />} label="Settings & Links" />
                    </>
                  ) : currentWorkspace === 'propfirm' ? (
                    <>
                      <NavButton active={activeTab === 'propfirm-dashboard'} onClick={handleTabClick} to="/propfirm-dashboard" icon={<LayoutDashboard size={15} />} label="Overview" />
                      <NavButton active={activeTab === 'propfirm-challenges'} onClick={handleTabClick} to="/propfirm-challenges" icon={<Activity size={15} />} label="Challenges" />
                      <NavButton active={activeTab === 'propfirm-accounts'} onClick={handleTabClick} to="/propfirm-accounts" icon={<Wallet size={15} />} label="Funded Accounts" />
                      <NavButton active={activeTab === 'propfirm-payouts'} onClick={handleTabClick} to="/propfirm-payouts" icon={<Landmark size={15} />} label="Payouts & Certs" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={15} />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={15} />} label="Settings & Links" />
                    </>
                  ) : (
                    <>
                      <NavButton active={activeTab === 'market'} onClick={handleTabClick} to="/market" icon={<Activity size={15} />} label="Research Terminal" />
                      <NavButton active={activeTab === 'market-data'} onClick={handleTabClick} to="/market-data" icon={<BarChart3 size={15} />} label="Live Market Data" />
                      <NavButton active={activeTab === 'terminal'} onClick={handleTabClick} to="/terminal" icon={<Activity size={15} />} label="Stock Terminal" />
                      <NavButton active={activeTab === 'forecaster'} onClick={handleTabClick} to="/forecaster" icon={<TrendingUp size={15} />} label="Wealth Forecaster" />
                      <NavButton active={activeTab === 'workspace'} onClick={handleTabClick} to="/workspace" icon={<Briefcase size={15} />} label="Workspace Suite" isSuite />
                      <NavButton active={activeTab === 'settings'} onClick={handleTabClick} to="/settings" icon={<Settings size={15} />} label="Settings & Links" />
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
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer relative text-left ${
        active 
          ? 'bg-slate-900 text-white shadow-2xs' 
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      {isSuite && (
        <span className="ml-auto bg-slate-200 text-slate-700 text-[10px] font-medium px-1.5 py-0.2 rounded-full">
          11 Apps
        </span>
      )}
    </button>
  );
}
