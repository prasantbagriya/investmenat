// FMP API Service
const API_KEY = import.meta.env.VITE_FMP_API_KEY || 'demo'; // fallback to demo, but usually fails on non-AAPL symbols
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export interface FMPSearchResult {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

export interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface FMPProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
  link: string;
  finalLink: string;
}

export const searchCompanies = async (query: string, exchange?: string): Promise<FMPSearchResult[]> => {
  if (!query) return [];
  try {
    let url = `https://financialmodelingprep.com/stable/search-name?query=${query}&limit=20&apikey=${API_KEY}`;
    if (exchange) {
      url += `&exchange=${exchange}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch (error) {
    console.error('FMP Search Error:', error);
    return [];
  }
};

export const getQuote = async (symbol: string): Promise<FMPQuote | null> => {
  try {
    const res = await fetch(`https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=${API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('FMP Quote Error:', error);
    return null;
  }
};

export const getCompanyProfile = async (symbol: string): Promise<FMPProfile | null> => {
  try {
    const res = await fetch(`https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('FMP Profile Error:', error);
    return null;
  }
};

export const getIncomeStatement = async (symbol: string, limit: number = 5): Promise<FMPIncomeStatement[]> => {
  try {
    const res = await fetch(`https://financialmodelingprep.com/stable/income-statement?symbol=${symbol}&limit=${limit}&apikey=${API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch (error) {
    console.error('FMP Income Statement Error:', error);
    return [];
  }
};

export const fetchFmpBars = async (symbol: string, timeframe: string) => {
  try {
    // Note: FMP's basic plan blocks historical-chart and historical-price-full. 
    // We are routing historical queries to Yahoo Finance as a free reliable fallback!
    
    let interval = '1d';
    let range = '5y';

    if (timeframe === '1m') { interval = '1m'; range = '7d'; }
    else if (timeframe === '5m') { interval = '5m'; range = '1mo'; }
    else if (timeframe === '15m') { interval = '15m'; range = '1mo'; }
    else if (timeframe === '30m') { interval = '30m'; range = '1mo'; }
    else if (timeframe === '1h' || timeframe === '1H') { interval = '1h'; range = '1mo'; }
    else if (timeframe === '1D' || timeframe === '1d') { interval = '1d'; range = '5y'; }
    else if (timeframe === '1W' || timeframe === '1w') { interval = '1wk'; range = '10y'; }
    else if (timeframe === '1M' || timeframe === '1M') { interval = '1mo'; range = 'max'; }

    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
    if (!res.ok) throw new Error('Yahoo Finance fetch failed');
    const data = await res.json();
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    if (!timestamps || !quote) return [];

    const bars = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.open[i] !== null) {
        bars.push({
          timestamp: timestamps[i] * 1000,
          open: quote.open[i],
          high: quote.high[i],
          low: quote.low[i],
          close: quote.close[i],
          volume: quote.volume[i]
        });
      }
    }
    return bars;
  } catch (error) {
    console.error('FMP/Yahoo History Error:', error);
    return [];
  }
};
