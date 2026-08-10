// Hostinger Passenger CommonJS Wrapper for InvestMant
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'passenger_debug.log');

try {
    fs.writeFileSync(logPath, `=== InvestMant Passenger Debug Started ${new Date().toISOString()} ===\n`);
} catch (e) {
    console.error('Failed to initialize passenger_debug.log:', e);
}

function appendToLog(prefix, args) {
    const time = new Date().toISOString();
    const message = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.toString();
        if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
        }
        return String(arg);
    }).join(' ');
    
    try {
        fs.appendFileSync(logPath, `[${time}] [${prefix}] ${message}\n`);
    } catch (e) {
        // Fallback
    }
}

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
    originalLog.apply(console, args);
    appendToLog('LOG', args);
};
console.error = (...args) => {
    originalError.apply(console, args);
    appendToLog('ERROR', args);
};

const http = require('http');
const server = http.createServer();
const PORT = process.env.PORT || 3000;
server.listen(PORT);

server.on('error', (err) => {
    console.error('[CRITICAL] Server Listen Error:', err);
});

process.env.IS_WRAPPER = 'true';
process.env.NODE_ENV = 'production';

let expressApp = null;
let appLoadError = null;

server.on('request', (req, res) => {
    if (expressApp) {
        expressApp(req, res);
    } else if (appLoadError) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <body style="font-family: monospace; background: #0f172a; color: #f43f5e; padding: 20px;">
                    <h2>InvestMant Server Startup Failed</h2>
                    <pre>${appLoadError.stack || appLoadError.message || String(appLoadError)}</pre>
                </body>
            </html>
        `);
    } else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Service is starting. Please retry shortly.' }));
    }
});

async function startApp() {
    try {
        console.log('[Info] Loading server.js ESM module...');
        const appModule = await import('./server.js');
        expressApp = appModule.app;
        console.log('[Info] server.js ESM module loaded successfully.');
    } catch (err) {
        console.error("Failed to load server.js:", err);
        appLoadError = err;
    }
}

startApp();
