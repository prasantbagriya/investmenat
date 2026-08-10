import React from 'react';
import { motion } from 'motion/react';
import { Lock, Fingerprint } from 'lucide-react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

interface PinLockScreenProps {
  pinValue: string;
  setPinValue: (val: string) => void;
  handleNumpadPress: (num: string) => void;
  handleLogout: () => void;
  handleUnlock: () => void;
}

export default function PinLockScreen({
  pinValue,
  setPinValue,
  handleNumpadPress,
  handleLogout,
  handleUnlock
}: PinLockScreenProps) {
  const [isBiometryAvailable, setIsBiometryAvailable] = React.useState(false);

  React.useEffect(() => {
    const checkAndTriggerBiometry = async () => {
      try {
        const info = await BiometricAuth.checkBiometry();
        if (info.isAvailable) {
          setIsBiometryAvailable(true);
          // Auto-trigger on load
          await BiometricAuth.authenticate({
            reason: 'Authenticate to unlock your private ledger'
          });
          handleUnlock();
        }
      } catch (e) {
        console.warn('Biometric auth failed', e);
      }
    };
    checkAndTriggerBiometry();
  }, []);

  const manualTriggerBiometric = async () => {
    try {
      await BiometricAuth.authenticate({
        reason: 'Authenticate to unlock your private ledger'
      });
      handleUnlock();
    } catch (e) {
      console.warn('Biometric auth failed', e);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-2 select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full text-center space-y-3"
      >
        <div className="flex flex-col items-center space-y-1">
          <div className="p-1.5 bg-white rounded-full text-indigo-600 border border-slate-200 shadow-sm">
            <Lock size={28} className="animate-bounce" />
          </div>
          <h2 className="font-extrabold text-base font-display mt-1">Investmant</h2>
          <p className="text-xs text-slate-500 font-bold ">PIN Authorization Required</p>
        </div>

        {/* Dots view */}
        <div className="flex justify-center gap-3 sm:gap-4 py-3 sm:py-5">
          {[0, 1, 2, 3].map((idx) => (
            <div 
              key={idx} 
              className={`h-3.5 w-3.5 rounded-full border-2 border-slate-300 transition-all duration-150 ${pinValue.length > idx ? 'bg-indigo-600 border-indigo-600 scale-125 shadow-sm' : 'bg-transparent'}`}
            />
          ))}
        </div>

        {/* Tactile Mobile Keypad */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-xs mx-auto py-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleNumpadPress(num)}
              className="h-16 w-16 sm:h-20 sm:w-20 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200/80 rounded-full font-bold text-2xl sm:text-3xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 mx-auto shadow-sm cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => setPinValue('')}
            className="col-span-1 h-16 w-16 sm:h-20 sm:w-20 text-slate-500 hover:text-slate-900 rounded-full font-semibold text-sm sm:text-base flex items-center justify-center mx-auto cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumpadPress('0')}
            className="h-16 w-16 sm:h-20 sm:w-20 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200/80 rounded-full font-bold text-2xl sm:text-3xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 mx-auto shadow-sm cursor-pointer"
          >
            0
          </button>
          {isBiometryAvailable ? (
            <button 
              onClick={manualTriggerBiometric}
              className="col-span-1 h-16 w-16 sm:h-20 sm:w-20 text-indigo-600 hover:text-indigo-700 rounded-full flex items-center justify-center mx-auto cursor-pointer bg-white hover:bg-slate-100 border border-slate-200/80 transition-colors shadow-sm"
            >
              <Fingerprint size={28} />
            </button>
          ) : (
            <div className="col-span-1 h-16 w-16 sm:h-20 sm:w-20"></div>
          )}
        </div>
        
        <div className="pt-4">
          <button 
            onClick={handleLogout}
            className="text-rose-500 hover:text-rose-600 rounded-full font-semibold text-sm flex items-center justify-center mx-auto cursor-pointer border border-rose-200 bg-white hover:bg-rose-50 px-4 py-2 transition-colors shadow-sm"
          >
            Log out account
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-1">Investmant ledger values stay hardware encrypted & shielded.</p>
      </motion.div>
    </div>
  );
}
