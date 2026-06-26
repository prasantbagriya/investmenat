import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { proxyFetch } from '../utils/proxyFetch';
import { ArrowLeft, Maximize, Minimize, RefreshCw, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

export default function StockTerminal() {
  const upstoxToken = localStorage.getItem('upstox_access_token');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [symbol, setSymbol] = useState('NSE_EQ|INE002A01018'); // Reliance by default
  const [inputSymbol, setInputSymbol] = useState('NSE_EQ|INE002A01018');
  const [interval, setInterval] = useState('1minute');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundamentals, setFundamentals] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize Lightweight Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#334155', // slate-700
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#cbd5e1',
      },
      timeScale: {
        borderColor: '#cbd5e1',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  const loadChartData = async () => {
    if (!upstoxToken || !symbol) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch historical data
      const res = await proxyFetch(`/api/upstox/historical-data?instrument_key=${encodeURIComponent(symbol)}`, {
        headers: { 'Authorization': `Bearer ${upstoxToken}` }
      });
      const data = await res.json();
      
      if (data.data && data.data.candles) {
        // Upstox historical candles format: [ timestamp, open, high, low, close, volume, OI ]
        const formattedData = data.data.candles.map((c: any) => {
          // Parse the ISO date string to a unix timestamp
          const date = new Date(c[0]);
          // Lightweight charts needs timestamp in seconds (Unix time)
          const time = date.getTime() / 1000;
          return {
            time: time as any,
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4])
          };
        }).reverse(); // Upstox returns newest first, lightweight charts needs oldest first

        candlestickSeriesRef.current?.setData(formattedData);
        chartRef.current?.timeScale().fitContent();
      } else {
        throw new Error("No chart data available for this symbol.");
      }

      // Fetch fundamentals and quote in parallel
      const [fundRes, quoteRes] = await Promise.all([
        proxyFetch(`/api/upstox/fundamentals?symbol=${encodeURIComponent(symbol)}`, { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
        proxyFetch(`/api/upstox/market-quote?symbol=${encodeURIComponent(symbol)}`, { headers: { 'Authorization': `Bearer ${upstoxToken}` } })
      ]);

      if (fundRes.ok) {
        const fData = await fundRes.json();
        if (fData.data) {
           // Get the first key's data
           const key = Object.keys(fData.data)[0];
           setFundamentals(fData.data[key]);
        }
      }
      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        if (qData.data) {
           const key = Object.keys(qData.data)[0];
           setQuote(qData.data[key]);
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (upstoxToken && candlestickSeriesRef.current) {
      loadChartData();
    }
  }, [upstoxToken, symbol]);

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50' : 'h-[calc(100vh-80px)]'}`}>
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="text-indigo-600" size={24} />
            <h1 className="font-black text-slate-900 tracking-tight text-xl">Stock Terminal</h1>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          
          <form 
            onSubmit={(e) => { e.preventDefault(); setSymbol(inputSymbol); }}
            className="flex items-center"
          >
            <input 
              type="text" 
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value)}
              placeholder="e.g. NSE_EQ|INE002A01018"
              className="bg-slate-100 border border-slate-200 rounded-l-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded-r-lg font-bold text-sm hover:bg-indigo-700 transition-colors">
              Load
            </button>
          </form>
          
          {loading && <span className="text-xs text-indigo-500 font-bold animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Loading data...</span>}
          {error && <span className="text-xs text-rose-500 font-bold">{error}</span>}
        </div>
        
        <div className="flex items-center gap-4">
          {quote && (
            <div className="text-right mr-4">
              <div className="text-lg font-black text-slate-900 font-mono flex items-center gap-2">
                ₹{quote.last_price?.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                <span className={`text-xs font-bold flex items-center ${quote.net_change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {quote.net_change >= 0 ? <TrendingUp size={14} className="mr-0.5" /> : <TrendingDown size={14} className="mr-0.5" />}
                  {quote.net_change > 0 ? '+' : ''}{quote.net_change}
                </span>
              </div>
            </div>
          )}
          <button 
            onClick={toggleFullscreen}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 bg-white relative">
          <div ref={chartContainerRef} className="absolute inset-0" />
        </div>

        {/* Fundamentals Sidebar */}
        <div className="w-80 bg-slate-50 border-l border-slate-200 overflow-y-auto flex flex-col shadow-inner">
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Company Overview</h2>
            <h3 className="font-bold text-slate-900 break-all text-sm leading-tight">
              {fundamentals?.company_name || symbol.split('|')[1]}
            </h3>
          </div>
          
          <div className="p-4 space-y-6">
            {fundamentals ? (
              <>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Valuation Metrics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5">P/E Ratio</p>
                      <p className="font-mono font-bold text-slate-800">{fundamentals.pe ? fundamentals.pe.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5">P/B Ratio</p>
                      <p className="font-mono font-bold text-slate-800">{fundamentals.pb ? fundamentals.pb.toFixed(2) : 'N/A'}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5">Dividend Yield</p>
                      <p className="font-mono font-bold text-slate-800">{fundamentals.dividend_yield ? fundamentals.dividend_yield.toFixed(2) + '%' : 'N/A'}</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-[9px] text-slate-500 font-bold mb-0.5">EPS (TTM)</p>
                      <p className="font-mono font-bold text-slate-800">{fundamentals.eps_ttm ? '₹' + fundamentals.eps_ttm.toFixed(2) : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">52 Week Range</h4>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold">52W Low</p>
                        <p className="font-mono font-bold text-rose-600">₹{fundamentals.fifty_two_week_low}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold">52W High</p>
                        <p className="font-mono font-bold text-emerald-600">₹{fundamentals.fifty_two_week_high}</p>
                      </div>
                    </div>
                    {quote?.last_price && fundamentals.fifty_two_week_low && fundamentals.fifty_two_week_high && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                        <div 
                          className="absolute h-full bg-indigo-500 rounded-full" 
                          style={{
                            left: '0%', 
                            width: `${Math.max(0, Math.min(100, ((quote.last_price - fundamentals.fifty_two_week_low) / (fundamentals.fifty_two_week_high - fundamentals.fifty_two_week_low)) * 100))}%`
                          }} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Financials</h4>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                    <div className="flex justify-between p-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Market Cap</span>
                      <span className="font-mono font-bold text-slate-800">{fundamentals.mcap ? `₹${(fundamentals.mcap / 10000000).toFixed(2)} Cr` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">ROE</span>
                      <span className="font-mono font-bold text-slate-800">{fundamentals.roe ? fundamentals.roe.toFixed(2) + '%' : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">ROCE</span>
                      <span className="font-mono font-bold text-slate-800">{fundamentals.roce ? fundamentals.roce.toFixed(2) + '%' : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span className="text-slate-500 font-medium">Book Value</span>
                      <span className="font-mono font-bold text-slate-800">{fundamentals.book_value ? `₹${fundamentals.book_value.toFixed(2)}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 text-xs py-8">
                {loading ? 'Loading fundamentals...' : 'No fundamentals data available.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
