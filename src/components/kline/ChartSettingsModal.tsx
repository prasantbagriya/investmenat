import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TV_CONFIG } from './chartConfig';

interface ChartSettingsModalProps {
  theme: 'light' | 'dark';
  onClose: () => void;
}

export default function ChartSettingsModal({ theme, onClose }: ChartSettingsModalProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1e222d' : '#ffffff';
  const border = isDark ? '#2b2b43' : '#e0e3eb';
  const text = isDark ? '#d1d4dc' : '#131722';
  const hoverBg = isDark ? '#2a2e39' : '#f0f3fa';

  const [activeTab, setActiveTab] = useState('symbol');

  const tabs = [
    { id: 'symbol', label: 'Symbol' },
    { id: 'status', label: 'Status line' },
    { id: 'scales', label: 'Scales' },
    { id: 'appearance', label: 'Appearance' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div 
        style={{ background: bg, borderColor: border, color: text }}
        className="w-[500px] h-[550px] border rounded-lg  flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: border }}>
          <h2 className="text-lg font-bold">Chart settings</h2>
          <button onClick={onClose} className="p-1 hover:opacity-70 rounded">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-1/3 border-r py-2" style={{ borderColor: border }}>
            {tabs.map(t => (
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
          
          {/* Content */}
          <div className="w-2/3 p-6 overflow-y-auto">
            {activeTab === 'symbol' && (
              <div className="flex flex-col gap-4 text-sm">
                <h3 className="font-bold mb-2">Candles</h3>
                <div className="flex items-center justify-between">
                  <span>Body</span>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 border rounded" style={{ background: TV_CONFIG.candleStyle.upColor }} />
                    <div className="w-6 h-6 border rounded" style={{ background: TV_CONFIG.candleStyle.downColor }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Borders</span>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 border rounded" style={{ background: TV_CONFIG.candleStyle.borderUpColor }} />
                    <div className="w-6 h-6 border rounded" style={{ background: TV_CONFIG.candleStyle.borderDownColor }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Wick</span>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 border rounded" style={{ background: TV_CONFIG.candleStyle.wickUpColor }} />
                    <div className="w-6 h-6 border rounded" style={{ background: TV_CONFIG.candleStyle.wickDownColor }} />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Background</span>
                  <div className="w-6 h-6 border rounded" style={{ background: isDark ? TV_CONFIG.colors.dark.bg : TV_CONFIG.colors.light.bg }} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Vert grid lines</span>
                  <div className="w-6 h-6 border rounded" style={{ background: isDark ? TV_CONFIG.colors.dark.grid : TV_CONFIG.colors.light.grid }} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Horz grid lines</span>
                  <div className="w-6 h-6 border rounded" style={{ background: isDark ? TV_CONFIG.colors.dark.grid : TV_CONFIG.colors.light.grid }} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Watermark</span>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            )}
            
            {(activeTab === 'scales' || activeTab === 'status') && (
              <div className="text-sm opacity-60 italic">Settings configuration coming soon...</div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2" style={{ borderColor: border }}>
          <button onClick={onClose} className="px-4 py-2 border rounded hover:opacity-80" style={{ borderColor: border }}>Cancel</button>
          <button onClick={onClose} className="px-4 py-2 rounded text-white bg-black dark:bg-white dark:text-black hover:opacity-80 transition-opacity">OK</button>
        </div>
      </div>
    </div>
  );
}
