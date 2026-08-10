"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAngelRoutes = setupAngelRoutes;
function setupAngelRoutes(app) {
    // 1. Angel One SmartAPI Login (Generates JWT)
    app.post("/api/angel/login", async (req, res) => {
        try {
            const { clientcode, password, totp, api_key } = req.body;
            if (!clientcode || !password || !totp || !api_key) {
                return res.status(400).json({ error: "Missing required Angel One credentials" });
            }
            const response = await fetch('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-PrivateKey': api_key,
                    'X-MACAddress': '00-00-00-00-00-00', // Mock MAC
                    'X-ClientLocalIP': '127.0.0.1',
                    'X-ClientPublicIP': '127.0.0.1'
                },
                body: JSON.stringify({
                    clientcode,
                    password,
                    totp
                })
            });
            const data = await response.json();
            res.status(response.status).json(data);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // 2. Fetch RMS Funds & Margin (Angel One)
    app.get("/api/angel/funds", async (req, res) => {
        try {
            const token = req.headers.authorization; // Bearer token
            const apiKey = req.headers['x-privatekey'];
            if (!token || !apiKey) {
                return res.status(401).json({ error: "Missing Angel One credentials" });
            }
            const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getRMS', {
                headers: {
                    'Authorization': token,
                    'X-PrivateKey': apiKey,
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
    // 3. Fetch Portfolio Holdings (Angel One)
    app.get("/api/angel/holdings", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const apiKey = req.headers['x-privatekey'];
            if (!token || !apiKey) {
                return res.status(401).json({ error: "Missing Angel One credentials" });
            }
            const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/portfolio/v1/getHolding', {
                headers: {
                    'Authorization': token,
                    'X-PrivateKey': apiKey,
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
    // 4. Place Order (Angel One)
    app.post("/api/angel/order", async (req, res) => {
        try {
            const token = req.headers.authorization;
            const apiKey = req.headers['x-privatekey'];
            if (!token || !apiKey)
                return res.status(401).json({ error: "Missing Angel One credentials" });
            const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'X-PrivateKey': apiKey,
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
}
//# sourceMappingURL=angelProxy.js.map