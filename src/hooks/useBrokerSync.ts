import { useState, useEffect } from 'react';
import { Holding } from '../types';

export interface BrokerFunds {
  upstox: { available: number; utilized: number };
  dhan: { available: number; utilized: number };
  angel: { available: number; utilized: number };
  zerodha: { available: number; utilized: number };
  totalAvailable: number;
}

export function useBrokerSync(userId: string | undefined) {
  const [brokerHoldings, setBrokerHoldings] = useState<Holding[]>([]);
  const [brokerRealizedTrades, setBrokerRealizedTrades] = useState<any[]>([]);
  const [brokerFunds, setBrokerFunds] = useState<BrokerFunds>({
    upstox: { available: 0, utilized: 0 },
    dhan: { available: 0, utilized: 0 },
    angel: { available: 0, utilized: 0 },
    zerodha: { available: 0, utilized: 0 },
    totalAvailable: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchBrokerData = async () => {
    if (!userId) return;
    setIsSyncing(true);

    const upstoxToken = localStorage.getItem('upstox_access_token');
    const dhanToken = localStorage.getItem('dhan_access_token');
    const angelToken = localStorage.getItem('angel_access_token');
    const kiteToken = localStorage.getItem('kite_access_token');

    let allHoldings: Holding[] = [];
    let fundsState = {
      upstox: { available: 0, utilized: 0 },
      dhan: { available: 0, utilized: 0 },
      angel: { available: 0, utilized: 0 },
      zerodha: { available: 0, utilized: 0 },
      totalAvailable: 0
    };

    // 1. Fetch Upstox
    if (upstoxToken) {
      try {
        const [fundsRes, holdingsRes, mfRes, pnlRes] = await Promise.all([
          fetch('/api/upstox/funds', { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
          fetch('/api/upstox/holdings', { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
          fetch('/api/upstox/mutual-funds', { headers: { 'Authorization': `Bearer ${upstoxToken}` } }),
          fetch('/api/upstox/trade-pnl?segment=EQ&financial_year=2425&page_number=1&page_size=1000', { headers: { 'Authorization': `Bearer ${upstoxToken}` } })
        ]);

        if (fundsRes.ok) {
          const fData = await fundsRes.json();
          if (fData.data?.equity) {
            fundsState.upstox.available = parseFloat(fData.data.equity.available_margin || 0);
            fundsState.upstox.utilized = parseFloat(fData.data.equity.used_margin || 0);
          }
        }

        if (holdingsRes.ok) {
          const hData = await holdingsRes.json();
          if (hData.data) {
            hData.data.forEach((h: any) => {
              allHoldings.push({
                id: `upstox_${h.instrument_token}`,
                userId,
                type: 'stock',
                symbol: h.trading_symbol || h.instrument_token,
                name: h.company_name || h.trading_symbol,
                buyPrice: parseFloat(h.average_price),
                quantity: parseInt(h.quantity),
                buyDate: new Date().toISOString().split('T')[0],
                assetClass: 'Equity',
                broker: 'Upstox',
                isAutoSynced: true
              });
            });
          }
        }

        if (mfRes.ok) {
          const mData = await mfRes.json();
          if (mData.data) {
            mData.data.forEach((m: any) => {
              allHoldings.push({
                id: `upstox_mf_${m.isin}`,
                userId,
                type: 'mf',
                symbol: m.fund_name,
                name: m.fund_name,
                buyPrice: parseFloat(m.average_price),
                quantity: parseFloat(m.quantity),
                buyDate: new Date().toISOString().split('T')[0],
                assetClass: 'Equity',
                broker: 'Upstox',
                isAutoSynced: true
              });
            });
          }
        }

        if (pnlRes.ok) {
          const pData = await pnlRes.json();
          if (pData.data) {
             const mappedPnl = (Array.isArray(pData.data) ? pData.data : (pData.data.profit_loss || [])).map((t: any) => ({
                id: `upstox_pnl_${t.isin || t.instrument_token || Math.random()}`,
                userId,
                type: 'stock',
                symbol: t.trading_symbol || t.scrip_name || t.instrument_token || 'Unknown',
                name: t.trading_symbol || t.scrip_name || t.instrument_token || 'Unknown',
                buyPrice: parseFloat(t.buy_average || t.buy_price || 0),
                exitPrice: parseFloat(t.sell_average || t.sell_price || 0),
                quantity: parseFloat(t.quantity || 0),
                pnl: parseFloat(t.realised_profit || t.profit_loss || 0),
                exitDate: t.exit_date || new Date().toISOString().split('T')[0],
                broker: 'Upstox',
                isAutoSynced: true
             }));
             setBrokerRealizedTrades((prev) => [...prev, ...mappedPnl]);
          }
        }
      } catch (err) {
        console.error("Upstox sync error:", err);
      }
    }

    // 2. Fetch Dhan
    if (dhanToken) {
      try {
        const [fundsRes, holdingsRes] = await Promise.all([
          fetch('/api/dhan/funds', { headers: { 'Authorization': `Bearer ${dhanToken}` } }),
          fetch('/api/dhan/holdings', { headers: { 'Authorization': `Bearer ${dhanToken}` } })
        ]);

        if (fundsRes.ok) {
          const fData = await fundsRes.json();
          fundsState.dhan.available = parseFloat(fData.availabelBalance || 0);
          fundsState.dhan.utilized = parseFloat(fData.utilizedAmount || 0);
        }

        if (holdingsRes.ok) {
          const hData = await holdingsRes.json();
          if (Array.isArray(hData)) {
            hData.forEach((h: any) => {
              allHoldings.push({
                id: `dhan_${h.tradingSymbol}`,
                userId,
                type: 'stock',
                symbol: h.tradingSymbol,
                name: h.tradingSymbol, // Dhan API might not return full company name
                buyPrice: parseFloat(h.avgCostPrice),
                quantity: parseInt(h.totalQty),
                buyDate: new Date().toISOString().split('T')[0],
                assetClass: 'Equity',
                broker: 'Dhan',
                isAutoSynced: true
              });
            });
          }
        }
      } catch (err) {
        console.error("Dhan sync error:", err);
      }
    }

    // 3. Fetch Angel One
    if (angelToken) {
      const clientCode = localStorage.getItem('angel_client_code');
      const apiKey = localStorage.getItem('angel_api_key');
      if (clientCode && apiKey) {
        try {
          const headers = {
            'Authorization': `Bearer ${angelToken}`,
            'X-ClientCode': clientCode,
            'X-PrivateKey': apiKey
          };
          const [fundsRes, holdingsRes] = await Promise.all([
            fetch('/api/angel/funds', { headers }),
            fetch('/api/angel/holdings', { headers })
          ]);

          if (fundsRes.ok) {
            const fData = await fundsRes.json();
            if (fData.data) {
              fundsState.angel.available = parseFloat(fData.data.net || 0);
              fundsState.angel.utilized = parseFloat(fData.data.utilizedmargin || 0);
            }
          }

          if (holdingsRes.ok) {
            const hData = await holdingsRes.json();
            if (hData.data) {
              hData.data.forEach((h: any) => {
                allHoldings.push({
                  id: `angel_${h.tradingsymbol}`,
                  userId,
                  type: 'stock',
                  symbol: h.tradingsymbol,
                  name: h.tradingsymbol,
                  buyPrice: parseFloat(h.averageprice),
                  quantity: parseInt(h.quantity),
                  buyDate: new Date().toISOString().split('T')[0],
                  assetClass: 'Equity',
                  broker: 'Angel One',
                  isAutoSynced: true
                });
              });
            }
          }
        } catch (err) {
          console.error("Angel One sync error:", err);
        }
      }
    }

    // 4. Fetch Zerodha Kite
    if (kiteToken) {
      const kiteApiKey = localStorage.getItem('kite_api_key');
      if (kiteApiKey) {
        try {
          const headers = {
            'Authorization': `token ${kiteApiKey}:${kiteToken}`
          };
          const [fundsRes, holdingsRes] = await Promise.all([
            fetch('/api/kite/funds', { headers }),
            fetch('/api/kite/holdings', { headers })
          ]);

          if (fundsRes.ok) {
            const fData = await fundsRes.json();
            if (fData.data?.equity) {
              fundsState.zerodha.available = parseFloat(fData.data.equity.available?.margin || 0);
              fundsState.zerodha.utilized = parseFloat(fData.data.equity.utilised?.debits || 0);
            }
          }

          if (holdingsRes.ok) {
            const hData = await holdingsRes.json();
            if (hData.data) {
              hData.data.forEach((h: any) => {
                allHoldings.push({
                  id: `zerodha_${h.tradingsymbol}`,
                  userId,
                  type: 'stock',
                  symbol: h.tradingsymbol,
                  name: h.tradingsymbol,
                  buyPrice: parseFloat(h.average_price),
                  quantity: parseInt(h.quantity),
                  buyDate: new Date().toISOString().split('T')[0],
                  assetClass: 'Equity',
                  broker: 'Zerodha',
                  isAutoSynced: true
                });
              });
            }
          }
        } catch (err) {
          console.error("Zerodha sync error:", err);
        }
      }
    }

    fundsState.totalAvailable = fundsState.upstox.available + fundsState.dhan.available + fundsState.angel.available + fundsState.zerodha.available;

    setBrokerHoldings(allHoldings);
    setBrokerFunds(fundsState);
    setIsSyncing(false);
  };

  useEffect(() => {
    fetchBrokerData();
    const interval = setInterval(fetchBrokerData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [userId]);

  return { brokerHoldings, brokerRealizedTrades, brokerFunds, isSyncing, refreshBrokerData: fetchBrokerData };
}
