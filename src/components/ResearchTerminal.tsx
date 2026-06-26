import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, BarChart2, Activity, PieChart, TrendingUp, Search, RefreshCw, Zap, Globe, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import CandlestickChart from './charts/CandlestickChart';
import OptionChainChart from './charts/OptionChainChart';
import PortfolioDonutChart from './charts/PortfolioDonutChart';
import MarketHeatmap from './charts/MarketHeatmap';
import PLChart from './charts/PLChart';
import { upstoxApi } from '../services/upstoxApi';

type TabId = 'candlestick' | 'options' | 'portfolio' | 'heatmap' | 'pnl';

const TABS = [
  { id: 'candlestick' as TabId, label: 'Historical', icon: LineChart, color: 'text-blue-500' },
  { id: 'options' as TabId, label: 'Option Chain', icon: BarChart2, color: 'text-indigo-500' },
  { id: 'portfolio' as TabId, label: 'Portfolio', icon: PieChart, color: 'text-emerald-500' },
  { id: 'heatmap' as TabId, label: 'Heatmap', icon: Globe, color: 'text-orange-500' },
  { id: 'pnl' as TabId, label: 'P&L Tracker', icon: TrendingUp, color: 'text-yellow-500' },
];

const POPULAR_STOCKS = [
  { label: 'NIFTY 50', key: 'NSE_INDEX|Nifty 50' },
  { label: 'Reliance', key: 'NSE_EQ|INE002A01018' },
  { label: 'TCS', key: 'NSE_EQ|INE467B01029' },
  { label: 'Infosys', key: 'NSE_EQ|INE009A01021' },
  { label: 'HDFC Bank', key: 'NSE_EQ|INE040A01034' },
  { label: 'ICICI Bank', key: 'NSE_EQ|INE090A01021' },
  { label: 'Wipro', key: 'NSE_EQ|INE075A01022' },
  { label: 'SBI', key: 'NSE_EQ|INE062A01020' },
];

const INTERVALS = ['1minute', '5minute', '15minute', '30minute', '1hour', 'day', 'week', 'month'];

// ─── Mock Data Generators ──────────────────────────────────────────
function generateMockCandlesticks() {
  const data: any[] = [];
  let base = 2900;
  let time = new Date('2024-03-01T09:15:00').getTime();
  for (let i = 0; i < 120; i++) {
    const open = base + (Math.random() - 0.5) * 15;
    const close = open + (Math.random() - 0.5) * 25;
    const high = Math.max(open, close) + Math.random() * 8;
    const low = Math.min(open, close) - Math.random() * 8;
    data.push([new Date(time).toISOString(), +open.toFixed(2), +high.toFixed(2), +low.toFixed(2), +close.toFixed(2), Math.floor(Math.random() * 200000), 0]);
    time += 60000;
    base = close;
  }
  return data;
}

function generateMockOptionChain() {
  const data: any[] = [];
  let strike = 2800;
  for (let i = 0; i < 20; i++) {
    data.push({
      strike_price: strike,
      call_options: { market_data: { oi: Math.floor(Math.random() * 200000 + 10000), ltp: (Math.random() * 150 + 5).toFixed(2) } },
      put_options: { market_data: { oi: Math.floor(Math.random() * 200000 + 10000), ltp: (Math.random() * 150 + 5).toFixed(2) } }
    });
    strike += 20;
  }
  return data;
}

function generateMockHeatmapData() {
  return [
    { name: 'Reliance', change: 2.4, value: 80 }, { name: 'TCS', change: -0.8, value: 70 },
    { name: 'HDFC Bank', change: 1.2, value: 65 }, { name: 'Infosys', change: -2.1, value: 60 },
    { name: 'ICICI Bank', change: 3.1, value: 55 }, { name: 'SBI', change: -0.3, value: 50 },
    { name: 'Wipro', change: 0.9, value: 40 }, { name: 'Bajaj Finance', change: -3.5, value: 45 },
    { name: 'Maruti', change: 1.8, value: 35 }, { name: 'ONGC', change: -1.2, value: 30 },
    { name: 'Sun Pharma', change: 2.7, value: 38 }, { name: 'Adani Ports', change: -0.5, value: 28 },
    { name: 'HUL', change: 0.4, value: 42 }, { name: 'Nestle', change: -1.9, value: 25 },
    { name: 'Titan', change: 4.2, value: 32 }, { name: 'LTI', change: -2.8, value: 22 },
    { name: 'M&M', change: 1.5, value: 36 }, { name: 'UltraTech', change: -0.7, value: 29 },
  ];
}

function generateMockPLData() {
  const months = ['Oct 23', 'Nov 23', 'Dec 23', 'Jan 24', 'Feb 24', 'Mar 24', 'Apr 24', 'May 24', 'Jun 24'];
  return months.map(m => ({
    date: m,
    realized: (Math.random() - 0.35) * 20000,
    unrealized: (Math.random() - 0.4) * 10000
  }));
}

function generateMockPortfolio() {
  return [
    { name: 'Reliance Industries', currentValue: 85000, type: 'Large Cap' },
    { name: 'HDFC Bank', currentValue: 72000, type: 'Large Cap' },
    { name: 'TCS', currentValue: 65000, type: 'Large Cap' },
    { name: 'SBI Small Cap Fund', currentValue: 48000, type: 'Mutual Fund' },
    { name: 'Nifty 50 ETF', currentValue: 55000, type: 'ETF' },
    { name: 'Infosys', currentValue: 38000, type: 'Large Cap' },
    { name: 'Axis Small Cap', currentValue: 29000, type: 'Mutual Fund' },
    { name: 'ICICI Bank', currentValue: 41000, type: 'Large Cap' },
  ];
}

export default function ResearchTerminal() {
  const [activeTab, setActiveTab] = useState<TabId>('candlestick');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [optionChainData, setOptionChainData] = useState<any[]>([]);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [plData, setPlData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [instrumentKey, setInstrumentKey] = useState('NSE_EQ|INE002A01018');
  const [inputKey, setInputKey] = useState('NSE_EQ|INE002A01018');
  const [interval, setIntervalVal] = useState('day');
  const [expiryDate, setExpiryDate] = useState('2024-12-26');

  // Check if real Upstox token is available
  const token = localStorage.getItem('upstox_access_token') || '';
  const isConnected = token.length > 10;

  // ─── Fetch Live Data ────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsMock(false);

    try {
      if (activeTab === 'candlestick') {
        if (!isConnected) {
          setHistoricalData(generateMockCandlesticks());
          setIsMock(true);
        } else {
          try {
            const toDate = new Date().toISOString().split('T')[0];
            const fromDate = new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0];
            const res = await upstoxApi.getHistoricalData(instrumentKey, token, interval, toDate, fromDate);
            const candles = res?.data?.candles;
            if (candles && candles.length > 0) {
              setHistoricalData(candles);
              setIsMock(false);
            } else {
              setHistoricalData(generateMockCandlesticks());
              setIsMock(true);
            }
          } catch {
            setHistoricalData(generateMockCandlesticks());
            setIsMock(true);
          }
        }
      }

      else if (activeTab === 'options') {
        if (!isConnected) {
          setOptionChainData(generateMockOptionChain());
          setIsMock(true);
        } else {
          try {
            const res = await upstoxApi.getOptionChain(instrumentKey, expiryDate, token);
            const chainData = res?.data;
            if (chainData && chainData.length > 0) {
              setOptionChainData(chainData);
              setIsMock(false);
            } else {
              setOptionChainData(generateMockOptionChain());
              setIsMock(true);
            }
          } catch {
            setOptionChainData(generateMockOptionChain());
            setIsMock(true);
          }
        }
      }

      else if (activeTab === 'portfolio') {
        if (!isConnected) {
          setPortfolioData(generateMockPortfolio());
          setIsMock(true);
        } else {
          try {
            const res = await upstoxApi.getHoldings(token);
            const holdings = res?.data;
            if (holdings && holdings.length > 0) {
              const mapped = holdings.map((h: any) => ({
                name: h.trading_symbol || h.instrument_token,
                currentValue: h.last_price * h.quantity,
                type: h.exchange === 'NSE' ? 'Large Cap' : h.exchange
              }));
              setPortfolioData(mapped);
              setIsMock(false);
            } else {
              setPortfolioData(generateMockPortfolio());
              setIsMock(true);
            }
          } catch {
            setPortfolioData(generateMockPortfolio());
            setIsMock(true);
          }
        }
      }

      else if (activeTab === 'heatmap') {
        if (!isConnected) {
          setHeatmapData(generateMockHeatmapData());
          setIsMock(true);
        } else {
          try {
            const res = await upstoxApi.getMarketInfo(token, 'gainers', 'cash_leaders');
            const gainers = res?.data?.items || [];
            const losersRes = await upstoxApi.getMarketInfo(token, 'losers', 'cash_leaders');
            const losers = losersRes?.data?.items || [];
            const combined = [
              ...gainers.map((g: any) => ({ name: g.trading_symbol || g.name, change: g.net_change_percentage || 0, value: Math.abs(g.total_traded_value || 50) })),
              ...losers.map((l: any) => ({ name: l.trading_symbol || l.name, change: l.net_change_percentage || 0, value: Math.abs(l.total_traded_value || 50) }))
            ];
            if (combined.length > 0) {
              setHeatmapData(combined);
              setIsMock(false);
            } else {
              setHeatmapData(generateMockHeatmapData());
              setIsMock(true);
            }
          } catch {
            setHeatmapData(generateMockHeatmapData());
            setIsMock(true);
          }
        }
      }

      else if (activeTab === 'pnl') {
        if (!isConnected) {
          setPlData(generateMockPLData());
          setIsMock(true);
        } else {
          try {
            const res = await upstoxApi.getTradePnl(token, 'EQ', '2024-25');
            const trades = res?.data?.trades_count > 0 ? res.data : null;
            if (trades) {
              // Group realized P&L by month
              const monthly: Record<string, number> = {};
              (res.data?.trade_wise_profit_and_loss || []).forEach((t: any) => {
                const month = t.scrip_open_date?.substring(0, 7) || 'Unknown';
                monthly[month] = (monthly[month] || 0) + (t.realized_pnl || 0);
              });
              const plArr = Object.entries(monthly).map(([date, realized]) => ({ date, realized }));
              setPlData(plArr.length > 0 ? plArr : generateMockPLData());
              setIsMock(plArr.length === 0);
            } else {
              setPlData(generateMockPLData());
              setIsMock(true);
            }
          } catch {
            setPlData(generateMockPLData());
            setIsMock(true);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, instrumentKey, interval, token, expiryDate, isConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault();
    setInstrumentKey(inputKey.trim());
  };

  const activeTabDef = TABS.find(t => t.id === activeTab)!;
  const stockLabel = POPULAR_STOCKS.find(s => s.key === instrumentKey)?.label || instrumentKey.split('|')[1];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* ─── NOT CONNECTED BANNER ───────────────────────────────── */}
      {!isConnected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={15} className="shrink-0 text-amber-500" />
            <span className="text-xs font-semibold">
              Upstox se connected nahi hai — Demo data dikh raha hai.
            </span>
          </div>
          <a
            href="/brokers"
            className="shrink-0 flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink size={11} /> Upstox Connect Karo
          </a>
        </div>
      )}

      {/* ─── CONNECTED BANNER ───────────────────────────────────── */}
      {isConnected && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-emerald-800">
            Upstox Connected — Live Market Data
          </span>
        </div>
      )}

      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-lg leading-tight">Research Terminal</h1>
              <p className="text-xs text-slate-400 font-medium">
                {isConnected ? '🟢 Live Upstox Data' : '🟡 Demo Mode — Connect Upstox for Live Data'}
              </p>
            </div>
          </div>

          {/* Symbol Picker */}
          {(activeTab === 'candlestick' || activeTab === 'options') && (
            <form onSubmit={handleLoad} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  placeholder="NSE_EQ|INE002A01018"
                  className="pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <button type="submit" className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1">
                <Zap size={13} /> Load
              </button>
              <button type="button" onClick={fetchData} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </form>
          )}
        </div>

        {/* Quick Stock Chips + Interval Selector */}
        {(activeTab === 'candlestick' || activeTab === 'options') && (
          <div className="max-w-7xl mx-auto mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {POPULAR_STOCKS.map(s => (
              <button
                key={s.key}
                onClick={() => { setInputKey(s.key); setInstrumentKey(s.key); }}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                  instrumentKey === s.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {s.label}
              </button>
            ))}
            {activeTab === 'candlestick' && (
              <div className="ml-auto flex gap-1 shrink-0">
                {INTERVALS.map(iv => (
                  <button
                    key={iv}
                    onClick={() => setIntervalVal(iv)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      interval === iv ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {iv.replace('minute', 'm').replace('hour', 'h')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Tab Bar */}
        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-sm mb-4 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} className={activeTab === id ? 'text-white' : color} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Chart Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <activeTabDef.icon size={16} className={activeTabDef.color} />
              <span className="font-bold text-slate-800 text-sm">{activeTabDef.label}</span>
              {(activeTab === 'candlestick' || activeTab === 'options') && (
                <span className="text-xs text-slate-400 font-mono ml-1">{stockLabel}</span>
              )}
              {/* MOCK badge */}
              {isMock && (
                <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1">
                  DEMO
                </span>
              )}
              {!isMock && !isLoading && (
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider ml-1">
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" /> Fetching...
                </span>
              ) : (
                <span className={`text-[10px] font-bold flex items-center gap-1 ${isMock ? 'text-amber-500' : 'text-emerald-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMock ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                  {isMock ? 'Demo' : 'Live'}
                </span>
              )}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'candlestick' && (
              <CandlestickChart data={historicalData} instrumentName={stockLabel} theme="light" />
            )}
            {activeTab === 'options' && (
              <OptionChainChart data={optionChainData} theme="light" />
            )}
            {activeTab === 'portfolio' && (
              <PortfolioDonutChart holdings={portfolioData} theme="light" />
            )}
            {activeTab === 'heatmap' && (
              <MarketHeatmap stocks={heatmapData} title="NSE Top Movers" theme="light" />
            )}
            {activeTab === 'pnl' && (
              <PLChart data={plData} theme="light" />
            )}
          </div>
        </div>

        {/* Heatmap Stats */}
        {activeTab === 'heatmap' && heatmapData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Gainers', value: heatmapData.filter(s => s.change > 0).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Losers', value: heatmapData.filter(s => s.change < 0).length, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Unchanged', value: heatmapData.filter(s => s.change === 0).length, color: 'text-slate-500', bg: 'bg-slate-50' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 text-center border border-slate-100`}>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs font-bold text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom message */}
        {isMock && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800 font-semibold">
                Yeh demo data hai. Live Upstox data ke liye Broker Settings mein jaake connect karo.
              </p>
            </div>
            <a href="/brokers" className="shrink-0 text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 underline">
              Connect <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
