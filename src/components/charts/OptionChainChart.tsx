import React, { useMemo, useEffect, useRef, useState } from 'react';
import { BarChart2, Table as TableIcon } from 'lucide-react';

interface OptionChainChartProps {
  data: any[];
  theme?: 'dark' | 'light';
}

const OptionChainChart: React.FC<OptionChainChartProps> = ({ data, theme = 'light' }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'table' | 'analytics'>('table');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.strike_price - b.strike_price);
  }, [data]);

  const maxOI = useMemo(() => {
    let max = 0;
    data.forEach(item => {
      const cOI = item.call_options?.market_data?.oi || 0;
      const pOI = item.put_options?.market_data?.oi || 0;
      if (cOI > max) max = cOI;
      if (pOI > max) max = pOI;
    });
    return max;
  }, [data]);

  // Find ATM strike (where Call LTP and Put LTP are closest)
  const atmIndex = useMemo(() => {
    let minDiff = Infinity;
    let idx = 0;
    sortedData.forEach((row, i) => {
      const callLTP = row.call_options?.market_data?.ltp || 0;
      const putLTP = row.put_options?.market_data?.ltp || 0;
      if (callLTP > 0 && putLTP > 0) {
        const diff = Math.abs(callLTP - putLTP);
        if (diff < minDiff) {
          minDiff = diff;
          idx = i;
        }
      }
    });
    return idx;
  }, [sortedData]);

  // Analytics Calculations
  const analytics = useMemo(() => {
    let totalCallOI = 0;
    let totalPutOI = 0;
    let maxCallOI = 0;
    let maxPutOI = 0;
    let resistanceStrike = 0;
    let supportStrike = 0;

    sortedData.forEach(row => {
      const cOI = row.call_options?.market_data?.oi || 0;
      const pOI = row.put_options?.market_data?.oi || 0;

      totalCallOI += cOI;
      totalPutOI += pOI;

      if (cOI > maxCallOI) {
        maxCallOI = cOI;
        resistanceStrike = row.strike_price;
      }
      if (pOI > maxPutOI) {
        maxPutOI = pOI;
        supportStrike = row.strike_price;
      }
    });

    const pcr = totalCallOI > 0 ? (totalPutOI / totalCallOI).toFixed(2) : '0';
    let pcrSentiment = 'Neutral';
    if (parseFloat(pcr) > 1.2) pcrSentiment = 'Bullish';
    if (parseFloat(pcr) < 0.8) pcrSentiment = 'Bearish';

    return { totalCallOI, totalPutOI, pcr, pcrSentiment, resistanceStrike, supportStrike, maxCallOI, maxPutOI };
  }, [sortedData]);

  const maxPain = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return 0;
    
    let minTotalValue = Infinity;
    let maxPainStrike = 0;

    sortedData.forEach((potentialExpiryRow) => {
      const expiryPrice = potentialExpiryRow.strike_price;
      let totalValue = 0;

      sortedData.forEach((row) => {
        const strike = row.strike_price;
        const callOI = row.call_options?.market_data?.oi || 0;
        const putOI = row.put_options?.market_data?.oi || 0;

        if (expiryPrice > strike) {
          totalValue += (expiryPrice - strike) * callOI;
        }
        if (strike > expiryPrice) {
          totalValue += (strike - expiryPrice) * putOI;
        }
      });

      if (totalValue < minTotalValue) {
        minTotalValue = totalValue;
        maxPainStrike = expiryPrice;
      }
    });

    return maxPainStrike;
  }, [sortedData]);

  // Scroll to ATM on mount
  useEffect(() => {
    if (view === 'table' && scrollRef.current && sortedData.length > 0) {
      const rowHeight = 36; 
      const scrollPos = Math.max(0, (atmIndex * rowHeight) - 150);
      scrollRef.current.scrollTop = scrollPos;
    }
  }, [atmIndex, sortedData.length, view]);

  const formatNum = (num: number) => {
    if (!num) return '-';
    if (num > 100000) return (num / 100000).toFixed(2) + 'L';
    if (num > 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toString();
  };

  if (!data || data.length === 0) {
    return null; 
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm relative">
      {/* Toggle View Header */}
      <div className="flex items-center justify-between p-2 bg-slate-50 border-b border-slate-200">
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${view === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <TableIcon size={14} /> Chain Table
          </button>
          <button
            onClick={() => setView('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${view === 'analytics' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <BarChart2 size={14} /> Analytics
          </button>
        </div>
      </div>

      {view === 'table' && (
        <>
          {/* Header */}
          <div className="flex bg-slate-900 text-white text-xs font-bold capitalize sticky top-0 z-20 shadow-md">
            <div className="flex-1 flex justify-between items-center px-4 py-2.5 border-r border-slate-700 bg-gradient-to-r from-red-900/40 to-transparent">
              <span className="w-20 text-left text-slate-300">Call OI</span>
              <span className="w-16 text-right text-slate-200">LTP</span>
              <span className="w-24 text-right text-red-400 font-black ">CALLS</span>
            </div>
            <div className="w-28 flex items-center justify-center py-2.5 bg-slate-950 border-x border-slate-700 shadow-inner">
              <span className="text-slate-200">STRIKE</span>
            </div>
            <div className="flex-1 flex justify-between items-center px-4 py-2.5 border-l border-slate-700 bg-gradient-to-l from-emerald-900/40 to-transparent">
              <span className="w-24 text-left text-emerald-400 font-black ">PUTS</span>
              <span className="w-16 text-left text-slate-200">LTP</span>
              <span className="w-20 text-right text-slate-300">Put OI</span>
            </div>
          </div>

          {/* Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
            {sortedData.map((row, idx) => {
              const callLTP = row.call_options?.market_data?.ltp || 0;
              const putLTP = row.put_options?.market_data?.ltp || 0;
              const callOI = row.call_options?.market_data?.oi || 0;
              const putOI = row.put_options?.market_data?.oi || 0;

              const callOiPercent = maxOI ? (callOI / maxOI) * 100 : 0;
              const putOiPercent = maxOI ? (putOI / maxOI) * 100 : 0;
              const isATM = idx === atmIndex;

              return (
                <div 
                  key={row.strike_price} 
                  className={`flex text-xs border-b border-slate-100 transition-colors group relative
                    ${isATM ? 'bg-yellow-50/50' : 'hover:bg-slate-50'}
                  `}
                >
                  {isATM && (
                    <div className="absolute left-0 right-0 top-0 h-[1px] bg-yellow-400 z-30" />
                  )}
                  {isATM && (
                    <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-yellow-400 z-30" />
                  )}

                  <div className="flex-1 flex items-center justify-between px-4 py-1.5 relative border-r border-slate-100">
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-red-100/50 z-0 transition-all duration-500 rounded-r" 
                      style={{ width: `${callOiPercent}%` }}
                    />
                    <div className="w-20 text-left z-10 font-mono text-xs text-slate-500">{formatNum(callOI)}</div>
                    <div className="w-16 text-right z-10 font-mono font-bold text-slate-800">{callLTP ? callLTP.toFixed(2) : '-'}</div>
                    <div className="w-24 text-right z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm transition-all transform hover:scale-105">
                        BUY CE
                      </button>
                    </div>
                  </div>

                  <div className={`w-28 text-center py-2 font-black border-x border-slate-200 shadow-sm z-10 flex items-center justify-center relative
                    ${isATM ? 'bg-yellow-100 text-yellow-900 text-sm ring-1 ring-yellow-400 shadow-md' : 'bg-slate-50/80 text-slate-700'}
                  `}>
                    {isATM && <span className="absolute left-1 text-[8px] text-yellow-600 font-bold capitalize tracking-tighter">ATM</span>}
                    {row.strike_price}
                  </div>

                  <div className="flex-1 flex items-center justify-between px-4 py-1.5 relative border-l border-slate-100">
                    <div 
                      className="absolute right-0 top-0 bottom-0 bg-emerald-100/50 z-0 transition-all duration-500 rounded-l" 
                      style={{ width: `${putOiPercent}%` }}
                    />
                    <div className="w-24 text-left z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded text-xs font-bold shadow-sm transition-all transform hover:scale-105">
                        BUY PE
                      </button>
                    </div>
                    <div className="w-16 text-left z-10 font-mono font-bold text-slate-800">{putLTP ? putLTP.toFixed(2) : '-'}</div>
                    <div className="w-20 text-right z-10 font-mono text-xs text-slate-500">{formatNum(putOI)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === 'analytics' && (
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/80">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <BarChart2 className="text-purple-600" /> Option Chain Analytics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* PCR Card */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
              <p className="text-xs text-slate-500 font-bold capitalize mb-2">Put-Call Ratio (PCR)</p>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-black tracking-tighter ${parseFloat(analytics.pcr) > 1 ? 'text-emerald-500' : 'text-red-500'}`}>{analytics.pcr}</span>
                <span className="text-sm font-bold text-slate-600 mb-1.5">{analytics.pcrSentiment}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-tight">A PCR &gt; 1 indicates more Puts (Support), suggesting bullish sentiment.</p>
            </div>
            
            {/* Max Pain Card */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <BarChart2 size={64} />
              </div>
              <p className="text-xs text-slate-500 font-bold capitalize mb-2 relative z-10">Max Pain Strike</p>
              <div className="flex items-end gap-2 relative z-10">
                <span className="text-4xl font-black tracking-tighter text-blue-600">{maxPain}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-tight relative z-10">The strike where option sellers face the least payout (minimum pain).</p>
            </div>

            {/* Support Card */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-emerald-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-emerald-400" />
              <p className="text-xs text-emerald-600 font-bold capitalize mb-2">Highest Support (Put OI)</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-black tracking-tighter text-emerald-600">{analytics.supportStrike}</span>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">{formatNum(analytics.maxPutOI)} OI</span>
            </div>

            {/* Resistance Card */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-red-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-red-400" />
              <p className="text-xs text-red-600 font-bold capitalize mb-2">Highest Resistance (Call OI)</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-black tracking-tighter text-red-600">{analytics.resistanceStrike}</span>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">{formatNum(analytics.maxCallOI)} OI</span>
            </div>
          </div>
          
          {/* Visual Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-slate-800">Open Interest Distribution (Calls vs Puts)</h4>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded-sm" /> Call OI (Resistance)</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded-sm" /> Put OI (Support)</div>
                </div>
             </div>
             
             <div className="space-y-3">
               {sortedData.filter((_, i) => Math.abs(i - atmIndex) <= 10).map(row => {
                  const callOI = row.call_options?.market_data?.oi || 0;
                  const putOI = row.put_options?.market_data?.oi || 0;
                  const cPct = (callOI / (analytics.maxCallOI || 1)) * 100;
                  const pPct = (putOI / (analytics.maxPutOI || 1)) * 100;
                  const isATM = row.strike_price === sortedData[atmIndex]?.strike_price;
                  
                  return (
                    <div key={row.strike_price} className="flex items-center gap-4 text-xs font-mono group hover:bg-slate-50 p-1 rounded transition-colors">
                      <div className="flex-1 flex justify-end items-center gap-2">
                        <span className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">{formatNum(callOI)}</span>
                        <div className="h-5 bg-gradient-to-l from-red-400 to-red-300 rounded-l transition-all duration-500" style={{ width: `${cPct}%` }} />
                      </div>
                      <div className={`w-20 text-center font-black text-sm py-1 border-x border-slate-200 ${isATM ? 'text-yellow-700 bg-yellow-100 rounded-lg shadow-sm border-0' : 'text-slate-600'}`}>
                        {row.strike_price}
                      </div>
                      <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="h-5 bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-r transition-all duration-500" style={{ width: `${pPct}%` }} />
                        <span className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">{formatNum(putOI)}</span>
                      </div>
                    </div>
                  )
               })}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionChainChart;
