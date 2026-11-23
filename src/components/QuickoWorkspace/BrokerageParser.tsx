import React, { useState } from 'react';
import { UploadCloud, Loader2, ShieldAlert, BarChart3, Receipt } from 'lucide-react';
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
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
        <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
          <Receipt size={20} className="text-emerald-400" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Contract Note Parser</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quicko Brokerage Parsing API</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Select Broker</label>
          <select 
            value={broker}
            onChange={e => setBroker(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all font-medium"
          >
            <option value="Zerodha">Zerodha</option>
            <option value="Groww">Groww</option>
            <option value="Upstox">Upstox</option>
            <option value="AngelOne">AngelOne</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Upload Tax P&L / Contract Note (PDF)</label>
          <div className="relative">
            <input 
              type="file" 
              accept="application/pdf"
              onChange={handleUpload}
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
            />
            <div className={`bg-slate-50 border-2 border-dashed ${error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100/50'} rounded-xl p-6 flex flex-col items-center justify-center transition-all text-center h-32`}>
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={22} className="animate-spin text-slate-700" />
                  <span className="text-slate-700 text-xs font-medium">Parsing trades from PDF...</span>
                </div>
              ) : (
                <>
                  <UploadCloud size={24} className={error ? 'text-rose-500 mb-1.5' : 'text-slate-500 mb-1.5'} />
                  <span className="text-slate-800 text-xs sm:text-sm font-medium">{error ? 'Upload Failed - Click to Retry' : 'Click or drag PDF file here'}</span>
                  <span className="text-slate-400 text-[11px] mt-1">Supports Zerodha and Groww Tax P&L PDFs</span>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
            <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {result && !error && (
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-900 p-3.5 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-emerald-400" />
                <span className="text-xs font-semibold">Extracted Summary</span>
              </div>
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-medium">{result.broker}</span>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] font-medium block mb-1">Total Trades Found</span>
                <p className="font-semibold text-slate-900 text-lg font-mono tabular-nums">{result.tradeCount}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] font-medium block mb-1">Total Turnover</span>
                <p className="font-semibold text-slate-900 text-lg font-mono tabular-nums">₹{result.totalTurnover.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] font-medium block mb-1">Net Realized Gain/Loss</span>
                <p className={`font-semibold text-lg font-mono tabular-nums ${result.netRealizedGain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {result.netRealizedGain >= 0 ? '+' : ''}₹{result.netRealizedGain.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="bg-white p-2.5 text-center border-t border-slate-200">
              <p className="text-[11px] text-slate-500">This data can now be automatically piped into your Tax Planner.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
