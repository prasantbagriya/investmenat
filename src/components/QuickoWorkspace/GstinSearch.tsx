import React, { useState } from 'react';
import { Building2, Search, Building, Loader2, ShieldAlert, CheckCircle, MapPin } from 'lucide-react';
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
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
        <Building2 size={120} />
      </div>

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 relative z-10">
        <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100/50 shadow-inner">
          <Building className="text-rose-600" size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Business GSTIN Search</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Quicko B2B Verification API</p>
        </div>
      </div>

      <div className="space-y-5 relative z-10">
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 capitalize ">Enter 15-Char GSTIN</label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  maxLength={15}
                  placeholder="27ABCDE1234F1Z5"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-slate-700 font-mono text-sm focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all capitalize"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 rounded-xl transition-all shadow-md shadow-rose-500/20 flex justify-center items-center disabled:opacity-60 whitespace-nowrap"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-700 font-medium">
            <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-500 capitalize ">GSTIN / UIN</p>
                <p className="font-black text-slate-800 font-mono">{gstin}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md text-xs font-bold">
                <CheckCircle size={12} /> {result.status}
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Legal Name of Business</span>
                <p className="font-bold text-slate-800 text-sm leading-tight">{result.legalName}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Trade Name</span>
                <p className="font-semibold text-slate-700 leading-tight">{result.tradeName}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Taxpayer Type</span>
                <p className="font-medium text-slate-700 bg-slate-100 inline-block px-2 py-0.5 rounded">{result.taxpayerType}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Date of Registration</span>
                <p className="font-mono text-slate-700">{result.registrationDate}</p>
              </div>
              <div className="sm:col-span-2 mt-1">
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Principal Place of Business</span>
                <p className="font-medium text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
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
