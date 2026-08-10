import React, { useState, useRef, useEffect } from 'react';
import {
  Search, ChevronDown, Activity, BarChart2, LineChart, 
  Settings, Undo2, Redo2, Maximize, Camera, Zap, FileJson, AlarmClock, LayoutGrid,
  Check, Star
} from 'lucide-react';
import SymbolSearchModal from './SymbolSearchModal';
import IndicatorsModal from './IndicatorsModal';

interface ChartToolbarProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  chartType: string;
  onChartTypeChange: (type: string) => void;
  onAddIndicator: (paneId: string, name: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  symbol: string;
  onSymbolChange: (sym: string) => void;
  onOpenAlert?: () => void;
  layoutType: string;
  onLayoutChange: (layout: string) => void;
}

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '45m', '1h', '4h', 'D', 'W'];

const CHART_TYPES = [
  { label: 'Candles',         value: 'candle_solid',      icon: BarChart2 },
  { label: 'Hollow candles',  value: 'candle_stroke',     icon: BarChart2 },
  { label: 'Bars',            value: 'ohlc',              icon: Activity },
  { label: 'Line',            value: 'area',              icon: LineChart },
];

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LTCUSDT',
];

export default function ChartToolbar({
  theme, chartType, onChartTypeChange,
  onAddIndicator, timeframe, onTimeframeChange, symbol, onSymbolChange, onOpenAlert,
  layoutType,
  onLayoutChange
}: ChartToolbarProps) {
  const dark = theme === 'dark';
  const bg       = dark ? '#131722' : '#ffffff';
  const border   = dark ? '#2b2b43' : '#e0e3eb';
  const text     = dark ? '#d1d4dc' : '#131722';
  const hoverBg  = dark ? '#2a2e39' : '#f0f3fa';
  const activeBg = dark ? '#2962ff' : '#2962ff';

  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(['1m', '5m', '15m', '1h', '4h', '1D']);

  const toggleFavorite = (e: React.MouseEvent, tf: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf].sort((a,b) => {
        const order = ['1s', '5s', '10s', '15s', '30s', '1m', '3m', '5m', '15m', '30m', '45m', '1h', '2h', '3h', '4h', '1D', '1W', '1M', '3M', '1Y'];
        return order.indexOf(a) - order.indexOf(b);
      })
    );
  };
  
  const searchRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSymbolSearch(false);
      if (indRef.current && !indRef.current.contains(e.target as Node)) setShowIndicatorMenu(false);
    };
    const handleCloseSearch = () => setShowSymbolSearch(false);
    document.addEventListener('mousedown', handler);
    window.addEventListener('close-symbol-search', handleCloseSearch);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('close-symbol-search', handleCloseSearch);
    };
  }, []);

  const Divider = () => (
    <div style={{ background: border, width: 1, height: 24, margin: '0 4px', flexShrink: 0 }} />
  );

  const ToolButton = ({ icon: Icon, label, onClick, active = false }: any) => (
    <button 
      onClick={onClick}
      className={`p-1.5 flex items-center justify-center rounded transition-colors`}
      style={{ color: active ? activeBg : text, background: active ? (dark ? '#1e222d' : '#f0f3fa') : 'transparent' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = hoverBg; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
      title={label}
    >
      <Icon size={16} strokeWidth={1.5} />
    </button>
  );

  return (
    <div
      style={{ background: bg, borderBottom: `1px solid ${border}`, color: text, userSelect: 'none' }}
      className="flex items-center px-2 py-1 text-sm relative z-10 w-full overflow-x-auto no-scrollbar whitespace-nowrap"
    >
      {/* ─── Profile / Menu (Leftmost) ─── */}
      <div 
        className="flex flex-col gap-0.5 cursor-pointer mr-2 p-1" 
        style={{ width: 24 }}
        onClick={() => window.dispatchEvent(new Event('open-nav-drawer'))}
      >
        <div style={{ height: 2, background: dark ? '#ffffff' : '#000000', width: '100%' }} />
        <div style={{ height: 2, background: dark ? '#ffffff' : '#000000', width: '100%' }} />
        <div style={{ height: 2, background: dark ? '#ffffff' : '#000000', width: '100%' }} />
      </div>
      
      {/* 🟢 Symbol 🟢 */}
      <div className="relative mr-1" ref={searchRef}>
        <button
          onClick={() => {
            setShowSymbolSearch(true);
            window.dispatchEvent(new Event('close-watchlist-sidebar'));
          }}
          style={{ background: showSymbolSearch ? hoverBg : 'transparent' }}
          className="flex items-center gap-1.5 px-2 py-1 rounded font-bold text-[15px] hover:opacity-90 transition tracking-tight"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full text-xs text-white" style={{ background: '#f23645' }}>
            {symbol.charAt(0)}
          </div>
          <span style={{ color: text }}>{symbol.replace('USDT', '')}</span>
        </button>

        {showSymbolSearch && (
          <SymbolSearchModal 
            theme={theme}
            onClose={() => setShowSymbolSearch(false)}
            onSelect={(s) => onSymbolChange(s)}
          />
        )}
      </div>

      <ToolButton icon={Search} label="Symbol Search" onClick={() => {
        setShowSymbolSearch(true);
        window.dispatchEvent(new Event('close-watchlist-sidebar'));
      }} />
      
      <Divider />

      {/* 🟢 Timeframes 🟢 */}
      <div className="flex items-center gap-0 relative">
        {favorites.map(tf => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            style={{
              color: timeframe === tf ? activeBg : text,
            }}
            className="px-2 py-1 rounded text-[13px] font-semibold transition-colors"
            onMouseEnter={e => { if (timeframe !== tf) e.currentTarget.style.background = hoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {tf}
          </button>
        ))}
        <ToolButton icon={ChevronDown} label="More Timeframes" onClick={() => setShowTimeframeMenu(!showTimeframeMenu)} />
        
        {showTimeframeMenu && (
           <div style={{ background: bg, border: `1px solid ${border}`, color: text }}
           className="absolute top-full left-0 mt-1 w-64 rounded-lg  z-50 overflow-y-auto max-h-[500px] py-1"
         >
           <div className="px-4 py-1.5 text-xs font-bold opacity-60">SECONDS</div>
           {['1s', '5s', '10s', '15s', '30s'].map(t => (
              <div key={t} onClick={() => { onTimeframeChange(t); setShowTimeframeMenu(false); }} className="flex justify-between items-center px-4 py-1.5 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <span>{t}</span>
                <Star size={14} onClick={(e) => toggleFavorite(e, t)} className={`hover:text-yellow-500 ${favorites.includes(t) ? 'text-yellow-500 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
           ))}
           <div className="px-4 py-1.5 mt-2 text-xs font-bold opacity-60 border-t" style={{ borderColor: border }}>MINUTES</div>
           {['1m', '3m', '5m', '15m', '30m', '45m'].map(t => (
              <div key={t} onClick={() => { onTimeframeChange(t); setShowTimeframeMenu(false); }} className="flex justify-between items-center px-4 py-1.5 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <span>{t.replace('m', ' minutes')}</span>
                <Star size={14} onClick={(e) => toggleFavorite(e, t)} className={`hover:text-yellow-500 ${favorites.includes(t) ? 'text-yellow-500 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
           ))}
           <div className="px-4 py-1.5 mt-2 text-xs font-bold opacity-60 border-t" style={{ borderColor: border }}>HOURS</div>
           {['1h', '2h', '3h', '4h'].map(t => (
              <div key={t} onClick={() => { onTimeframeChange(t); setShowTimeframeMenu(false); }} className="flex justify-between items-center px-4 py-1.5 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <span>{t.replace('h', ' hours')}</span>
                <Star size={14} onClick={(e) => toggleFavorite(e, t)} className={`hover:text-yellow-500 ${favorites.includes(t) ? 'text-yellow-500 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
           ))}
           <div className="px-4 py-1.5 mt-2 text-xs font-bold opacity-60 border-t" style={{ borderColor: border }}>DAYS</div>
           {['1D', '1W', '1M', '3M', '1Y'].map(t => (
              <div key={t} onClick={() => { onTimeframeChange(t); setShowTimeframeMenu(false); }} className="flex justify-between items-center px-4 py-1.5 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <span>{t.replace('D', ' day').replace('W', ' week').replace('M', ' month').replace('Y', ' year')}</span>
                <Star size={14} onClick={(e) => toggleFavorite(e, t)} className={`hover:text-yellow-500 ${favorites.includes(t) ? 'text-yellow-500 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
           ))}
         </div>
        )}
      </div>

      <Divider />

      {/* 🟢 Icons Block 🟢 */}
      <div className="flex items-center gap-0.5 relative" ref={indRef}>
        <ToolButton icon={BarChart2} label="Candles" onClick={() => onChartTypeChange(chartType === 'candle_solid' ? 'area' : 'candle_solid')} />
        
        <ToolButton icon={Activity} label="Indicators" onClick={() => setShowIndicatorMenu(true)} />
        {showIndicatorMenu && (
          <IndicatorsModal 
            theme={theme}
            onClose={() => setShowIndicatorMenu(false)}
            onAddIndicator={onAddIndicator}
          />
        )}

        <ToolButton icon={FileJson} label="Templates" />
        <ToolButton icon={AlarmClock} label="Alert" onClick={onOpenAlert} />
        <ToolButton icon={Undo2} label="Undo" />
        <ToolButton icon={Redo2} label="Redo" />
      </div>

      <div className="flex-1" />

      {/* 🔴 Right Aligned 🔴 */}
      <div className="flex items-center gap-0.5 relative">
        <ToolButton icon={LayoutGrid} label="Select Layout" onClick={() => setShowLayoutMenu(!showLayoutMenu)} />
        {showLayoutMenu && (
          <div style={{ background: bg, border: `1px solid ${border}`, color: text }}
           className="absolute top-full right-0 mt-1 w-32 rounded  z-50 overflow-hidden py-1"
          >
            {[
              { id: '1x1', label: '1 Chart' },
              { id: '2x1', label: '2 Vertical' },
              { id: '1x2', label: '2 Horizontal' },
              { id: '2x2', label: '4 Grid' },
            ].map(l => (
              <div 
                key={l.id} 
                onClick={() => { onLayoutChange(l.id); setShowLayoutMenu(false); }} 
                className="px-4 py-2 text-sm cursor-pointer hover:opacity-80 flex items-center justify-between" 
                style={{ background: layoutType === l.id ? activeBg : 'transparent' }}
                onMouseEnter={e => { if (layoutType !== l.id) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (layoutType !== l.id) e.currentTarget.style.background = 'transparent'; }}
              >
                {l.label}
              </div>
            ))}
          </div>
        )}

        <ToolButton icon={Settings} label="Chart Settings" />
        <ToolButton icon={Maximize} label="Fullscreen" />
        <ToolButton icon={Camera} label="Take a snapshot" />
        
        <button 
          className="ml-2 px-4 py-1.5 rounded-md font-bold text-sm bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
        >
          Publish
        </button>
      </div>
    </div>
  );
}
