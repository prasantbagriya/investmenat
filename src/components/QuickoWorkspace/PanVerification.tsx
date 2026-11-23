import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, Search, Loader2 } from 'lucide-react';
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
      toast.success('PAN verified successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify PAN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
        <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
          <ShieldCheck size={20} className="text-emerald-400" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Identity KYC</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quicko PAN verification engine</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Enter PAN Number</label>
          <div className="relative">
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="ABCDE1234F"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-white" />
          ) : (
            <span>Verify Identity</span>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-200/80 pb-3">
            <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle size={15} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">Verification Successful</p>
              <p className="text-[11px] text-slate-500">PAN is active and verified with ITD</p>
            </div>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">PAN Holder Name</span>
              <span className="font-semibold text-slate-900">{result.name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">PAN Number</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">{result.pan}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-xl font-medium text-[11px]">
                {result.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
