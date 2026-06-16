import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import TradeExecutionModal from './TradeExecutionModal';

interface MarketQuote {
  instrument_token: string;
  symbol: string;
  name: string;
  last_price: number;
  net_change: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
}

export default function MarketView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [instrumentKey, setInstrumentKey] = useState('NSE_INDEX|Nifty 50');
  const [quoteData, setQuoteData] = useState<MarketQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  
  const [news, setNews] = useState<any[]>([]);
  const [fundamentals, setFundamentals] = useState<any | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  
  const [expiryDate, setExpiryDate] = useState('');
  const [optionChainData, setOptionChainData] = useState<any[]>([]);
  const [loadingChain, setLoadingChain] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  const upstoxToken = localStorage.getItem('upstox_access_token');

  const fetchQuote = async (key: string) => {
    if (!upstoxToken) {
      setErrorMsg("Please connect Upstox first in the Broker Connect tab.");
      return;
    }
    setLoadingQuote(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/upstox/market-quote?symbol=${encodeURIComponent(key)}`, {
        headers: { 'Authorization': `Bearer ${upstoxToken}` }
      });
      const data = await res.json();
      if (data.data) {
        const itemKeys = Object.keys(data.data);
        if (itemKeys.length > 0) {
          const q = data.data[itemKeys[0]];
          setQuoteData({
            instrument_token: q.instrument_token,
            symbol: q.symbol,
            name: q.symbol,
            last_price: q.last_price,
            net_change: q.net_change,
            open: q.ohlc?.open,
            high: q.ohlc?.high,
            low: q.ohlc?.low,
            close: q.ohlc?.close,
            volume: q.volume,
            lower_circuit_limit: q.lower_circuit_limit,
            upper_circuit_limit: q.upper_circuit_limit
          });
        } else {
          setErrorMsg("Symbol not found.");
        }
      } else {
        throw new Error(data.error || "Failed to fetch quote");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingQuote(false);
    }
  };

  const fetchOptionChain = async () => {
    if (!upstoxToken || !instrumentKey || !expiryDate) return;
    setLoadingChain(true);
    try {
      const res = await fetch(`/api/upstox/option-chain?instrument_key=${encodeURIComponent(instrumentKey)}&expiry_date=${encodeURIComponent(expiryDate)}`, {
        headers: { 'Authorization': `Bearer ${upstoxToken}` }
      });
      const data = await res.json();
      if (data.data) {
        setOptionChainData(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch option chain");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoadingChain(false);
    }
  };

  const fetchNewsAndFundamentals = async (key: string) => {
    if (!upstoxToken) return;
    setLoadingExtra(true);
    try {
      const [newsRes, fundRes, histRes] = await Promise.all([
        fetch(`/api/upstox/news?symbol=${encodeURIComponent(key)}`, { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
        fetch(`/api/upstox/fundamentals?symbol=${encodeURIComponent(key)}`, { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
        fetch(`/api/upstox/historical-data?instrument_key=${encodeURIComponent(key)}`, { headers: { 'Authorization': `Bearer ${upstoxToken}` } })
      ]);

      if (newsRes.ok) {
        const nData = await newsRes.json();
        setNews(nData.data || []);
      }
      if (fundRes.ok) {
        const fData = await fundRes.json();
        setFundamentals(fData.data || null);
      }
      if (histRes.ok) {
        const hData = await histRes.json();
        if (hData.data && hData.data.candles) {
          // Format candles for Recharts
          const formatted = hData.data.candles.reverse().map((c: any) => ({
            time: new Date(c[0]).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            close: c[4]
          }));
          setHistoricalData(formatted);
        } else {
          setHistoricalData([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch news/fundamentals:", err);
    } finally {
      setLoadingExtra(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const key = searchQuery.includes('|') ? searchQuery : `NSE_EQ|${searchQuery.toUpperCase()}`;
      setInstrumentKey(key);
      fetchQuote(key);
      fetchNewsAndFundamentals(key);
    }
  };

  useEffect(() => {
    if (upstoxToken && instrumentKey) {
      fetchQuote(instrumentKey);
      fetchNewsAndFundamentals(instrumentKey);
    }
  }, []);

  return (
    <div className="space-y-4 font-sans animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={28} />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">Live Market Data</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1 ml-9">
            Powered by Upstox API. Real-time quotes and Option Chain.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 rounded-xl p-3 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Panel - Quote Search & Details */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Search Instrument Key</label>
              <div className="flex bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <input
                  type="text"
                  placeholder="e.g. NSE_EQ|RELIANCE or NSE_INDEX|Nifty 50"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent flex-1 p-2 text-xs outline-none"
                />
                <button type="submit" className="bg-slate-900 text-white p-2 hover:bg-slate-800 transition-colors cursor-pointer">
                  <Search size={14} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400">Prefix with NSE_EQ| or NSE_INDEX|</p>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100">
              {loadingQuote ? (
                <div className="text-center text-slate-400 py-4"><span className="animate-pulse">Fetching live quote...</span></div>
              ) : quoteData ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-bold text-slate-800 text-sm">{quoteData.symbol}</h2>
                      <p className="text-[10px] text-slate-400 font-mono break-all">{quoteData.instrument_token}</p>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-black font-mono text-slate-800">
                      ₹{quoteData.last_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs font-bold flex items-center gap-1 ${quoteData.net_change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {quoteData.net_change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {quoteData.net_change >= 0 ? '+' : ''}{quoteData.net_change?.toFixed(2)}
                      <span className="text-slate-400 font-normal">
                        ({((quoteData.net_change / quoteData.close) * 100).toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  {historicalData.length > 0 && (
                    <div className="h-32 mt-2 -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historicalData}>
                          <XAxis dataKey="time" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip 
                            contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            labelStyle={{ color: '#64748b', marginBottom: '2px' }}
                            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="close" 
                            stroke={quoteData.net_change >= 0 ? '#10b981' : '#f43f5e'} 
                            strokeWidth={2} 
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-50">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">Open</div>
                      <div className="font-mono text-slate-700 font-semibold">{quoteData.open?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">High</div>
                      <div className="font-mono text-slate-700 font-semibold">{quoteData.high?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">Low</div>
                      <div className="font-mono text-slate-700 font-semibold">{quoteData.low?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <div className="text-slate-400 font-bold uppercase tracking-wide">Prev Close</div>
                      <div className="font-mono text-slate-700 font-semibold">{quoteData.close?.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setTradeModalOpen(true)}
                      className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-extrabold text-sm py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                    >
                      EXECUTE TRADE
                    </button>
                  </div>

                  {/* Fundamentals */}
                  {fundamentals && (
                    <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                      <h3 className="text-xs font-bold text-indigo-900 mb-2">Fundamentals</h3>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500">Market Cap:</span>
                          <span className="font-bold ml-1 text-slate-800">{fundamentals.market_cap ? `₹${fundamentals.market_cap}Cr` : '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">P/E Ratio:</span>
                          <span className="font-bold ml-1 text-slate-800">{fundamentals.pe || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">52W High:</span>
                          <span className="font-bold ml-1 text-emerald-600">{fundamentals.high_52_week || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">52W Low:</span>
                          <span className="font-bold ml-1 text-rose-600">{fundamentals.low_52_week || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* News */}
                  {news && news.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-xs font-bold text-slate-800">Latest News</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {news.slice(0, 5).map((n, i) => (
                          <a key={i} href={n.link || '#'} target="_blank" rel="noreferrer" className="block p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors">
                            <p className="text-[10px] font-semibold text-slate-700 line-clamp-2">{n.headline || n.title}</p>
                            <span className="text-[9px] text-slate-400 mt-1 block">{n.source || 'Market News'}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-400 text-xs py-4">No quote loaded</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Option Chain */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden flex flex-col h-[500px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <ArrowLeftRight size={16} className="text-indigo-600" />
                Option Chain
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs p-1.5 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none flex-1"
                />
                <button
                  onClick={fetchOptionChain}
                  disabled={loadingChain || !expiryDate || !instrumentKey}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  {loadingChain ? 'Loading...' : 'Fetch Chain'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-100 rounded-lg">
              <table className="w-full text-[10px] text-center border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10 shadow-xs">
                  <tr>
                    <th colSpan={4} className="p-1 border-b border-r border-slate-200 text-emerald-700 font-black">CALLS (CE)</th>
                    <th className="p-1 border-b border-r border-slate-200 bg-slate-200/50">STRIKE</th>
                    <th colSpan={4} className="p-1 border-b border-slate-200 text-rose-700 font-black">PUTS (PE)</th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-500 font-bold tracking-wider">
                    <th className="p-1.5 border-r border-b border-slate-200">OI</th>
                    <th className="p-1.5 border-r border-b border-slate-200">Vol</th>
                    <th className="p-1.5 border-r border-b border-slate-200">LTP</th>
                    <th className="p-1.5 border-r border-b border-slate-200">Chng</th>
                    
                    <th className="p-1.5 border-r border-b border-slate-200 font-black text-slate-800 bg-slate-200/50">PRICE</th>
                    
                    <th className="p-1.5 border-r border-b border-slate-200">Chng</th>
                    <th className="p-1.5 border-r border-b border-slate-200">LTP</th>
                    <th className="p-1.5 border-r border-b border-slate-200">Vol</th>
                    <th className="p-1.5 border-b border-slate-200">OI</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {optionChainData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-slate-400">
                        {expiryDate ? "No chain data found for this expiry." : "Select expiry date and fetch."}
                      </td>
                    </tr>
                  ) : (
                    optionChainData.map((row: any, idx) => {
                      const ce = row.call_options;
                      const pe = row.put_options;
                      const strike = row.strike_price;
                      return (
                        <tr key={idx} className="hover:bg-indigo-50/30 border-b border-slate-100 font-mono">
                          <td className="p-1 border-r border-slate-100">{ce?.market_data?.oi || '-'}</td>
                          <td className="p-1 border-r border-slate-100">{ce?.market_data?.volume || '-'}</td>
                          <td className="p-1 border-r border-slate-100 font-bold text-emerald-600 bg-emerald-50/10">{ce?.market_data?.ltp || '-'}</td>
                          <td className={`p-1 border-r border-slate-200 ${(ce?.market_data?.net_change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {ce?.market_data?.net_change?.toFixed(2) || '-'}
                          </td>
                          
                          <td className="p-1 border-r border-slate-200 font-black text-slate-800 bg-slate-50">{strike}</td>
                          
                          <td className={`p-1 border-r border-slate-100 ${(pe?.market_data?.net_change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {pe?.market_data?.net_change?.toFixed(2) || '-'}
                          </td>
                          <td className="p-1 border-r border-slate-100 font-bold text-rose-600 bg-rose-50/10">{pe?.market_data?.ltp || '-'}</td>
                          <td className="p-1 border-r border-slate-100">{pe?.market_data?.volume || '-'}</td>
                          <td className="p-1">{pe?.market_data?.oi || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <TradeExecutionModal 
        isOpen={tradeModalOpen} 
        onClose={() => setTradeModalOpen(false)} 
        symbol={quoteData?.symbol || 'UNKNOWN'}
        ltp={quoteData?.last_price}
      />
    </div>
  );
}
