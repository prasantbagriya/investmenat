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

  // ─── Portfolio ─────────────────────────────────────  // ✨ Portfolio ✨
  getHoldings: (token: string) => get(`${BASE_URL}/holdings`, token),
  getPositions: (token: string) => get(`${BASE_URL}/positions`, token),
  getShortTermPositions: (token: string) => get(`${BASE_URL}/short-term-positions`, token),
  getMutualFunds: (token: string) => get(`${BASE_URL}/mutual-funds`, token),

  // ─── Orders ────────────────────────────────────────
  getOrders: (token: string) => get(`${BASE_URL}/orders`, token),
  getGttOrders: (token: string) => get(`${BASE_URL}/gtt-orders`, token),
  placeOrder: (token: string, order: object) => post(`${BASE_URL}/order/place`, token, order),
  modifyOrder: (token: string, order: object) => post(`${BASE_URL}/order/modify`, token, order),
  cancelOrder: (token: string, orderId: string) => get(`${BASE_URL}/order/cancel?order_id=${orderId}`, token),
  exitAllPositions: (token: string) => get(`${BASE_URL}/order/exit-all-positions`, token),

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

  getNews: (token: string, category: 'instrument_keys' | 'positions' | 'holdings' = 'positions', instrumentKeys?: string[]) => {
    let url = `${BASE_URL}/news?category=${category}`;
    if (instrumentKeys && instrumentKeys.length > 0) {
      url += `&instrument_keys=${encodeURIComponent(instrumentKeys.join(','))}`;
    }
    return get(url, token);
  },

  getFundamentals: (token: string, endpoint: string, instrumentKey: string) => 
    get(`${BASE_URL}/fundamentals/${endpoint}?instrument_key=${encodeURIComponent(instrumentKey)}`, token),

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

  // ─── Mutual Funds ──────────────────────────────────
  getMutualFundHoldings: (token: string) => get(`${BASE_URL}/portfolio/mutual-fund`, token),

  // ─── Account Settings ──────────────────────────────
  getKillSwitchStatus: (token: string) => get(`${BASE_URL}/user/kill-switch`, token),
  updateKillSwitch: (token: string, action: string) => post(`${BASE_URL}/user/kill-switch`, token, { action }),
};
