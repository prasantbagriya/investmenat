import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { exchangeQuickoToken } from '../../services/quickoService';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

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

        // Exchange code for access token
        const accessToken = await exchangeQuickoToken(code);
        
        // Save to localStorage so QuickoConnect.tsx can use it
        localStorage.setItem('quicko_access_token', accessToken);
        
        setStatus('success');
        
        // Redirect back to the dashboard after a short delay
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
        <h2 className="text-2xl font-semibold text-white mb-6">Quicko Connection</h2>
        
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-gray-400">Authenticating with Quicko securely...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-emerald-400 font-medium">Authentication Successful!</p>
            <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-red-400 font-medium">Authentication Failed</p>
            <p className="text-sm text-gray-400">{errorMsg}</p>
            <button 
              onClick={() => navigate('/?workspace=quicko')}
              className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
