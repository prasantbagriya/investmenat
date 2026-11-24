import React, { useState } from 'react';
import { Fingerprint, CheckCircle, Search, ShieldAlert, Loader2 } from 'lucide-react';
import { verifyAadhaar, AadhaarVerifyResponse } from '../../services/quickoService';

export default function AadhaarVerification() {
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AadhaarVerifyResponse | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.length !== 12) {
      setError('Aadhaar must be exactly 12 digits');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await verifyAadhaar(aadhaar);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
        <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
          <Fingerprint size={20} className="text-emerald-400" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Aadhaar KYC</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quicko Sandbox Verification API</p>
        </div>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Enter 12-Digit Aadhaar</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={12}
                placeholder="0000 0000 0000"
                value={aadhaar}
                onChange={e => setAadhaar(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all placeholder:text-slate-400"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin text-white" /> : 'Fetch KYC Details'}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
            <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="mt-6 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-200/80 pb-3">
              <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle size={15} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Aadhaar Verified Successfully</p>
                <p className="text-[11px] text-slate-500">Government UIDAI record match</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block text-[11px]">Full Name</span>
                <p className="font-semibold text-slate-900 mt-1">{result.name}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block text-[11px]">DOB / Gender</span>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-1">{result.dob} / {result.gender}</p>
              </div>
              <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium block text-[11px]">Registered Address</span>
                <p className="text-slate-700 font-medium mt-1 leading-relaxed">{result.address}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
