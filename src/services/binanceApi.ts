import CryptoJS from 'crypto-js';
import { proxyFetch } from '../utils/proxyFetch';

const SPOT_API_URL = 'https://api.binance.com';
const FUTURES_API_URL = 'https://fapi.binance.com';

// -------------------------------------------------------------
// HELPER: SIGN REQUESTS
// -------------------------------------------------------------
const signRequest = (queryString: string, apiSecret: string) => {
  return CryptoJS.HmacSHA256(queryString, apiSecret).toString(CryptoJS.enc.Hex);
};

let timeOffset = 0;
let hasSyncedTime = false;

const syncBinanceTime = async (isFutures = false) => {
  try {
    const endpoint = isFutures ? '/fapi/v1/time' : '/api/v3/time';
    const response = await proxyFetch(`/api/binance${endpoint}`, {
      headers: isFutures ? { 'X-Binance-Futures': 'true' } as any : undefined
    });
    if (response.ok) {
      const data = await response.json();
      const serverTime = data.serverTime;
      const localTime = Date.now();
      timeOffset = serverTime - localTime;
      hasSyncedTime = true;
    }
  } catch (e) {
    console.warn('Failed to sync Binance time:', e);
  }
};

const makeSignedRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  params: Record<string, any>,
  apiKey: string,
  apiSecret: string,
  isFutures = false
) => {
  if (!apiKey || !apiSecret) {
    throw new Error('Binance API keys are required for this endpoint.');
  }

  if (!hasSyncedTime) {
    await syncBinanceTime(isFutures);
  }

  const baseUrl = isFutures ? FUTURES_API_URL : SPOT_API_URL;
  const timestamp = Date.now() + timeOffset;
  
  const queryParams = new URLSearchParams({
    ...params,
    timestamp: timestamp.toString(),
    recvWindow: '5000', // standard Binance recv window
  });

  const queryString = queryParams.toString();
  const signature = signRequest(queryString, apiSecret);
  
  const proxyUrl = `/api/binance${endpoint}?${queryString}&signature=${signature}`;

  const headers: any = {
    'X-MBX-APIKEY': apiKey,
  };
  if (isFutures) {
    headers['X-Binance-Futures'] = 'true';
  }

  const response = await proxyFetch(proxyUrl, {
    method,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Binance API Error: ${errorData.msg || response.statusText}`);
  }

  return response.json();
};

// -------------------------------------------------------------
// PUBLIC ENDPOINTS (No Keys Required)
// -------------------------------------------------------------

export const getBinanceTicker24hr = async (symbol: string) => {
  try {
    const response = await proxyFetch(`/api/binance/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`);
    if (!response.ok) throw new Error('Failed to fetch ticker data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching Binance ticker:', error);
    return null;
  }
};

let binanceExchangeInfo: any[] | null = null;
let isFetchingExchangeInfo = false;

export const searchBinance = async (query: string) => {
  if (!query) return [];
  try {
    if (!binanceExchangeInfo) {
      if (!isFetchingExchangeInfo) {
        isFetchingExchangeInfo = true;
        try {
          const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
          const data = await response.json();
          binanceExchangeInfo = data.symbols;
        } catch (e) {
          console.error("Failed to load Binance exchange info:", e);
        } finally {
          isFetchingExchangeInfo = false;
        }
      }
      
      let retries = 0;
      while (isFetchingExchangeInfo && retries < 10) {
        await new Promise(r => setTimeout(r, 500));
        retries++;
      }
    }

    if (!binanceExchangeInfo) return [];

    const q = query.toLowerCase();
    const results = [];
    for (const sym of binanceExchangeInfo) {
      if (sym.status === 'TRADING' && (sym.symbol.toLowerCase().includes(q) || sym.baseAsset.toLowerCase().includes(q))) {
        results.push({
          symbol: sym.symbol,
          name: `${sym.baseAsset}/${sym.quoteAsset}`,
          currency: sym.quoteAsset,
          stockExchange: 'Binance',
          exchangeShortName: 'CRYPTO',
          type: 'crypto'
        });
        if (results.length >= 20) break;
      }
    }
    return results;
  } catch (error) {
    console.error('Binance Search Error:', error);
    return [];
  }
};

export const getBinanceOpenInterest = async (symbol: string) => {
  try {
    const response = await proxyFetch(`/api/binance/fapi/v1/openInterest?symbol=${symbol.toUpperCase()}`, { headers: { 'X-Binance-Futures': 'true' } as any });
    if (!response.ok) throw new Error('Failed to fetch open interest');
    return await response.json();
  } catch (error) {
    console.error('Error fetching Binance Open Interest:', error);
    return null;
  }
};

export const getBinanceFundingRate = async (symbol: string) => {
  try {
    const response = await proxyFetch(`/api/binance/fapi/v1/premiumIndex?symbol=${symbol.toUpperCase()}`, { headers: { 'X-Binance-Futures': 'true' } as any });
    if (!response.ok) throw new Error('Failed to fetch funding rate');
    return await response.json();
  } catch (error) {
    console.error('Error fetching Binance Funding Rate:', error);
    return null;
  }
};

// -------------------------------------------------------------
// PRIVATE ENDPOINTS (API Keys Required)
// -------------------------------------------------------------

export const getBinanceAccountBalances = async (apiKey: string, apiSecret: string) => {
  try {
    const data = await makeSignedRequest('/api/v3/account', 'GET', {}, apiKey, apiSecret, false);
    // Filter out zero balances for cleaner UI
    if (data && data.balances) {
      return data.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    }
    return [];
  } catch (error) {
    console.error('Error fetching Binance balances:', error);
    throw error;
  }
};

export const getBinanceOpenOrders = async (symbol: string | null, apiKey: string, apiSecret: string) => {
  try {
    const params = symbol ? { symbol: symbol.toUpperCase() } : {};
    return await makeSignedRequest('/api/v3/openOrders', 'GET', params, apiKey, apiSecret, false);
  } catch (error) {
    console.error('Error fetching Binance open orders:', error);
    throw error;
  }
};

export const getBinanceTradeHistory = async (symbol: string, apiKey: string, apiSecret: string) => {
  try {
    const params = { symbol: symbol.toUpperCase(), limit: 50 };
    return await makeSignedRequest('/api/v3/myTrades', 'GET', params, apiKey, apiSecret, false);
  } catch (error) {
    console.error('Error fetching Binance trade history:', error);
    throw error;
  }
};

export const getBinanceSymbol = (symbol: string) => {
  const s = symbol.toUpperCase();
  // Already a Binance symbol ending in USDT or BTC etc — return as-is
  if (s.endsWith('USDT') || s.endsWith('BTC') || s.endsWith('ETH') || s.endsWith('BNB')) return s;
  // Legacy mapping: BTCUSD → BTCUSDT
  if (s.endsWith('USD')) return s.replace('USD', 'USDT');
  return s;
};

export const mapPeriodToInterval = (span: number, type: string) => {
  if (type === 'second') return `${span}s`;
  if (type === 'minute') return `${span}m`;
  if (type === 'hour') return `${span}h`;
  if (type === 'day') return `${span}d`;
  if (type === 'week') return `${span}w`;
  if (type === 'month') return `${span}M`;
  if (type === 'year') return '1M'; // Fetch monthly to aggregate into yearly
  return '1d';
};

export async function fetchBinanceBars(symbol: string, span: number, type: string, totalLimit: number = 500, endTime?: number) {
  const binanceSymbol = getBinanceSymbol(symbol);
  const interval = mapPeriodToInterval(span, type);
  
  const endpoints = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api4.binance.com'
  ];

  for (const base of endpoints) {
    try {
      let allData: any[] = [];
      let currentEndTime = endTime;
      let remaining = totalLimit;

      while (remaining > 0) {
        const batchLimit = Math.min(remaining, 1000);
        let url = `${base}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${batchLimit}`;
        if (currentEndTime) {
          url += `&endTime=${currentEndTime}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Bad response');
        const data = await res.json();
        
        if (!Array.isArray(data) || data.length === 0) break;
        
        const parsed = data.map((d: any) => ({
          timestamp: d[0],
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
          turnover: parseFloat(d[7])
        }));
        
        allData = [...parsed, ...allData];
        remaining -= parsed.length;
        currentEndTime = parsed[0].timestamp - 1;
        
        if (parsed.length < batchLimit) break;
      }
      
      if (allData.length > 0) {
        if (type === 'year') {
          // Aggregate monthly candles into yearly candles
          const yearlyMap = new Map();
          for (const d of allData) {
            const date = new Date(d.timestamp);
            const year = date.getFullYear();
            if (!yearlyMap.has(year)) {
              yearlyMap.set(year, {
                timestamp: new Date(year, 0, 1).getTime(),
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume,
                turnover: d.turnover
              });
            } else {
              const yCandle = yearlyMap.get(year);
              yCandle.high = Math.max(yCandle.high, d.high);
              yCandle.low = Math.min(yCandle.low, d.low);
              yCandle.close = d.close; // Latest close
              yCandle.volume += d.volume;
              yCandle.turnover += d.turnover;
            }
          }
          return Array.from(yearlyMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
        }
        return allData;
      }
    } catch (error) {
      // Ignore and try the next endpoint
    }
  }
  
  // If Binance fails (e.g. ISP block in India), fallback to Kraken
  try {
    const getKrakenInterval = (s: number, t: string) => {
      if (t === 'minute') return s;
      if (t === 'hour') return s * 60;
      if (t === 'day') return s * 1440;
      if (t === 'week') return s * 10080;
      return 1440;
    };
    const krakenInterval = getKrakenInterval(span, type);
    const krakenUrl = `https://api.kraken.com/0/public/OHLC?pair=${binanceSymbol}&interval=${krakenInterval}`;
    const res = await fetch(krakenUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.result) {
        const key = Object.keys(data.result)[0];
        const candles = data.result[key];
        if (Array.isArray(candles) && candles.length > 0) {
          return candles.map((d: any) => ({
            timestamp: d[0] * 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[6]), // Kraken volume is index 6
            turnover: 0 // Optional
          }));
        }
      }
    }
  } catch (error) {
    console.error('Kraken fallback also failed:', error);
  }

  console.error('All REST APIs failed to fetch historical data.');
  return [];
}

export function subscribeToBinanceTicks(symbol: string, span: number, type: string, onTick: (candle: any) => void): () => void {
  const s = symbol.toUpperCase();
  const isMock = ['SPX', 'IXIC', 'DJI', 'VIX', 'US10Y', 'DXY'].includes(s);
  
  if (isMock) {
    // Generate mock ticks for the chart
    const spanMs = type === 'minute' ? span * 60000 : type === 'hour' ? span * 3600000 : type === 'day' ? span * 86400000 : 86400000;
    let basePrice = 150;
    if (s === 'SPX') basePrice = 7489.72;
    else if (s === 'IXIC') basePrice = 18500.20;
    else if (s === 'DJI') basePrice = 38500.50;
    
    let currentPrice = basePrice;
    
    const interval = setInterval(() => {
      currentPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.0005);
      const now = Date.now();
      const currentCandleTime = now - (now % spanMs);
      
      onTick({
        timestamp: currentCandleTime,
        open: currentPrice * 0.9999,
        high: currentPrice * 1.0005,
        low: currentPrice * 0.9995,
        close: currentPrice,
        volume: Math.random() * 100,
        turnover: Math.random() * 5000
      });
    }, 2000);
    return () => clearInterval(interval);
  }

  const binanceSymbol = getBinanceSymbol(symbol).toLowerCase();
  const interval = mapPeriodToInterval(span, type);
  
  const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${interval}`;
  console.log(`Connecting to Binance WS: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log(`Binance WS Connected: ${wsUrl}`);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.e === 'kline' && message.k) {
        const k = message.k;
        const candle = {
          timestamp: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          turnover: parseFloat(k.q)
        };
        onTick(candle);
      }
    } catch (error) {
      console.error('Error parsing Binance WS message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('Binance WS Error:', error);
  };
  
  return () => {
    console.log(`Closing Binance WS: ${wsUrl}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}
