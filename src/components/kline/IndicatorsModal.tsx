import React, { useState } from 'react';
import { Search, X, Star } from 'lucide-react';

interface IndicatorsModalProps {
  theme: 'light' | 'dark';
  onClose: () => void;
  onAddIndicator: (paneId: string, name: string) => void;
}

export default function IndicatorsModal({ theme, onClose, onAddIndicator }: IndicatorsModalProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1e222d' : '#ffffff';
  const border = isDark ? '#2b2b43' : '#e0e3eb';
  const text = isDark ? '#d1d4dc' : '#131722';
  const subtext = isDark ? '#787b86' : '#9098a1';
  const hoverBg = isDark ? '#2a2e39' : '#f0f3fa';

  const [activeTab, setActiveTab] = useState('Technicals');
  const [query, setQuery] = useState('');

  const sidebarTabs = [
    { id: 'Favorites', label: 'Favorites' },
    { id: 'MyScripts', label: 'My scripts' },
    { id: 'Technicals', label: 'Technicals' },
    { id: 'Financials', label: 'Financials' },
    { id: 'Community', label: 'Community Scripts' }
  ];

  const subTabs = ['Indicators', 'Strategies', 'Profiles', 'Patterns'];

  const indicatorsList = [
    { name: 'Moving Average Exponential', author: 'Built-in', likes: 0 },
    { name: 'Smart Money Concepts (SMC)', author: 'LuxAlgo', likes: '155.5K' },
    { name: 'Relative Strength Index', author: 'Built-in', likes: 0 },
    { name: 'MACD', author: 'Built-in', likes: 0 },
    { name: 'Bollinger Bands', author: 'Built-in', likes: 0 },
    { name: 'Volume', author: 'Built-in', likes: 0 },
  ].filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        style={{ background: bg, borderColor: border, color: text }}
        className="w-[850px] h-[600px] border rounded-lg  flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: border }}>
          <h2 className="text-xl font-bold">Indicators, metrics, and strategies</h2>
          <button onClick={onClose} className="p-1 hover:opacity-70 rounded transition-opacity"><X size={24} /></button>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: border }}>
          <Search style={{ color: subtext }} size={20} />
          <input 
            autoFocus
            type="text" 
            placeholder="Search" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-[200px] border-r py-2 flex flex-col" style={{ borderColor: border }}>
            {sidebarTabs.map(t => (
              <div 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
                style={{
                  background: activeTab === t.id ? hoverBg : 'transparent',
                  color: activeTab === t.id ? (theme === 'dark' ? '#ffffff' : '#000000') : text
                }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-6 px-6 border-b" style={{ borderColor: border }}>
              {subTabs.map(t => (
                <div 
                  key={t}
                  className="py-3 cursor-pointer text-sm font-semibold transition-colors"
                  style={{
                    borderBottom: t === 'Indicators' ? (theme === 'dark' ? '2px solid #ffffff' : '2px solid #000000') : '2px solid transparent',
                    color: t === 'Indicators' ? text : subtext
                  }}
                >
                  {t}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[1fr_100px_80px] gap-4 px-6 py-2 text-xs font-semibold" style={{ color: subtext, borderBottom: `1px solid ${border}` }}>
                <span>NAME</span>
                <span>AUTHOR</span>
                <span className="text-right">LIKES</span>
              </div>
              
              {indicatorsList.map((ind, i) => (
                <div 
                  key={i}
                  onClick={() => { 
                    // Maps to internal keys for the engine
                    const map: Record<string, string> = {
                      'Moving Average Exponential': 'MA_20',
                      'Relative Strength Index': 'RSI_14',
                      'Volume': 'VOL'
                    };
                    onAddIndicator('main', map[ind.name] || 'MA_20'); 
                    onClose(); 
                  }}
                  className="grid grid-cols-[1fr_100px_80px] items-center gap-4 px-6 py-2 cursor-pointer transition-colors text-sm"
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex items-center gap-3 font-medium">
                    <Star size={14} style={{ color: subtext }} />
                    {ind.name}
                  </div>
                  <div style={{ color: subtext }}>{ind.author}</div>
                  <div className="text-right" style={{ color: subtext }}>{ind.likes ? ind.likes : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
