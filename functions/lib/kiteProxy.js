"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupKiteRoutes = setupKiteRoutes;
const crypto_1 = __importDefault(require("crypto"));
function setupKiteRoutes(app) {
    // 1. Token Exchange (Session Generation)
    app.post("/api/kite/token", async (req, res) => {
        try {
            const { request_token, api_key, api_secret } = req.body;
            if (!request_token || !api_key || !api_secret) {
                return res.status(400).json({ error: "Missing required fields for Zerodha Auth" });
            }
            // Checksum = sha256(api_key + request_token + api_secret)
            const hashString = api_key + request_token + api_secret;
            const checksum = crypto_1.default.createHash('sha256').update(hashString).digest('hex');
            const params = new URLSearchParams();
            params.append('api_key', api_key);
            params.append('request_token', request_token);
            params.append('checksum', checksum);
            const response = await fetch('https://api.kite.trade/session/token', {
                method: 'POST',
                headers: {
                    'X-Kite-Version': '3',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            });
            const data = await response.json();
            if (!response.ok || data.status === 'error') {
                throw new Error(data.message || 'Failed to generate Kite session');
            }
            res.json(data);
        }
        catch (err) {
            console.error("[Kite API] Token Error:", err);
            res.status(500).json({ error: err.message });
        }
    });
    // 2. Fetch User Margins / Funds
    app.get("/api/kite/funds", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.kite.trade/user/margins', {
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': authHeader // Expected format: "token api_key:access_token"
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 3. Fetch Portfolio Holdings
    app.get("/api/kite/holdings", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader)
                return res.status(401).json({ error: "Missing authorization token" });
            const response = await fetch('https://api.kite.trade/portfolio/holdings', {
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': authHeader
                }
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 4. Place Order
    app.post("/api/kite/order", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader)
                return res.status(401).json({ error: "Missing authorization token" });
            const { tradingsymbol, exchange, transaction_type, order_type, quantity, product, price, trigger_price } = req.body;
            const params = new URLSearchParams();
            params.append('tradingsymbol', tradingsymbol);
            params.append('exchange', exchange);
            params.append('transaction_type', transaction_type); // BUY or SELL
            params.append('order_type', order_type); // MARKET, LIMIT, SL, SL-M
            params.append('quantity', quantity.toString());
            params.append('product', product); // CNC, MIS, NRML
            params.append('validity', 'DAY');
            if (price)
                params.append('price', price.toString());
            if (trigger_price)
                params.append('trigger_price', trigger_price.toString());
            const response = await fetch('https://api.kite.trade/orders/regular', {
                method: 'POST',
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });
            const data = await response.json();
            if (!response.ok || data.status === 'error') {
                throw new Error(data.message || 'Failed to place Kite order');
            }
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 5. Market Quote
    app.get("/api/kite/quote", async (req, res) => {
        try {
            const authHeader = req.headers.authorization;
            const symbol = req.query.symbol; // e.g. NSE:RELIANCE
            if (!authHeader)
                return res.status(401).json({ error: "Missing authorization token" });
            if (!symbol)
                return res.status(400).json({ error: "Missing symbol" });
            const response = await fetch(`https://api.kite.trade/quote?i=${encodeURIComponent(symbol)}`, {
                headers: {
                    'X-Kite-Version': '3',
                    'Authorization': authHeader
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
//# sourceMappingURL=kiteProxy.js.map