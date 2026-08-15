import React, { useEffect, useRef, useState } from 'react';
import ChartToolbar from './ChartToolbar';
import DrawingToolbar from './DrawingToolbar';
import WatchlistSidebar from './WatchlistSidebar';
import CanvasChart, { CandleData, Drawing } from './CanvasChart';
import BottomPanel from './BottomPanel';
import ChartSettingsModal from './ChartSettingsModal';
import CreateAlertModal from './CreateAlertModal';
import { fetchBinanceBars, subscribeToBinanceTicks } from '../../services/binanceApi';
import { fetchAngelBars } from '../../services/angelApi';
import { fetchFmpBars } from '../../services/fmpApi';
export const getPeriod = (tf: string) => {
  const match = tf.match(/(\d+)([a-zA-Z]+)/);
  if (!match) return { span: 1, type: 'day' };
  const span = parseInt(match[1], 10);
  const letter = match[2];
  
  if (letter === 's') return { span, type: 'second' };
  if (letter === 'm') return { span, type: 'minute' };
  if (letter === 'h') return { span, type: 'hour' };
  if (letter === 'D' || letter === 'd') return { span, type: 'day' };
  if (letter === 'W' || letter === 'w') return { span, type: 'week' };
  if (letter === 'M') return { span, type: 'month' };
  if (letter === 'Y' || letter === 'y') return { span, type: 'year' };
  return { span: 1, type: 'day' };
};

export default function KlineWorkspace() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [chartType, setChartType] = useState('candle_solid');
  const [activeMode, setActiveMode] = useState('normal');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [indicators, setIndicators] = useState<string[]>(['MA_20']); // Default MA_20
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);
  
  const [layoutType, setLayoutType] = useState('1x1'); // '1x1', '2x1', '1x2', '2x2'

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1D');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowWatchlist(false);
      } else {
        setShowWatchlist(true);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [data, setData] = useState<CandleData[]>([]);
  const wsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Handle Sidebar Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizingSidebar(false);
    
    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    let isSubscribed = true;
    const loadData = async () => {
      const { type, span } = getPeriod(timeframe);
      
      // Determine limit based on timeframe to avoid freezing browser on 1m charts
      // while providing full history (since listing) for Daily/Weekly charts.
      let limit = 2000; 
      if (type === 'hour') limit = 5000;
      if (type === 'day' || type === 'week' || type === 'month') limit = 20000; // 20k days = 54 years (entire history)

      let assetType = 'crypto';
      let assetToken = '';
      let assetExchange = '';
      
      try {
        const savedStr = localStorage.getItem('custom_watchlist');
        if (savedStr) {
          const items = JSON.parse(savedStr);
          const item = items.find((i: any) => i.symbol === symbol);
          if (item) {
            assetType = item.type;
            assetToken = item.angelToken || '';
            assetExchange = item.exchange || '';
          }
        }
      } catch (e) {}

      try {
        let historical: CandleData[] = [];
        if (assetType === 'crypto') {
          historical = await fetchBinanceBars(symbol, span, type, limit) || [];
          if (isSubscribed && historical) {
            setData(historical);
            
            if (wsUnsubscribeRef.current) wsUnsubscribeRef.current();
            
            wsUnsubscribeRef.current = subscribeToBinanceTicks(
              symbol, span, type,
              (candle) => {
                setData(prev => {
                  if (prev.length === 0) return [candle];
                  const last = prev[prev.length - 1];
                  if (candle.timestamp === last.timestamp) {
                    return [...prev.slice(0, -1), candle];
                  } else if (candle.timestamp > last.timestamp) {
                    return [...prev, candle];
                  }
                  return prev;
                });
              }
            );
          }
        } else if (assetType === 'angel') {
          historical = await fetchAngelBars(assetExchange, assetToken, timeframe) || [];
          if (isSubscribed && historical) {
            setData(historical);
            if (wsUnsubscribeRef.current) { wsUnsubscribeRef.current(); wsUnsubscribeRef.current = null; }
          }
        } else {
          historical = await fetchFmpBars(symbol, timeframe) || [];
          if (isSubscribed && historical) {
            setData(historical);
            if (wsUnsubscribeRef.current) { wsUnsubscribeRef.current(); wsUnsubscribeRef.current = null; }
          }
        }
      } catch (e) {
        console.error('Failed to load chart data', e);
      }
    };
    
    setData([]);
    loadData();

    return () => {
      isSubscribed = false;
      if (wsUnsubscribeRef.current) {
        wsUnsubscribeRef.current();
        wsUnsubscribeRef.current = null;
      }
    };
  }, [symbol, timeframe]);

  const handleAddIndicator = (paneId: string, name: string) => {
    // Basic toggle for now based on what's clicked
    setIndicators(prev => {
      if (prev.includes(name)) return prev.filter(i => i !== name);
      return [...prev, name];
    });
  };
  const handleClearDrawings = () => {
    setActiveMode('normal');
    setDrawings([]);
  };

  const [showWatchlist, setShowWatchlist] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setShowWatchlist(true);
      else setShowWatchlist(false);
    };
    const handleCloseWatchlist = () => {
      if (window.innerWidth < 768) {
        setShowWatchlist(false);
      } else {
        setIsWatchlistCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('close-watchlist-sidebar', handleCloseWatchlist);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('close-watchlist-sidebar', handleCloseWatchlist);
    };
  }, []);

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden text-sm relative ${theme === 'dark' ? 'dark' : ''}`}
         style={{ backgroundColor: theme === 'dark' ? '#131722' : '#ffffff' }}>
      
      {/* Top Toolbar */}
      <div className="min-h-[40px] border-b border-[#e0e3eb] dark:border-[#2B2B36] flex-shrink-0 relative z-[50]">
        <div className="w-full h-full">
          <ChartToolbar 
            symbol={symbol}
            onSymbolChange={setSymbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            chartType={chartType}
            onChartTypeChange={setChartType}
            theme={theme}
            onThemeToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            onAddIndicator={handleAddIndicator}
            onOpenAlert={() => setShowAlertModal(true)}
            layoutType={layoutType}
            onLayoutChange={setLayoutType}
          />
        </div>
        {isMobile && (
          <button 
            onClick={() => {
              setShowWatchlist(!showWatchlist);
              if (!showWatchlist) window.dispatchEvent(new Event('close-symbol-search'));
            }}
            className="fixed right-2 top-2 p-1.5 rounded-md bg-black dark:bg-white text-white dark:text-black z-[100]  text-xs font-bold"
          >
            {showWatchlist ? 'Close' : 'Watchlist'}
          </button>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`w-[52px] border-r border-[#e0e3eb] dark:border-[#2B2B36] bg-white dark:bg-[#131722] flex-col items-center shrink-0 z-10 flex`}>
          <DrawingToolbar 
            theme={theme}
            activeMode={activeMode} 
            onSelectMode={(mode) => setActiveMode(mode)} 
            onClearAll={handleClearDrawings}
          />
        </div>

        {/* Custom Canvas Chart Container (Multi-Chart Grid) */}
        <div className="flex-1 flex flex-col relative bg-white dark:bg-[#131722] overflow-hidden">
          <div className={`flex-1 grid bg-[#e0e3eb] dark:bg-[#2B2B36] ${
            layoutType === '2x1' ? 'grid-cols-2' :
            layoutType === '1x2' ? 'grid-rows-2' :
            layoutType === '2x2' ? 'grid-cols-2 grid-rows-2' :
            'grid-cols-1'
          }`}>
            {Array.from({ length: layoutType === '1x1' ? 1 : layoutType === '2x2' ? 4 : 2 }).map((_, idx) => (
              <div key={idx} className="relative w-full h-full bg-white dark:bg-[#131722] overflow-hidden flex flex-col">
                {data.length > 0 ? (
                  <CanvasChart 
                    data={data} 
                    theme={theme} 
                    chartType={chartType}
                    symbol={symbol}
                    timeframe={timeframe}
                    activeMode={activeMode}
                    drawings={drawings}
                    indicators={indicators}
                    onDrawEnd={(d) => {
                      setDrawings(prev => [...prev, d]);
                      setActiveMode('normal');
                    }}
                    onRemoveDrawing={(id) => {
                      setDrawings(prev => prev.filter(d => d.id !== id));
                    }}
                    onOpenSettings={() => setShowSettingsModal(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Loading chart data...
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Bottom Panel (Pine, Screener, Tester) */}
          <BottomPanel theme={theme} activeSymbol={symbol} />
        </div>

        {/* Right Sidebar */}
        {showWatchlist && (
          <div 
            className={`flex-shrink-0 bg-white dark:bg-[#131722] z-[60] absolute right-0 h-full md:relative md:h-auto md:block flex transition-all duration-300 ${isMobile ? 'shadow-2xl border-l border-slate-200 dark:border-slate-800' : ''}`}
            style={{ width: isMobile ? '100%' : (isWatchlistCollapsed ? 50 : sidebarWidth) }}
          >
            {/* Resize Handle (only active if not collapsed) */}
            {!isWatchlistCollapsed && !isMobile && (
              <div 
                className="w-1 h-full cursor-col-resize hover:bg-black dark:hover:bg-white absolute left-0 top-0 z-20"
                style={{ borderLeft: `1px solid ${theme === 'dark' ? '#2B2B36' : '#e0e3eb'}` }}
                onMouseDown={() => setIsResizingSidebar(true)}
              />
            )}
            <div className={`flex-1 w-full h-full overflow-hidden ${isMobile ? '' : 'ml-1'}`}>
              <WatchlistSidebar 
                theme={theme} 
                onSymbolSelect={setSymbol} 
                activeSymbol={symbol} 
                isCollapsed={isWatchlistCollapsed}
                onToggleCollapse={(tab) => {
                  if (tab === 'collapse') {
                    setIsWatchlistCollapsed(true);
                  } else if (tab) {
                    setIsWatchlistCollapsed(false);
                  } else {
                    setIsWatchlistCollapsed(!isWatchlistCollapsed);
                  }
                }}
              />
            </div>
          </div>
        )}
        
        {showSettingsModal && (
          <ChartSettingsModal theme={theme} onClose={() => setShowSettingsModal(false)} />
        )}

        {showAlertModal && (
          <CreateAlertModal theme={theme} onClose={() => setShowAlertModal(false)} symbol={symbol} />
        )}
      </div>
    </div>
  );
}
