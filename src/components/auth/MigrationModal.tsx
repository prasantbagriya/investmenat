import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

interface MigrationModalProps {
  pendingMigrationData: any;
  user: User | null;
  migrationProgress: string;
  handleCancelMigration: () => void;
  handleMigrateGuestData: () => void;
}

export default function MigrationModal({
  pendingMigrationData,
  user,
  migrationProgress,
  handleCancelMigration,
  handleMigrateGuestData
}: MigrationModalProps) {
  return (
    <AnimatePresence>
      {pendingMigrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden font-sans text-xs text-slate-800"
          >
            <div className="p-3 border-b border-slate-100 bg-amber-50/40">
              <div className="flex items-start gap-1">
                <div className="p-1 bg-amber-500 text-white rounded-2xl shrink-0 shadow-md">
                  <ShieldCheck size={26} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    📥 Local Offline Workspace Data Found!
                  </h3>
                  <p className="text-[10px] text-slate-700 font-semibold uppercase mt-0.5 tracking-wider">
                    Migrate guest ledger details to secured cloud profile
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <div className="text-slate-605 space-y-1 leading-relaxed">
                <p>
                  हमें आपके स्थानीय ब्राउज़र मेमोरी में मेहमान खाता (Guest Account) का डेटा प्राप्त हुआ है। 
                  क्या आप इस डेटा को अपने नए लिंक किए गए गूगल अकाउंट <strong>({user?.email})</strong> के साथ जोड़ना (Merge & Migrate) चाहते हैं?
                </p>
                <p className="font-bold text-slate-800">
                  हम निम्न विवरण सुरक्षित रूप से आपके Google Profile Firestore Cloud पर ले जाएँगे:
                </p>
              </div>

              {/* Audit Grid of Local Data */}
              <div className="grid grid-cols-2 gap-1 bg-slate-50 border border-slate-200/50 p-2 rounded-2xl font-mono text-[10px]">
                <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-100">
                  <span className="text-slate-450 font-bold">🗒️ Transactions:</span>
                  <span className="font-extrabold text-slate-905">{pendingMigrationData.data.transactions.length} entries</span>
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-100">
                  <span className="text-slate-450 font-bold">📈 Stock/MF:</span>
                  <span className="font-extrabold text-slate-905">{pendingMigrationData.data.holdings.length} holdings</span>
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-100">
                  <span className="text-slate-450 font-bold">⏰ SIP Triggers:</span>
                  <span className="font-extrabold text-slate-905">{pendingMigrationData.data.sips.length} plans</span>
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-100">
                  <span className="text-slate-450 font-bold">🏦 FD/RD Lock:</span>
                  <span className="font-extrabold text-slate-905">{pendingMigrationData.data.fds.length} lockers</span>
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-100">
                  <span className="text-slate-450 font-bold">🎯 Savings Goals:</span>
                  <span className="font-extrabold text-slate-905">{pendingMigrationData.data.savingsGoals.length} targets</span>
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-xl border border-slate-100">
                  <span className="text-slate-450 font-bold">📊 Watchlist:</span>
                  <span className="font-extrabold text-slate-905">{pendingMigrationData.data.watchlist.length} items</span>
                </div>
              </div>

              {migrationProgress && (
                <div className="flex items-center gap-1 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider animate-pulse bg-indigo-50 border border-indigo-150 p-1 rounded-xl justify-center">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>{migrationProgress}</span>
                </div>
              )}

              <p className="text-[10px] text-slate-500 italic">
                * Note: Once migrated, this data will be securely backed up forever in Google Cloud Run / Cloud FireStore database, and will be cleared from Local Storage for optimum browser speed.
              </p>

              <div className="flex flex-col sm:flex-row gap-1 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  onClick={handleCancelMigration}
                  className="flex-1 py-1 border border-slate-205 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer text-center"
                >
                  No, Skip (नया अकाउंट शुरू करें)
                </button>
                <button
                  type="button"
                  onClick={handleMigrateGuestData}
                  disabled={!!migrationProgress}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer transition-colors shadow-md text-center flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} className={migrationProgress ? 'animate-spin' : ''} />
                  <span>Yes, Migrate (हाँ, डेटा सिंक करें)</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
