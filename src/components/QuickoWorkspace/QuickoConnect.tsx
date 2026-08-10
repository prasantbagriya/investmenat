import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, ExternalLink, ShieldCheck, User, 
  Calculator, ScrollText, CheckCircle, ShieldAlert, Loader2, ArrowRight
} from 'lucide-react';
import { 
  connectQuickoOAuth, getUserDetails, getTaxPayer, getItrDetails, getTaxComputation,
  OpenApiUserDetails, OpenApiTaxPayer, OpenApiItrDetails, OpenApiTaxComputation
} from '../../services/quickoService';

export default function QuickoConnect() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('quicko_access_token'));
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  const [user, setUser] = useState<OpenApiUserDetails | null>(null);
  const [taxPayer, setTaxPayer] = useState<OpenApiTaxPayer | null>(null);
  const [itr, setItr] = useState<OpenApiItrDetails | null>(null);
  const [taxComp, setTaxComp] = useState<OpenApiTaxComputation | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    try {
      await connectQuickoOAuth();
      // Code won't reach here because of window redirect
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Quicko');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('quicko_access_token');
    setToken(null);
    setUser(null);
    setTaxPayer(null);
    setItr(null);
    setTaxComp(null);
  };

  useEffect(() => {
    if (token) {
      loadDashboardData(token);
    }
  }, [token]);

  const loadDashboardData = async (accessToken: string) => {
    setLoadingData(true);
    setError('');
    try {
      // Execute all fetches in parallel
      const [u, t, i, c] = await Promise.all([
        getUserDetails(accessToken),
        getTaxPayer(accessToken),
        getItrDetails(accessToken),
        getTaxComputation(accessToken)
      ]);
      setUser(u);
      setTaxPayer(t);
      setItr(i);
      setTaxComp(c);
    } catch (err: any) {
      setError('Failed to fetch data from Quicko Open APIs. ' + err.message);
      if (err.message.includes('401')) {
        handleDisconnect();
      }
    } finally {
      setLoadingData(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-6 sm:p-8 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center mb-6 shadow-inner">
            <LinkIcon size={32} className="text-indigo-600" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Connect your ITD Account</h2>
          <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
            Securely connect your Income Tax Department account via Quicko Open APIs to automatically fetch your ITR details and tax computation.
          </p>

          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
            ) : (
              <>Connect via Quicko <ExternalLink size={16} /></>
            )}
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium capitalize ">
            <ShieldCheck size={14} /> Bank-Grade Security • Consent Based
          </div>
          {error && <p className="text-red-500 text-xs mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Connected to Quicko</h3>
            <p className="text-xs text-slate-500">OAuth Bearer Token Active</p>
          </div>
        </div>
        <button onClick={handleDisconnect} className="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
          Disconnect
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-700 font-medium">
          <ShieldAlert size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">Fetching highly secure Tax Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Identity & Tax Payer */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <User size={18} className="text-indigo-500" />
              <h3 className="font-bold text-slate-800 text-sm">Taxpayer Identity</h3>
            </div>
            {taxPayer && user && (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-400 font-semibold mb-0.5">Full Name</p>
                  <p className="font-bold text-slate-800 text-sm">{taxPayer.fullName}</p>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">PAN</span>
                  <span className="font-mono font-bold text-slate-700">{taxPayer.pan}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">Contact</span>
                  <span className="font-medium text-slate-700">{user.mobile}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">Residential Status</span>
                  <span className="font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{taxPayer.residentialStatus}</span>
                </div>
              </div>
            )}
          </div>

          {/* ITR Details */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <ScrollText size={18} className="text-emerald-500" />
              <h3 className="font-bold text-slate-800 text-sm">ITR Details</h3>
            </div>
            {itr && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assessment Year</span>
                  <span className="font-bold text-slate-800 bg-emerald-50 text-emerald-700 px-2 rounded">AY {itr.assessmentYear}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">Form Type</span>
                  <span className="font-bold text-slate-700">{itr.formType}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">Tax Regime</span>
                  <span className="font-bold text-slate-700">{itr.regime}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">Filing Status</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> {itr.status}</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-2">
                  <span className="text-slate-500">Ack Number</span>
                  <span className="font-mono font-medium text-slate-500">{itr.ackNumber}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tax Computation */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-xl sm:col-span-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 p-6 pointer-events-none">
              <Calculator size={140} />
            </div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 relative z-10">
              <Calculator size={18} className="text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Official Tax Computation</h3>
            </div>
            {taxComp && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs relative z-10">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Income from Salary</span>
                    <span className="font-mono text-slate-200">₹{taxComp.salaryIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">House Property</span>
                    <span className="font-mono text-slate-200">₹{taxComp.housePropertyIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capital Gains (STCG + LTCG)</span>
                    <span className="font-mono text-slate-200">₹{(taxComp.stcg + taxComp.ltcg).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Other Sources</span>
                    <span className="font-mono text-slate-200">₹{taxComp.otherSources.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-8">
                  <div className="flex justify-between text-emerald-400">
                    <span>Chapter VI-A Deductions</span>
                    <span className="font-mono font-bold">- ₹{taxComp.deductions.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-white font-bold">Total Taxable Income</span>
                    <span className="font-mono text-white font-bold">₹{taxComp.totalTaxable.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-rose-400 font-bold">Total Tax Payable</span>
                    <span className="font-mono text-rose-400 font-bold text-base">₹{taxComp.taxPayable.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
