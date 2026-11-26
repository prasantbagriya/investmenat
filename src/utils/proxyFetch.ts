import { Capacitor } from '@capacitor/core';
import { 
  clientChat, 
  clientParseSms, 
  clientParseReceipt, 
  clientParseSubscriptions, 
  clientParseCsv 
} from '../services/clientGemini';

/**
 * Handle AI routes directly on client if backend is not reachable or hosted on Firebase Hosting SPA.
 */
async function handleClientAiRoute(urlStr: string, options: RequestInit): Promise<Response | null> {
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  if (urlStr === '/api/chat') {
    const res = await clientChat(body.message, body.context);
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (urlStr === '/api/parse-sms-ai') {
    const res = await clientParseSms(body.text, body.pendingPayments, body.recurringBills, body.bankAccounts);
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (urlStr === '/api/parse-receipt') {
    const res = await clientParseReceipt(body.base64Image);
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (urlStr === '/api/parse-subscriptions') {
    const res = await clientParseSubscriptions(body.emailSnippets);
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (urlStr === '/api/parse-csv-ai') {
    const res = await clientParseCsv(body.csvText, body.bankAccounts);
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return null;
}

/**
 * proxyFetch acts as a drop-in replacement for the standard window.fetch.
 * In a web environment (React/Vite dev server), it passes the request through to the 
 * relative Express backend (e.g., '/api/upstox/...').
 * 
 * In a native environment (Capacitor/Android APK), since the backend is not hosted/reachable, 
 * it leverages the CapacitorHttp plugin to bypass CORS and hits the broker APIs directly.
 */
export async function proxyFetch(url: string | URL | Request, options: RequestInit = {}): Promise<Response> {
  const urlStr = url.toString();

  // If the request is for our backend API
  if (urlStr.startsWith('/api/')) {
    const isAiRoute = [
      '/api/chat',
      '/api/parse-sms-ai',
      '/api/parse-receipt',
      '/api/parse-subscriptions',
      '/api/parse-csv-ai'
    ].includes(urlStr);

    let backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    
    if (Capacitor.isNativePlatform() && !backendUrl) {
      // If it's an AI route in Native APK, handle directly on device using Gemini API
      if (isAiRoute) {
        try {
          const clientRes = await handleClientAiRoute(urlStr, options);
          if (clientRes) return clientRes;
        } catch (e) {
          console.error('[proxyFetch] Client Gemini error:', e);
        }
      }

      const isDev = import.meta.env.DEV;
      if (isDev) {
        backendUrl = 'http://10.0.2.2:8000';
      } else {
        console.warn('[proxyFetch] No VITE_BACKEND_URL set for native build. Skipping backend call:', urlStr);
        return new Response(JSON.stringify({ skipped: true }), { status: 200 });
      }
    }

    // On Web DEV, we MUST ignore VITE_BACKEND_URL so it hits the local Vite proxy/Express server.
    if (import.meta.env.DEV && !Capacitor.isNativePlatform()) {
      backendUrl = '';
    }

    // On Web with no VITE_BACKEND_URL, it fetches '/api/...' directly, which Vite's proxy handles.
    const finalUrl = backendUrl ? `${backendUrl}${urlStr}` : urlStr;
    try {
      const resp = await fetch(finalUrl, options);
      // Check if the response is actually valid JSON or if Firebase Hosting returned index.html (fallback rewrite)
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || (!contentType.includes('application/json') && isAiRoute)) {
        if (isAiRoute) {
          console.log('[proxyFetch] Backend not handling AI route, executing via Client Gemini API:', urlStr);
          const clientRes = await handleClientAiRoute(urlStr, options);
          if (clientRes) return clientRes;
        }
      }
      return resp;
    } catch (err) {
      if (isAiRoute) {
        console.log('[proxyFetch] Network failed for AI route, falling back to Client Gemini API:', urlStr);
        const clientRes = await handleClientAiRoute(urlStr, options);
        if (clientRes) return clientRes;
      }
      throw err;
    }
  }

  // Normal external fetches (like Yahoo Finance, etc.) go through directly
  return fetch(url, options);
}
