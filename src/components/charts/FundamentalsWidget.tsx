import React, { memo, useEffect, useRef, useState } from 'react';
import { getBinanceTicker24hr, getBinanceOpenInterest, getBinanceFundingRate } from '../../services/binanceApi';

interface FundamentalsWidgetProps {
  instrumentKey: string;
}

const FundamentalsWidget = ({ instrumentKey }: FundamentalsWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cryptoData, setCryptoData] = useState<any>(null);
  const [isLoadingCrypto, setIsLoadingCrypto] = useState(false);

  const getTVSymbol = (sym: string) => {
    let finalSym = sym.trim();
    if (!finalSym) return 'BSE:SENSEX';
    if (finalSym === 'NSE:NIFTY' || finalSym.includes('Nifty') || finalSym.includes('NIFTY 50')) return 'BSE:SENSEX';
    
    if (finalSym.includes(':')) {
      return finalSym;
    }
    
    if (finalSym.includes('|')) {
       if (finalSym.includes('002A01018')) return 'NSE:RELIANCE';
       if (finalSym.includes('467B01029')) return 'NSE:TCS';
       if (finalSym.includes('009A01021')) return 'NSE:INFY';
       if (finalSym.includes('040A01034')) return 'NSE:HDFCBANK';
       if (finalSym.includes('090A01021')) return 'NSE:ICICIBANK';
       if (finalSym.includes('075A01022')) return 'NSE:WIPRO';
       if (finalSym.includes('062A01020')) return 'NSE:SBIN';
       if (finalSym.includes('112A01023')) return 'NSE:BAJFINANCE';
       return 'BSE:SENSEX';
    }

    if (!finalSym.includes(':') && (finalSym.toUpperCase().endsWith('USDT') || finalSym.toUpperCase().endsWith('BTC') || finalSym.toUpperCase().endsWith('ETH'))) {
      return `BINANCE:${finalSym.toUpperCase()}`;
    }

    return `NSE:${finalSym.toUpperCase().replace(/\s+/g, '')}`;
  };

  const tvSymbol = getTVSymbol(instrumentKey);
  const isBinance = tvSymbol.startsWith('BINANCE:');
  const isUnsupported = !isBinance && (tvSymbol === 'NSE:NIFTY' || tvSymbol === 'BSE:SENSEX' || tvSymbol.includes('OANDA:') || tvSymbol.includes('FOREXCOM:'));

  useEffect(() => {
    if (isBinance) {
      const fetchCryptoData = async () => {
        setIsLoadingCrypto(true);
        try {
          const symbol = tvSymbol.replace('BINANCE:', '');
          const [ticker, oi, funding] = await Promise.all([
            getBinanceTicker24hr(symbol),
            getBinanceOpenInterest(symbol),
            getBinanceFundingRate(symbol)
          ]);
          setCryptoData({ ticker, oi, funding });
        } catch (error) {
          console.error("Error loading crypto fundamentals", error);
        } finally {
          setIsLoadingCrypto(false);
        }
      };
      fetchCryptoData();
      return;
    }

    if (!containerRef.current || isUnsupported) return;

    // Clean up previous widget
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%; width:100%"></div>';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `
      {
        "colorTheme": "light",
        "isTransparent": true,
        "largeChartUrl": "",
        "displayMode": "regular",
        "width": "100%",
        "height": "100%",
        "symbol": "${tvSymbol}",
        "locale": "in"
      }
    `;

    containerRef.current.appendChild(script);
  }, [tvSymbol, isUnsupported, isBinance]);

  if (isBinance) {
    if (isLoadingCrypto) {
      return <div className="w-full h-full bg-white flex items-center justify-center p-6"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }
    
    if (!cryptoData?.ticker) {
      return <div className="w-full h-full bg-white flex items-center justify-center p-6 text-slate-500">Failed to load Crypto Metrics</div>;
    }

    const { ticker, oi, funding } = cryptoData;
    const priceChangeColor = parseFloat(ticker.priceChangePercent) >= 0 ? 'text-green-600' : 'text-red-600';

    return (
      <div className="w-full h-full bg-white flex flex-col overflow-y-auto custom-scrollbar">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">{tvSymbol.replace('BINANCE:', '')}</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold">${parseFloat(ticker.lastPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className={`text-sm font-semibold ${priceChangeColor}`}>
              {parseFloat(ticker.priceChange) > 0 ? '+' : ''}{parseFloat(ticker.priceChange).toLocaleString()} ({parseFloat(ticker.priceChangePercent).toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="p-4 flex-1">
          <h3 className="text-sm font-bold text-slate-400 capitalize mb-4">Crypto Metrics (24H)</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">24h High</div>
              <div className="font-semibold text-slate-800">${parseFloat(ticker.highPrice).toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">24h Low</div>
              <div className="font-semibold text-slate-800">${parseFloat(ticker.lowPrice).toLocaleString()}</div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">24h Volume (Coin)</div>
              <div className="font-semibold text-slate-800">{parseFloat(ticker.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">24h Volume (USDT)</div>
              <div className="font-semibold text-slate-800">${(parseFloat(ticker.quoteVolume) / 1000000).toFixed(2)}M</div>
            </div>
            
            {oi && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                <div className="text-xs text-slate-500 mb-1">Open Interest (Futures)</div>
                <div className="font-semibold text-slate-800 flex justify-between">
                  <span>{parseFloat(oi.openInterest).toLocaleString()} {tvSymbol.replace('BINANCE:', '').replace('USDT', '')}</span>
                  <span className="text-slate-400 text-sm">~${(parseFloat(oi.openInterest) * parseFloat(ticker.lastPrice)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            )}
            
            {funding && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2">
                <div className="text-xs text-slate-500 mb-1">Current Funding Rate</div>
                <div className="font-semibold text-slate-800">
                  {(parseFloat(funding.lastFundingRate) * 100).toFixed(4)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isUnsupported) {
    return (
      <div className="w-full h-full bg-white p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22h20"/><path d="M17 2v20"/><path d="M22 17H2"/><path d="M7 2v20"/><path d="M22 7H2"/></svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Fundamentals Not Available</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          Fundamental data (Balance Sheet, Income Statement, etc.) is only available for individual company stocks, not for market indices or forex.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="tradingview-widget-container flex-1" ref={containerRef} style={{ height: "100%", width: "100%" }}>
        <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
      </div>
    </div>
  );
};

export default memo(FundamentalsWidget);
