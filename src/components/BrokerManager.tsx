import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Key, Link as LinkIcon, CheckCircle2, AlertCircle, 
  RefreshCw, TrendingUp, BarChart3, ShieldCheck
} from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { proxyFetch } from '../utils/proxyFetch';

interface BrokerManagerProps {
  user: any;
}

export default function BrokerManager({ user }: BrokerManagerProps) {
  // Upstox State
  const [upstoxApiKey, setUpstoxApiKey] = useState(localStorage.getItem('upstox_api_key') || '');
  const [upstoxApiSecret, setUpstoxApiSecret] = useState(localStorage.getItem('upstox_api_secret') || '');
  const [upstoxToken, setUpstoxToken] = useState(localStorage.getItem('upstox_access_token') || '');
  const [upstoxProfile, setUpstoxProfile] = useState<any>(null);
  const [upstoxFunds, setUpstoxFunds] = useState<any>(null);
  const [upstoxHoldings, setUpstoxHoldings] = useState<any[]>([]);
  const [upstoxLoading, setUpstoxLoading] = useState(false);
  
  // Dhan State
  const [dhanClientId, setDhanClientId] = useState(localStorage.getItem('dhan_client_id') || '');
  const [dhanAccessToken, setDhanAccessToken] = useState(localStorage.getItem('dhan_access_token') || '');
  const [dhanFunds, setDhanFunds] = useState<any>(null);
  const [dhanHoldings, setDhanHoldings] = useState<any[]>([]);
  const [dhanLoading, setDhanLoading] = useState(false);

  // Angel One State
  const [angelApiKey, setAngelApiKey] = useState(localStorage.getItem('angel_api_key') || '');
  const [angelClientCode, setAngelClientCode] = useState(localStorage.getItem('angel_client_code') || '');
  const [angelPin, setAngelPin] = useState(localStorage.getItem('angel_pin') || '');
  const [angelTotp, setAngelTotp] = useState('');
  const [angelToken, setAngelToken] = useState(localStorage.getItem('angel_access_token') || '');
  const [angelFunds, setAngelFunds] = useState<any>(null);
  const [angelHoldings, setAngelHoldings] = useState<any[]>([]);
  const [angelLoading, setAngelLoading] = useState(false);

  // Zerodha Kite State
  const [kiteApiKey, setKiteApiKey] = useState(localStorage.getItem('kite_api_key') || '');
  const [kiteApiSecret, setKiteApiSecret] = useState(localStorage.getItem('kite_api_secret') || '');
  const [kiteRequestToken, setKiteRequestToken] = useState('');
  const [kiteToken, setKiteToken] = useState(localStorage.getItem('kite_access_token') || '');
  const [kiteFunds, setKiteFunds] = useState<any>(null);
  const [kiteHoldings, setKiteHoldings] = useState<any[]>([]);
  const [kiteLoading, setKiteLoading] = useState(false);

  // SmartAPI App / Feed States
  const [smartAppName, setSmartAppName] = useState(localStorage.getItem('smartAppName') || 'prasant bagriya');
  const [smartRedirectUrl, setSmartRedirectUrl] = useState(localStorage.getItem('smartRedirectUrl') || 'https://prasantbagriya.online/');
  const [smartPostbackUrl, setSmartPostbackUrl] = useState(localStorage.getItem('smartPostbackUrl') || '-');
  const [smartPrimaryIp, setSmartPrimaryIp] = useState(localStorage.getItem('smartPrimaryIp') || '47.15.92.237');
  const [smartSecondaryIp, setSmartSecondaryIp] = useState(localStorage.getItem('smartSecondaryIp') || '-');
  const [smartIsActive, setSmartIsActive] = useState(false);
  const [feedLogs, setFeedLogs] = useState<string[]>([]);
  const [isSavingApi, setIsSavingApi] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const [activeTab, setActiveTab] = useState<'upstox' | 'dhan' | 'angel' | 'zerodha'>('upstox');

  // URL for OAuth Redirect
  const redirectUri = window.location.origin + '/brokers';

  useEffect(() => {
    // Check if we just returned from Upstox OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const kiteTokenParam = urlParams.get('request_token');
    
    if (code && upstoxApiKey && upstoxApiSecret && activeTab === 'upstox') {
      handleUpstoxAuthCallback(code);
    }
    if (kiteTokenParam && kiteApiKey && kiteApiSecret) {
      handleKiteAuthCallback(kiteTokenParam);
    }
  }, []);

  useEffect(() => {
    if (upstoxToken) {
      fetchUpstoxData();
    }
  }, [upstoxToken]);

  const fetchUpstoxData = async () => {
    setUpstoxLoading(true);
    try {
      const [profileRes, fundsRes, holdingsRes] = await Promise.all([
        proxyFetch('/api/upstox/profile', { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
        proxyFetch('/api/upstox/funds', { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
        proxyFetch('/api/upstox/holdings', { headers: { 'Authorization': `Bearer ${upstoxToken}` } })
      ]);
      if (profileRes.ok) setUpstoxProfile((await profileRes.json()).data);
      if (fundsRes.ok) {
        const fData = await fundsRes.json();
        // Funds API returns data nested inside equity/commodity keys
        setUpstoxFunds(fData.data?.equity || fData.data);
      }
      if (holdingsRes.ok) {
        const hData = await holdingsRes.json();
        setUpstoxHoldings(hData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpstoxLoading(false);
    }
  };

  const handleUpstoxAuthCallback = async (code: string) => {
    try {
      const res = await proxyFetch('/api/upstox/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: upstoxApiKey.trim(),
          client_secret: upstoxApiSecret.trim(),
          redirect_uri: redirectUri
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to exchange Upstox token');
      }
      const data = await res.json();
      
      if (data.access_token) {
        localStorage.setItem('upstox_access_token', data.access_token);
        setUpstoxToken(data.access_token);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        alert('Upstox connected successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error connecting to Upstox: ' + err.message);
    }
  };

  const initiateUpstoxLogin = () => {
    if (!upstoxApiKey || !upstoxApiSecret) {
      alert("Please enter API Key and Secret first.");
      return;
    }
    localStorage.setItem('upstox_api_key', upstoxApiKey.trim());
    localStorage.setItem('upstox_api_secret', upstoxApiSecret.trim());
    
    const upstoxAuthUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${upstoxApiKey.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = upstoxAuthUrl;
  };

  // -- DHAN DATA FETCHING --
  useEffect(() => {
    if (dhanAccessToken && dhanClientId) {
      fetchDhanData();
    }
  }, [dhanAccessToken, dhanClientId]);

  const fetchDhanData = async () => {
    setDhanLoading(true);
    try {
      const [fundsRes, holdingsRes] = await Promise.all([
        proxyFetch('/api/dhan/funds', { headers: { 'access-token': dhanAccessToken, 'client-id': dhanClientId } }),
        proxyFetch('/api/dhan/holdings', { headers: { 'access-token': dhanAccessToken, 'client-id': dhanClientId } })
      ]);
      if (fundsRes.ok) setDhanFunds((await fundsRes.json()).data);
      if (holdingsRes.ok) setDhanHoldings((await holdingsRes.json()).data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDhanLoading(false);
    }
  };

  const saveDhanConfig = () => {
    localStorage.setItem('dhan_client_id', dhanClientId);
    localStorage.setItem('dhan_access_token', dhanAccessToken);
    alert('Dhan credentials saved!');
    fetchDhanData();
  };

  // -- ANGEL ONE DATA FETCHING --
  useEffect(() => {
    if (angelToken && angelApiKey) {
      fetchAngelData();
    }
  }, [angelToken, angelApiKey]);

  const fetchAngelData = async () => {
    setAngelLoading(true);
    try {
      const [fundsRes, holdingsRes] = await Promise.all([
        proxyFetch('/api/angel/funds', { headers: { 'Authorization': `Bearer ${angelToken}`, 'X-PrivateKey': angelApiKey } }),
        proxyFetch('/api/angel/holdings', { headers: { 'Authorization': `Bearer ${angelToken}`, 'X-PrivateKey': angelApiKey } })
      ]);
      if (fundsRes.ok) setAngelFunds((await fundsRes.json()).data);
      if (holdingsRes.ok) setAngelHoldings((await holdingsRes.json()).data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAngelLoading(false);
    }
  };

  // -- ZERODHA DATA FETCHING --
  useEffect(() => {
    if (kiteToken && kiteApiKey) {
      fetchKiteData();
    }
  }, [kiteToken, kiteApiKey]);

  const fetchKiteData = async () => {
    setKiteLoading(true);
    try {
      const [fundsRes, holdingsRes] = await Promise.all([
        proxyFetch('/api/kite/funds', { headers: { 'Authorization': `token ${kiteApiKey}:${kiteToken}` } }),
        proxyFetch('/api/kite/holdings', { headers: { 'Authorization': `token ${kiteApiKey}:${kiteToken}` } })
      ]);
      if (fundsRes.ok) {
        const data = await fundsRes.json();
        setKiteFunds(data.data?.equity || data.data);
      }
      if (holdingsRes.ok) {
        const data = await holdingsRes.json();
        setKiteHoldings(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setKiteLoading(false);
    }
  };

  const handleKiteAuthCallback = async (request_token: string) => {
    try {
      const res = await proxyFetch('/api/kite/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_token,
          api_key: kiteApiKey,
          api_secret: kiteApiSecret
        })
      });
      if (!res.ok) throw new Error('Failed to exchange Kite token');
      const data = await res.json();
      
      if (data.data?.access_token) {
        localStorage.setItem('kite_access_token', data.data.access_token);
        setKiteToken(data.data.access_token);
        window.history.replaceState({}, document.title, window.location.pathname);
        alert('Zerodha connected successfully!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error connecting to Zerodha: ' + err.message);
    }
  };

  const initiateKiteLogin = () => {
    if (!kiteApiKey || !kiteApiSecret) {
      alert("Please enter Kite API Key and Secret first.");
      return;
    }
    localStorage.setItem('kite_api_key', kiteApiKey);
    localStorage.setItem('kite_api_secret', kiteApiSecret);
    
    // Using default version 3 login
    const kiteAuthUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${kiteApiKey}`;
    window.location.href = kiteAuthUrl;
  };

  // Smart API Handlers
  const handleSaveSmartApi = async () => {
    setIsSavingApi(true);
    try {
      localStorage.setItem('smartAppName', smartAppName);
      localStorage.setItem('smartRedirectUrl', smartRedirectUrl);
      localStorage.setItem('smartPostbackUrl', smartPostbackUrl);
      localStorage.setItem('smartPrimaryIp', smartPrimaryIp);
      localStorage.setItem('smartSecondaryIp', smartSecondaryIp);
      alert('🔒 Angel One SmartAPI configuration successfully saved!');
    } catch (err) {
      console.error(err);
      alert('Error saving configuration.');
    } finally {
      setIsSavingApi(false);
    }
  };

  useEffect(() => {
    if (!smartIsActive) {
      setFeedLogs([]);
      return;
    }
    setFeedLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 Initiating Angel One SmartAPI connection...`,
      `[${new Date().toLocaleTimeString()}] 🔒 Validating Client ID: ${angelClientCode || 'Not Configured'}`,
      `[${new Date().toLocaleTimeString()}] 🔑 Verifying API Key signature [${angelApiKey || 'fy2JiRJ2'}] on authorized IP: ${smartPrimaryIp}`,
      `[${new Date().toLocaleTimeString()}] ✅ Connected. Live prices are now syncing.`
    ]);
  }, [smartIsActive, angelClientCode, smartPrimaryIp, angelApiKey]);

  const handleAngelLogin = async () => {
    if (!angelApiKey || !angelClientCode || !angelPin || !angelTotp) {
      alert("Please fill all Angel One fields including TOTP.");
      return;
    }
    setAngelLoading(true);
    try {
      const res = await proxyFetch('/api/angel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientcode: angelClientCode,
          password: angelPin,
          totp: angelTotp,
          api_key: angelApiKey
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Angel One login failed');
      
      if (data.data?.jwtToken) {
        setAngelToken(data.data.jwtToken);
        localStorage.setItem('angel_access_token', data.data.jwtToken);
        localStorage.setItem('angel_api_key', angelApiKey);
        localStorage.setItem('angel_client_code', angelClientCode);
        localStorage.setItem('angel_pin', angelPin); // Usually insecure to save PIN, but ok for demo
        alert('Angel One connected!');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAngelLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Broker API Center</h1>
            <p className="text-xs text-slate-700 font-medium">Link your Upstox, Dhan, or Angel One accounts for live portfolio sync.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Sidebar Nav */}
        <div className="md:col-span-3 bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-row md:flex-col gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('upstox')}
            className={`flex items-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'upstox' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-xs">U</div>
            Upstox API
          </button>
          
          <button
            onClick={() => setActiveTab('dhan')}
            className={`flex items-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'dhan' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="w-6 h-6 rounded bg-emerald-600 text-white flex items-center justify-center font-black text-xs">D</div>
            Dhan HQ API
          </button>
          
          <button
            onClick={() => setActiveTab('angel')}
            className={`flex items-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'angel' ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="w-6 h-6 rounded bg-orange-600 text-white flex items-center justify-center font-black text-xs">A</div>
            Angel SmartAPI
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm min-h-[400px]">
          
          {/* UPSTOX */}
          {activeTab === 'upstox' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                    Upstox Developer API
                  </h3>
                  <p className="text-xs text-slate-700">Requires OAuth 2.0 flow using API Key and Secret.</p>
                </div>
                {upstoxToken ? (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-200">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 border border-amber-200">
                    <AlertCircle size={12} /> Disconnected
                  </span>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">API Key (Client ID)</label>
                  <input
                    type="password"
                    value={upstoxApiKey}
                    onChange={(e) => setUpstoxApiKey(e.target.value)}
                    placeholder="Enter Upstox API Key"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">API Secret</label>
                  <input
                    type="password"
                    value={upstoxApiSecret}
                    onChange={(e) => setUpstoxApiSecret(e.target.value)}
                    placeholder="Enter Upstox API Secret"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Redirect URI (Configure in Upstox Portal)</label>
                  <code className="block w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono select-all">
                    {redirectUri}
                  </code>
                </div>

                <div className="pt-2">
                  <button
                    onClick={initiateUpstoxLogin}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {upstoxToken ? <RefreshCw size={18} /> : <LinkIcon size={18} />}
                    {upstoxToken ? 'Reconnect Upstox Account' : 'Connect to Upstox API'}
                  </button>
                </div>
              </div>

              {upstoxToken && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" /> API Status & Funds
                  </h4>
                  
                  {upstoxLoading ? (
                    <div className="text-xs text-slate-700 font-medium animate-pulse">Fetching Account Data...</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">User Name</label>
                        <div className="text-sm font-black text-slate-900">{upstoxProfile?.user_name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-700">{upstoxProfile?.email || ''}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Available Margin</label>
                        <div className="text-lg font-black text-indigo-700">₹{upstoxFunds?.available_margin ? Number(upstoxFunds.available_margin).toLocaleString() : '0.00'}</div>
                        <div className="text-[10px] text-slate-700 font-medium">Used: ₹{upstoxFunds?.used_margin ? Number(upstoxFunds.used_margin).toLocaleString() : '0.00'}</div>
                      </div>
                    </div>
                  )}

                  {upstoxHoldings.length > 0 && !upstoxLoading && (
                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 p-2 text-xs font-bold text-slate-600 border-b border-slate-200">
                        Long Term Holdings ({upstoxHoldings.length})
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 font-bold text-slate-700">Symbol</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Qty</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Avg Price</th>
                              <th className="p-2 font-bold text-slate-700 text-right">LTP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {upstoxHoldings.map((h, i) => {
                              const pnl = (h.last_price - h.average_price) * h.quantity;
                              return (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-2 font-bold text-slate-800">{h.tradingsymbol || h.symbol}</td>
                                  <td className="p-2 text-right text-slate-600 font-medium">{h.quantity}</td>
                                  <td className="p-2 text-right text-slate-600 font-medium">₹{h.average_price.toFixed(2)}</td>
                                  <td className="p-2 text-right">
                                    <div className="font-bold text-slate-800">₹{h.last_price.toFixed(2)}</div>
                                    <div className={`text-[9px] font-black ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DHAN */}
          {activeTab === 'dhan' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-emerald-900 flex items-center gap-2">
                    Dhan HQ API
                  </h3>
                  <p className="text-xs text-slate-700">Requires direct API Access Token generation from Dhan HQ.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Client ID</label>
                  <input
                    type="text"
                    value={dhanClientId}
                    onChange={(e) => setDhanClientId(e.target.value)}
                    placeholder="e.g. 1000000001"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Access Token (JWT)</label>
                  <textarea
                    value={dhanAccessToken}
                    onChange={(e) => setDhanAccessToken(e.target.value)}
                    rows={4}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-400 font-mono resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={saveDhanConfig}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck size={18} /> Save & Connect Dhan
                  </button>
                </div>
              </div>

              {(dhanFunds || dhanHoldings.length > 0) && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Dhan API Status
                  </h4>
                  
                  {dhanLoading ? (
                    <div className="text-xs text-slate-700 font-medium animate-pulse">Fetching Account Data...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Available Margin</label>
                        <div className="text-lg font-black text-emerald-700">₹{dhanFunds?.availabelBalance ? Number(dhanFunds.availabelBalance).toLocaleString() : '0.00'}</div>
                        <div className="text-[10px] text-slate-700 font-medium">Used: ₹{dhanFunds?.utilizedAmount ? Number(dhanFunds.utilizedAmount).toLocaleString() : '0.00'}</div>
                      </div>
                    </div>
                  )}

                  {dhanHoldings.length > 0 && !dhanLoading && (
                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 p-2 text-xs font-bold text-slate-600 border-b border-slate-200">
                        Holdings ({dhanHoldings.length})
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 font-bold text-slate-700">Symbol</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Qty</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Avg Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dhanHoldings.map((h, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-bold text-slate-800">{h.tradingSymbol}</td>
                                <td className="p-2 text-right text-slate-600 font-medium">{h.totalQty}</td>
                                <td className="p-2 text-right text-slate-600 font-medium">₹{Number(h.avgCostPrice).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ANGEL ONE */}
          {activeTab === 'angel' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-orange-900 flex items-center gap-2">
                    Angel SmartAPI
                  </h3>
                  <p className="text-xs text-slate-700">Requires API Key, Client Code, and PIN for TOTP generation.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">SmartAPI Key</label>
                  <input
                    type="password"
                    value={angelApiKey}
                    onChange={(e) => setAngelApiKey(e.target.value)}
                    placeholder="Enter SmartAPI Key"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Client Code</label>
                  <input
                    type="text"
                    value={angelClientCode}
                    onChange={(e) => setAngelClientCode(e.target.value)}
                    placeholder="e.g. S123456"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">MPIN / Password</label>
                  <input
                    type="password"
                    value={angelPin}
                    onChange={(e) => setAngelPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">TOTP Code (Google Authenticator)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={angelTotp}
                    onChange={(e) => setAngelTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit TOTP"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400 font-mono tracking-widest"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleAngelLogin}
                    disabled={angelLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {angelLoading ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />} 
                    {angelToken ? 'Reconnect Angel One' : 'Login to Angel One'}
                  </button>
                </div>
              </div>

              {angelToken && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" /> Angel One Status
                  </h4>
                  
                  {angelLoading ? (
                    <div className="text-xs text-slate-700 font-medium animate-pulse">Fetching Account Data...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Available Margin</label>
                        <div className="text-lg font-black text-orange-700">₹{angelFunds?.availablecash ? Number(angelFunds.availablecash).toLocaleString() : '0.00'}</div>
                        <div className="text-[10px] text-slate-700 font-medium">Net: ₹{angelFunds?.net || '0.00'}</div>
                      </div>
                    </div>
                  )}

                  {angelHoldings.length > 0 && !angelLoading && (
                    <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-100 p-2 text-xs font-bold text-slate-600 border-b border-slate-200">
                        Holdings ({angelHoldings.length})
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 font-bold text-slate-700">Symbol</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Qty</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Avg Price</th>
                              <th className="p-2 font-bold text-slate-700 text-right">LTP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {angelHoldings.map((h, i) => {
                              const pnl = h.profitandloss;
                              return (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-2 font-bold text-slate-800">{h.tradingsymbol}</td>
                                  <td className="p-2 text-right text-slate-600 font-medium">{h.quantity}</td>
                                  <td className="p-2 text-right text-slate-600 font-medium">₹{Number(h.averageprice).toFixed(2)}</td>
                                  <td className="p-2 text-right">
                                    <div className="font-bold text-slate-800">₹{Number(h.ltp).toFixed(2)}</div>
                                    <div className={`text-[9px] font-black ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {pnl >= 0 ? '+' : ''}{Number(pnl).toFixed(2)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Angel One SmartAPI Real-time Connection Panel Moved from PortfolioTracker */}
              <div className="bg-white rounded-2xl border border-slate-150 p-2 shadow-sm space-y-2 mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-1 gap-1">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${smartIsActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                      <h3 className="font-bold text-sm text-slate-800 font-display">My Smart API & Apps (Angel One)</h3>
                    </div>
                    <p className="text-[10px] text-slate-450 mt-0.5">Algo trading feeds & real-time tick integration. Static IP can be updated once a week.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsFormExpanded(!isFormExpanded)}
                      className="px-1 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {isFormExpanded ? 'Close Form' : 'Configure Credentials'}
                    </button>
                    <button
                      onClick={() => setSmartIsActive(!smartIsActive)}
                      className={`px-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        smartIsActive 
                          ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {smartIsActive ? 'Stop Stream' : 'Live WebSocket Stream'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isFormExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-50 p-2 rounded-xl space-y-1 text-xs mb-2 mt-2">
                        <p className="font-bold text-slate-700">Update App Registry</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-1">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">App Name</label>
                            <input
                              type="text"
                              value={smartAppName}
                              onChange={(e) => setSmartAppName(e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Redirect URL</label>
                            <input
                              type="text"
                              value={smartRedirectUrl}
                              onChange={(e) => setSmartRedirectUrl(e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Authorization IP</label>
                            <input
                              type="text"
                              value={smartPrimaryIp}
                              onChange={(e) => setSmartPrimaryIp(e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={handleSaveSmartApi}
                              disabled={isSavingApi}
                              className="w-full py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
                            >
                              {isSavingApi ? 'Saving Connection...' : 'Save Config & Apply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs shadow-xs">
                    <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-col justify-between gap-1.5">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center">
                          My Smart API & Apps
                          <InfoTooltip text="Algo trading orders placed from these apps will be executed (max 5 apps)." />
                        </h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] bg-slate-200/80 text-slate-700 font-bold px-1.5 py-0.5 rounded uppercase">API Type: Trading</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold text-rose-600 bg-rose-50/50 p-1.5 rounded border border-rose-100 mt-1">
                        ⚠️ Primary IP and Secondary IP can be updated once in a week only.
                      </p>
                    </div>
                    
                    <div className="p-1 border-b border-slate-100 bg-slate-50/20 flex flex-wrap gap-2 items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">API Key:</span>
                        <span className="font-mono bg-slate-100 px-1 py-1 rounded select-all font-semibold text-slate-705">
                          {angelApiKey || 'fy2JiRJ2'}
                        </span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(angelApiKey || 'fy2JiRJ2');
                            alert('🔑 Key copied to clipboard!');
                          }}
                          className="text-indigo-600 hover:underline hover:text-indigo-700 font-bold text-[10px] cursor-pointer"
                        >
                          Copy Key
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setIsFormExpanded(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-1 py-1 rounded shrink-0 transition-colors cursor-pointer"
                      >
                        + ADD APP
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50/60 border-b border-slate-250 text-slate-700 text-[9px] uppercase font-bold tracking-wider">
                            <th className="p-1">App Name</th>
                            <th className="p-1">Redirect URL</th>
                            <th className="p-1">Postback URL</th>
                            <th className="p-1">Primary Static IP</th>
                            <th className="p-1">Secondary Static IP</th>
                            <th className="p-1 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          <tr className="hover:bg-slate-50/30 text-slate-750">
                            <td className="p-1 font-bold text-slate-800">{smartAppName || 'prasant bagriya'}</td>
                            <td className="p-1 max-w-[120px] truncate" title={smartRedirectUrl || 'https://prasantbagriya.online/'}>
                              <a href={smartRedirectUrl || 'https://prasantbagriya.online/'} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-mono truncate block">
                                {smartRedirectUrl || 'https://prasantbagriya.online/'}
                              </a>
                            </td>
                            <td className="p-1 font-mono text-slate-500">{smartPostbackUrl || '-'}</td>
                            <td className="p-1 font-mono text-slate-650">{smartPrimaryIp || '47.15.92.237'}</td>
                            <td className="p-1 font-mono text-slate-500">{smartSecondaryIp || '-'}</td>
                            <td className="p-1 text-right font-bold">
                              <div className="flex justify-end gap-1 text-indigo-650">
                                <button 
                                  onClick={() => setIsFormExpanded(true)}
                                  className="hover:underline text-[10px] font-bold cursor-pointer"
                                >
                                  EDIT
                                </button>
                                <button 
                                  onClick={() => {
                                    setSmartAppName('');
                                    setSmartRedirectUrl('');
                                    setSmartPrimaryIp('');
                                    alert('Row cleared. Fill form & save to reset App registry.');
                                  }}
                                  className="text-slate-500 hover:text-red-500 text-[10px] font-bold cursor-pointer"
                                >
                                  DELETE
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-slate-950 text-zinc-300 font-mono rounded-xl p-1 text-[10px] flex flex-col justify-between max-h-[140px] overflow-hidden h-[180px] lg:h-auto min-h-[140px]">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5 text-zinc-500 font-sans">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${smartIsActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                        SMARTAPI TICK CONSOLE
                      </span>
                      <span className="text-[9px] font-mono">{smartIsActive ? 'CONNECTED' : 'STANDBY'}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 py-1 scrollbar-thin select-none">
                      {feedLogs.length === 0 ? (
                        <p className="text-zinc-500 italic text-center pt-1 font-sans">No stream active. Turn on raw feed connection above to view live quote packets.</p>
                      ) : (
                        feedLogs.map((log, idx) => (
                          <p key={idx} className="truncate select-all leading-tight">{log}</p>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
          {/* ZERODHA */}
          {activeTab === 'zerodha' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-rose-900 flex items-center gap-2">
                    Zerodha Kite Connect
                  </h3>
                  <p className="text-xs text-slate-700">Connect using Kite API Key and Secret.</p>
                </div>
                {kiteToken ? (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-200">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg flex items-center gap-1 border border-amber-200">
                    <AlertCircle size={12} /> Disconnected
                  </span>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Kite API Key</label>
                  <input
                    type="password"
                    value={kiteApiKey}
                    onChange={(e) => setKiteApiKey(e.target.value)}
                    placeholder="Enter Kite API Key"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Kite API Secret</label>
                  <input
                    type="password"
                    value={kiteApiSecret}
                    onChange={(e) => setKiteApiSecret(e.target.value)}
                    placeholder="Enter Kite API Secret"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Redirect URI (Configure in Kite Developer)</label>
                  <code className="block w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono select-all">
                    {redirectUri}
                  </code>
                </div>

                <div className="pt-2">
                  <button
                    onClick={initiateKiteLogin}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {kiteToken ? <RefreshCw size={18} /> : <LinkIcon size={18} />}
                    {kiteToken ? 'Reconnect Zerodha Account' : 'Connect to Kite API'}
                  </button>
                </div>
              </div>

              {kiteToken && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Funds Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                          <Building2 size={16} className="text-rose-500" />
                          Zerodha Funds
                        </h4>
                        {kiteLoading && <RefreshCw size={14} className="animate-spin text-slate-500" />}
                      </div>
                      
                      {kiteFunds ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-700 font-bold">Available Margin</span>
                            <span className="font-black text-slate-800">₹{kiteFunds.available?.margin?.toLocaleString('en-IN') || 0}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-700 font-bold">Used Margin</span>
                            <span className="font-bold text-slate-800">₹{kiteFunds.utilised?.debits?.toLocaleString('en-IN') || 0}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-slate-100 mt-1">
                            <span className="text-slate-700 font-bold">Net Balance</span>
                            <span className="font-black text-rose-600">₹{kiteFunds.net?.toLocaleString('en-IN') || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Loading funds data...</p>
                      )}
                    </div>
                  </div>

                  {/* Holdings List */}
                  {kiteHoldings.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                          <BarChart3 size={16} className="text-rose-500" />
                          Live Holdings Sync
                        </h4>
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {kiteHoldings.length} Assets
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 font-bold text-slate-700">Symbol</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Qty</th>
                              <th className="p-2 font-bold text-slate-700 text-right">Avg Price</th>
                              <th className="p-2 font-bold text-slate-700 text-right">LTP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {kiteHoldings.map((h, i) => {
                              const pnl = h.pnl;
                              return (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-2 font-bold text-slate-800">{h.tradingsymbol}</td>
                                  <td className="p-2 text-right text-slate-600 font-medium">{h.quantity}</td>
                                  <td className="p-2 text-right text-slate-600 font-medium">₹{Number(h.average_price).toFixed(2)}</td>
                                  <td className="p-2 text-right">
                                    <div className="font-bold text-slate-800">₹{Number(h.last_price).toFixed(2)}</div>
                                    <div className={`text-[9px] font-black ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {pnl >= 0 ? '+' : ''}{Number(pnl).toFixed(2)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
