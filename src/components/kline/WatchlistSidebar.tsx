import React, { useState, useEffect } from 'react';
import { List, Settings, LayoutGrid, Flame, Calendar, Bell, MessageSquare, Plus, ChevronDown, FileText, Maximize2, Newspaper } from 'lucide-react';
import FinnhubNews from './FinnhubNews';
import { getQuote, getCompanyProfile, FMPProfile } from '../../services/fmpApi';

interface WatchlistSidebarProps {
  theme: 'light' | 'dark';
  activeSymbol: string;
  onSymbolSelect: (sym: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (tab: string) => void;
}

const DEFAULT_WATCHLIST = [
  { symbol: 'AAPL', binanceSymbol: '', type: 'stock' },
  { symbol: 'MSFT', binanceSymbol: '', type: 'stock' },
  { symbol: 'BTCUSD', binanceSymbol: 'BTCUSDT', type: 'crypto' },
  { symbol: 'ETHUSD', binanceSymbol: 'ETHUSDT', type: 'crypto' },
  { symbol: 'BNBUSD', binanceSymbol: 'BNBUSDT', type: 'crypto' },
  { symbol: 'SOLUSD', binanceSymbol: 'SOLUSDT', type: 'crypto' },
];

const getInitialWatchlist = () => {
  try {
    const stored = localStorage.getItem('custom_watchlist');
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return DEFAULT_WATCHLIST;
};

export default function WatchlistSidebar({ theme, activeSymbol, onSymbolSelect, isCollapsed = false, onToggleCollapse }: WatchlistSidebarProps) {
  const [activeTab, setActiveTab] = useState('watchlist');
  const [newsMarket, setNewsMarket] = useState('cryptocurrency');
  const [watchlistItems, setWatchlistItems] = useState<any[]>(getInitialWatchlist());
  const [watchlistData, setWatchlistData] = useState<Record<string, { price: number, change: number }>>({});
  const [companyProfile, setCompanyProfile] = useState<FMPProfile | null>(null);

  useEffect(() => {
    localStorage.setItem('custom_watchlist', JSON.stringify(watchlistItems));
  }, [watchlistItems]);

  useEffect(() => {
    const handleAdd = (e: any) => {
      const detail = e.detail;
      setWatchlistItems(prev => {
        if (prev.find(i => i.symbol === detail.symbol)) return prev;
        return [detail, ...prev];
      });
    };
    window.addEventListener('add_to_watchlist', handleAdd);
    return () => window.removeEventListener('add_to_watchlist', handleAdd);
  }, []);

  useEffect(() => {
    const fetchWatchlistData = async () => {
      const cryptoItems = watchlistItems.filter(i => i.type === 'crypto');
      const otherItems = watchlistItems.filter(i => i.type !== 'crypto');

      const initial: Record<string, { price: number, change: number }> = {};

      // Crypto Fetch
      await Promise.all(cryptoItems.map(item => 
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${item.binanceSymbol}`)
          .then(res => res.json())
          .then(data => ({
            symbol: item.symbol,
            price: parseFloat(data.lastPrice),
            change: parseFloat(data.priceChangePercent)
          }))
          .catch(() => null)
      )).then(results => {
        results.forEach(res => {
          if (res) initial[res.symbol] = { price: res.price, change: res.change };
        });
      });

      // Angel Fetch
      const angelItems = watchlistItems.filter(i => i.type === 'angel');
      const { getAngelQuote } = await import('../../services/angelApi');
      await Promise.all(angelItems.map(item =>
        getAngelQuote(item.exchange || 'NSE', item.symbol, item.angelToken || '')
          .then(data => data ? {
            symbol: item.symbol,
            price: data.price,
            change: data.change
          } : null)
          .catch(() => null)
      )).then(results => {
        results.forEach(res => {
          if (res) initial[res.symbol] = { price: res.price, change: res.change };
        });
      });

      // Stock/Forex Fetch (FMP)
      const fmpItems = watchlistItems.filter(i => i.type !== 'crypto' && i.type !== 'angel');
      await Promise.all(fmpItems.map(item => 
        getQuote(item.symbol)
          .then(data => data ? {
            symbol: item.symbol,
            price: data.price,
            change: data.changesPercentage
          } : null)
          .catch(() => null)
      )).then(results => {
        results.forEach(res => {
          if (res) initial[res.symbol] = { price: res.price, change: res.change };
        });
      });

      setWatchlistData(initial);
    };

    fetchWatchlistData();

    // WebSocket for live crypto updates
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setWatchlistData(prev => {
            const next = { ...prev };
            let updated = false;
            
            data.forEach((ticker: any) => {
              const matchedItem = watchlistItems.find(w => w.binanceSymbol === ticker.s);
              if (matchedItem) {
                const currentPrice = parseFloat(ticker.c);
                const change = parseFloat(ticker.P);
                
                next[matchedItem.symbol] = {
                  price: currentPrice,
                  change: change
                };
                updated = true;
              }
            });
            
            return updated ? next : prev;
          });
        }
      } catch (e) {}
    };
    return () => ws.close();
  }, [watchlistItems]);

  useEffect(() => {
    // Fetch company profile if active symbol is a stock
    // Or even if it's crypto just set it to null
    const activeItem = watchlistItems.find(w => w.symbol === activeSymbol) || { type: 'stock' }; // Assume stock if not in watchlist
    if (activeItem?.type !== 'crypto' && activeItem?.type !== 'angel') {
      getCompanyProfile(activeSymbol).then(profile => {
        setCompanyProfile(profile);
      });
    } else {
      setCompanyProfile(null);
    }
  }, [activeSymbol]);

  const dark = theme === 'dark';
  const bg = dark ? '#131722' : '#ffffff';
  const text = dark ? '#d1d4dc' : '#131722';
  const subtext = dark ? '#787b86' : '#787b86';
  const border = dark ? '#2B2B36' : '#e0e3eb';
  const active = dark ? '#2a2e39' : '#f0f3fa';
  const hover = dark ? '#1e222d' : '#f8f9fa';

  const formatPrice = (p: number) => p.toFixed(2);

  const formatMarketCap = (num: number) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full" style={{ background: bg, borderLeft: `1px solid ${border}` }}>
      {/* Expanded Panel */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-r order-2 md:order-1" style={{ borderColor: border }}>
          {activeTab === 'watchlist' ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                  <span style={{ color: text }}>Watchlist</span>
                  <ChevronDown size={14} style={{ color: subtext }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button style={{ color: subtext }} className="p-1 rounded hover:opacity-70 transition-opacity"><Plus size={16} /></button>
                  <button style={{ color: subtext }} className="p-1 rounded hover:opacity-70 transition-opacity"><Settings size={15} /></button>
                </div>
              </div>

              {/* Column headers */}
              <div style={{ color: subtext, borderBottom: `1px solid ${border}` }} className="flex items-center px-4 py-1.5 text-xs font-semibold">
                <span className="flex-1">Symbol</span>
                <span className="w-16 text-right">Last</span>
                <span className="w-16 text-right">Chg%</span>
              </div>

              {/* List Area */}
              <div className="flex-1 overflow-y-auto">
                {watchlistItems.map(item => {
                  const data = watchlistData[item.symbol] || { price: 0, change: 0 };
                  const price = Number(data.price) || 0;
                  const change = Number(data.change) || 0;
                  const changeStr = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
                  const isPos = change > 0;
                  const isActive = activeSymbol === item.symbol;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => onSymbolSelect(item.symbol)}
                      style={{
                        background: isActive ? active : 'transparent',
                        borderLeft: isActive ? (dark ? '2px solid #ffffff' : '2px solid #000000') : '2px solid transparent',
                      }}
                      className="flex items-center px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = hover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isActive ? active : 'transparent'; }}
                    >
                      <span className={`flex-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{item.symbol}</span>
                      <span className={`w-16 text-right ${theme === 'dark' ? 'text-[#d1d4dc]' : 'text-[#131722]'}`}>
                        {price > 10 ? price.toFixed(2) : price.toFixed(4)}
                      </span>
                      <span className={`w-16 text-right ${isPos ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>{changeStr}</span>
                    </div>
                  );
                })}
              </div>

              {/* Details Section (Bottom Half) */}
              <div className="flex flex-col h-[280px] bg-white" style={{ borderTop: `1px solid ${border}` }}>
                <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${border}` }}>
                  <div className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                    <div className="w-5 h-5 rounded-full text-xs text-white flex items-center justify-center bg-black dark:bg-white dark:text-black">
                      {companyProfile?.image ? (
                         <img src={companyProfile.image} alt={activeSymbol} className="w-full h-full rounded-full object-cover" />
                      ) : activeSymbol.charAt(0)}
                    </div>
                    <span style={{ color: text }}>{companyProfile ? companyProfile.companyName : activeSymbol}</span>
                  </div>
                  <div className="flex justify-around py-3 border-gray-100 dark:border-[#2b2b43] text-gray-500 gap-3">
                    <LayoutGrid size={15} className="cursor-pointer hover:text-black dark:hover:text-white" />
                    <FileText size={15} className="cursor-pointer hover:text-black dark:hover:text-white" />
                    <Maximize2 size={15} className="cursor-pointer hover:text-black dark:hover:text-white" />
                  </div>
                </div>

                <div className="px-4 py-4 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                  <div className="flex items-center gap-1 text-[13px] font-medium" style={{ color: subtext }}>
                    {activeSymbol} • {companyProfile ? companyProfile.exchangeShortName : 'CRYPTO'}
                    <span className="text-xs px-1 py-0.5 rounded text-black bg-gray-200 dark:bg-[#2b2b43] dark:text-white ml-1">
                      {companyProfile ? 'Stock' : 'Index'}
                    </span>
                  </div>
                  
                  {(() => {
                    const d = watchlistData[activeSymbol] || (companyProfile ? { price: companyProfile.price, change: companyProfile.changes } : { price: 0, change: 0 });
                    const dPrice = Number(d.price) || 0;
                    const dChange = Number(d.change) || 0;
                    const isPos = dChange >= 0;
                    const changeAbs = (dPrice * Math.abs(dChange)) / 100;
                    return (
                      <>
                        <div className="text-[32px] font-bold tracking-tight leading-tight" style={{ color: text }}>
                          {formatPrice(dPrice)} <span className="text-sm font-semibold" style={{ color: subtext }}>USD</span>
                        </div>
                        
                        <div className="text-sm font-semibold flex items-center gap-1" style={{ color: isPos ? '#26a69a' : '#ef5350' }}>
                          {isPos ? '+' : ''}{changeAbs.toFixed(2)}
                          {' '}({isPos ? '+' : ''}{dChange.toFixed(2)}%)
                        </div>
                      </>
                    );
                  })()}

                  {companyProfile && (
                    <div className="mt-4 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between" style={{ borderBottom: `1px dashed ${border}`, paddingBottom: 4 }}>
                        <span style={{ color: subtext }}>Market Cap</span>
                        <span style={{ color: text }} className="font-semibold">{formatMarketCap(companyProfile.mktCap)}</span>
                      </div>
                      <div className="flex justify-between" style={{ borderBottom: `1px dashed ${border}`, paddingBottom: 4 }}>
                        <span style={{ color: subtext }}>Sector</span>
                        <span style={{ color: text }} className="font-semibold">{companyProfile.sector}</span>
                      </div>
                      <div className="flex justify-between" style={{ borderBottom: `1px dashed ${border}`, paddingBottom: 4 }}>
                        <span style={{ color: subtext }}>Industry</span>
                        <span style={{ color: text }} className="font-semibold">{companyProfile.industry}</span>
                      </div>
                      <div className="flex justify-between" style={{ paddingBottom: 4 }}>
                        <span style={{ color: subtext }}>CEO</span>
                        <span style={{ color: text }} className="font-semibold text-right max-w-[120px] truncate">{companyProfile.ceo}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs mt-2 flex items-center gap-1" style={{ color: subtext }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Market open
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'news' ? (
            <div className="flex-1 flex flex-col h-full bg-white">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid #e0e3eb` }}>
                <span className="font-bold text-sm" style={{ color: '#000000' }}>Market News</span>
                <select 
                  value={newsMarket} 
                  onChange={(e) => setNewsMarket(e.target.value as any)}
                  className="bg-transparent border outline-none text-xs px-2 py-1 rounded"
                  style={{ borderColor: '#e0e3eb', color: '#000000' }}
                >
                  <option value="all">All News</option>
                  <option value="cryptocurrency">Crypto</option>
                  <option value="stock">Stocks</option>
                  <option value="forex">Forex</option>
                  <option value="index">Indices</option>
                </select>
              </div>
              <div className="flex-1 overflow-hidden">
                <FinnhubNews category={newsMarket} theme={'light'} />
              </div>
            </div>
          ) : activeTab === 'calendar' ? (
            <div className="flex-1 flex flex-col h-full bg-white">
              <div className="flex-1 overflow-hidden">
                <iframe 
                  scrolling="no" 
                  allowTransparency 
                  frameBorder="0" 
                  src={`https://s.tradingview.com/embed-widget/events/?locale=en&colorTheme=${theme}`} 
                  style={{ boxSizing: 'border-box', height: '100%', width: '100%' }}
                ></iframe>
              </div>
            </div>
          ) : activeTab === 'data' ? (
            <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto no-scrollbar">
              <div className="px-4 py-3 flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderBottom: `1px solid ${border}` }}>
                <span className="font-bold text-sm" style={{ color: text }}>Fundamental Data</span>
              </div>
              <div className="p-4 flex flex-col gap-4 text-sm" style={{ color: text }}>
                {companyProfile ? (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      {companyProfile.image && (
                        <div className="w-12 h-12 bg-white rounded-full p-1 shadow-sm border" style={{ borderColor: border }}>
                          <img src={companyProfile.image} alt={activeSymbol} className="w-full h-full rounded-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h2 className="font-bold text-base">{companyProfile.companyName}</h2>
                        <span className="opacity-70 text-xs">{companyProfile.exchangeShortName} : {activeSymbol}</span>
                      </div>
                    </div>

                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Market Cap</span>
                      <span className="font-mono font-semibold">{companyProfile.mktCap ? `$${(companyProfile.mktCap / 1000000000).toFixed(2)}B` : '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Volume Avg</span>
                      <span className="font-mono font-semibold">{companyProfile.volAvg ? (companyProfile.volAvg / 1000000).toFixed(2) + 'M' : '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Beta</span>
                      <span className="font-mono font-semibold">{companyProfile.beta ? companyProfile.beta.toFixed(2) : '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">52W Range</span>
                      <span className="font-mono font-semibold">{companyProfile.range || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Dividend</span>
                      <span className="font-mono font-semibold">{companyProfile.lastDiv ? `$${companyProfile.lastDiv.toFixed(2)}` : '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Sector</span>
                      <span className="font-mono font-semibold text-right">{companyProfile.sector || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Industry</span>
                      <span className="font-mono font-semibold text-right">{companyProfile.industry || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">CEO</span>
                      <span className="font-mono font-semibold text-right">{companyProfile.ceo || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2" style={{ borderColor: border }}>
                      <span className="opacity-70">Employees</span>
                      <span className="font-mono font-semibold text-right">{companyProfile.fullTimeEmployees || '-'}</span>
                    </div>

                    <div className="flex flex-col mt-2">
                      <span className="opacity-70 mb-2 font-semibold">Description</span>
                      <span className="text-xs leading-relaxed opacity-90 text-justify">{companyProfile.description || 'No description available.'}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center opacity-50 h-32 text-center mt-10">
                    <div>
                      <LayoutGrid size={32} className="mx-auto mb-2 opacity-50" />
                      No fundamental data<br/>available for {activeSymbol}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 h-full flex flex-col text-sm items-center justify-center opacity-50" style={{ color: text }}>
              Select a tab to view content
            </div>
          )}
        </div>
      )}

      {/* Sidebar Icons */}
      <div className="h-[50px] md:h-auto md:w-[50px] flex-shrink-0 flex flex-row md:flex-col items-center md:py-2 border-t md:border-t-0 md:border-l bg-white z-50 overflow-y-auto no-scrollbar order-1 md:order-2" style={{ borderColor: border }}>

        {/* Mobile: single row, no gaps. Desktop: grouped columns */}
        <div className="flex flex-row md:flex-col items-center w-full h-full md:w-full md:h-auto md:gap-2 md:px-1 md:py-0">
          <button onClick={() => { setActiveTab('watchlist'); if (onToggleCollapse) onToggleCollapse(activeTab === 'watchlist' && !isCollapsed ? 'collapse' : 'watchlist'); }} className={`flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors ${activeTab === 'watchlist' && !isCollapsed ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'hover:bg-gray-100 dark:hover:bg-[#2a2e39]'}`} style={{ color: activeTab === 'watchlist' && !isCollapsed ? undefined : subtext }} title="Watchlist">
            <List size={20} />
          </button>
          <button onClick={() => { setActiveTab('data'); if (onToggleCollapse) onToggleCollapse(activeTab === 'data' && !isCollapsed ? 'collapse' : 'data'); }} className={`flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors ${activeTab === 'data' && !isCollapsed ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'hover:bg-gray-100 dark:hover:bg-[#2a2e39]'}`} style={{ color: activeTab === 'data' && !isCollapsed ? undefined : subtext }} title="Data Window">
            <LayoutGrid size={20} />
          </button>
        </div>

        <div className="hidden md:block w-6 h-px bg-gray-200 dark:bg-[#2B2B36] flex-shrink-0" />

        <div className="flex flex-row md:flex-col items-center w-full h-full md:w-full md:h-auto md:gap-2 md:px-1 md:py-0">
          <button onClick={() => { setActiveTab('news'); if (onToggleCollapse) onToggleCollapse(activeTab === 'news' && !isCollapsed ? 'collapse' : 'news'); }} className={`flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors ${activeTab === 'news' && !isCollapsed ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'hover:bg-gray-100 dark:hover:bg-[#2a2e39]'}`} style={{ color: activeTab === 'news' && !isCollapsed ? undefined : subtext }} title="Market News">
            <Newspaper size={20} />
          </button>
          <button className="flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-[#2a2e39]" style={{ color: subtext }} title="Hotlists">
            <Flame size={20} />
          </button>
          <button onClick={() => { setActiveTab('calendar'); if (onToggleCollapse) onToggleCollapse(activeTab === 'calendar' && !isCollapsed ? 'collapse' : 'calendar'); }} className={`flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors ${activeTab === 'calendar' && !isCollapsed ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : 'hover:bg-gray-100 dark:hover:bg-[#2a2e39]'}`} style={{ color: activeTab === 'calendar' && !isCollapsed ? undefined : subtext }} title="Economic Calendar">
            <Calendar size={20} />
          </button>
        </div>

        <div className="hidden md:block w-6 h-px bg-gray-200 dark:bg-[#2B2B36] flex-shrink-0" />

        <div className="flex flex-row md:flex-col items-center w-full h-full md:w-full md:h-auto md:gap-2 md:px-1 md:py-0 md:mt-auto">
          <button className="flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-[#2a2e39]" style={{ color: subtext }} title="Alerts">
            <Bell size={20} />
          </button>
          <button className="flex-1 md:flex-none md:w-full flex justify-center p-2 rounded transition-colors hover:bg-gray-100 dark:hover:bg-[#2a2e39]" style={{ color: subtext }} title="Chats & Ideas">
            <MessageSquare size={20} />
          </button>
        </div>

      </div>
    </div>
  );
}
