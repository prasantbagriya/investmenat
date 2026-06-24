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
          const result = await BiometricAuth.authenticate({
            reason: 'Authenticate to unlock your private ledger'
          });
          if (result.hasVerified) {
            handleUnlock();
          }
        }
      } catch (e) {
        console.warn('Biometric auth failed', e);
      }
    };
    checkAndTriggerBiometry();
  }, []);

  const manualTriggerBiometric = async () => {
    try {
      const result = await BiometricAuth.authenticate({
        reason: 'Authenticate to unlock your private ledger'
      });
      if (result.hasVerified) {
        handleUnlock();
      }
    } catch (e) {
      console.warn('Biometric auth failed', e);
    }
  };
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-2 font-sans select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xs w-full text-center space-y-3"
      >
        <div className="flex flex-col items-center space-y-1">
          <div className="p-1.5 bg-slate-800 rounded-full text-white border border-slate-700/60 shadow-md">
            <Lock size={28} className="animate-bounce" />
          </div>
          <h2 className="font-extrabold text-base tracking-wide font-display mt-1">INVESTMANT</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PIN AUTHORIZATION REQUIRED</p>
        </div>

        {/* Dots view */}
        <div className="flex justify-center gap-2.5 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div 
              key={idx} 
              className={`h-3 w-3 rounded-full border border-slate-600 transition-all duration-150 ${pinValue.length > idx ? 'bg-white scale-125 shadow-md' : 'bg-transparent'}`}
            />
          ))}
        </div>

        {/* Tactile Mobile Keypad */}
        <div className="grid grid-cols-3 gap-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleNumpadPress(num)}
              className="h-14 w-14 bg-slate-800 hover:bg-slate-705 text-white rounded-full font-bold text-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 mx-auto shadow-sm cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => setPinValue('')}
            className="col-span-1 h-14 w-14 text-slate-400 hover:text-white rounded-full font-semibold text-[10px] uppercase flex items-center justify-center mx-auto cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumpadPress('0')}
            className="h-14 w-14 bg-slate-800 hover:bg-slate-705 text-white rounded-full font-bold text-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 mx-auto shadow-sm cursor-pointer"
          >
            0
          </button>
          {isBiometryAvailable ? (
            <button 
              onClick={manualTriggerBiometric}
              className="col-span-1 h-14 w-14 text-indigo-400 hover:text-indigo-300 rounded-full flex items-center justify-center mx-auto cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Fingerprint size={22} />
            </button>
          ) : (
            <div className="col-span-1 h-14 w-14"></div>
          )}
        </div>
        
        <div className="pt-2">
          <button 
            onClick={handleLogout}
            className="text-rose-450 hover:text-red-500 rounded-full font-semibold text-[10px] uppercase flex items-center justify-center mx-auto cursor-pointer border border-rose-900/30 px-3 py-1.5"
          >
            Log Out Account
          </button>
        </div>

        <p className="text-[9px] text-slate-500 mt-1">InvestMant ledger values stay hardware encrypted & shielded.</p>
      </motion.div>
    </div>
  );
}
