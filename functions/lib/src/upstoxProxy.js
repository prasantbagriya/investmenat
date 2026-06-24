"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupUpstoxRoutes = setupUpstoxRoutes;
function setupUpstoxRoutes(app) {
    // --- UPSTOX BROKER API PROXIES (PHASE 1) ---
    // 1. Token Exchange (OAuth)
    app.post("/api/upstox/token", async (req, res) => {
        try {
            const { code, client_id, client_secret, redirect_uri } = req.body;
            if (!code || !client_id || !client_secret || !redirect_uri) {
                return res.status(400).json({ error: "Missing required fields for Upstox OAuth" });
            }
            const params = new URLSearchParams();
            params.append('code', code);
            params.append('client_id', client_id);
            params.append('client_secret', client_secret);
            params.append('redirect_uri', redirect_uri);
            params.append('grant_type', 'authorization_code');
            const response = await fetch('https://api.upstox.com/v2/login/authorization/token', {
                method: 'POST',
                headers: {
                    'Api-Version': '2.0',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: params
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.errors?.[0]?.message || 'Failed to exchange token');
            }
            res.json(data);
        }
        catch (err) {
            console.error("[Upstox API] Token Error:", err);
            res.status(500).json({ error: err.message });
        }
    });
    // 2. Fetch User Profile
    app.get("/api/upstox/profile", async (req, res) => {
        try {
            const token = req.headers.authorization;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.upstox.com/v2/user/profile', {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 3. Fetch User Funds & Margin
    app.get("/api/upstox/funds", async (req, res) => {
        try {
            const token = req.headers.authorization;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.upstox.com/v2/user/get-funds-and-margin', {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 4. Fetch Portfolio Holdings
    app.get("/api/upstox/holdings", async (req, res) => {
        try {
            const token = req.headers.authorization;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.upstox.com/v2/portfolio/long-term-holdings', {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // --- UPSTOX BROKER API PROXIES (PHASE 2) ---
    // 5. Market Quotes (LTP, OHLC)
    app.get("/api/upstox/market-quote", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const symbol = req.query.symbol;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            if (!symbol)
                return res.status(400).json({ error: "Missing symbol" });
            const response = await fetch(`https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(symbol)}`, {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 6. Option Chain
    app.get("/api/upstox/option-chain", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const instrument_key = req.query.instrument_key;
            const expiry_date = req.query.expiry_date;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            if (!instrument_key || !expiry_date)
                return res.status(400).json({ error: "Missing instrument_key or expiry_date" });
            const response = await fetch(`https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrument_key)}&expiry_date=${encodeURIComponent(expiry_date)}`, {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 7. Place Order
    app.post("/api/upstox/order", async (req, res) => {
        try {
            const token = req.headers.authorization;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.upstox.com/v2/order/place', {
                method: 'POST',
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // --- UPSTOX BROKER API PROXIES (PHASE 3) ---
    // 8. Historical Data
    app.get("/api/upstox/historical-data", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const { instrument_key, interval, to_date, from_date } = req.query;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            if (!instrument_key)
                return res.status(400).json({ error: "Missing instrument_key" });
            // Support for both intraday (no to/from date) and historical
            let url = `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(instrument_key)}/1minute`;
            if (interval && to_date && from_date) {
                url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrument_key)}/${encodeURIComponent(interval)}/${encodeURIComponent(to_date)}/${encodeURIComponent(from_date)}`;
            }
            const response = await fetch(url, {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 9. Mutual Funds Holdings
    app.get("/api/upstox/mutual-funds", async (req, res) => {
        try {
            const token = req.headers.authorization;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.upstox.com/v2/portfolio/mutual-fund-holdings', {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 10. Trade Profit & Loss
    app.get("/api/upstox/trade-pnl", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const { segment, financial_year, page_number, page_size } = req.query;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            let queryParams = new URLSearchParams();
            if (segment)
                queryParams.append('segment', segment);
            if (financial_year)
                queryParams.append('financial_year', financial_year);
            if (page_number)
                queryParams.append('page_number', page_number);
            if (page_size)
                queryParams.append('page_size', page_size);
            const response = await fetch(`https://api.upstox.com/v2/trade/profit-loss/data?${queryParams.toString()}`, {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 11. GTT Orders
    app.post("/api/upstox/gtt-order", async (req, res) => {
        try {
            const token = req.headers.authorization;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.upstox.com/v2/order/gtt/place', {
                method: 'POST',
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 12. Market News
    app.get("/api/upstox/news", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const symbol = req.query.symbol;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            const url = symbol
                ? `https://api.upstox.com/v2/market-news/instrument?instrument_key=${encodeURIComponent(symbol)}`
                : `https://api.upstox.com/v2/market-news/top`;
            const response = await fetch(url, {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 13. Fundamentals
    app.get("/api/upstox/fundamentals", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const symbol = req.query.symbol;
            if (!token)
                return res.status(401).json({ error: "Missing authorization token" });
            if (!symbol)
                return res.status(400).json({ error: "Missing symbol" });
            const response = await fetch(`https://api.upstox.com/v2/fundamentals/company-essential?instrument_key=${encodeURIComponent(symbol)}`, {
                headers: {
                    'Api-Version': '2.0',
                    'Authorization': token,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}
//# sourceMappingURL=upstoxProxy.js.map