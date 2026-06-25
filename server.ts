import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import fs from 'fs';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import { setupUpstoxRoutes } from "./upstoxProxy";
import { setupDhanRoutes } from "./dhanProxy";
import { setupAngelRoutes } from "./angelProxy";
import { setupKiteRoutes } from "./kiteProxy";

dotenv.config();

function cleanPrivateKey(keyInput: string): string {
  let key = keyInput.trim();

  // 1. Remove optional enclosing quotes
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1).trim();
  }
  if (key.startsWith("'") && key.endsWith("'")) {
    key = key.substring(1, key.length - 1).trim();
  }

  // 2. Unescape escaped literal backslashes (\n, \r, \t)
  key = key.replace(/\\n/g, '\n');
  key = key.replace(/\\r/g, '\r');
  key = key.trim();

  // 3. Check if it is a JSON object
  if (key.startsWith("{") && key.endsWith("}")) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) {
        key = parsed.private_key.trim();
      }
    } catch (e) {
      // not valid JSON, proceed
    }
  }

  // Double check again in case we need to unescape and clean quotes inside JSON value
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1).trim();
  }
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r').trim();

  // 4. Properly check and decode headers
  // Support any type of RSA or standard private key boundary
  const beginMatch = key.match(/-----BEGIN[A-Z0-9\s]+PRIVATE KEY-----/);
  const endMatch = key.match(/-----END[A-Z0-9\s]+PRIVATE KEY-----/);

  if (beginMatch && endMatch) {
    const beginHeader = beginMatch[0];
    const endHeader = endMatch[0];
    
    // Extract base64 part between margins
    const startIndex = key.indexOf(beginHeader) + beginHeader.length;
    const endIndex = key.indexOf(endHeader);
    const base64Part = key.substring(startIndex, endIndex);

    // Clean base64 lines (reline to 64 character standard limits)
    const rawBase64 = base64Part
      .split(/[\r\n]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('');

    const formattedLines: string[] = [];
    for (let i = 0; i < rawBase64.length; i += 64) {
      formattedLines.push(rawBase64.substring(i, i + 64));
    }

    return `${beginHeader}\n${formattedLines.join('\n')}\n${endHeader}\n`;
  }

  // 5. If it doesn't contain headers, it's a raw base64. Rebuild as a PKCS#8 block.
  const rawBase = key
    .split(/[\r\n\s]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('');

  const formattedBase64: string[] = [];
  for (let i = 0; i < rawBase.length; i += 64) {
    formattedBase64.push(rawBase.substring(i, i + 64));
  }

  return `-----BEGIN PRIVATE KEY-----\n${formattedBase64.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

export let app: express.Application;

async function startServer() {
  app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Enable CORS so Firebase hosted frontend can call this backend
  app.use(cors({ origin: true }));
  // Body parser to accept Service Account configurations and Base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Initialize JSON file-based database for Firestore sync backup
  const syncFilePath = path.join(process.cwd(), 'firestore_sync.json');
  
  // Helper to read sync data
  const readSyncData = (): Record<string, any> => {
    try {
      if (fs.existsSync(syncFilePath)) {
        return JSON.parse(fs.readFileSync(syncFilePath, 'utf8'));
      }
    } catch (e) {
      console.error("[SQLiteSync] Error reading sync file:", e);
    }
    return {};
  };

  // Helper to write sync data
  const writeSyncData = (data: Record<string, any>) => {
    try {
      fs.writeFileSync(syncFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error("[SQLiteSync] Error writing sync file:", e);
    }
  };

  // Auto-serve Service Account credentials from .env to frontend (avoids manual paste)
  app.get("/api/get-sa-credentials", (req, res) => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (!email || !privateKey) {
      return res.status(404).json({ error: 'SA credentials not configured on server' });
    }
    res.json({ email, privateKey });
  });

  // Add SQLite sync endpoint for Firebase dual-write (using JSON file-based store)
  app.post("/api/sync-sqlite", (req, res) => {
    try {
      const { collection, id, operation, data } = req.body;
      if (!collection || !id || !operation) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const syncDb = readSyncData();
      const key = `${collection}:${id}`;

      if (operation === 'delete') {
        delete syncDb[key];
      } else if (operation === 'set' || operation === 'update') {
        syncDb[key] = {
          collection,
          doc_id: id,
          data: data || {},
          updated_at: new Date().toISOString()
        };
      }
      writeSyncData(syncDb);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("[SQLiteSync] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // AI SMS/Email parsing endpoint using Gemini
  app.post("/api/parse-sms-ai", async (req, res) => {
    try {
      const { text, pendingPayments = [], recurringBills = [] } = req.body;
      if (!text) return res.status(400).json({ error: "Missing text payload" });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
      }

      const ai = new GoogleGenAI({ apiKey });

      const pendingList = pendingPayments.map((p: any) => `[ID: ${p.id}] ${p.person} owes/owed ₹${p.amount} on ${p.dueDate}`).join('\n');
      const billsList = recurringBills.map((b: any) => `[ID: ${b.id}] ${b.title} of ₹${b.amount} due on ${b.nextDueDate}`).join('\n');
      const bankAccsList = (req.body.bankAccounts || []).map((b: any) => `[ID: ${b.id}] ${b.bankName} (${b.accountName} - ${b.accountNumber || ''})`).join('\n');

      const prompt = `You are an expert Automation Architect and Financial Data Parser. Your task is to extract transaction data from a raw bank SMS/Email and map it to a predefined JSON schema for my Personal Finance Manager.

Input SMS: ${text}

Available Pending Payments:
${pendingList || 'None'}

Available Recurring Bills:
${billsList || 'None'}

Available Bank Accounts:
${bankAccsList || 'None'}

Rules:
Extract: Amount, Transaction Type (Credit/Debit), Date, Payee/Merchant, and Transaction Reference Number.
Detail Extraction: Explicitly capture the Name of the sender/receiver and the UPI ID if present.
Categorize: Based on the description, automatically assign a category (e.g., 'Business', 'Trading', 'Shopping', 'Institutional', 'Utilities', 'Dining Out', 'Groceries', 'Entertainment', 'Housing', 'Transportation').
Format: Output the result as a strict JSON object without markdown formatting or code blocks.
Alignment: Ensure the data maps directly to my database schema: { "transaction_id": "", "amount": 0.00, "type": "CR/DR", "category": "", "merchant": "", "description": "", "matched_pending_id": "", "matched_recurring_id": "", "matched_bank_account_id": "" }. The "description" should combine the Merchant Name, UPI ID, and Reference Number in a clean readable format.
Cleanse: Remove any extra text, disclaimers, or noise from the input.
Matching Pending/Bills: If the SMS perfectly matches the amount and context of an available Pending Payment, set its ID in "matched_pending_id". If it matches a Recurring Bill, set its ID in "matched_recurring_id". Otherwise leave them blank strings.
Matching Bank Account: Identify which Bank Account this SMS belongs to by checking the bank name (e.g. HDFC, SBI) or the account number suffix (e.g. a/c XX1234). If it matches, set its ID in "matched_bank_account_id". Otherwise leave blank.
If the input is for Trading (e.g., deposits to a Brokerage/Prop Firm), tag it as 'Investment/Trading' category specifically.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1
        }
      });

      let jsonStr = response.text || "{}";
      // Clean up markdown block if present
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsedData = JSON.parse(jsonStr);
      res.json(parsedData);
    } catch (err: any) {
      console.error("[Parse SMS AI] Error:", err);
      res.status(500).json({ error: err.message || "Failed to parse SMS via AI" });
    }
  });

  // Default preselected service account parameters shared by the user
  const DEFAULT_SA_EMAIL = "investment@gen-lang-client-0137730538.iam.gserviceaccount.com";
  const DEFAULT_SA_PK = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJepRZg5aEDDYm\nXRFHcrOHBPxFU/LGj+NmY39G7VSUaKC99tXpTN2SRQUEPWaVD76gJlI8bHZCqSnr\nLhfZlE7SWZrzJTAt+q5r/rskKQfYKbzmjS0/GCUmdaZAgr3K/LzwTKlUKMa0wIrQ\nGuz9un9oXBVL404ZaMzwzcMfRJ+douHCNo1qTdG+bzuyaUwCIsaFW6U15iC8VOi0\nSocNQ7qvZ5tJppRUzU8hPszF/s4kow6JjicoOddKGuwcATSEBivdejA+4us0rAC6\ngCBz8dS9QFwF8HWJPLpcHAplQAN16YFsxnbcN5PZYPEw71VbNz6M3acP5sYzmjTQ\nlIB+vWObAgMBAAECggEADmlkvtRr9KJqUICGvGLG1wkdwcMZUhJidI/4ajU5asDj\nLUNrQLFoBfmcPBXnm7umaePj16ugd/CMGDpR/Wp04D9a7I/ZQZNgB5yPJq0tVk0s\nqccpGI1xwYMCiInG6VlTwH09/Xr0imMIFY5fgQoRPqtGNglFLF8ejbkCKd8+6vJm\nPnQ7b6Cqt6OePeEpBd6DvYSW4mffKKsNeOyp+SikHmHRbU72OKBMdlj/ui42xRqe\n0gz5TxaZlbHNTZNxqiLkcUosj1zAuVfnUt1EnJe7SSay/5GSp5bRC+KQ6xelHo+W\nH59DILkiIZoHKDqUfKgLo9Ny5CiIp+fgJg4ZVly9QKBgQD6SJ7711sLows/E7/M\neJUserAqVh0kal5R3bRioNdsy0Kr5khqBojWtjGqW6g4bISO2TqNlpRtUA41NHj2\ncE0a1th6UfYvjWqUIeaZwJtvPtsDub9IgZ077YCre/RJ/ZgDOcnTSJNaqRZ5/YGg\nIxH1JBivOtzIVHC93RxPPz45DQKBgQDOFJov0lgjMLcnhlRwsOgCwztV8LM2DJ2r\nEoD6Q/8pRjeakEydpSsQJH0pYJyiHcx/al1o8eZ4wDAjT5O3LZ91n/D8BhnO89jy\ne9xsjy98GW7UZrN65N2dI4yXZ72S2ZEF6IgulciXQgYmnRZV5++527IeF+A0W6FO\nrH4LkqOVRwKBgEh58x/2kvThuAYCEA6D9J62wIDiAvpimwGV9ACDlx54Fcx1mQ6q\n6cFTbTpp5GLCefhry1ro+f5VqmeZ1FV427sj7/gr9+B5UR2oW4C2l8w1JXMEvPGg\nJwoNkq8V6/3pI7X7bAh1AcbFJC8bTAg1X6PfWg6UOw7/9M3mU6ZXKAuZAoGADIV3\n8Nvo+wpktoQU8VvuXOyb2FbtrKULl29iYtJq2Ikpq7yEyzdT7IErEa6LFdaVrFA8\nKLo59LBIvHyDTyf4fl8fd1CvlMGANwuLkxUIH5Q0BbfPw/HP/VJBopltDVUm2KMO\nUzZKn9YlJYd56fJTwIk2w1lUCBphLLSSXAWm5tUCgYEApOxpCADglz/dEH8XnBtX\nSe6/totOPnWx0Fah7m6L4dm2GtBGGiD7G4XoiGT7uoFyQxUGZDhXYkofoDgu3wuw\nDxBNQ7/mxche6MVXbrJOkOtUG9ME9rJjUPG0yDbJeJqWC/IzWxWphDYnT1MaE77v\nyvlaT7zW9Xd5RqUUd3EyN05=\n-----END PRIVATE KEY-----\n";

  // Backend API route to generate an authorized Google Bearer token on demand
  app.post("/api/get-google-service-token", async (req, res) => {
    try {
      let clientEmail = req.body?.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SA_EMAIL;
      let privateKeyInput = req.body?.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || DEFAULT_SA_PK;

      if (!privateKeyInput || !clientEmail) {
        return res.status(400).json({
          error: "Google Service Account credentials not provided."
        });
      }

      let privateKey = privateKeyInput.trim();

      // Robust check: Did the user paste the entire Firebase/Google credential JSON file?
      if (privateKey.startsWith("{") && privateKey.endsWith("}")) {
        try {
          const parsedJson = JSON.parse(privateKey);
          if (parsedJson.private_key) {
            privateKey = parsedJson.private_key;
          }
          if (parsedJson.client_email) {
            clientEmail = parsedJson.client_email;
          }
        } catch (je) {
          console.warn("[GoogleToken] Unreadable JSON credential block:", je);
        }
      }

      // Clean client_email as well just in case they pasted the JSON there
      let emailStr = clientEmail.trim();
      if (emailStr.startsWith("{") && emailStr.endsWith("}")) {
        try {
          const parsedEmailJson = JSON.parse(emailStr);
          if (parsedEmailJson.client_email) {
            emailStr = parsedEmailJson.client_email;
          }
          if (parsedEmailJson.private_key) {
            privateKey = parsedEmailJson.private_key;
          }
        } catch (je) {
          // ignore
        }
      }

      // Process and normalize the private key text
      privateKey = cleanPrivateKey(privateKey);

      // Get scopes from body or fallback to default sheets, contacts, calendar, drive, tasks, gmail, chat, classroom
      const requestedScopes = req.body?.scopes || [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/chat.spaces.readonly',
        'https://www.googleapis.com/auth/chat.messages.create',
        'https://www.googleapis.com/auth/classroom.courses.readonly'
      ];

      const client = new JWT({
        email: emailStr,
        key: privateKey,
        scopes: requestedScopes,
      });

      console.log(`[GoogleToken] Exchanging credentials for email: ${emailStr} with scopes:`, requestedScopes);
      const tokens = await client.authorize();

      res.json({
        accessToken: tokens.access_token,
        expiry: tokens.expiry_date,
        clientEmail: emailStr
      });
    } catch (err: any) {
      console.error("[GoogleToken] Fetch token exception:", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Setup Broker Routes
  setupUpstoxRoutes(app);
  setupDhanRoutes(app);
  setupAngelRoutes(app);
  setupKiteRoutes(app);

  // In-memory cache store
  interface CacheEntry<T> {
    data: T;
    timestamp: number;
  }
  const stockCache = new Map<string, CacheEntry<any>>();
  const mfCache = new Map<string, CacheEntry<any>>();
  const searchCache = new Map<string, CacheEntry<any>>();

  // Proxy endpoint to fetch Yahoo Finance stock price securely from Node.js (bypasses CORS and referrer blocklist)
  app.get("/api/stock-price", async (req, res) => {
    try {
      const symbol = req.query.symbol;
      if (!symbol || typeof symbol !== "string") {
        return res.status(400).json({ error: "Stock symbol query parameter is required" });
      }

      let cleanSymbol = symbol.trim().toUpperCase();

      // Ensure proper extension for Yahoo. Default to .NS for Indian market if no extension is specified and there's no period.
      if (!cleanSymbol.endsWith('.NS') && !cleanSymbol.endsWith('.BO') && !cleanSymbol.includes('.')) {
        cleanSymbol += '.NS';
      }

      // Check cache first (1-minute TTL for stock prices)
      const cached = stockCache.get(cleanSymbol);
      if (cached && Date.now() - cached.timestamp < 60 * 1000) {
        return res.json(cached.data);
      }

      console.log(`[StockProxy] Fetching price for symbol: ${cleanSymbol}`);

      // Try fetching from query2 first, then failover to query1
      let apiResponse;
      let usedQuery = 'query2';
      try {
        apiResponse = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (!apiResponse.ok) {
          throw new Error(`query2 failed with status ${apiResponse.status}`);
        }
      } catch (e) {
        console.warn(`[StockProxy] query2 failed for ${cleanSymbol}, trying query1:`, e);
        usedQuery = 'query1';
        apiResponse = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
      }

      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          error: `Yahoo Finance API returned error state ${apiResponse.status}`,
          symbol: cleanSymbol
        });
      }

      const data: any = await apiResponse.json();
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      
      let currentPrice = meta?.regularMarketPrice || meta?.previousClose;
      if (!currentPrice) {
        const closes = result?.indicators?.quote?.[0]?.close;
        if (Array.isArray(closes) && closes.length > 0) {
          currentPrice = closes.filter((val: any) => val !== null).pop();
        }
      }

      let previousClose = meta?.chartPreviousClose || meta?.previousClose || currentPrice;
      if (!previousClose) {
        const opens = result?.indicators?.quote?.[0]?.open;
        if (Array.isArray(opens) && opens.length > 0) {
          previousClose = opens.filter((val: any) => val !== null)[0];
        }
      }

      if (currentPrice) {
        const diff = currentPrice - previousClose;
        const dayChangePercent = previousClose ? (diff / previousClose) * 100 : 0;
        const resultPayload = {
          currentPrice: parseFloat(currentPrice.toFixed(2)),
          dayChangePercent: parseFloat(dayChangePercent.toFixed(2)),
          longName: (meta?.longName || cleanSymbol.split('.')[0]).toUpperCase(),
          usedQuery,
          symbol: cleanSymbol
        };

        // Cache the result
        stockCache.set(cleanSymbol, {
          data: resultPayload,
          timestamp: Date.now()
        });

        return res.json(resultPayload);
      } else {
        return res.status(404).json({
          error: "Could not locate live quote data inside response structure",
          symbol: cleanSymbol
        });
      }
    } catch (err: any) {
      console.error("[StockProxy] Fetch exception:", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Proxy endpoint to fetch Mutual Fund NAV with caching and payload reduction (10-minute TTL)
  app.get("/api/mf-nav", async (req, res) => {
    try {
      const code = req.query.code;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Mutual Fund code parameter is required" });
      }

      const cleanCode = code.trim();

      // Check cache first (10-minute TTL for mutual funds)
      const cached = mfCache.get(cleanCode);
      if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
        return res.json(cached.data);
      }

      console.log(`[MFProxy] Fetching NAV for AMFI code: ${cleanCode}`);
      const apiResponse = await fetch(`https://api.mfapi.in/mf/${cleanCode}`);
      if (!apiResponse.ok) {
        return res.status(apiResponse.status).json({
          error: `MFAPI returned error state ${apiResponse.status}`,
          code: cleanCode
        });
      }

      const data: any = await apiResponse.json();
      const currentNav = parseFloat(data?.data?.[0]?.nav || '0');
      const fundName = data?.meta?.scheme_name || 'Mutual Fund Scheme';

      if (currentNav > 0) {
        const resultPayload = {
          currentNav,
          fundName
        };

        // Cache the result
        mfCache.set(cleanCode, {
          data: resultPayload,
          timestamp: Date.now()
        });

        return res.json(resultPayload);
      } else {
        return res.status(404).json({
          error: "Invalid NAV data returned from AMFI API",
          code: cleanCode
        });
      }
    } catch (err: any) {
      console.error("[MFProxy] Fetch exception:", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  // Proxy endpoint to search Yahoo Finance symbols (5-minute TTL)
  app.get("/api/stock-search", async (req, res) => {
    try {
      const queryStr = req.query.q;
      if (!queryStr || typeof queryStr !== "string" || queryStr.trim().length < 2) {
        return res.status(400).json({ error: "Valid search query of at least 2 characters is required" });
      }

      const cleanQuery = queryStr.trim().toLowerCase();

      // Check cache (5-minute TTL)
      const cached = searchCache.get(cleanQuery);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return res.json(cached.data);
      }

      console.log(`[SearchProxy] Searching Yahoo Finance for: "${cleanQuery}"`);
      // Query Yahoo search API
      const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&newsCount=0`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to search Yahoo Finance API" });
      }

      const data: any = await response.json();
      const quotes = data?.quotes || [];

      // Filter and map quotes to clean list of stocks/ETFs
      // Usually Indian stocks end with .NS or .BO
      const suggestions = quotes
        .filter((q: any) => {
          return q.symbol && 
            (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') &&
            (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || q.exchange === 'NSI' || q.exchange === 'BSE');
        })
        .map((q: any) => {
          // Remove .NS or .BO suffix for cleaner UI, but keep key
          const rawSymbol = q.symbol;
          const displaySymbol = rawSymbol.split('.')[0];
          return {
            symbol: displaySymbol,
            rawSymbol: rawSymbol,
            name: q.longname || q.shortname || displaySymbol,
            exch: q.exchange || (rawSymbol.endsWith('.NS') ? 'NSE' : 'BSE')
          };
        })
        .slice(0, 8); // Top 8 suggestions

      // Fallback: If no Indian results found, return standard matches
      const finalSuggestions = suggestions.length > 0 ? suggestions : quotes
        .slice(0, 5)
        .map((q: any) => ({
          symbol: q.symbol.split('.')[0],
          rawSymbol: q.symbol,
          name: q.longname || q.shortname || q.symbol,
          exch: q.exchange || 'MKT'
        }));

      searchCache.set(cleanQuery, {
        data: finalSuggestions,
        timestamp: Date.now()
      });

      return res.json(finalSuggestions);
    } catch (err: any) {
      console.error("[SearchProxy] Search exception:", err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Financial Rolodex fully active" });
  });

  // Bulk CSV Parser Endpoint
  app.post("/api/parse-csv-ai", async (req, res) => {
    try {
      const { csvText, bankAccounts } = req.body;
      if (!csvText) {
        return res.status(400).json({ error: "csvText is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
      }

      console.log(`[CSV-AI] Processing CSV text length: ${csvText.length}`);

      const ai = new GoogleGenAI({ apiKey });

      const bankContext = bankAccounts && Array.isArray(bankAccounts) && bankAccounts.length > 0 
        ? `Here are the user's available bank accounts:\n${bankAccounts.map((b: any) => `- ID: ${b.id}, Name: ${b.bankName}, Number: ${b.accountNumber}`).join('\n')}\nIf the CSV statement mentions one of these banks or account numbers, assign that bank ID to "matched_bank_account_id".`
        : '';

      const prompt = `You are a strict financial transaction parser. You are given the raw text contents of a bank statement CSV.
Your job is to extract all the transactions and return them as a JSON array.
${bankContext}

Output a JSON array where each element has this exact structure:
{
  "date": "YYYY-MM-DD",
  "amount": number (positive),
  "type": "income" or "expense",
  "category": "Food" | "Transport" | "Shopping" | "Utilities" | "Trading" | "Salary" | "Investment" | "Entertainment" | "Healthcare" | "Transfer" | "Other",
  "note": "A short, clean description of the transaction (e.g. Amazon, Zomato, Salary, ATM Withdrawal)",
  "matched_bank_account_id": "string ID of the bank account if matched, else null"
}

Rules:
1. Ignore header rows, balances, or useless rows. Only extract actual transactions.
2. Determine if it's income or expense based on debit/credit columns or sign.
3. Guess the best category based on the description.
4. Output ONLY the JSON array, nothing else.

Raw CSV Text:
${csvText}
`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      
      const responseText = result.text || "[]";
      const transactions = JSON.parse(responseText);

      return res.json({ transactions });
    } catch (err: any) {
      console.error("[CSV-AI] Failed to parse CSV:", err);
      res.status(500).json({ error: err.message || "Failed to process CSV" });
    }
  });

  // Vite integration
  // --- AI Chatbot Endpoint ---
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "No GEMINI_API_KEY" });

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a highly professional, expert AI Financial Assistant for the app InvestMant. 
Context of user's current finances (bank balances, recent transactions, assets, net worth):
${context}

User's Query: ${message}

Provide a concise, highly analytical, and tailored response. Use clear markdown formatting (bolding, lists) to make it easy to read.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ reply: response.text });
    } catch (err: any) {
      console.error("[Chat-AI] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- AI Parse Receipt Endpoint ---
  app.post("/api/parse-receipt", async (req, res) => {
    try {
      const { base64Image } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "No GEMINI_API_KEY" });

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert OCR and financial data extractor. You are provided with an image of a receipt or bill.
Extract the transaction details and output EXACTLY a JSON object with this structure:
{
  "amount": number (total amount of the bill),
  "date": "YYYY-MM-DD" (extract date if visible, else leave blank),
  "category": "Food" | "Transport" | "Shopping" | "Utilities" | "Other" (guess based on the receipt),
  "note": "Vendor name or short description"
}
Output ONLY the raw JSON object, without any markdown blocks or formatting.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          prompt
        ]
      });

      let cleanJson = response.text || "";
      cleanJson = cleanJson.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '').trim();

      res.json({ result: cleanJson });
    } catch (err: any) {
      console.error("[Receipt-AI] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- AI Parse Subscriptions Endpoint ---
  app.post("/api/parse-subscriptions", async (req, res) => {
    try {
      const { emailSnippets } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "No GEMINI_API_KEY" });

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an AI that extracts recurring subscriptions from email snippets.
Here are recent emails that match 'subscription' or 'invoice':
${emailSnippets}

Extract any active recurring subscriptions. Output EXACTLY a JSON array of objects:
[{
  "name": "Netflix, Spotify, AWS, etc.",
  "amount": number (monthly cost in INR or local currency),
  "category": "Entertainment, Software, Utility, etc.",
  "dueDate": "YYYY-MM-DD" (guess next billing date if mentioned, else leave blank)
}]
Output ONLY the raw JSON array, without any markdown blocks or formatting.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let cleanJson = response.text || "[]";
      cleanJson = cleanJson.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '').trim();

      res.json({ result: cleanJson });
    } catch (err: any) {
      console.error("[Subscriptions-AI] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.IS_WRAPPER) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server boot successful on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
