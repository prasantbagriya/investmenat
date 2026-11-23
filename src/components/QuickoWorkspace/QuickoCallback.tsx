import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { exchangeQuickoToken } from '../../services/quickoService';
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export default function QuickoCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('request_token') || params.get('code');
        
        if (!code) {
          throw new Error('No authorization code found in URL');
        }

        const accessToken = await exchangeQuickoToken(code);
        localStorage.setItem('quicko_access_token', accessToken);
        setStatus('success');
        
        setTimeout(() => {
          navigate('/?workspace=quicko');
        }, 1500);

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to complete authentication');
      }
    };

    processCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-8 max-w-md w-full text-center shadow-xs">
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-5 shadow-xs mx-auto">
          <ShieldCheck size={22} className="text-emerald-400" strokeWidth={2} />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">Quicko Connection</h2>
        
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-3 py-4">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">Authenticating with Quicko securely...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-3 py-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <p className="text-slate-900 font-semibold text-sm">Authentication Successful!</p>
            <p className="text-xs text-slate-500">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-3 py-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center">
              <XCircle className="w-7 h-7" strokeWidth={2.5} />
            </div>
            <p className="text-slate-900 font-semibold text-sm">Authentication Failed</p>
            <p className="text-xs text-rose-600">{errorMsg}</p>
            <button 
              onClick={() => navigate('/?workspace=quicko')}
              className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
