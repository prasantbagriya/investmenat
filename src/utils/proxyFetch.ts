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

  // If not native or not a proxy API URL, just do a normal fetch
  if (!Capacitor.isNativePlatform() || !urlStr.startsWith('/api/')) {
    if (!Capacitor.isNativePlatform() && urlStr.startsWith('/api/')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      return fetch(`${backendUrl}${urlStr}`, options);
    }
    return fetch(url, options);
  }

  let nativeUrl = urlStr;
  const nativeOptions: RequestInit = { ...options };
  nativeOptions.headers = { ...(nativeOptions.headers || {}) } as any;

  // UPSTOX NATIVE MAPPING
  if (urlStr.startsWith('/api/upstox/')) {
    const path = urlStr.replace('/api/upstox/', '');
    
    // Upstox API v2 requirements
    (nativeOptions.headers as any)['Api-Version'] = '2.0';
    (nativeOptions.headers as any)['Accept'] = 'application/json';

    if (path.startsWith('token')) {
      nativeUrl = 'https://api.upstox.com/v2/login/authorization/token';
      
      // Token endpoint requires x-www-form-urlencoded
      if (options.body && typeof options.body === 'string') {
        try {
          const jsonBody = JSON.parse(options.body);
          const params = new URLSearchParams();
          for (const key in jsonBody) {
            params.append(key, jsonBody[key]);
          }
          // The proxy adds grant_type automatically, so we must add it here natively
          params.append('grant_type', 'authorization_code'); 
          nativeOptions.body = params.toString();
          (nativeOptions.headers as any)['Content-Type'] = 'application/x-www-form-urlencoded';
        } catch (e) {
          console.error("Failed to parse token body", e);
        }
      }
    } else if (path.startsWith('profile')) {
      nativeUrl = 'https://api.upstox.com/v2/user/profile';
    } else if (path.startsWith('funds')) {
      nativeUrl = 'https://api.upstox.com/v2/user/get-funds-and-margin';
    } else if (path.startsWith('holdings')) {
      nativeUrl = 'https://api.upstox.com/v2/portfolio/long-term-holdings';
    } else if (path.startsWith('mutual-funds')) {
      nativeUrl = 'https://api.upstox.com/v2/portfolio/mutual-fund-holdings';
    } else if (path.startsWith('trade-pnl')) {
      nativeUrl = `https://api.upstox.com/v2/trade/profit-loss/data?${path.split('?')[1] || ''}`;
    } else if (path.startsWith('market-quote')) {
      const q = path.split('?')[1];
      const searchParams = new URLSearchParams(q || '');
      const symbol = searchParams.get('symbol') || '';
      nativeUrl = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(symbol)}`;
    } else if (path.startsWith('option-chain')) {
      nativeUrl = `https://api.upstox.com/v2/option/chain?${path.split('?')[1] || ''}`;
    } else if (path.startsWith('news')) {
      const q = path.split('?')[1];
      const searchParams = new URLSearchParams(q || '');
      const symbol = searchParams.get('symbol');
      nativeUrl = symbol 
        ? `https://api.upstox.com/v2/market-news/instrument?instrument_key=${encodeURIComponent(symbol)}`
        : `https://api.upstox.com/v2/market-news/top`;
    } else if (path.startsWith('fundamentals')) {
      const q = path.split('?')[1];
      const searchParams = new URLSearchParams(q || '');
      const symbol = searchParams.get('symbol') || '';
      nativeUrl = `https://api.upstox.com/v2/fundamentals/company-essential?instrument_key=${encodeURIComponent(symbol)}`;
    } else if (path.startsWith('historical-data')) {
      const q = path.split('?')[1];
      const searchParams = new URLSearchParams(q || '');
      const instrument_key = searchParams.get('instrument_key') || '';
      const interval = searchParams.get('interval');
      const to_date = searchParams.get('to_date');
      const from_date = searchParams.get('from_date');
      
      if (interval && to_date && from_date) {
        nativeUrl = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrument_key)}/${encodeURIComponent(interval)}/${encodeURIComponent(to_date)}/${encodeURIComponent(from_date)}`;
      } else {
        nativeUrl = `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(instrument_key)}/1minute`;
      }
    } else if (path.startsWith('gtt-order')) {
      nativeUrl = 'https://api.upstox.com/v2/order/gtt/place';
    } else if (path.startsWith('order')) {
      nativeUrl = 'https://api.upstox.com/v2/order/place';
    }
  }
  
  // DHAN NATIVE MAPPING
  else if (urlStr.startsWith('/api/dhan/')) {
    const path = urlStr.replace('/api/dhan/', '');
    (nativeOptions.headers as any)['Accept'] = 'application/json';
    
    if (path.startsWith('funds')) {
      nativeUrl = 'https://api.dhan.co/fundlimit';
    } else if (path.startsWith('holdings')) {
      nativeUrl = 'https://api.dhan.co/holdings';
    } else if (path.startsWith('order')) {
      nativeUrl = 'https://api.dhan.co/orders';
    }
  }

  // ANGEL ONE NATIVE MAPPING
  else if (urlStr.startsWith('/api/angel/')) {
    const path = urlStr.replace('/api/angel/', '');
    (nativeOptions.headers as any)['Accept'] = 'application/json';
    (nativeOptions.headers as any)['Content-Type'] = 'application/json';
    (nativeOptions.headers as any)['X-UserType'] = 'USER';
    (nativeOptions.headers as any)['X-SourceID'] = 'WEB';
    (nativeOptions.headers as any)['X-ClientLocalIP'] = '192.168.1.1'; // Required mock IPs
    (nativeOptions.headers as any)['X-ClientPublicIP'] = '106.193.147.98';
    (nativeOptions.headers as any)['X-MACAddress'] = '00-00-00-00-00-00';

    if (path.startsWith('login')) {
      nativeUrl = 'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword';
    } else if (path.startsWith('funds')) {
      nativeUrl = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getRMS';
    } else if (path.startsWith('holdings')) {
      nativeUrl = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/portfolio/v1/getHolding';
    } else if (path.startsWith('order')) {
      nativeUrl = 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder';
    }
  }

  // ZERODHA KITE NATIVE MAPPING
  else if (urlStr.startsWith('/api/kite/')) {
    const path = urlStr.replace('/api/kite/', '');
    (nativeOptions.headers as any)['X-Kite-Version'] = '3';
    
    if (path.startsWith('token')) {
      nativeUrl = 'https://api.kite.trade/session/token';
      // Token endpoint requires x-www-form-urlencoded
      if (options.body && typeof options.body === 'string') {
        try {
          const jsonBody = JSON.parse(options.body);
          const params = new URLSearchParams();
          for (const key in jsonBody) {
            params.append(key, jsonBody[key]);
          }
          nativeOptions.body = params.toString();
          (nativeOptions.headers as any)['Content-Type'] = 'application/x-www-form-urlencoded';
        } catch (e) {
          console.error("Failed to parse Kite token body", e);
        }
      }
    } else if (path.startsWith('funds')) {
      nativeUrl = 'https://api.kite.trade/user/margins';
    } else if (path.startsWith('holdings')) {
      nativeUrl = 'https://api.kite.trade/portfolio/holdings';
    } else if (path.startsWith('order')) {
      nativeUrl = 'https://api.kite.trade/orders/regular';
    }
  }

  // If no native mapping matched but it's a backend proxy route, route it to Render
  if (nativeUrl === urlStr && urlStr.startsWith('/api/')) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    nativeUrl = `${backendUrl}${urlStr}`;
  }

  return fetch(nativeUrl, nativeOptions);
}
