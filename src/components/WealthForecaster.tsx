import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { Sip, Fd, Holding, PhysicalAsset, BankAccount } from '../types';
import { IndianRupee, TrendingUp, Info } from 'lucide-react';

interface WealthForecasterProps {
  sips: Sip[];
  fds: Fd[];
  holdings: Holding[];
  physicalAssets?: PhysicalAsset[];
  bankAccounts?: BankAccount[];
  livePrices?: Record<string, any>;
}

export function WealthForecaster({ sips, fds, holdings, physicalAssets = [], bankAccounts = [], livePrices }: WealthForecasterProps) {
  const [projectionYears, setProjectionYears] = useState<number>(20);
  const [expectedEquityReturn, setExpectedEquityReturn] = useState<number>(12);
  const [expectedDebtReturn, setExpectedDebtReturn] = useState<number>(7);
  const [expectedPhysicalReturn, setExpectedPhysicalReturn] = useState<number>(6);
  const [expectedBankReturn, setExpectedBankReturn] = useState<number>(4);

  const forecastData = useMemo(() => {
    // Current lumpsum (Holdings + FDs + Physical + Bank)
    const currentEquity = holdings.reduce((sum, h) => {
      const live = livePrices?.[h.type === 'stock' ? `stock_${h.symbol}` : `mf_${h.schemeCode}`];
      const price = live ? live.currentPrice : h.buyPrice;
      return sum + (price * h.quantity);
    }, 0);
    const currentDebt = fds.reduce((sum, f) => sum + f.principal, 0);
    const currentPhysical = physicalAssets.reduce((sum, a) => sum + a.currentValue, 0);
    const currentBank = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);

    // Monthly SIP (Assume all are equity for simplicity, unless we check risk level)
    const monthlySip = sips.reduce((sum, s) => sum + s.amount, 0);

    const data = [];
    let accumulatedEquity = currentEquity;
    let accumulatedDebt = currentDebt;
    let accumulatedPhysical = currentPhysical;
    let accumulatedBank = currentBank;
    
    // Monthly interest rates
    const monthlyEquityRate = (expectedEquityReturn / 100) / 12;
    const monthlyDebtRate = (expectedDebtReturn / 100) / 12;
    const monthlyPhysicalRate = (expectedPhysicalReturn / 100) / 12;
    const monthlyBankRate = (expectedBankReturn / 100) / 12;

    for (let year = 0; year <= projectionYears; year++) {
      if (year === 0) {
        data.push({
          year: 'Now',
          Invested: currentEquity + currentDebt + currentPhysical + currentBank,
          Wealth: currentEquity + currentDebt + currentPhysical + currentBank
        });
        continue;
      }

      let yearInvested = currentEquity + currentDebt + currentPhysical + currentBank + (monthlySip * 12 * year);
      
      // Calculate 1 year growth
      for(let m = 1; m <= 12; m++) {
        accumulatedEquity = accumulatedEquity * (1 + monthlyEquityRate) + monthlySip;
        accumulatedDebt = accumulatedDebt * (1 + monthlyDebtRate);
        accumulatedPhysical = accumulatedPhysical * (1 + monthlyPhysicalRate);
        accumulatedBank = accumulatedBank * (1 + monthlyBankRate);
      }

      data.push({
        year: `Year ${year}`,
        Invested: Math.round(yearInvested),
        Wealth: Math.round(accumulatedEquity + accumulatedDebt + accumulatedPhysical + accumulatedBank)
      });
    }
    
    return data;
  }, [sips, fds, holdings, physicalAssets, bankAccounts, projectionYears, expectedEquityReturn, expectedDebtReturn, expectedPhysicalReturn, expectedBankReturn, livePrices]);

  const finalWealth = forecastData[forecastData.length - 1]?.Wealth || 0;
  const finalInvested = forecastData[forecastData.length - 1]?.Invested || 0;
  const wealthGained = finalWealth - finalInvested;

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      <div className="bg-linear-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <TrendingUp size={120} />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-indigo-200 font-medium text-sm tracking-wide mb-1">PROJECTED WEALTH IN {projectionYears} YEARS</h2>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">{formatCurrency(finalWealth)}</span>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div>
              <p className="text-indigo-300/70 text-xs font-medium">Total Invested</p>
              <p className="font-semibold">{formatCurrency(finalInvested)}</p>
            </div>
            <div>
              <p className="text-indigo-300/70 text-xs font-medium">Est. Returns</p>
              <p className="font-semibold text-emerald-400">+{formatCurrency(wealthGained)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Growth Trajectory</h3>
        </div>
        <div className="h-64 w-full">
          <ReactECharts 
            option={{
              tooltip: { 
                trigger: 'axis', 
                backgroundColor: '#0f172a', 
                textStyle: { color: '#fff', fontSize: 12 }, 
                borderColor: '#334155',
                formatter: (params: any) => {
                  let res = `<div style="font-weight:bold;margin-bottom:4px;">${params[0].name}</div>`;
                  params.forEach((p: any) => {
                    res += `<div style="display:flex;justify-content:space-between;gap:12px;">
                              <span>${p.marker} ${p.seriesName}</span>
                              <span style="font-weight:bold;">${formatCurrency(p.value)}</span>
                            </div>`;
                  });
                  return res;
                }
              },
              legend: { bottom: 0, textStyle: { fontSize: 10, fontWeight: 'bold' }, icon: 'circle' },
              grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
              xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                data: forecastData.map(d => d.year),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: '#94a3b8', fontSize: 10 }
              },
              yAxis: { 
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
                axisLabel: { 
                  formatter: (val: number) => val >= 10000000 ? `₹${(val/10000000).toFixed(0)}Cr` : val >= 100000 ? `₹${(val/100000).toFixed(0)}L` : `₹${val}`,
                  color: '#94a3b8', fontSize: 10 
                }
              },
              series: [
                {
                  name: 'Wealth',
                  type: 'line',
                  smooth: true,
                  symbol: 'none',
                  lineStyle: { color: '#4f46e5', width: 3 },
                  areaStyle: {
                    color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: 'rgba(79, 70, 229, 0.3)' }, { offset: 1, color: 'rgba(79, 70, 229, 0)' }]
                    }
                  },
                  data: forecastData.map(d => d.Wealth)
                },
                {
                  name: 'Invested',
                  type: 'line',
                  smooth: true,
                  symbol: 'none',
                  lineStyle: { color: '#94a3b8', width: 2 },
                  areaStyle: {
                    color: {
                      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                      colorStops: [{ offset: 0, color: 'rgba(148, 163, 184, 0.2)' }, { offset: 1, color: 'rgba(148, 163, 184, 0)' }]
                    }
                  },
                  data: forecastData.map(d => d.Invested)
                }
              ]
            }} 
            style={{ height: '100%', width: '100%' }} 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-800">Assumptions & Adjustments</h3>
        
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Projection Period</label>
            <span className="text-xs font-bold text-indigo-600">{projectionYears} Years</span>
          </div>
          <input 
            type="range" min="5" max="40" step="5"
            value={projectionYears} 
            onChange={(e) => setProjectionYears(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Expected Equity Return (SIPs & Stocks)</label>
            <span className="text-xs font-bold text-indigo-600">{expectedEquityReturn}% p.a.</span>
          </div>
          <input 
            type="range" min="5" max="25" step="1"
            value={expectedEquityReturn} 
            onChange={(e) => setExpectedEquityReturn(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Expected Debt Return (FDs)</label>
            <span className="text-xs font-bold text-indigo-600">{expectedDebtReturn}% p.a.</span>
          </div>
          <input 
            type="range" min="4" max="12" step="0.5"
            value={expectedDebtReturn} 
            onChange={(e) => setExpectedDebtReturn(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Expected Physical Asset Return (Real Estate/Gold)</label>
            <span className="text-xs font-bold text-indigo-600">{expectedPhysicalReturn}% p.a.</span>
          </div>
          <input 
            type="range" min="0" max="15" step="0.5"
            value={expectedPhysicalReturn} 
            onChange={(e) => setExpectedPhysicalReturn(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Expected Bank Savings Return</label>
            <span className="text-xs font-bold text-indigo-600">{expectedBankReturn}% p.a.</span>
          </div>
          <input 
            type="range" min="0" max="8" step="0.5"
            value={expectedBankReturn} 
            onChange={(e) => setExpectedBankReturn(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="bg-slate-50 p-3 rounded-xl flex gap-3 text-xs text-slate-700 mt-2">
          <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
          <p>This forecast calculates exponential growth compounded monthly based on your current active SIPs ({formatCurrency(sips.reduce((s,x)=>s+x.amount,0))}/mo), FDs, Bank Balances, Physical Assets, and Stock Holdings. Inflation is not factored in.</p>
        </div>
      </div>
    </div>
  );
}
