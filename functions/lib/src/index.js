"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const google_auth_library_1 = require("google-auth-library");
const genai_1 = require("@google/genai");
const upstoxProxy_1 = require("./upstoxProxy");
const dhanProxy_1 = require("./dhanProxy");
const angelProxy_1 = require("./angelProxy");
const kiteProxy_1 = require("./kiteProxy");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
function cleanPrivateKey(keyInput) {
    let key = keyInput.trim();
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.substring(1, key.length - 1).trim();
    }
    if (key.startsWith("'") && key.endsWith("'")) {
        key = key.substring(1, key.length - 1).trim();
    }
    key = key.replace(/\\n/g, '\n');
    key = key.replace(/\\r/g, '\r');
    key = key.trim();
    if (key.startsWith("{") && key.endsWith("}")) {
        try {
            const parsed = JSON.parse(key);
            if (parsed.private_key) {
                key = parsed.private_key.trim();
            }
        }
        catch (e) { }
    }
    if (key.startsWith('"') && key.endsWith('"')) {
        key = key.substring(1, key.length - 1).trim();
    }
    key = key.replace(/\\n/g, '\n').replace(/\\r/g, '\r').trim();
    const beginMatch = key.match(/-----BEGIN[A-Z0-9\s]+PRIVATE KEY-----/);
    const endMatch = key.match(/-----END[A-Z0-9\s]+PRIVATE KEY-----/);
    if (beginMatch && endMatch) {
        const beginHeader = beginMatch[0];
        const endHeader = endMatch[0];
        const startIndex = key.indexOf(beginHeader) + beginHeader.length;
        const endIndex = key.indexOf(endHeader);
        const base64Part = key.substring(startIndex, endIndex);
        const rawBase64 = base64Part
            .split(/[\r\n]+/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('');
        const formattedLines = [];
        for (let i = 0; i < rawBase64.length; i += 64) {
            formattedLines.push(rawBase64.substring(i, i + 64));
        }
        return `${beginHeader}\n${formattedLines.join('\n')}\n${endHeader}\n`;
    }
    const rawBase = key
        .split(/[\r\n\s]+/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('');
    const formattedBase64 = [];
    for (let i = 0; i < rawBase.length; i += 64) {
        formattedBase64.push(rawBase.substring(i, i + 64));
    }
    return `-----BEGIN PRIVATE KEY-----\n${formattedBase64.join('\n')}\n-----END PRIVATE KEY-----\n`;
}
const stockCache = new Map();
const mfCache = new Map();
const searchCache = new Map();
// SQLite Sync is disabled for Cloud Functions as it relies on persistent local filesystem
app.get("/get-sa-credentials", (req, res) => {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
    if (!email || !privateKey) {
        return res.status(404).json({ error: 'SA credentials not configured on server' });
    }
    res.json({ email, privateKey });
});
app.post("/parse-sms-ai", async (req, res) => {
    try {
        const { text, pendingPayments = [], recurringBills = [] } = req.body;
        if (!text)
            return res.status(400).json({ error: "Missing text payload" });
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
        }
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const pendingList = pendingPayments.map((p) => `[ID: ${p.id}] ${p.person} owes/owed ₹${p.amount} on ${p.dueDate}`).join('\n');
        const billsList = recurringBills.map((b) => `[ID: ${b.id}] ${b.title} of ₹${b.amount} due on ${b.nextDueDate}`).join('\n');
        const bankAccsList = (req.body.bankAccounts || []).map((b) => `[ID: ${b.id}] ${b.bankName} (${b.accountName} - ${b.accountNumber || ''})`).join('\n');
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
Format: Output the result as a strict JSON object without markdown formatting or code blocks.
Alignment: { "transaction_id": "", "amount": 0.00, "type": "CR/DR", "category": "", "merchant": "", "description": "", "matched_pending_id": "", "matched_recurring_id": "", "matched_bank_account_id": "" }.
Cleanse: Remove noise.
`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.1 }
        });
        let jsonStr = response.text || "{}";
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsedData = JSON.parse(jsonStr);
        res.json(parsedData);
    }
    catch (err) {
        console.error("[Parse SMS AI] Error:", err);
        res.status(500).json({ error: err.message || "Failed to parse SMS via AI" });
    }
});
const DEFAULT_SA_EMAIL = "investment@gen-lang-client-0137730538.iam.gserviceaccount.com";
const DEFAULT_SA_PK = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJepRZg5aEDDYm\nXRFHcrOHBPxFU/LGj+NmY39G7VSUaKC99tXpTN2SRQUEPWaVD76gJlI8bHZCqSnr\nLhfZlE7SWZrzJTAt+q5r/rskKQfYKbzmjS0/GCUmdaZAgr3K/LzwTKlUKMa0wIrQ\nGuz9un9oXBVL404ZaMzwzcMfRJ+douHCNo1qTdG+bzuyaUwCIsaFW6U15iC8VOi0\nSocNQ7qvZ5tJppRUzU8hPszF/s4kow6JjicoOddKGuwcATSEBivdejA+4us0rAC6\ngCBz8dS9QFwF8HWJPLpcHAplQAN16YFsxnbcN5PZYPEw71VbNz6M3acP5sYzmjTQ\nlIB+vWObAgMBAAECggEADmlkvtRr9KJqUICGvGLG1wkdwcMZUhJidI/4ajU5asDj\nLUNrQLFoBfmcPBXnm7umaePj16ugd/CMGDpR/Wp04D9a7I/ZQZNgB5yPJq0tVk0s\nqccpGI1xwYMCiInG6VlTwH09/Xr0imMIFY5fgQoRPqtGNglFLF8ejbkCKd8+6vJm\nPnQ7b6Cqt6OePeEpBd6DvYSW4mffKKsNeOyp+SikHmHRbU72OKBMdlj/ui42xRqe\n0gz5TxaZlbHNTZNxqiLkcUosj1zAuVfnUt1EnJe7SSay/5GSp5bRC+KQ6xelHo+W\nH59DILkiIZoHKDqUfKgLo9Ny5CiIp+fgJg4ZVly9QKBgQD6SJ7711sLows/E7/M\neJUserAqVh0kal5R3bRioNdsy0Kr5khqBojWtjGqW6g4bISO2TqNlpRtUA41NHj2\ncE0a1th6UfYvjWqUIeaZwJtvPtsDub9IgZ077YCre/RJ/ZgDOcnTSJNaqRZ5/YGg\nIxH1JBivOtzIVHC93RxPPz45DQKBgQDOFJov0lgjMLcnhlRwsOgCwztV8LM2DJ2r\nEoD6Q/8pRjeakEydpSsQJH0pYJyiHcx/al1o8eZ4wDAjT5O3LZ91n/D8BhnO89jy\ne9xsjy98GW7UZrN65N2dI4yXZ72S2ZEF6IgulciXQgYmnRZV5++527IeF+A0W6FO\nrH4LkqOVRwKBgEh58x/2kvThuAYCEA6D9J62wIDiAvpimwGV9ACDlx54Fcx1mQ6q\n6cFTbTpp5GLCefhry1ro+f5VqmeZ1FV427sj7/gr9+B5UR2oW4C2l8w1JXMEvPGg\nJwoNkq8V6/3pI7X7bAh1AcbFJC8bTAg1X6PfWg6UOw7/9M3mU6ZXKAuZAoGADIV3\n8Nvo+wpktoQU8VvuXOyb2FbtrKULl29iYtJq2Ikpq7yEyzdT7IErEa6LFdaVrFA8\nKLo59LBIvHyDTyf4fl8fd1CvlMGANwuLkxUIH5Q0BbfPw/HP/VJBopltDVUm2KMO\nUzZKn9YlJYd56fJTwIk2w1lUCBphLLSSXAWm5tUCgYEApOxpCADglz/dEH8XnBtX\nSe6/totOPnWx0Fah7m6L4dm2GtBGGiD7G4XoiGT7uoFyQxUGZDhXYkofoDgu3wuw\nDxBNQ7/mxche6MVXbrJOkOtUG9ME9rJjUPG0yDbJeJqWC/IzWxWphDYnT1MaE77v\nyvlaT7zW9Xd5RqUUd3EyN05=\n-----END PRIVATE KEY-----\n";
app.post("/get-google-service-token", async (req, res) => {
    try {
        let clientEmail = req.body?.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || DEFAULT_SA_EMAIL;
        let privateKeyInput = req.body?.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || DEFAULT_SA_PK;
        if (!privateKeyInput || !clientEmail) {
            return res.status(400).json({ error: "Google Service Account credentials not provided." });
        }
        let privateKey = privateKeyInput.trim();
        if (privateKey.startsWith("{") && privateKey.endsWith("}")) {
            try {
                const parsedJson = JSON.parse(privateKey);
                if (parsedJson.private_key)
                    privateKey = parsedJson.private_key;
                if (parsedJson.client_email)
                    clientEmail = parsedJson.client_email;
            }
            catch (je) { }
        }
        let emailStr = clientEmail.trim();
        if (emailStr.startsWith("{") && emailStr.endsWith("}")) {
            try {
                const parsedEmailJson = JSON.parse(emailStr);
                if (parsedEmailJson.client_email)
                    emailStr = parsedEmailJson.client_email;
                if (parsedEmailJson.private_key)
                    privateKey = parsedEmailJson.private_key;
            }
            catch (je) { }
        }
        privateKey = cleanPrivateKey(privateKey);
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
        const client = new google_auth_library_1.JWT({
            email: emailStr,
            key: privateKey,
            scopes: requestedScopes,
        });
        const tokens = await client.authorize();
        res.json({
            accessToken: tokens.access_token,
            expiry: tokens.expiry_date,
            clientEmail: emailStr
        });
    }
    catch (err) {
        console.error("[GoogleToken] Fetch token exception:", err);
        res.status(500).json({ error: err.message || String(err) });
    }
});
// Setup Broker Routes
// Pass the app so they can register their routes
(0, upstoxProxy_1.setupUpstoxRoutes)(app);
(0, dhanProxy_1.setupDhanRoutes)(app);
(0, angelProxy_1.setupAngelRoutes)(app);
(0, kiteProxy_1.setupKiteRoutes)(app);
app.get("/stock-price", async (req, res) => {
    try {
        const symbol = req.query.symbol;
        if (!symbol || typeof symbol !== "string") {
            return res.status(400).json({ error: "Stock symbol query parameter is required" });
        }
        let cleanSymbol = symbol.trim().toUpperCase();
        if (!cleanSymbol.endsWith('.NS') && !cleanSymbol.endsWith('.BO') && !cleanSymbol.includes('.')) {
            cleanSymbol += '.NS';
        }
        const cached = stockCache.get(cleanSymbol);
        if (cached && Date.now() - cached.timestamp < 60 * 1000) {
            return res.json(cached.data);
        }
        let apiResponse;
        let usedQuery = 'query2';
        try {
            apiResponse = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}`, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            if (!apiResponse.ok)
                throw new Error(`query2 failed`);
        }
        catch (e) {
            usedQuery = 'query1';
            apiResponse = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}`, {
                headers: { "User-Agent": "Mozilla/5.0" }
            });
        }
        if (!apiResponse.ok) {
            return res.status(apiResponse.status).json({ error: `Yahoo Finance error` });
        }
        const data = await apiResponse.json();
        const result = data?.chart?.result?.[0];
        const meta = result?.meta;
        let currentPrice = meta?.regularMarketPrice || meta?.previousClose;
        let previousClose = meta?.chartPreviousClose || meta?.previousClose || currentPrice;
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
            stockCache.set(cleanSymbol, { data: resultPayload, timestamp: Date.now() });
            return res.json(resultPayload);
        }
        else {
            return res.status(404).json({ error: "No live quote data" });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});
app.get("/mf-nav", async (req, res) => {
    try {
        const code = req.query.code;
        if (!code || typeof code !== "string")
            return res.status(400).json({ error: "Code required" });
        const cleanCode = code.trim();
        const cached = mfCache.get(cleanCode);
        if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
            return res.json(cached.data);
        }
        const apiResponse = await fetch(`https://api.mfapi.in/mf/${cleanCode}`);
        if (!apiResponse.ok)
            return res.status(apiResponse.status).json({ error: "MFAPI error" });
        const data = await apiResponse.json();
        const currentNav = parseFloat(data?.data?.[0]?.nav || '0');
        const fundName = data?.meta?.scheme_name || 'Mutual Fund Scheme';
        if (currentNav > 0) {
            const resultPayload = { currentNav, fundName };
            mfCache.set(cleanCode, { data: resultPayload, timestamp: Date.now() });
            return res.json(resultPayload);
        }
        else {
            return res.status(404).json({ error: "Invalid NAV data" });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});
app.get("/stock-search", async (req, res) => {
    try {
        const queryStr = req.query.q;
        if (!queryStr || typeof queryStr !== "string" || queryStr.trim().length < 2) {
            return res.status(400).json({ error: "Valid search query of at least 2 characters is required" });
        }
        const cleanQuery = queryStr.trim().toLowerCase();
        const cached = searchCache.get(cleanQuery);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            return res.json(cached.data);
        }
        const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&newsCount=0`;
        const response = await fetch(searchUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!response.ok)
            return res.status(response.status).json({ error: "Failed to search Yahoo Finance" });
        const data = await response.json();
        const quotes = data?.quotes || [];
        const suggestions = quotes
            .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || q.exchange === 'NSI' || q.exchange === 'BSE'))
            .map((q) => {
            const rawSymbol = q.symbol;
            const displaySymbol = rawSymbol.split('.')[0];
            return {
                symbol: displaySymbol,
                rawSymbol: rawSymbol,
                name: q.longname || q.shortname || displaySymbol,
                exch: q.exchange || (rawSymbol.endsWith('.NS') ? 'NSE' : 'BSE')
            };
        }).slice(0, 8);
        const finalSuggestions = suggestions.length > 0 ? suggestions : quotes.slice(0, 5).map((q) => ({
            symbol: q.symbol.split('.')[0],
            rawSymbol: q.symbol,
            name: q.longname || q.shortname || q.symbol,
            exch: q.exchange || 'MKT'
        }));
        searchCache.set(cleanQuery, { data: finalSuggestions, timestamp: Date.now() });
        return res.json(finalSuggestions);
    }
    catch (err) {
        res.status(500).json({ error: err.message || String(err) });
    }
});
app.post("/parse-csv-ai", async (req, res) => {
    try {
        const { csvText, bankAccounts } = req.body;
        if (!csvText)
            return res.status(400).json({ error: "csvText is required" });
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey)
            return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const bankContext = bankAccounts && Array.isArray(bankAccounts) && bankAccounts.length > 0
            ? `Here are the user's available bank accounts:\n${bankAccounts.map((b) => `- ID: ${b.id}, Name: ${b.bankName}, Number: ${b.accountNumber}`).join('\n')}\nIf the CSV statement mentions one of these banks or account numbers, assign that bank ID to "matched_bank_account_id".`
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
            config: { responseMimeType: "application/json", temperature: 0.1 }
        });
        const responseText = result.text || "[]";
        const transactions = JSON.parse(responseText);
        return res.json({ transactions });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Failed to process CSV" });
    }
});
app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Financial Rolodex Cloud Functions active" });
});
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map