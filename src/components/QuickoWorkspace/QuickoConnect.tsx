import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, ExternalLink, ShieldCheck, User, 
  Calculator, ScrollText, CheckCircle, ShieldAlert, Loader2
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
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 shadow-xs text-center">
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-5 shadow-xs mx-auto">
          <LinkIcon size={20} className="text-emerald-400" strokeWidth={2} />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">Connect ITD Account</h2>
        <p className="text-slate-600 text-sm max-w-sm mx-auto mb-7 leading-relaxed">
          Securely link your Income Tax Department account via Quicko Open APIs to automatically sync your ITR details and tax computations.
        </p>

        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-60"
        >
          {isConnecting ? (
            <><Loader2 size={16} className="animate-spin text-white" /> Connecting...</>
          ) : (
            <><span>Connect via Quicko</span> <ExternalLink size={15} /></>
          )}
        </button>
        
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck size={14} className="text-slate-400" />
          <span>Bank-grade security & consent-based access</span>
        </div>
        {error && <p className="text-rose-600 text-xs mt-3 bg-rose-50 border border-rose-200 p-2 rounded-xl">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center">
            <CheckCircle size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Connected to Quicko</h3>
            <p className="text-xs text-slate-500">OAuth Bearer Token Active</p>
          </div>
        </div>
        <button 
          onClick={handleDisconnect} 
          className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-medium px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
        >
          Disconnect
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700 font-medium">
          <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <Loader2 size={24} className="animate-spin text-slate-700" />
          <p className="text-sm font-medium text-slate-600">Fetching tax data from Quicko...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Identity & Tax Payer */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <User size={16} className="text-slate-700" />
              <h3 className="font-semibold text-slate-900 text-sm">Taxpayer Identity</h3>
            </div>
            {taxPayer && user && (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500 font-medium text-[11px] mb-0.5">Full Name</p>
                  <p className="font-semibold text-slate-900 text-sm">{taxPayer.fullName}</p>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">PAN</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-800">{taxPayer.pan}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Contact</span>
                  <span className="font-medium text-slate-800">{user.mobile}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Residential Status</span>
                  <span className="font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px]">{taxPayer.residentialStatus}</span>
                </div>
              </div>
            )}
          </div>

          {/* ITR Details */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <ScrollText size={16} className="text-slate-700" />
              <h3 className="font-semibold text-slate-900 text-sm">ITR Details</h3>
            </div>
            {itr && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assessment Year</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px]">AY {itr.assessmentYear}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Form Type</span>
                  <span className="font-semibold text-slate-800">{itr.formType}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Tax Regime</span>
                  <span className="font-semibold text-slate-800">{itr.regime}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Filing Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> {itr.status}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Ack Number</span>
                  <span className="font-mono tabular-nums font-medium text-slate-600">{itr.ackNumber}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tax Computation */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xs sm:col-span-2 text-white">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Calculator size={16} className="text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">Official Tax Computation</h3>
            </div>
            {taxComp && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Income from Salary</span>
                    <span className="font-mono tabular-nums text-slate-200">₹{taxComp.salaryIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">House Property</span>
                    <span className="font-mono tabular-nums text-slate-200">₹{taxComp.housePropertyIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capital Gains (STCG + LTCG)</span>
                    <span className="font-mono tabular-nums text-slate-200">₹{(taxComp.stcg + taxComp.ltcg).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Other Sources</span>
                    <span className="font-mono tabular-nums text-slate-200">₹{taxComp.otherSources.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="space-y-2.5 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-8">
                  <div className="flex justify-between text-emerald-400">
                    <span>Chapter VI-A Deductions</span>
                    <span className="font-mono tabular-nums font-semibold">- ₹{taxComp.deductions.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-white font-medium">Total Taxable Income</span>
                    <span className="font-mono tabular-nums text-white font-semibold">₹{taxComp.totalTaxable.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-rose-400 font-medium">Total Tax Payable</span>
                    <span className="font-mono tabular-nums text-rose-400 font-semibold text-sm">₹{taxComp.taxPayable.toLocaleString('en-IN')}</span>
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
