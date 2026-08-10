import express from "express";

export function setupDhanRoutes(app: express.Application) {
  
  // 1. Fetch User Funds & Margin (Dhan)
  app.get("/api/dhan/funds", async (req, res) => {
    try {
      const token = req.headers['access-token'];
      const clientId = req.headers['client-id'];
      
      if (!token || !clientId) {
        return res.status(401).json({ error: "Missing Dhan credentials" });
      }

      const response = await fetch('https://api.dhan.co/fundlimit', {
        headers: {
          'access-token': token as string,
          'client-id': clientId as string,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Fetch Portfolio Holdings (Dhan)
  app.get("/api/dhan/holdings", async (req, res) => {
    try {
      const token = req.headers['access-token'];
      const clientId = req.headers['client-id'];
      
      if (!token || !clientId) {
        return res.status(401).json({ error: "Missing Dhan credentials" });
      }

      const response = await fetch('https://api.dhan.co/holdings', {
        headers: {
          'access-token': token as string,
          'client-id': clientId as string,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Place Order (Dhan)
  app.post("/api/dhan/order", async (req, res) => {
    try {
      const token = req.headers['access-token'];
      const clientId = req.headers['client-id'];
      
      if (!token || !clientId) {
        return res.status(401).json({ error: "Missing Dhan credentials" });
      }

      const response = await fetch('https://api.dhan.co/orders', {
        method: 'POST',
        headers: {
          'access-token': token as string,
          'client-id': clientId as string,
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
}
