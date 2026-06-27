import { proxyFetch } from '../utils/proxyFetch';

// proxyFetch will route `/api/upstox/...` correctly on web and native
const BASE_URL = `/api/upstox`;

function headers(token: string) {
  return { 'Authorization': `Bearer ${token}` };
}

async function get(url: string, token: string) {
  const res = await proxyFetch(url, { headers: headers(token) });
  if (!res.ok) {
    let msg = `${res.status}: ${res.statusText}`;
    try { const errObj = await res.json(); if(errObj.errors) msg = errObj.errors[0].message; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function post(url: string, token: string, body: any) {
  const res = await proxyFetch(url, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let msg = `${res.status}: ${res.statusText}`;
    try { const errObj = await res.json(); if(errObj.errors) msg = errObj.errors[0].message; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const upstoxApi = {
  // ─── Account ───────────────────────────────────────
  getProfile: (token: string) => get(`${BASE_URL}/profile`, token),
  getFunds: (token: string) => get(`${BASE_URL}/funds`, token),

  // ─── Portfolio ─────────────────────────────────────
  getHoldings: (token: string) => get(`${BASE_URL}/holdings`, token),
  getPositions: (token: string) => get(`${BASE_URL}/positions`, token),

  // ─── Orders ────────────────────────────────────────
  getOrders: (token: string) => get(`${BASE_URL}/orders`, token),
  getGttOrders: (token: string) => get(`${BASE_URL}/gtt-orders`, token),
  placeOrder: (token: string, order: object) => post(`${BASE_URL}/order/place`, token, order),

  // ─── Market Quotes ─────────────────────────────────
  getMarketQuote: (symbol: string, token: string) =>
    get(`${BASE_URL}/market-quote?symbol=${encodeURIComponent(symbol)}`, token),

  getLtp: (instrumentKeys: string[], token: string) =>
    get(`${BASE_URL}/ltp?instrument_key=${encodeURIComponent(instrumentKeys.join(','))}`, token),

  // ─── Historical Data ───────────────────────────────
  getHistoricalData: (
    instrumentKey: string,
    token: string,
    interval?: string,
    toDate?: string,
    fromDate?: string
  ) => {
    let url = `${BASE_URL}/historical-data?instrument_key=${encodeURIComponent(instrumentKey)}`;
    if (interval && toDate && fromDate) {
      url += `&interval=${interval}&to_date=${toDate}&from_date=${fromDate}`;
    }
    return get(url, token);
  },

  // ─── Options ───────────────────────────────────────
  getOptionChain: (instrumentKey: string, expiryDate: string, token: string) =>
    get(`${BASE_URL}/option-chain?instrument_key=${encodeURIComponent(instrumentKey)}&expiry_date=${expiryDate}`, token),

  getOptionExpiry: (instrumentKey: string, token: string) =>
    get(`${BASE_URL}/option-expiry?instrument_key=${encodeURIComponent(instrumentKey)}`, token),

  // ─── Fundamentals ──────────────────────────────────
  getFundamentals: (symbol: string, token: string) =>
    get(`${BASE_URL}/fundamentals?symbol=${encodeURIComponent(symbol)}`, token),

  // ─── Trade P&L ─────────────────────────────────────
  getTradePnl: (token: string, segment = 'EQ', financialYear = '2023-24', fromDate?: string, toDate?: string) => {
    let url = `${BASE_URL}/trade-pnl?segment=${segment}&financial_year=${financialYear}&page_number=1&page_size=100`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;
    return get(url, token);
  },

  getTradePnlCharges: (token: string, segment = 'EQ', financialYear = '2023-24') =>
    get(`${BASE_URL}/trade-pnl-charges?segment=${segment}&financial_year=${financialYear}&page_number=1&page_size=100`, token),

  // ─── Market Information ────────────────────────────
  getMarketInfo: (token: string, infoType = 'gainers', dataType = 'cash_leaders') =>
    get(`${BASE_URL}/market-info?info_type=${infoType}&data_type=${dataType}`, token),

  // ─── Charges & Margins ─────────────────────────────
  getBrokerage: (
    token: string,
    instrumentKey: string,
    quantity: number,
    product = 'D',
    transactionType = 'BUY',
    price = 0
  ) =>
    get(
      `${BASE_URL}/brokerage?instrument_key=${encodeURIComponent(instrumentKey)}&quantity=${quantity}&product=${product}&transaction_type=${transactionType}&price=${price}`,
      token
    ),

  calculateMargin: (token: string, orders: object[]) =>
    post(`${BASE_URL}/margin`, token, { orders }),

  // ─── Position Conversion ────────────────────────────
  convertPosition: (token: string, data: object) =>
    post(`${BASE_URL}/positions/convert`, token, data),
};
