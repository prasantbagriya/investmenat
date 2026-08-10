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
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
        <Fingerprint size={120} />
      </div>

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 relative z-10">
        <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100/50 shadow-inner">
          <Fingerprint className="text-orange-600" size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Offline Aadhaar KYC</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Quicko Sandbox Verification API</p>
        </div>
      </div>

      <div className="space-y-5 relative z-10">
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 capitalize ">Enter 12-Digit Aadhaar</label>
            <div className="relative">
              <input 
                type="text" 
                maxLength={12}
                placeholder="0000 0000 0000"
                value={aadhaar}
                onChange={e => setAadhaar(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-700 font-mono text-sm focus:ring-1 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-orange-500/20 flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Fetch KYC Details'}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-700 font-medium">
            <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-1.5 border-b border-emerald-100 pb-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <h3 className="font-bold text-emerald-800 text-sm">Aadhaar Verified Successfully</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
                <span className="text-slate-500 text-xs capitalize font-bold ">Full Name</span>
                <p className="font-black text-slate-800 font-mono mt-0.5 truncate">{result.name}</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
                <span className="text-slate-500 text-xs capitalize font-bold ">DOB / Gender</span>
                <p className="font-black text-slate-800 font-mono mt-0.5">{result.dob} / {result.gender}</p>
              </div>
              <div className="col-span-2 bg-white p-2 rounded-lg border border-slate-100 shadow-xs">
                <span className="text-slate-500 text-xs capitalize font-bold ">Registered Address</span>
                <p className="font-bold text-slate-700 mt-0.5 leading-relaxed">{result.address}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
