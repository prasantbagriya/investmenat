export interface ChartDataPoint {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  value?: number; // For volume or single value
}

export interface IndicatorDataPoint {
  time: number | string;
  value: number;
}

// Simple Moving Average
export function calculateSMA(data: ChartDataPoint[], period: number): IndicatorDataPoint[] {
  const result: IndicatorDataPoint[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

// Exponential Moving Average
export function calculateEMA(data: ChartDataPoint[], period: number): IndicatorDataPoint[] {
  const result: IndicatorDataPoint[] = [];
  if (data.length < period) return result;

  const k = 2 / (period + 1);
  let ema = 0;

  // Initial SMA for the first EMA point
  for (let i = 0; i < period; i++) {
    ema += data[i].close;
  }
  ema = ema / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * k + ema;
    result.push({ time: data[i].time, value: ema });
  }

  return result;
}

// Relative Strength Index
export function calculateRSI(data: ChartDataPoint[], period: number = 14): IndicatorDataPoint[] {
  const result: IndicatorDataPoint[] = [];
  if (data.length <= period) return result;

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rs = avgGain / avgLoss;
  const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  result.push({ time: data[period].time, value: rsi });

  // Calculate subsequent RSI
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push({ time: data[i].time, value: 100 });
    } else {
      const currentRs = avgGain / avgLoss;
      const currentRsi = 100 - (100 / (1 + currentRs));
      result.push({ time: data[i].time, value: currentRsi });
    }
  }

  return result;
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(data: ChartDataPoint[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): {
  macd: IndicatorDataPoint[],
  signal: IndicatorDataPoint[],
  histogram: IndicatorDataPoint[]
} {
  const macdLine: IndicatorDataPoint[] = [];
  const signalLine: IndicatorDataPoint[] = [];
  const histogram: IndicatorDataPoint[] = [];

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  if (fastEMA.length === 0 || slowEMA.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  // Align EMAs
  const fastMap = new Map(fastEMA.map(d => [d.time, d.value]));
  const macdData: ChartDataPoint[] = []; // Reuse ChartDataPoint to pass into calculateEMA for signal line

  for (const slowPoint of slowEMA) {
    const fastValue = fastMap.get(slowPoint.time);
    if (fastValue !== undefined) {
      const macdVal = fastValue - slowPoint.value;
      macdLine.push({ time: slowPoint.time, value: macdVal });
      // Dummy close value to reuse EMA function
      macdData.push({ time: slowPoint.time, open: 0, high: 0, low: 0, close: macdVal }); 
    }
  }

  const signalEMA = calculateEMA(macdData, signalPeriod);
  const signalMap = new Map(signalEMA.map(d => [d.time, d.value]));

  for (const mPoint of macdLine) {
    const sValue = signalMap.get(mPoint.time);
    if (sValue !== undefined) {
      signalLine.push({ time: mPoint.time, value: sValue });
      histogram.push({ time: mPoint.time, value: mPoint.value - sValue });
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}
