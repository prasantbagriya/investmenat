import express from "express";

export function setupAngelRoutes(app: express.Application) {
  
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
    } catch (err: any) {
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
          'X-PrivateKey': apiKey as string,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
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
          'X-PrivateKey': apiKey as string,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Place Order (Angel One)
  app.post("/api/angel/order", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const apiKey = req.headers['x-privatekey'];
      
      if (!token || !apiKey) return res.status(401).json({ error: "Missing Angel One credentials" });

      const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'X-PrivateKey': apiKey as string,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4b. Get LTP Data (Angel One Quote)
  app.post("/api/angel/quote", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const apiKey = req.headers['x-privatekey'];
      
      if (!token || !apiKey) return res.status(401).json({ error: "Missing Angel One credentials" });

      const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getLtpData', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'X-PrivateKey': apiKey as string,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body) // { exchange, tradingsymbol, symboltoken }
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4c. Get Historical Data (Angel One)
  app.post("/api/angel/historical", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const apiKey = req.headers['x-privatekey'];
      
      if (!token || !apiKey) return res.status(401).json({ error: "Missing Angel One credentials" });

      const response = await fetch('https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'X-PrivateKey': apiKey as string,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body) // { exchange, symboltoken, interval, fromdate, todate }
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Search Scrips (Angel One)
  let scripCache: any[] | null = null;
  let isFetchingScrips = false;

  app.get("/api/angel/search", async (req, res) => {
    try {
      const query = (req.query.q as string || '').toLowerCase();
      if (!query) return res.json([]);

      if (!scripCache) {
        if (!isFetchingScrips) {
          isFetchingScrips = true;
          try {
            console.log("Fetching Angel One Scrip Master...");
            const response = await fetch('https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json');
            scripCache = await response.json();
            console.log(`Loaded ${scripCache?.length} scrips from Angel One.`);
          } catch (e) {
            console.error("Failed to load Angel One scrips:", e);
          } finally {
            isFetchingScrips = false;
          }
        }
        
        // If it's still fetching, we can wait a bit or just return empty for now
        let retries = 0;
        while (isFetchingScrips && retries < 10) {
          await new Promise(r => setTimeout(r, 500));
          retries++;
        }
      }

      if (!scripCache) return res.json([]);

      // Filter scrips based on query. Only NSE equity or NFO for simplicity, but let's stick to NSE EQ.
      const results = [];
      for (const scrip of scripCache) {
        if (scrip.exch_seg === 'NSE' && scrip.instrumenttype === '') { // Regular stocks usually have empty instrumenttype or 'OPTIDX' etc. We want regular equity. But wait, some have 'OPTIDX'. We will just match symbol.
           if (scrip.symbol.toLowerCase().includes(query) || scrip.name.toLowerCase().includes(query)) {
             results.push(scrip);
             if (results.length >= 20) break;
           }
        }
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
