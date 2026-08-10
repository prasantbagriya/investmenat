import { Capacitor } from '@capacitor/core';

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
    let backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    
    if (Capacitor.isNativePlatform() && !backendUrl) {
      // On real Android device, 10.0.2.2 only works in Android Emulator — NOT on real phones.
      // If no production backend URL is set, we throw so callers can skip gracefully.
      // This prevents hanging requests on real APK builds.
      const isDev = import.meta.env.DEV;
      if (isDev) {
        // Only use emulator localhost in development/emulator context
        backendUrl = 'http://10.0.2.2:8000';
      } else {
        // Real APK with no backend URL — return a fake failed response so firebase-sync
        // can skip SQLite sync without blocking the Firebase write
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
    return fetch(finalUrl, options);
  }

  // Normal external fetches (like Yahoo Finance, etc.) go through directly
  return fetch(url, options);
}
