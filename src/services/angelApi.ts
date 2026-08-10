import { proxyFetch } from '../utils/proxyFetch';

export interface AngelScrip {
  token: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: string;
  lotsize: string;
  instrumenttype: string;
  exch_seg: string;
  tick_size: string;
}

export const searchAngelInstruments = async (query: string): Promise<AngelScrip[]> => {
  if (!query) return [];
  try {
    const res = await proxyFetch(`/api/angel/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch from Angel proxy');
    return await res.json();
  } catch (error) {
    console.error('Angel Search Error:', error);
    return [];
  }
};

export const getAngelQuote = async (exchange: string, symbol: string, token: string) => {
  try {
    const jwt = localStorage.getItem('angel_access_token');
    const apiKey = localStorage.getItem('angel_api_key');
    if (!jwt || !apiKey) {
      console.warn("Cannot fetch Angel Quote: User is not logged in to Angel One.");
      return null;
    }

    const res = await proxyFetch('/api/angel/quote', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'X-PrivateKey': apiKey,
        'Content-Type': 'application/json'
      } as any,
      body: JSON.stringify({
        exchange: exchange || 'NSE',
        tradingsymbol: symbol,
        symboltoken: token
      })
    });
    
    if (!res.ok) throw new Error('Failed to fetch LTP from Angel proxy');
    const data = await res.json();
    
    if (data.status && data.data) {
      return {
        price: data.data.ltp,
        change: 0 // Angel One LTP doesn't always provide change directly in this basic endpoint, but we return price. Or we can calc: (ltp - close) / close * 100
      };
    }
    return null;
  } catch (error) {
    console.error('Angel Quote Error:', error);
    return null;
  }
};

export const fetchAngelBars = async (exchange: string, symboltoken: string, timeframe: string) => {
  try {
    const jwt = localStorage.getItem('angel_access_token');
    const apiKey = localStorage.getItem('angel_api_key');
    if (!jwt || !apiKey) {
      console.warn("Cannot fetch Angel Historical Data: User is not logged in to Angel One.");
      return [];
    }

    let interval = 'ONE_DAY';
    let daysBack = 1000;
    
    // Map standard timeframes to Angel One intervals
    if (timeframe === '1m') { interval = 'ONE_MINUTE'; daysBack = 30; }
    else if (timeframe === '5m') { interval = 'FIVE_MINUTE'; daysBack = 100; }
    else if (timeframe === '15m') { interval = 'FIFTEEN_MINUTE'; daysBack = 100; }
    else if (timeframe === '30m') { interval = 'THIRTY_MINUTE'; daysBack = 100; }
    else if (timeframe === '1h' || timeframe === '1H') { interval = 'ONE_HOUR'; daysBack = 300; }
    else if (timeframe === '1D' || timeframe === '1d') { interval = 'ONE_DAY'; daysBack = 2000; }

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - daysBack);

    const formatDate = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const res = await proxyFetch('/api/angel/historical', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'X-PrivateKey': apiKey,
        'Content-Type': 'application/json'
      } as any,
      body: JSON.stringify({
        exchange: exchange || 'NSE',
        symboltoken,
        interval,
        fromdate: formatDate(fromDate),
        todate: formatDate(toDate)
      })
    });
    
    if (!res.ok) throw new Error('Failed to fetch historical data from Angel proxy');
    const data = await res.json();
    
    if (data.status && data.data && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        timestamp: new Date(item[0]).getTime(),
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
        volume: item[5]
      }));
    }
    return [];
  } catch (error) {
    console.error('Angel Historical Error:', error);
    return [];
  }
};
