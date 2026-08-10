import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { getIncomeStatement, FMPIncomeStatement } from '../../services/fmpApi';

interface BottomPanelProps {
  theme: 'light' | 'dark';
  activeSymbol: string;
}

export default function BottomPanel({ theme, activeSymbol }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState('screener');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosed, setIsClosed] = useState(true); // Default closed in TV until opened
  const [incomeStatement, setIncomeStatement] = useState<FMPIncomeStatement[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  const isDark = theme === 'dark';
  const bg = isDark ? '#131722' : '#ffffff';
  const border = isDark ? '#2b2b43' : '#e0e3eb';
  const text = isDark ? '#d1d4dc' : '#131722';
  const activeText = isDark ? '#ffffff' : '#000000';

  const tabs = [
    { id: 'screener', label: 'Stock Screener' },
    { id: 'pine', label: 'Pine Editor' },
    { id: 'tester', label: 'Strategy Tester' },
    { id: 'trading', label: 'Trading Panel' },
    { id: 'financials', label: 'Financials' },
  ];

  useEffect(() => {
    if (activeTab === 'financials' && !isClosed) {
      setLoadingFinancials(true);
      getIncomeStatement(activeSymbol)
        .then(data => {
          setIncomeStatement(data || []);
          setLoadingFinancials(false);
        })
        .catch(() => {
          setIncomeStatement([]);
          setLoadingFinancials(false);
        });
    }
  }, [activeSymbol, activeTab, isClosed]);

  if (isClosed) {
    return (
      <div 
        style={{ borderTop: `1px solid ${border}`, background: bg, color: text }}
        className="hidden md:flex items-center gap-4 px-4 h-6 text-xs font-semibold cursor-pointer"
      >
        {tabs.map(t => (
          <div 
            key={t.id} 
            onClick={() => { setActiveTab(t.id); setIsClosed(false); }}
            className="hover:text-black dark:hover:text-white transition-colors leading-none"
          >
            {t.label}
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (val == null) return '-';
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    return val.toLocaleString();
  };

  return (
    <div 
      style={{ borderTop: `1px solid ${border}`, background: bg, color: text }}
      className={`hidden md:flex flex-col transition-all duration-300 ${isExpanded ? 'h-96' : 'h-48'}`}
    >
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b px-4" style={{ borderColor: border }}>
        <div className="flex items-center gap-6 text-sm font-semibold h-10">
          {tabs.map(t => (
            <div 
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`cursor-pointer h-full flex items-center border-b-2 transition-colors ${activeTab === t.id ? 'border-black dark:border-white' : 'border-transparent hover:text-black dark:hover:text-white'}`}
              style={{ color: activeTab === t.id ? activeText : text }}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:opacity-70">
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => setIsClosed(true)} className="p-1 hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 text-sm font-mono opacity-80">
        {activeTab === 'screener' && <div>Screener data will load here...</div>}
        {activeTab === 'pine' && <div>// Pine Script Editor v5<br/>indicator("My Script")<br/>plot(close)</div>}
        {activeTab === 'tester' && <div>Strategy tester results...</div>}
        {activeTab === 'trading' && <div>Paper trading connection active. Balance: $100,000.00</div>}
        {activeTab === 'financials' && (
          <div className="flex flex-col h-full ">
            <h3 className="font-bold mb-2">Income Statement - {activeSymbol}</h3>
            {loadingFinancials ? (
              <div className="text-gray-500">Loading financials...</div>
            ) : incomeStatement.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    <th className="py-2">Date</th>
                    <th className="py-2 text-right">Revenue</th>
                    <th className="py-2 text-right">Gross Profit</th>
                    <th className="py-2 text-right">Operating Income</th>
                    <th className="py-2 text-right">Net Income</th>
                    <th className="py-2 text-right">EPS</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeStatement.map((stmt, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px dashed ${border}` }}>
                      <td className="py-2">{stmt.calendarYear}</td>
                      <td className="py-2 text-right">{formatCurrency(stmt.revenue)}</td>
                      <td className="py-2 text-right">{formatCurrency(stmt.grossProfit)}</td>
                      <td className="py-2 text-right">{formatCurrency(stmt.operatingIncome)}</td>
                      <td className="py-2 text-right">{formatCurrency(stmt.netIncome)}</td>
                      <td className="py-2 text-right">{stmt.eps.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-gray-500">No income statement data available for {activeSymbol}.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
