import React, { useState } from 'react';
import { FileBarChart2, UploadCloud, Loader2, ShieldAlert, BarChart3, Receipt } from 'lucide-react';
import { parseContractNote, BrokerageParseResponse } from '../../services/quickoService';

export default function BrokerageParser() {
  const [broker, setBroker] = useState('Zerodha');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrokerageParseResponse | null>(null);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await parseContractNote(file, broker);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
        <FileBarChart2 size={120} />
      </div>

      <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4 relative z-10">
        <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100/50 shadow-inner">
          <Receipt className="text-blue-600" size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Contract Note Parser</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Quicko Brokerage Parsing API</p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 capitalize ">Select Broker</label>
            <select 
              value={broker}
              onChange={e => setBroker(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm text-slate-700 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="Zerodha">Zerodha</option>
              <option value="Groww">Groww</option>
              <option value="Upstox">Upstox</option>
              <option value="AngelOne">AngelOne</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 capitalize ">Upload Tax P&L / Contract Note (PDF)</label>
            <div className="relative">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleUpload}
                disabled={loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              />
              <div className={`bg-white border-2 border-dashed ${error ? 'border-red-300' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'} rounded-xl p-6 flex flex-col items-center justify-center transition-all text-center h-32`}>
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                    <span className="text-blue-600 text-xs font-bold">Parsing trades from PDF...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={28} className={error ? 'text-red-400 mb-2' : 'text-blue-400 mb-2'} />
                    <span className="text-slate-700 text-sm font-bold">{error ? 'Upload Failed - Click to Retry' : 'Click or Drag PDF file here'}</span>
                    <span className="text-slate-400 text-xs mt-1">Supports Zerodha, Groww Tax P&L PDFs</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-700 font-medium">
            <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900 p-3 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-400" />
                <span className="text-xs font-bold capitalize">Extracted Summary</span>
              </div>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{result.broker}</span>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-center">
              <div className="pt-3 sm:pt-0">
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Total Trades Found</span>
                <p className="font-black text-slate-800 text-xl font-mono">{result.tradeCount}</p>
              </div>
              <div className="pt-3 sm:pt-0">
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Total Turnover</span>
                <p className="font-black text-slate-800 text-lg font-mono">₹{result.totalTurnover.toLocaleString('en-IN')}</p>
              </div>
              <div className="pt-3 sm:pt-0">
                <span className="text-slate-500 text-xs capitalize font-bold block mb-1">Net Realized Gain/Loss</span>
                <p className={`font-black text-lg font-mono ${result.netRealizedGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {result.netRealizedGain >= 0 ? '+' : ''}₹{result.netRealizedGain.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="bg-slate-50 p-2 text-center border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">This data can now be automatically piped into your Tax Planner.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
