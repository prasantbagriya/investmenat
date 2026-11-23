import React, { useState } from 'react';
import { Building2, Search, Loader2, ShieldAlert, CheckCircle, MapPin } from 'lucide-react';
import { verifyGstin, GstinSearchResponse } from '../../services/quickoService';

export default function GstinSearch() {
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GstinSearchResponse | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gstin.length !== 15) {
      setError('GSTIN must be exactly 15 alphanumeric characters');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await verifyGstin(gstin);
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
          <Building2 size={20} className="text-emerald-400" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">GSTIN Search</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quicko B2B Verification API</p>
        </div>
      </div>

      <div className="space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Enter 15-Char GSTIN</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  maxLength={15}
                  placeholder="27ABCDE1234F1Z5"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pl-10 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium px-5 rounded-xl text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-60 whitespace-nowrap flex items-center justify-center min-w-[80px]"
              >
                {loading ? <Loader2 size={16} className="animate-spin text-white" /> : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
            <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-3.5 bg-white border-b border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-[11px] font-medium text-slate-500">GSTIN / UIN</p>
                <p className="font-semibold text-slate-900 font-mono tabular-nums text-sm">{gstin}</p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1">
                <CheckCircle size={12} /> {result.status}
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] font-medium block mb-0.5">Legal Name of Business</span>
                <p className="font-semibold text-slate-900 text-sm leading-tight">{result.legalName}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] font-medium block mb-0.5">Trade Name</span>
                <p className="font-semibold text-slate-800 leading-tight">{result.tradeName || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] font-medium block mb-0.5">Taxpayer Type</span>
                <p className="font-medium text-slate-700 bg-white border border-slate-200 inline-block px-2 py-0.5 rounded-md text-[11px]">{result.taxpayerType}</p>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] font-medium block mb-0.5">Date of Registration</span>
                <p className="font-mono tabular-nums text-slate-700 font-medium">{result.registrationDate}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 text-[11px] font-medium block mb-0.5">Principal Place of Business</span>
                <p className="font-medium text-slate-600 flex items-start gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  {result.address}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
