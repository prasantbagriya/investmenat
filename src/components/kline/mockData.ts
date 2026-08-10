export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  [key: string]: any;
}

export function generateMockData(count: number = 200, lastData?: KLineData, symbol?: string): KLineData[] {
  const data: KLineData[] = [];
  let currentTime = lastData ? lastData.timestamp + 60000 * 60 * 24 : Date.now() - count * 60000 * 60 * 24;
  
  // Set starting price based on symbol
  let currentPrice = 150;
  let volatility = 5;
  if (symbol) {
    const s = symbol.toUpperCase();
    if (s.includes('EURUSD')) { currentPrice = 1.0850; volatility = 0.0050; }
    else if (s.includes('GBPUSD')) { currentPrice = 1.2500; volatility = 0.0060; }
    else if (s.includes('USDJPY')) { currentPrice = 150.50; volatility = 0.80; }
    else if (s.includes('AUDUSD')) { currentPrice = 0.6500; volatility = 0.0040; }
    else if (s.includes('USDCAD')) { currentPrice = 1.3500; volatility = 0.0050; }
  }
  
  if (lastData) currentPrice = lastData.close;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility;
    const open = currentPrice;
    let high = open + Math.abs((Math.random() - 0.5) * (volatility * 2));
    let low = open - Math.abs((Math.random() - 0.5) * (volatility * 2));
    const close = Math.min(Math.max(open + change, low), high);

    // Adjust high and low just in case the random change pushed close outside of them
    high = Math.max(high, Math.max(open, close));
    low = Math.min(low, Math.min(open, close));

    data.push({
      timestamp: currentTime,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 10000) + 1000,
    });

    currentPrice = close;
    currentTime += 60000 * 60 * 24; // Add 1 day
  }

  return data;
}
