import React, { useState } from 'react';
import { ShieldCheck, User as UserIcon, AlertCircle, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyPan, PanVerificationResponse } from '../../services/quickoService';

export default function PanVerification() {
  const [pan, setPan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PanVerificationResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pan || pan.length !== 10) {
      toast.error('Please enter a valid 10-character PAN');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await verifyPan(pan);
      setResult(response);
      toast.success('PAN Verified Successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify PAN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
      
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-100/50 rounded-full blur-3xl group-hover:bg-blue-200/50 transition-colors" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <ShieldCheck size={24} className="stroke-[2.5px]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Identity KYC</h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Quicko PAN Verification</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-bold text-slate-700 capitalize mb-2">Enter PAN Number</label>
          <div className="relative">
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="ABCDE1234F"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all capitalize placeholder:normal-case placeholder:font-normal"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Verify Identity</>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 sm:p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl relative z-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-4 border-b border-emerald-100 pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle size={20} className="stroke-[2.5px]" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">Verification Successful</p>
              <p className="text-xs font-medium text-emerald-700">PAN is active and valid</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 capitalize ">PAN Holder Name</span>
              <span className="text-sm font-black text-slate-900">{result.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 capitalize ">PAN Number</span>
              <span className="text-sm font-black text-slate-900">{result.pan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 capitalize ">Status</span>
              <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md capitalize ">
                {result.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
