import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { searchAngelInstruments } from '../../services/angelApi';
import { searchCompanies } from '../../services/fmpApi';

interface SymbolSearchModalProps {
  theme: 'light' | 'dark';
  onClose: () => void;
  onSelect: (symbol: string) => void;
}

export default function SymbolSearchModal({ theme, onClose, onSelect }: SymbolSearchModalProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1e222d' : '#ffffff';
  const border = isDark ? '#2b2b43' : '#e0e3eb';
  const text = isDark ? '#d1d4dc' : '#131722';
  const subtext = isDark ? '#787b86' : '#9098a1';
  const hoverBg = isDark ? '#2a2e39' : '#f0f3fa';

  const tabs = ['All', 'Indian Stocks', 'Stocks', 'Crypto', 'Forex', 'Indices', 'Commodities'];
  const [activeTab, setActiveTab] = useState('All');
  const [query, setQuery] = useState('');

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (activeTab === 'All') {
          const { searchBinance } = await import('../../services/binanceApi');
          const [angelData, binanceData, fmpData] = await Promise.all([
            searchAngelInstruments(query),
            searchBinance(query),
            searchCompanies(query, '')
          ]);
          setResults([
            ...angelData.slice(0, 5).map(d => ({
              symbol: d.symbol, name: d.name, exchangeShortName: d.exch_seg, currency: 'INR', type: 'angel', token: d.token
            })),
            ...binanceData.slice(0, 5),
            ...fmpData.slice(0, 10).map(d => ({ ...d, type: 'stock' }))
          ]);
        } else if (activeTab === 'Indian Stocks') {
          const angelData = await searchAngelInstruments(query);
          setResults(angelData.map(d => ({
            symbol: d.symbol,
            name: d.name,
            exchangeShortName: d.exch_seg,
            currency: 'INR',
            type: 'angel',
            token: d.token
          })));
        } else if (activeTab === 'Crypto') {
          const { searchBinance } = await import('../../services/binanceApi');
          const binanceData = await searchBinance(query);
          setResults(binanceData);
        } else {
          let exchangeFilter = '';
          if (activeTab === 'Forex') exchangeFilter = 'FOREX';
          if (activeTab === 'Indices') exchangeFilter = 'INDEX';
          if (activeTab === 'Commodities') exchangeFilter = 'COMMODITY';
          
          const data = await searchCompanies(query, exchangeFilter);
          setResults(data.map(d => ({ ...d, type: 'stock' })));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, activeTab]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div 
        style={{ background: bg, borderColor: border, color: text }}
        className="w-[95vw] md:w-[800px] h-[90vh] md:h-[500px] border rounded-lg flex flex-col"
      >
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: border }}>
          <Search style={{ color: subtext }} size={20} />
          <input 
            autoFocus
            type="text" 
            placeholder="Search symbols or companies" 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xl font-medium outline-none placeholder:text-gray-500"
          />
          <button onClick={onClose} className="p-1 hover:opacity-70 rounded transition-opacity"><X size={24} /></button>
        </div>

        <div className="flex items-center gap-4 px-4 border-b overflow-x-auto no-scrollbar" style={{ borderColor: border }}>
          {tabs.map(t => (
            <div 
              key={t}
              onClick={() => { setActiveTab(t); setQuery(''); setResults([]); }}
              className="py-3 cursor-pointer text-sm font-semibold whitespace-nowrap transition-colors"
              style={{
                borderBottom: activeTab === t ? (theme === 'dark' ? '2px solid #ffffff' : '2px solid #000000') : '2px solid transparent',
                color: activeTab === t ? (theme === 'dark' ? '#ffffff' : '#000000') : subtext
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading && <div className="p-8 text-center" style={{ color: subtext }}>Searching...</div>}
          {!loading && results.map(r => (
            <div 
              key={`${r.symbol}-${r.exchangeShortName}`}
              onClick={() => { 
                // Dispatch event so WatchlistSidebar can add it
                window.dispatchEvent(new CustomEvent('add_to_watchlist', { detail: { 
                  symbol: r.symbol, 
                  type: r.type, 
                  binanceSymbol: r.type === 'crypto' ? r.symbol : '',
                  angelToken: r.token,
                  exchange: r.exchangeShortName
                }}));
                onSelect(r.symbol); 
                onClose(); 
              }}
              className="flex items-center justify-between px-6 py-2 cursor-pointer transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-500">
                  {r.symbol.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold">{r.symbol}</span>
                  <span className="text-xs max-w-[300px] truncate" style={{ color: subtext }}>{r.name || r.symbol}</span>
                </div>
              </div>
              <div className="flex flex-col items-end text-xs">
                <span className="font-medium">{r.stockExchange || r.exchangeShortName}</span>
                <span style={{ color: subtext }}>{r.currency}</span>
              </div>
            </div>
          ))}
          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center" style={{ color: subtext }}>No symbols match your criteria</div>
          )}
          {!loading && !query && (
             <div className="p-8 text-center" style={{ color: subtext }}>Type to search instruments</div>
          )}
        </div>
      </div>
    </div>
  );
}
