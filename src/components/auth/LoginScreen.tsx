import React from 'react';
import { motion } from 'motion/react';
import { Coins, User as UserIcon, Settings, ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  handleGuestSignIn: () => void;
  handleGoogleSignIn: () => void;
  showCustomLoginConfig: boolean;
  setShowCustomLoginConfig: (val: boolean) => void;
  customLoginClientId: string;
  setCustomLoginClientId: (val: string) => void;
  handleCustomOauthLogin: () => void;
  loginManualToken: string;
  setLoginManualToken: (val: string) => void;
  handleApplyLoginManualToken: () => void;
}

export default function LoginScreen({
  handleGuestSignIn,
  handleGoogleSignIn,
  showCustomLoginConfig,
  setShowCustomLoginConfig,
  customLoginClientId,
  setCustomLoginClientId,
  handleCustomOauthLogin,
  loginManualToken,
  setLoginManualToken,
  handleApplyLoginManualToken
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-emerald-200/40 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.06)] flex flex-col items-center text-center space-y-8 relative overflow-hidden">
          
          {/* Top subtle highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-indigo-200 to-transparent opacity-50" />

          {/* Logo Section */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-600 rounded-2xl blur-lg opacity-20" />
            <div className="relative p-5 bg-linear-to-b from-slate-800 to-slate-950 rounded-2xl shadow-xl border border-slate-700/50">
              <Coins size={44} className="text-white" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Typography */}
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 font-display">
              Invest<span className="text-indigo-600">Mant</span>
            </h1>
            <p className="text-[13px] text-slate-500 font-medium px-4 leading-relaxed">
              India's premium offline-safe PWA investment tracker. Manage stock holdings, live NAV SIP triggers, and financial goals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            <button
              onClick={handleGoogleSignIn}
              className="group relative w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer overflow-hidden"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.61 4.5 1.8l2.4-2.4C17.3 1.8 14.9 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.37 0 9.6-3.815 9.6-9.715 0-.585-.05-1.17-.15-1.74l-9.45.04z" />
              </svg>
              <span className="text-[15px]">Sign In with Google</span>
            </button>

            <button
              onClick={handleGuestSignIn}
              className="w-full flex items-center justify-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-4 px-6 rounded-2xl transition-all border border-emerald-100 hover:border-emerald-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <UserIcon className="w-5 h-5 shrink-0" strokeWidth={2} />
              <span className="text-[15px]">Direct Access (Guest)</span>
            </button>
          </div>

          {/* Advanced Config Toggle */}
          <div className="w-full pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCustomLoginConfig(!showCustomLoginConfig)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto cursor-pointer group"
            >
              <Settings size={14} className="group-hover:rotate-90 transition-transform duration-300" />
              Advanced Setup
              <ChevronRight size={14} className={`transition-transform duration-300 ${showCustomLoginConfig ? 'rotate-90' : ''}`} />
            </button>

            {/* Advanced Settings Panel */}
            {showCustomLoginConfig && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-5 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-4"
              >
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Add custom developer credentials or paste a temporary access token from Google OAuth playground.
                </p>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-400 uppercase tracking-widest text-[10px]">Google Client ID</label>
                  <input
                    type="text"
                    value={customLoginClientId}
                    onChange={(e) => setCustomLoginClientId(e.target.value)}
                    placeholder="Custom Client ID"
                    className="w-full bg-white border border-slate-200 text-slate-700 placeholder-slate-400 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCustomOauthLogin}
                  className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl cursor-pointer text-xs shadow-sm transition-all"
                >
                  🔐 Authorize Custom Client
                </button>

                <div className="pt-4 border-t border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-400 uppercase tracking-widest text-[10px]">Access Token Bypass</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste token (e.g. ya29...)"
                      value={loginManualToken}
                      onChange={(e) => setLoginManualToken(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 placeholder-slate-400 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLoginManualToken}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl text-xs transition-colors shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <p className="text-center mt-6 text-[11px] text-slate-400 font-medium">
          Your data remains secure and private.
        </p>
      </motion.div>
    </div>
  );
}

