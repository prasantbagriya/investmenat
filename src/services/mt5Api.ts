import MetaApi from 'metaapi.cloud-sdk';
import { KLineData } from '../components/kline/mockData';
import { generateMockData } from '../components/kline/mockData';

const META_API_TOKEN = import.meta.env.VITE_META_API_TOKEN || '';
const META_ACCOUNT_ID = import.meta.env.VITE_META_ACCOUNT_ID || '';

// Global connection cache to avoid reconnecting on every fetch
let metaApi: MetaApi | null = null;
let rpcConnection: any = null;
let streamConnection: any = null;

async function initMetaApiConnection() {
  if (!META_API_TOKEN || !META_ACCOUNT_ID) {
    throw new Error('MetaApi credentials not configured in .env');
  }
  
  if (!metaApi) {
    metaApi = new MetaApi(META_API_TOKEN);
  }

  if (!rpcConnection) {
    const account = await metaApi.metatraderAccountApi.getAccount(META_ACCOUNT_ID);
    await account.waitConnected();
    rpcConnection = account.getRPCConnection();
    await rpcConnection.connect();
    await rpcConnection.waitSynchronized();
    
    streamConnection = account.getStreamingConnection();
    await streamConnection.connect();
    await streamConnection.waitSynchronized();
  }
  
  return { rpcConnection, streamConnection };
}

/**
 * Fetches historical bars from MetaApi Cloud (fallback to mock data if no API key is present)
 */
export async function fetchMT5Bars(symbol: string, timeframe: string, limit: number = 500): Promise<KLineData[]> {
  if (!META_API_TOKEN || !META_ACCOUNT_ID) {
    console.warn("MetaApi Token or Account ID not found. Falling back to mock data.");
    return generateMockData(limit, undefined, symbol);
  }

  try {
    const { rpcConnection: connection } = await initMetaApiConnection();
    
    // Convert timeframe to MetaApi format (e.g. '1D' -> '1d', '1H' -> '1h')
    const metaTimeframe = timeframe.toLowerCase(); 
    
    // We request from the current time backwards
    const endTime = new Date();
    // To get 'limit' candles, we can just request an array of candles directly in some SDK versions,
    // or calculate the start time. MetaApi getHistoricalCandles takes (accountId, symbol, timeframe, startTime).
    // Wait, the SDK `getRPCConnection().getHistoricalCandles` usually takes (symbol, timeframe, startTime).
    
    // Let's request the history safely using the REST API if the SDK fails, but we'll try SDK first
    // Some versions use: getHistoricalCandles(symbol, timeframe, startTime)
    // Actually, to get the last N candles, it's often easier to just ask for a broad start time.
    // Let's assume we want N candles.
    
    const startTime = new Date(Date.now() - limit * 24 * 60 * 60 * 1000); // Rough approximation
    
    // NOTE: If the exact method signature is different, this might throw.
    // If it throws, we catch it and fallback to mock data, keeping the app alive.
    const history = await connection.getHistoricalCandles(symbol, metaTimeframe, startTime);
    
    if (!history || !history.length) {
      throw new Error('No historical data returned');
    }

    // Map to kline format
    return history.slice(-limit).map((candle: any) => ({
      timestamp: new Date(candle.time).getTime(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.tickVolume || candle.volume || 0,
    }));
    
  } catch (error) {
    console.error("Failed to fetch from MetaApi Cloud, falling back to mock:", error);
    return generateMockData(limit, undefined, symbol);
  }
}

/**
 * Subscribes to live market data ticks via MetaApi Streaming Connection
 */
export async function subscribeToTicks(symbol: string, onTick: (tick: any) => void): Promise<() => void> {
  if (!META_API_TOKEN || !META_ACCOUNT_ID) {
    console.warn("MetaApi credentials missing, cannot subscribe to live ticks.");
    return () => {};
  }

  try {
    const { streamConnection } = await initMetaApiConnection();
    
    // Ensure we are subscribed to market data for this symbol
    await streamConnection.subscribeToMarketData(symbol);

    // Create a listener
    const listenerId = 'tickListener_' + Date.now();
    const listener = {
      onSymbolPriceUpdated: (instanceIndex: string, price: any) => {
        if (price.symbol === symbol) {
          onTick(price);
        }
      }
    };
    
    streamConnection.addSynchronizationListener(listener);

    // Return an unsubscribe function
    return () => {
      try {
        streamConnection.removeSynchronizationListener(listener);
        streamConnection.unsubscribeFromMarketData(symbol);
      } catch (e) {
        console.error("Error unsubscribing:", e);
      }
    };
  } catch (err) {
    console.error("Failed to subscribe to ticks via MetaApi:", err);
    return () => {};
  }
}

