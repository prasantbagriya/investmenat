import React, { useEffect, useRef, memo, useState } from 'react';
import { LayoutGrid, ListPlus, X, Plus } from 'lucide-react';
import FundamentalsWidget from './FundamentalsWidget';
import EconomicCalendarWidget from './EconomicCalendarWidget';
import NewsWidget from './NewsWidget';

interface AdvancedChartWidgetProps {
  data?: any[];
  symbol?: string;
  theme?: 'light' | 'dark';
  chartLayout?: string;
  onLayoutChange?: (layout: string) => void;
  isPrimary?: boolean;
  watchlistSymbols?: string[];
  onAddWatchlistSymbol?: (symbol: string) => void;
  onRemoveWatchlistSymbol?: (symbol: string) => void;
  widgetId?: string;
  onSymbolChange?: (symbol: string) => void;
}

const AdvancedChartWidget = ({ 
  symbol = 'BSE:SENSEX', 
  theme = 'light',
  chartLayout = '1',
  onLayoutChange,
  isPrimary = true,
  watchlistSymbols = [],
  onAddWatchlistSymbol,
  onRemoveWatchlistSymbol,
  widgetId: externalWidgetId,
  onSymbolChange
}: AdvancedChartWidgetProps) => {
  const container = useRef<HTMLDivElement>(null);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showWatchlistMenu, setShowWatchlistMenu] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'news' | 'fundamentals' | 'calendar' | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const widgetId = externalWidgetId || `tradingview_adv_${isPrimary ? 'primary' : 'sec'}_default`;

  const getTVSymbol = (sym: string) => {
    let finalSym = sym?.trim() || '';
    if (!finalSym) return 'BSE:SENSEX';
    
    // Nifty should map to NSE:NIFTY, not BSE:SENSEX
    if (finalSym === 'NSE:NIFTY' || finalSym.toLowerCase().includes('nifty')) return 'NSE:NIFTY';
    if (finalSym.toLowerCase().includes('sensex')) return 'BSE:SENSEX';
    if (finalSym.toLowerCase().includes('banknifty')) return 'NSE:BANKNIFTY';
    
    if (finalSym.includes(':')) {
      return finalSym;
    }
    
    if (finalSym.includes('|')) {
       if (finalSym.includes('002A01018')) return 'BSE:RELIANCE';
       if (finalSym.includes('467B01029')) return 'BSE:TCS';
       if (finalSym.includes('009A01021')) return 'BSE:INFY';
       if (finalSym.includes('040A01034')) return 'BSE:HDFCBANK';
       if (finalSym.includes('090A01021')) return 'BSE:ICICIBANK';
       if (finalSym.includes('075A01022')) return 'BSE:WIPRO';
       if (finalSym.includes('062A01020')) return 'BSE:SBIN';
       if (finalSym.includes('112A01023')) return 'BSE:BAJFINANCE';
       return 'BSE:SENSEX';
    }

    if (!finalSym.includes(':') && (finalSym.toUpperCase().endsWith('USDT') || finalSym.toUpperCase().endsWith('BTC') || finalSym.toUpperCase().endsWith('ETH'))) {
      return `BINANCE:${finalSym.toUpperCase()}`;
    }

    return `BSE:${finalSym.toUpperCase().replace(/\s+/g, '')}`;
  };

  const tvSymbol = getTVSymbol(symbol);

  useEffect(() => {
    if (container.current) {
      container.current.innerHTML = '<div class="tradingview-widget-container__widget" style="height:calc(100% - 32px); width:100%"></div>';
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "${tvSymbol}",
        "interval": "D",
        "timezone": "Asia/Kolkata",
        "theme": "${theme}",
        "style": "1",
        "locale": "in",
        "enable_publishing": false,
        "backgroundColor": "${theme === 'dark' ? '#131722' : '#ffffff'}",
        "gridColor": "${theme === 'dark' ? '#2b2b43' : '#e1e3eb'}",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_side_toolbar": false,
        "details": ${isPrimary},
        "hotlist": ${isPrimary},
        "calendar": true,
        "news": [
          "headlines"
        ],
        ${isPrimary && watchlistSymbols ? `"watchlist": ${JSON.stringify(watchlistSymbols)},` : ''}
        "withdateranges": true,
        "save_image": true,
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650",
        "container_id": "${widgetId}",
        "allow_symbol_change": true,
        "support_host": "https://www.tradingview.com"
      }`;
    
    if (container.current) {
        container.current.appendChild(script);
    }
  }, [tvSymbol, theme, widgetId, watchlistSymbols]);

  return (
    <div className="w-full h-full rounded-none overflow-hidden relative group">
        <div id={widgetId} className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
            <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
        </div>

        {/* Floating Tools Overlay (Aligned with Native TV right-toolbar) */}
        {isPrimary && (
          <div className={`hidden sm:flex absolute top-[3px] z-50 gap-0 transition-all duration-300 opacity-100 ${activeSidePanel ? 'right-[480px]' : 'right-[80px]'}`}>
            {onLayoutChange && (
              <button onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowWatchlistMenu(false); }} className={`p-1.5 rounded hover:bg-slate-500/20 transition-colors flex items-center justify-center w-[36px] h-[36px] ${showLayoutMenu ? (theme === 'dark' ? 'text-white' : 'text-black') : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} title="Chart Layout">
                 <LayoutGrid size={22} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}

        {/* Floating Watchlist Add Button (+ icon) placed in the native right sidebar */}
        {isPrimary && onAddWatchlistSymbol && (
          <div className={`absolute top-[135px] right-0 sm:right-[6px] z-50 flex flex-col gap-1 sm:gap-2 transition-all opacity-100 scale-[0.85] sm:scale-100 origin-right ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'} sm:bg-transparent sm:border-transparent border border-r-0 rounded-l-xl p-1 sm:p-0 shadow-md sm:shadow-none backdrop-blur-sm sm:backdrop-blur-none`}>
            <button onClick={() => { setShowWatchlistMenu(!showWatchlistMenu); setShowLayoutMenu(false); setActiveSidePanel(null); }} className={`rounded hover:bg-slate-500/20 transition-colors flex items-center justify-center w-[40px] h-[40px] ${theme === 'dark' ? 'text-white' : 'text-black'}`} title="Add to Watchlist">
               <Plus size={28} strokeWidth={1.5} />
            </button>
            <button onClick={() => { setActiveSidePanel(activeSidePanel === 'news' ? null : 'news'); setShowWatchlistMenu(false); setShowLayoutMenu(false); }} className={`rounded hover:bg-slate-500/20 transition-colors flex items-center justify-center w-[40px] h-[40px] ${activeSidePanel === 'news' ? 'bg-purple-500/20 text-purple-600' : theme === 'dark' ? 'text-white' : 'text-black'}`} title="Market News">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
            </button>
            <button onClick={() => { setActiveSidePanel(activeSidePanel === 'calendar' ? null : 'calendar'); setShowWatchlistMenu(false); setShowLayoutMenu(false); }} className={`rounded hover:bg-slate-500/20 transition-colors flex items-center justify-center w-[40px] h-[40px] ${activeSidePanel === 'calendar' ? 'bg-rose-500/20 text-rose-600' : theme === 'dark' ? 'text-white' : 'text-black'}`} title="Economic Calendar">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            </button>
            <button onClick={() => { setActiveSidePanel(activeSidePanel === 'fundamentals' ? null : 'fundamentals'); setShowWatchlistMenu(false); setShowLayoutMenu(false); }} className={`rounded hover:bg-slate-500/20 transition-colors flex items-center justify-center w-[40px] h-[40px] ${activeSidePanel === 'fundamentals' ? 'bg-cyan-500/20 text-cyan-600' : theme === 'dark' ? 'text-white' : 'text-black'}`} title="Fundamental Details">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            </button>
            {onLayoutChange && (
              <button onClick={() => { setShowLayoutMenu(!showLayoutMenu); setShowWatchlistMenu(false); setActiveSidePanel(null); }} className={`sm:hidden rounded hover:bg-slate-500/20 transition-colors flex items-center justify-center w-[40px] h-[40px] ${showLayoutMenu ? (theme === 'dark' ? 'text-white' : 'text-black') : theme === 'dark' ? 'text-white' : 'text-black'}`} title="Chart Layout">
                 <LayoutGrid size={22} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}

        {/* Layout Grid Dropdown */}
        {showLayoutMenu && onLayoutChange && (
          <div className={`absolute sm:top-[40px] top-[260px] z-50 bg-white shadow-xl border border-slate-200 rounded-lg p-2 grid grid-cols-3 gap-2 transition-all duration-300 right-[50px] ${activeSidePanel ? 'sm:right-[480px]' : 'sm:right-[80px]'}`}>
             <button onClick={() => onLayoutChange('1')} className={`p-3 border rounded flex justify-center items-center ${chartLayout === '1' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`} title="1 Chart">
               <div className="w-6 h-6 border-2 border-slate-400 rounded-sm"></div>
             </button>
             <button onClick={() => onLayoutChange('split-v')} className={`p-3 border rounded flex justify-center items-center ${chartLayout === 'split-v' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`} title="2 Charts (Vertical)">
               <div className="w-6 h-6 flex gap-1"><div className="flex-1 border-2 border-slate-400 rounded-sm"></div><div className="flex-1 border-2 border-slate-400 rounded-sm"></div></div>
             </button>
             <button onClick={() => onLayoutChange('split-h')} className={`p-3 border rounded flex justify-center items-center ${chartLayout === 'split-h' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`} title="2 Charts (Horizontal)">
               <div className="w-6 h-6 flex flex-col gap-1"><div className="flex-1 border-2 border-slate-400 rounded-sm"></div><div className="flex-1 border-2 border-slate-400 rounded-sm"></div></div>
             </button>
             <button onClick={() => onLayoutChange('grid-4')} className={`p-3 border rounded flex justify-center items-center ${chartLayout === 'grid-4' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`} title="4 Charts">
               <div className="w-6 h-6 grid grid-cols-2 gap-1"><div className="border-2 border-slate-400 rounded-sm"></div><div className="border-2 border-slate-400 rounded-sm"></div><div className="border-2 border-slate-400 rounded-sm"></div><div className="border-2 border-slate-400 rounded-sm"></div></div>
             </button>
             <button onClick={() => onLayoutChange('grid-8')} className={`p-3 border rounded flex justify-center items-center ${chartLayout === 'grid-8' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`} title="8 Charts">
               <div className="w-6 h-6 grid grid-cols-4 grid-rows-2 gap-[2px]">
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
                 <div className="border-[1.5px] border-slate-400 rounded-[1px]"></div>
               </div>
             </button>
          </div>
        )}

        {/* Watchlist Edit Modal (TradingView Style) */}
        {showWatchlistMenu && onAddWatchlistSymbol && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className={`w-[600px] max-w-[95%] flex flex-col shadow-2xl rounded-lg border ${theme === 'dark' ? 'bg-[#1e222d] border-[#434651] text-[#d1d4dc]' : 'bg-white border-[#e0e3eb] text-[#131722]'}`}>
              {/* Header */}
              <div className={`flex justify-between items-center px-6 py-4 border-b ${theme === 'dark' ? 'border-[#2a2e39]' : 'border-[#e0e3eb]'}`}>
                <h4 className="text-lg font-medium m-0 leading-none">Search & Watchlist</h4>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      if (onAddWatchlistSymbol && symbol) {
                        onAddWatchlistSymbol(tvSymbol);
                      }
                    }} 
                    className={`text-[12px] px-3 py-1.5 rounded-full border ${theme === 'dark' ? 'border-[#434651] hover:bg-[#434651] text-white' : 'border-[#e0e3eb] hover:bg-slate-100 text-black'} transition-colors whitespace-nowrap`}
                  >
                    + Add Current Chart
                  </button>
                  <button onClick={() => setShowWatchlistMenu(false)} className={`flex items-center justify-center p-1 rounded transition-colors ${theme === 'dark' ? 'hover:bg-[#2a2e39] text-[#787b86]' : 'hover:bg-[#f0f3fa] text-[#787b86]'}`}>
                     <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Add Symbol Input */}
              <div className="p-5 pb-2 flex gap-3 relative">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSymbol) {
                        onAddWatchlistSymbol(newSymbol);
                        setNewSymbol('');
                        setSearchResults([]);
                      }
                    }}
                    placeholder="Type symbol (e.g. NSE:TCS)"
                    className={`w-full px-3 py-2 text-[15px] outline-none focus:outline-none focus:ring-0 border rounded ${theme === 'dark' ? 'bg-[#2a2e39] border-[#434651] text-white focus:border-white' : 'bg-white border-[#e0e3eb] text-black focus:border-black'} transition-colors capitalize`}
                  />
                  
                  {/* Search Autocomplete Dropdown */}
                  {searchResults.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-y-auto rounded shadow-xl border ${theme === 'dark' ? 'bg-[#1e222d] border-[#434651]' : 'bg-white border-[#e0e3eb]'}`}>
                      {searchResults.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setNewSymbol(`${item.exchange}:${item.symbol}`);
                            setShowWatchlistMenu(false);
                            setSearchResults([]);
                          }}
                          className={`px-4 py-2.5 cursor-pointer flex justify-between items-center ${theme === 'dark' ? 'hover:bg-[#2a2e39] border-[#2a2e39]' : 'hover:bg-[#f0f3fa] border-[#f0f3fa]'} border-b last:border-b-0`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-[14px] font-bold ${theme === 'dark' ? 'text-[#d1d4dc]' : 'text-[#131722]'}`}>{item.symbol}</span>
                            <span className={`text-[12px] mt-0.5 ${theme === 'dark' ? 'text-[#787b86]' : 'text-[#787b86]'}`}>{item.description}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-[#2a2e39] text-[#d1d4dc]' : 'bg-[#f0f3fa] text-[#131722]'}`}>
                              {item.exchange}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const sym = `${item.exchange}:${item.symbol}`;
                                onAddWatchlistSymbol(sym);
                                setNewSymbol('');
                                setSearchResults([]);
                              }}
                              className={`p-1 rounded-full ${theme === 'dark' ? 'hover:bg-[#434651] text-[#d1d4dc]' : 'hover:bg-slate-200 text-[#131722]'} transition-colors flex items-center justify-center border ${theme === 'dark' ? 'border-[#434651]' : 'border-slate-200'}`}
                              title="Add to Watchlist"
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (newSymbol) {
                      onAddWatchlistSymbol(newSymbol);
                      setNewSymbol('');
                      setSearchResults([]);
                    }
                  }}
                  className={`px-6 py-2 h-[42px] ${theme === 'dark' ? 'bg-black hover:bg-[#131722]' : 'bg-black hover:bg-slate-800'} text-white rounded text-[15px] font-medium transition-colors`}
                >
                  Add
                </button>
              </div>

              {/* Symbol List */}
              <div className="h-[450px] max-h-[60vh] overflow-y-auto px-5 pb-5 mt-2 custom-scrollbar">
                {watchlistSymbols?.length === 0 ? (
                  <div className="text-center text-[14px] text-[#787b86] py-8">No symbols in watchlist.</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {watchlistSymbols?.map(sym => (
                      <div key={sym} className={`group flex justify-between items-center px-3 py-2 rounded ${theme === 'dark' ? 'hover:bg-[#2a2e39]' : 'hover:bg-[#f0f3fa]'} transition-colors cursor-default`}>
                        <span className="font-semibold text-[14px]">{sym}</span>
                        <button onClick={() => onRemoveWatchlistSymbol && onRemoveWatchlistSymbol(sym)} className={`opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 rounded transition-all ${theme === 'dark' ? 'hover:bg-[#434651] text-[#787b86] hover:text-white' : 'hover:bg-[#e0e3eb] text-[#787b86] hover:text-black'}`}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Active Side Panel Overlay */}
        {activeSidePanel && (
          <div className={`absolute top-0 right-[56px] bottom-0 w-[400px] shadow-2xl border-l z-40 transition-transform flex flex-col ${theme === 'dark' ? 'bg-[#131722] border-[#2b2b43]' : 'bg-white border-slate-200'}`}>
            <div className={`flex items-center justify-between p-3 border-b ${theme === 'dark' ? 'border-[#2b2b43] bg-[#1e222d]' : 'border-slate-100 bg-slate-50'}`}>
              <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                {activeSidePanel === 'news' ? 'Market News' : activeSidePanel === 'calendar' ? 'Economic Calendar' : 'Fundamental Details'}
              </h3>
              <button onClick={() => setActiveSidePanel(null)} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
               {activeSidePanel === 'news' && <NewsWidget theme={theme} />}
               {activeSidePanel === 'calendar' && <EconomicCalendarWidget theme={theme} />}
               {activeSidePanel === 'fundamentals' && <FundamentalsWidget instrumentKey={tvSymbol} />}
            </div>
          </div>
        )}
    </div>
  );
};

export default memo(AdvancedChartWidget);

