import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, BarChart2, Activity, PieChart, TrendingUp, Search, RefreshCw, Zap, Globe, AlertTriangle, ExternalLink, CheckCircle, ArrowLeft, List, Clock, LayoutGrid, Home, CalendarDays, Building2, Newspaper } from 'lucide-react';
import toast from 'react-hot-toast';
import AdvancedChartWidget from './charts/AdvancedChartWidget';
import OptionChainChart from './charts/OptionChainChart';
import PortfolioDonutChart from './charts/PortfolioDonutChart';
import MarketHeatmap from './charts/MarketHeatmap';
import PLChart from './charts/PLChart';
import type { Holding, ScheduledTask, UserSettings } from '../types';
import UpstoxOrderTicket from './UpstoxOrderTicket';
import FundamentalsWidget from './charts/FundamentalsWidget';
import EconomicCalendarWidget from './charts/EconomicCalendarWidget';
import NewsWidget from './charts/NewsWidget';
import { upstoxApi } from '../services/upstoxApi';

type TabId = 'dashboard' | 'candlestick' | 'options' | 'portfolio' | 'heatmap' | 'pnl' | 'order' | 'fundamentals' | 'calendar' | 'news' | 'kline';

const TABS = [
  { id: 'candlestick' as TabId, label: 'Historical Chart', icon: LineChart, color: 'text-blue-500', desc: 'View detailed candlestick patterns and technical analysis.' },
  { id: 'fundamentals' as TabId, label: 'Fundamental Details', icon: Building2, color: 'text-cyan-500', desc: 'View company profile, financials, and key metrics.' },
  { id: 'calendar' as TabId, label: 'Economic Calendar', icon: CalendarDays, color: 'text-rose-500', desc: 'Track global economic events and indicators.' },
  { id: 'news' as TabId, label: 'Market News', icon: Newspaper, color: 'text-purple-500', desc: 'Get the latest top stories and market news globally.' },
  { id: 'options' as TabId, label: 'Option Chain', icon: BarChart2, color: 'text-indigo-500', desc: 'Analyze strike prices, open interest, and LTP for options.' },
  { id: 'order' as TabId, label: 'Order Execution', icon: Zap, color: 'text-purple-500', desc: 'Place buy and sell orders directly to your Upstox account.' },
  { id: 'portfolio' as TabId, label: 'Portfolio Analytics', icon: PieChart, color: 'text-emerald-500', desc: 'Visualize your holdings distribution and exposure.' },
  { id: 'heatmap' as TabId, label: 'Market Heatmap', icon: Globe, color: 'text-orange-500', desc: 'Spot top gainers and losers in the market at a glance.' },
  { id: 'pnl' as TabId, label: 'P&L Tracker', icon: TrendingUp, color: 'text-yellow-500', desc: 'Track your realized and unrealized profit & loss over time.' },
  { id: 'kline' as TabId, label: 'Advanced Kline Chart', icon: Activity, color: 'text-fuchsia-500', desc: 'New isolated workspace with persistent drawings and indicators.' },
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

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'greater_than' | 'less_than';
  active: boolean;
}

interface ResearchTerminalProps {
  userSettings?: UserSettings | null;
  onUpdateSettings?: (settings: Partial<UserSettings>) => void;
  livePrices?: any;
}

export default function ResearchTerminal({ userSettings, onUpdateSettings, livePrices = {} }: ResearchTerminalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [optionChainData, setOptionChainData] = useState<any[]>([]);
  const [portfolioData, setPortfolioData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [plData, setPlData] = useState<any[]>([]);
  const [marketQuote, setMarketQuote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [instrumentKey, setInstrumentKey] = useState(userSettings?.researchTerminal?.lastInstrumentKey || 'NSE_EQ|INE002A01018'); // Reliance by default
  const [inputKey, setInputKey] = useState(userSettings?.researchTerminal?.lastInputKey || 'NSE_EQ|INE002A01018');
  const [interval, setIntervalVal] = useState('day');
  const [expiryDate, setExpiryDate] = useState('2026-07-23'); // Default to a valid Thursday expiry
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNewsSidebar, setShowNewsSidebar] = useState(false);

  // New States for Multi-Chart & Watchlist
  const [chartLayout, setChartLayout] = useState<'1' | 'split-v' | 'split-h' | 'grid-4' | 'grid-8'>('1');
  const [chartSymbols, setChartSymbols] = useState<string[]>(() => {
    if (userSettings?.researchTerminal?.tvChartSymbolsV3) {
      return userSettings.researchTerminal.tvChartSymbolsV3;
    }
    return [
      'TVC:GOLD', // Default to Gold
      'NSE_EQ|INE040A01034', // HDFC Bank
      'NSE_EQ|INE467B01029', // TCS
      'NSE_EQ|INE009A01021', // Infosys
      'NSE_EQ|INE090A01021', // ICICI Bank
      'NSE_EQ|INE062A01020', // SBI
      'NSE_EQ|INE075A01022', // Wipro
      'NSE_EQ|INE112A01023'  // Bajaj Finance
    ];
  });
  const [activeChartIndex, setActiveChartIndex] = useState<number>(0);
  const [activeSidebar, setActiveSidebar] = useState<'watchlist' | 'alerts' | 'layout' | null>('watchlist');
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 64px * 4 = 256px
  const isDraggingSidebar = useRef(false);

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('tv_price_alerts') || '[]');
    } catch { return []; }
  });
  
  const [tvWatchlistSymbols, setTvWatchlistSymbols] = useState<string[]>(() => {
    if (userSettings?.researchTerminal?.tvNativeWatchlist) {
      return userSettings.researchTerminal.tvNativeWatchlist;
    }
    try {
      const saved = localStorage.getItem('tv_native_watchlist');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['OANDA:XAUUSD'];
  });

  // Re-sync if userSettings change from cloud
  useEffect(() => {
    if (userSettings?.researchTerminal) {
      if (userSettings.researchTerminal.tvNativeWatchlist) {
        setTvWatchlistSymbols(userSettings.researchTerminal.tvNativeWatchlist);
      }
      if (userSettings.researchTerminal.tvChartSymbolsV3) {
        setChartSymbols(userSettings.researchTerminal.tvChartSymbolsV3);
      }
    }
  }, [userSettings?.researchTerminal]);

  // Save watchlist to local storage or Firebase
  useEffect(() => {
    if (onUpdateSettings) {
      onUpdateSettings({
        researchTerminal: {
          ...(userSettings?.researchTerminal || {}),
          tvNativeWatchlist: tvWatchlistSymbols
        }
      });
    } else {
      localStorage.setItem('tv_native_watchlist', JSON.stringify(tvWatchlistSymbols));
    }
  }, [tvWatchlistSymbols]);

  // Save chart symbols and instrument key to local storage or Firebase
  useEffect(() => {
    if (onUpdateSettings) {
      onUpdateSettings({
        researchTerminal: {
          ...(userSettings?.researchTerminal || {}),
          tvChartSymbolsV3: chartSymbols
        }
      });
    } else {
      localStorage.setItem('tv_chart_symbols_v3', JSON.stringify(chartSymbols));
    }
  }, [chartSymbols]);

  useEffect(() => {
    if (onUpdateSettings) {
      onUpdateSettings({
        researchTerminal: {
          ...(userSettings?.researchTerminal || {}),
          lastInstrumentKey: instrumentKey
        }
      });
    } else {
      localStorage.setItem('last_instrument_key', instrumentKey);
    }
  }, [instrumentKey]);

  useEffect(() => {
    if (onUpdateSettings) {
      onUpdateSettings({
        researchTerminal: {
          ...(userSettings?.researchTerminal || {}),
          lastInputKey: inputKey
        }
      });
    } else {
      localStorage.setItem('last_input_key', inputKey);
    }
  }, [inputKey]);

  // Sidebar Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar.current) return;
      // e.clientX is from the left. The sidebar is on the right.
      // So width is window.innerWidth - e.clientX - 45px (for the thin right toolbar)
      const newWidth = window.innerWidth - e.clientX - 45;
      if (newWidth >= 200 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingSidebar.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Polling Alerts against Live Prices
  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return;
    
    let alertsTriggered = false;
    const updatedAlerts = alerts.map(alertItem => {
      if (!alertItem.active) return alertItem;
      
      const currentPriceObj = livePrices[alertItem.symbol];
      if (!currentPriceObj || !currentPriceObj.ltp) return alertItem;
      
      const currentPrice = currentPriceObj.ltp;
      let triggered = false;
      
      if (alertItem.condition === 'greater_than' && currentPrice >= alertItem.targetPrice) triggered = true;
      if (alertItem.condition === 'less_than' && currentPrice <= alertItem.targetPrice) triggered = true;
      
      if (triggered) {
        alertsTriggered = true;
        // Trigger browser notification or custom toast
        toast.error(`PRICE ALERT: ${alertItem.symbol} has crossed your target of ₹${alertItem.targetPrice}! (Current: ₹${currentPrice})`);
        return { ...alertItem, active: false };
      }
      return alertItem;
    });
    
    if (alertsTriggered) {
      setAlerts(updatedAlerts);
    }
  }, [livePrices, alerts]);

  // Check if real Upstox token is available
  const token = localStorage.getItem('upstox_access_token') || '';
  const isConnected = token.length > 10;

  // ─── Fetch Live Data ────────────────────────────────────────────  // ✨ Fetch Live Data ✨
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsMock(false);
    setErrorMsg(null);
    setMarketQuote(null);

    try {
      if (isConnected) {
        try {
          const resQuote = await upstoxApi.getMarketQuote(instrumentKey, token);
          if (resQuote?.data && resQuote.data[instrumentKey]) {
            setMarketQuote(resQuote.data[instrumentKey]);
          }
        } catch (err) {
          console.error('Market Quote Error', err);
        }
      }

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
            } else {
              setHistoricalData([]);
            }
            setIsMock(false);
          } catch (err: any) {
            setHistoricalData([]);
            setIsMock(false);
            setErrorMsg(`Historical Data Error: ${err.message}`);
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
            } else {
              setOptionChainData([]);
            }
            setIsMock(false);
          } catch (err: any) {
            setOptionChainData([]);
            setIsMock(false);
            setErrorMsg(`Option Chain Error: ${err.message}`);
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
            } else {
              setPortfolioData([]);
            }
            setIsMock(false);
          } catch (err: any) {
            setPortfolioData([]);
            setIsMock(false);
            setErrorMsg(`Portfolio Error: ${err.message}`);
            console.error('Portfolio Error:', err.message);
          }
        }
      }

      else if (activeTab === 'heatmap') {
        if (!isConnected) {
          setHeatmapData(generateMockHeatmapData());
          setIsMock(true);
        } else {
          try {
            // Use Market Quote for POPULAR_STOCKS as heatmap source since Movers API isn't publicly accessible via proxy
            const keys = POPULAR_STOCKS.map(s => s.key).join(',');
            const res = await upstoxApi.getMarketQuote(keys, token);
            const data = res?.data;
            if (data && Object.keys(data).length > 0) {
              const combined = Object.keys(data).map(key => {
                const quote = data[key];
                return {
                  name: POPULAR_STOCKS.find(s => s.key === key)?.label || key.split('|')[1],
                  change: quote.net_change || 0,
                  value: Math.abs(quote.last_price || 50)
                };
              });
              setHeatmapData(combined);
            } else {
              setHeatmapData([]);
            }
            setIsMock(false);
          } catch (err: any) {
            setHeatmapData([]);
            setIsMock(false);
            setErrorMsg(`Market Heatmap Error: ${err.message}`);
            console.error('Market Heatmap Error:', err.message);
          }
        }
      }

      else if (activeTab === 'pnl') {
        if (!isConnected) {
          setPlData(generateMockPLData());
          setIsMock(true);
        } else {
          try {
            const res = await upstoxApi.getTradePnl(token, 'EQ', '2425');
            const trades = res?.data?.trades_count > 0 ? res.data : null;
            if (trades) {
              // Group realized P&L by month
              const monthly: Record<string, number> = {};
              (res.data?.trade_wise_profit_and_loss || []).forEach((t: any) => {
                const month = t.scrip_open_date?.substring(0, 7) || 'Unknown';
                monthly[month] = (monthly[month] || 0) + (t.realized_pnl || 0);
              });
              const plArr = Object.entries(monthly).map(([date, realized]) => ({ date, realized }));
              setPlData(plArr);
            } else {
              setPlData([]);
            }
            setIsMock(false);
          } catch (err: any) {
            setPlData([]);
            setIsMock(false);
            setErrorMsg(`Trade P&L Error: ${err.message}`);
            console.error('Trade P&L Error:', err.message);
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
    const input = inputKey.trim();
    // Try to resolve friendly names to Upstox keys
    const match = POPULAR_STOCKS.find(s => 
      s.label.toLowerCase() === input.toLowerCase() || 
      s.key === input ||
      s.label.toLowerCase().includes(input.toLowerCase())
    );
    
    if (match) {
      setInstrumentKey(match.key);
      setInputKey(match.label); // Keep friendly name in the box
    } else {
      setInstrumentKey(input);
    }
  };

  const activeTabDef = TABS.find(t => t.id === activeTab) || TABS[0];
  const stockLabel = POPULAR_STOCKS.find(s => s.key === instrumentKey)?.label || instrumentKey.split('|')[1];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ─── BANNERS (Only visible on Dashboard) ───────────────────────────────── */}
      {activeTab === 'dashboard' && !isConnected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={15} className="shrink-0 text-amber-500" />
            <span className="text-xs font-semibold">
              Not connected to Upstox — Showing demo data.
            </span>
          </div>
          <a
            href="/brokers"
            className="shrink-0 flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink size={11} /> Connect Upstox
          </a>
        </div>
      )}

      {activeTab === 'dashboard' && isConnected && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-emerald-800">
            Upstox Connected — Live Market Data
          </span>
        </div>
      )}




      {activeTab === 'dashboard' ? (
        <div className="w-full mx-auto px-4 py-8 relative">
          <div className="absolute top-2 left-4 sm:top-8 sm:left-4 flex items-center gap-2">
            <button 
              onClick={() => window.dispatchEvent(new Event('open-nav-drawer'))}
              className="flex items-center justify-center p-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Home size={16} />
              <span className="text-sm font-bold hidden sm:inline">Main App</span>
            </button>
          </div>
          <div className="text-center mb-8 mt-12 sm:mt-0">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Research Dashboard</h2>
            <p className="text-slate-500 font-medium">Select a tool below to analyze the market and your portfolio.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'kline') {
                    navigate('/kline-test');
                  } else {
                    setActiveTab(tab.id);
                  }
                }}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all flex flex-col items-start text-left group cursor-pointer"
              >
                <div className={`p-3 rounded-lg bg-slate-50 mb-4 group-hover:bg-slate-100 transition-colors ${tab.color}`}>
                  <tab.icon size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">{tab.label}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{tab.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
        {/* ✨ LIVE MARKET QUOTE STRIP ✨ */}
        {marketQuote && (
          <div className="mx-4 mt-4 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center">
            <div>
              <p className="text-xs font-bold text-slate-400 ">LTP</p>
              <p className="text-xl font-black text-slate-800">₹{marketQuote.last_price}</p>
            </div>
            <div className={marketQuote.net_change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
              <p className="text-xs font-bold ">CHANGE</p>
              <p className="text-md font-bold">
                {marketQuote.net_change > 0 ? '+' : ''}{marketQuote.net_change} ({marketQuote.net_change > 0 ? '+' : ''}{((marketQuote.net_change / (marketQuote.last_price - marketQuote.net_change)) * 100).toFixed(2)}%)
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-400 ">VOLUME</p>
              <p className="text-md font-bold text-slate-700">{marketQuote.volume?.toLocaleString() || 0}</p>
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-slate-400 ">OPEN INTEREST</p>
              <p className="text-md font-bold text-slate-700">{marketQuote.oi?.toLocaleString() || 0}</p>
            </div>
          </div>
        )}

        <div className={activeTab === 'candlestick' ? 'fixed inset-0 z-[100] bg-white w-full h-[100dvh]' : 'w-full mx-auto px-2 sm:px-2 lg:px-2 mt-2 mb-8'}>
          {/* Quick Stock Chips + Interval Selector (Only when inside relevant tool) */}
          {(activeTab === 'options' || activeTab === 'fundamentals') && (
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 scrollbar-hide px-4 lg:px-0">
              {POPULAR_STOCKS.map(s => (
                <button
                  key={s.key}
                  onClick={() => { 
                    setInputKey(s.key); 
                    setInstrumentKey(s.key); 
                    const newCharts = [...chartSymbols];
                    newCharts[activeChartIndex] = s.key;
                    setChartSymbols(newCharts);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                    instrumentKey === s.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:shadow-md'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        <div className={`bg-white rounded-none border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5 ${activeTab === 'candlestick' ? 'h-full flex flex-col !border-none !ring-0 !rounded-none !bg-transparent' : ''}`}>
          {activeTab !== 'candlestick' && (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-4 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.dispatchEvent(new Event('open-nav-drawer'))}
                className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                title="Global Navigation"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                title="Back to Dashboard"
              >
                <ArrowLeft size={16} />
              </button>
              <div className={`p-2 rounded-xl bg-white border border-slate-100 ${activeTabDef.color}`}>
                <activeTabDef.icon size={16} />
              </div>
              <div className="flex items-center gap-3">
                <h3 className="font-black text-slate-900 text-sm leading-tight flex items-center gap-2">
                  {activeTabDef.label}
                  {(activeTab === 'options' || activeTab === 'fundamentals') && (
                    <span className="text-xs text-slate-500 font-mono font-medium">{stockLabel}</span>
                  )}
                </h3>
                {isConnected && (
                  <button 
                    onClick={() => { localStorage.removeItem('upstox_access_token'); window.location.reload(); }} 
                    className="ml-2 text-xs font-bold bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-200 hover:bg-red-100 transition-colors shadow-sm"
                  >
                    Disconnect Upstox
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {(activeTab === 'options' || activeTab === 'fundamentals') && (
                <form onSubmit={(e) => {
                  handleLoad(e);
                  const input = inputKey.trim();
                  const match = POPULAR_STOCKS.find(s => s.label.toLowerCase() === input.toLowerCase() || s.key === input || s.label.toLowerCase().includes(input.toLowerCase()));
                  const finalKey = match ? match.key : input;
                  const newCharts = [...chartSymbols];
                  newCharts[activeChartIndex] = finalKey;
                  setChartSymbols(newCharts);
                }} className="flex items-center bg-white p-1 border border-slate-100 rounded-lg shadow-sm w-full lg:w-[500px]">
                  <div className="relative flex-1 flex items-center min-w-[200px]">
                    <Search size={14} className="absolute left-3 text-slate-400" />
                    <input
                      type="text"
                      value={inputKey}
                      onChange={e => {
                        setInputKey(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => setShowSearchDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                      placeholder="Search NIFTY, Reliance..."
                      className="pl-8 pr-2 py-1.5 bg-transparent text-xs w-full focus:outline-none text-slate-800 placeholder-slate-400 font-medium"
                    />
                    
                    {/* Custom Autocomplete Dropdown */}
                    {showSearchDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                        {POPULAR_STOCKS.filter(s => s.label.toLowerCase().includes(inputKey.toLowerCase()) || s.key.toLowerCase().includes(inputKey.toLowerCase())).length > 0 ? (
                          POPULAR_STOCKS.filter(s => s.label.toLowerCase().includes(inputKey.toLowerCase()) || s.key.toLowerCase().includes(inputKey.toLowerCase())).map(s => (
                            <div 
                              key={s.key}
                              className="px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between transition-colors"
                              onMouseDown={() => {
                                setInputKey(s.label);
                                setInstrumentKey(s.key);
                                const newCharts = [...chartSymbols];
                                newCharts[activeChartIndex] = s.key;
                                setChartSymbols(newCharts);
                                setShowSearchDropdown(false);
                              }}
                            >
                              <span className="text-xs font-bold text-slate-800">{s.label}</span>
                              <span className="text-xs text-slate-400 font-mono px-1.5 py-0.5 bg-slate-100 rounded">{s.key.split('|')[0]}</span>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-xs text-slate-500 text-center">No related results found</div>
                        )}
                      </div>
                    )}
                  </div>

                  {activeTab === 'options' && (
                    <div className="border-l border-slate-200 pl-2 pr-1 hidden sm:block">
                      <input 
                        type="date"
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        className="px-1 py-1 bg-transparent text-xs focus:outline-none text-slate-600 font-semibold font-mono w-[110px] cursor-pointer"
                        title="Expiry Date"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-1 pr-1 py-1">
                    <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded-md hover:bg-black transition-all text-xs font-medium shadow-sm">
                      Search
                    </button>
                    <button type="button" onClick={() => setShowNewsSidebar(!showNewsSidebar)} className={`p-1.5 rounded-md transition-all ${showNewsSidebar ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`} title="Toggle News Sidebar">
                      <Newspaper size={14} />
                    </button>
                    <button type="button" onClick={fetchData} className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all" title="Refresh">
                      <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tool Content Wrapper */}
        <div className="flex-1 flex w-full overflow-hidden">
          <div className={`flex-1 flex flex-col min-w-0 ${activeTab === 'candlestick' ? 'h-full bg-slate-100' : 'bg-slate-50/30 p-0 sm:p-2'}`}>
          {activeTab === 'candlestick' && (
            <div className="flex-1 flex w-full h-full relative">
                <button 
                  onClick={() => setActiveTab('dashboard')} 
                  className="absolute bottom-4 left-2 z-[110] p-2 bg-white/80 hover:bg-white backdrop-blur-md rounded-lg shadow-md border border-slate-200 text-slate-700 transition-all flex items-center justify-center cursor-pointer"
                  title="Back to Dashboard"
                >
                  <ArrowLeft size={18} />
                </button>
                {/* Chart Grid Area */}
                <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden relative">
                   {/* Dynamic Grid */}
                   <div className={`w-full h-full ${
                      chartLayout === '1' ? 'flex' :
                      chartLayout === 'split-v' ? 'flex flex-row' :
                      chartLayout === 'split-h' ? 'flex flex-col' :
                      chartLayout === 'grid-8' ? 'grid grid-cols-4 grid-rows-2' :
                      'grid grid-cols-2 grid-rows-2'
                   }`}>
                      {Array.from({ length: chartLayout === '1' ? 1 : chartLayout === 'grid-4' ? 4 : chartLayout === 'grid-8' ? 8 : 2 }).map((_, i) => (
                         <div key={i} onClick={() => setActiveChartIndex(i)} className={`flex-1 relative border-0 transition-colors ${activeChartIndex === i ? 'z-0' : ''}`}>
                             <AdvancedChartWidget 
                               symbol={chartSymbols[i]} 
                               theme="light" 
                               widgetId={`tv_chart_slot_${i}`} 
                               chartLayout={chartLayout}
                               onLayoutChange={(layout: any) => setChartLayout(layout)}
                               isPrimary={i === 0}
                               watchlistSymbols={tvWatchlistSymbols}
                               onAddWatchlistSymbol={(sym: string) => {
                                 if (!tvWatchlistSymbols.includes(sym)) setTvWatchlistSymbols([sym, ...tvWatchlistSymbols]);
                               }}
                               onRemoveWatchlistSymbol={(sym: string) => {
                                 setTvWatchlistSymbols(tvWatchlistSymbols.filter(s => s !== sym));
                               }}
                               onSymbolChange={(sym: string) => {
                                 const newCharts = [...chartSymbols];
                                 newCharts[i] = sym;
                                 setChartSymbols(newCharts);
                               }}
                             />
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}
          {activeTab === 'options' && (
            <div className="flex-1 flex flex-col h-full w-full relative">
              {errorMsg ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 m-4 rounded-xl border border-red-100">
                  <AlertTriangle size={32} className="text-red-400 mb-3" />
                  <p className="text-sm font-bold text-slate-800">{errorMsg}</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-md">Try checking if the selected Expiry Date is a valid F&O expiry (like Thursday), or try clicking 'Disconnect Upstox' to reconnect.</p>
                </div>
              ) : optionChainData.length === 0 && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50 m-4 rounded-xl border border-slate-200">
                  <div className="text-slate-400 mb-2"><BarChart2 size={32} /></div>
                  <p className="text-sm font-bold text-slate-700">No Option Chain Data Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">Please ensure the selected date ({expiryDate}) is a valid expiry day for this symbol. Options only expire on specific days (like Thursdays for Nifty).</p>
                </div>
              ) : (
                <OptionChainChart data={optionChainData} theme="light" />
              )}
            </div>
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

          {activeTab === 'calendar' && (
             <div className="h-[700px] w-full relative">
                <EconomicCalendarWidget theme="light" />
             </div>
          )}
          {activeTab === 'news' && (
             <div className="flex-1 w-full relative min-h-[calc(100vh-200px)]">
                <NewsWidget theme="light" instrumentKey={instrumentKey} />
             </div>
          )}
          {activeTab === 'fundamentals' && (
             <div className="flex-1 w-full relative min-h-[calc(100vh-200px)]">
                <FundamentalsWidget instrumentKey={instrumentKey} />
             </div>
          )}
          {activeTab === 'order' && (
             <div className="flex justify-center items-center w-full min-h-[500px] py-12">
                <UpstoxOrderTicket initialSymbol={instrumentKey} />
             </div>
          )}
        </div>

        {/* News Sidebar */}
        {showNewsSidebar && (
          <div className="w-[350px] border-l border-slate-200 bg-white shadow-xl z-20 flex flex-col h-full overflow-hidden shrink-0">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Newspaper size={16} className="text-blue-600"/> Live News</h3>
              <button onClick={() => setShowNewsSidebar(false)} className="text-slate-400 hover:text-slate-800 p-1 hover:bg-slate-200 rounded font-bold text-xs">X</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NewsWidget theme="light" instrumentKey={instrumentKey} compact={true} />
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Stats */}
        {activeTab === 'heatmap' && heatmapData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Gainers', value: heatmapData.filter(s => s.change > 0).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Losers', value: heatmapData.filter(s => s.change < 0).length, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Unchanged', value: heatmapData.filter(s => s.change === 0).length, color: 'text-slate-500', bg: 'bg-slate-50' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-lg p-4 text-center border border-slate-100`}>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs font-bold text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      </>
    )}
    </div>
  );
}
