import React from 'react';
import { motion } from 'motion/react';
import { Coins, User as UserIcon, Settings, ChevronRight, Download, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-xs flex flex-col items-center text-center">
          
          {/* Logo */}
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-5 shadow-xs">
            <Coins size={22} className="text-emerald-400" strokeWidth={2} />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Invest<span className="text-emerald-600">Mant</span>
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Personal finance ledger, portfolio tracking, and multi-broker reconciliation. Offline-first and private.
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 mt-7">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.61 4.5 1.8l2.4-2.4C17.3 1.8 14.9 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.37 0 9.6-3.815 9.6-9.715 0-.585-.05-1.17-.15-1.74l-9.45.04z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={handleGuestSignIn}
              className="w-full flex items-center justify-center gap-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
            >
              <UserIcon className="w-4 h-4 text-slate-600 shrink-0" strokeWidth={2} />
              <span>Explore as Guest</span>
            </button>

            <a
              href="https://github.com/prasantbagriya/investmenat/raw/main/public/app.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
              <span>Download Android APK</span>
            </a>
          </div>

          {/* Advanced Developer Settings */}
          <div className="w-full pt-5 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCustomLoginConfig(!showCustomLoginConfig)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Settings size={13} className="text-slate-400" />
              <span>Advanced Setup</span>
              <ChevronRight size={13} className={`text-slate-400 transition-transform duration-200 ${showCustomLoginConfig ? 'rotate-90' : ''}`} />
            </button>

            {showCustomLoginConfig && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-3.5"
              >
                <p className="text-xs text-slate-600 leading-relaxed">
                  Provide custom Google OAuth client credentials or supply a temporary playground access token.
                </p>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-600">Google Client ID</label>
                  <input
                    type="text"
                    value={customLoginClientId}
                    onChange={(e) => setCustomLoginClientId(e.target.value)}
                    placeholder="OAuth Client ID"
                    className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-lg p-2.5 text-xs font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCustomOauthLogin}
                  className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium py-2 px-3 rounded-lg cursor-pointer text-xs transition-colors shadow-2xs"
                >
                  Authorize Client
                </button>

                <div className="pt-3 border-t border-slate-200/80 space-y-1">
                  <label className="block text-xs font-medium text-slate-600">Access Token Bypass</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste token (ya29...)"
                      value={loginManualToken}
                      onChange={(e) => setLoginManualToken(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 text-slate-800 placeholder-slate-400 rounded-lg p-2 text-xs font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLoginManualToken}
                      className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium px-3 rounded-xl text-xs transition-colors shadow-2xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-xs text-slate-500">
          <ShieldCheck size={13} className="text-slate-400" />
          <span>Local offline storage & encrypted cloud backup</span>
        </div>
      </motion.div>
    </div>
  );
}
