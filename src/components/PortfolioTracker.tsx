import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, BarChart3, PieChart as PieIcon, 
  Eye, EyeOff, ShieldCheck, HelpCircle, Layers, FolderCheck, Wallet, ArrowUpRight
} from 'lucide-react';
import { Holding, WatchlistItem, UserSettings, RealizedTrade } from '../types';
import { fetchStockPrice, fetchMutualFundNav, calculateXIRR, fetchStockSearch } from '../utils/financeHelpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import InfoTooltip from './InfoTooltip';
import toast from 'react-hot-toast';
import TradeExecutionModal from './TradeExecutionModal';

interface PortfolioTrackerProps {
  holdings: Holding[];
  realizedTrades: RealizedTrade[];
  watchlist: WatchlistItem[];
  onAddHolding: (holding: Omit<Holding, 'id' | 'userId'>) => Promise<void>;
  onDeleteHolding: (id: string) => Promise<void>;
  onUpdateHolding: (id: string, updatedData: Partial<Holding>) => Promise<void>;
  onAddRealizedTrade: (trade: Omit<RealizedTrade, 'id' | 'userId'>) => Promise<void>;
  onAddToWatchlist: (item: Omit<WatchlistItem, 'id' | 'userId'>) => Promise<void>;
  onRemoveFromWatchlist: (id: string) => Promise<void>;
  userSettings?: UserSettings | null;
  onUpdateSmartApiSettings: (settingsData: Partial<UserSettings>) => Promise<void>;
  livePrices?: Record<string, { currentPrice: number; dayChange: number; name: string }>;
  refreshPrices?: () => void;
  loadingPrices?: boolean;
  brokerFunds?: {
    upstox: { available: number; utilized: number };
    dhan: { available: number; utilized: number };
    angel: { available: number; utilized: number };
    totalAvailable: number;
  };
  brokerOrders?: any[]; // Passed from useBrokerSync
  isSyncingBrokerData?: boolean;
  onRefreshBrokerData?: () => void;
}

const POPULAR_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', price: 2420, class: 'Equity' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', price: 3850, class: 'Equity' },
  { symbol: 'INFY', name: 'Infosys Limited', price: 1490, class: 'Equity' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Limited', price: 1545, class: 'Equity' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', price: 1120, class: 'Equity' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Limited', price: 955, class: 'Equity' },
  { symbol: 'ITC', name: 'ITC Limited', price: 430, class: 'Equity' },
  { symbol: 'SBIN', name: 'State Bank of India', price: 790, class: 'Equity' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited', price: 1220, class: 'Equity' },
  { symbol: 'LT', name: 'Larsen & Toubro Limited', price: 3650, class: 'Equity' },
  { symbol: 'ZOMATO', name: 'Zomato Limited', price: 185, class: 'Equity' },
  { symbol: 'NIFTYBEES', name: 'Nippon India Nifty 50 ETF', price: 245, class: 'Equity' },
  { symbol: 'GOLDBEES', name: 'Nippon India Gold ETF', price: 62.5, class: 'Gold' },
  { symbol: 'MON100', name: 'Motilal Oswal Nasdaq 100 ETF', price: 145, class: 'Equity' },
  { symbol: 'LIQUIDBEES', name: 'Nippon India Liquid ETF (Debt)', price: 1000, class: 'Debt' }
];

export default function PortfolioTracker({
  holdings,
  realizedTrades,
  watchlist,
  onAddHolding,
  onDeleteHolding,
  onUpdateHolding,
  onAddRealizedTrade,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  userSettings,
  onUpdateSmartApiSettings,
  livePrices = {},
  refreshPrices,
  loadingPrices = false,
  brokerFunds,
  brokerOrders = [], // Default to empty
  isSyncingBrokerData = false,
  onRefreshBrokerData
}: PortfolioTrackerProps) {



  // Forms states
  const [subTab, setSubTab] = useState<'analytics' | 'holdings' | 'watchlist'>('analytics');
  const [calcYears, setCalcYears] = useState(5);
  const [calcMonthlyContrib, setCalcMonthlyContrib] = useState(10000);
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<'stock' | 'mf'>('stock');
  const [symbol, setSymbol] = useState('');
  const [mfSchemeCode, setMfSchemeCode] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyDate, setBuyDate] = useState(new Date().toISOString().substring(0, 10));
  const [assetClass, setAssetClass] = useState<'Equity' | 'Debt' | 'Gold' | 'Cash'>('Equity');
  const [broker, setBroker] = useState('Zerodha');

  // Watchlist forms states
  const [isAddingWatch, setIsAddingWatch] = useState(false);
  const [watchType, setWatchType] = useState<'stock' | 'mf'>('stock');
  const [watchSymbol, setWatchSymbol] = useState('');
  const [watchScheme, setWatchScheme] = useState('');

  // Cash Wallet Management State
  const [cashActionType, setCashActionType] = useState<'deposit' | 'withdraw' | null>(null);
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [cashNoteInput, setCashNoteInput] = useState('');

  // Exit Holding State
  const [exitingHolding, setExitingHolding] = useState<any | null>(null);
  const [exitQuantity, setExitQuantity] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [addProceedsToCash, setAddProceedsToCash] = useState(true);

  // Asset Details & Recharts state
  const [viewingAssetDetails, setViewingAssetDetails] = useState<any | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');

  const [deductCashFromWallet, setDeductCashFromWallet] = useState(false);
  const [portfolioViewMode, setPortfolioViewMode] = useState<'holdings' | 'ledger' | 'orders'>('holdings');

  // Trade Execution Modal State
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeLtp, setTradeLtp] = useState<number | undefined>(undefined);

  // Live lookup & search states for high-fidelity stock and MF searching
  const [mfSearchQuery, setMfSearchQuery] = useState('');
  const [mfSearchResults, setMfSearchResults] = useState<Array<{ schemeCode: number; schemeName: string }>>([]);
  const [isSearchingMf, setIsSearchingMf] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockSearchResults, setStockSearchResults] = useState<Array<{ symbol: string; rawSymbol: string; name: string; exch: string }>>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [tickerLookupResult, setTickerLookupResult] = useState<{ price: number; name: string; change: number } | null>(null);
  const [isLookingUpTicker, setIsLookingUpTicker] = useState(false);

  // Reset search and form states when asset type switches
  useEffect(() => {
    setSymbol('');
    setMfSchemeCode('');
    setMfSearchQuery('');
    setMfSearchResults([]);
    setStockSearchQuery('');
    setStockSearchResults([]);
    setTickerLookupResult(null);
    setBuyPrice('');
    setQuantity('');
  }, [type]);

  // Debounced live Stock Quote Lookup (fallback when manual input is used or symbol state changes)
  useEffect(() => {
    if (type !== 'stock' || !symbol || symbol.trim().length < 2) {
      return;
    }
    // Only run if stockSearchQuery doesn't match the selected symbol to prevent duplicate fetches
    const popularMatch = POPULAR_STOCKS.find(s => s.symbol === symbol.toUpperCase());
    if (popularMatch && tickerLookupResult && tickerLookupResult.name === popularMatch.name) {
      return;
    }
    const handler = setTimeout(async () => {
      setIsLookingUpTicker(true);
      try {
        const info = await fetchStockPrice(symbol);
        if (info && info.currentPrice > 0) {
          setTickerLookupResult({
            price: info.currentPrice,
            name: info.longName,
            change: info.dayChangePercent
          });
          if (!buyPrice) {
            setBuyPrice(info.currentPrice.toString());
          }
        }
      } catch (err) {
        console.warn("Real-time stock quote lookup failed:", err);
      } finally {
        setIsLookingUpTicker(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [symbol, type]);

  // Debounced Stock Symbol Autocomplete search resolution
  useEffect(() => {
    if (type !== 'stock' || !stockSearchQuery || stockSearchQuery.trim().length < 2) {
      setStockSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearchingStock(true);
      try {
        const results = await fetchStockSearch(stockSearchQuery);
        if (Array.isArray(results)) {
          setStockSearchResults(results);
        }
      } catch (err) {
        console.warn("Stock autocomplete live search failed:", err);
      } finally {
        setIsSearchingStock(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [stockSearchQuery, type]);

  // Debounced Mutual Fund Scheme Search suggestion resolution
  useEffect(() => {
    if (type !== 'mf' || !mfSearchQuery || mfSearchQuery.trim().length < 3) {
      setMfSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearchingMf(true);
      try {
        const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(mfSearchQuery)}`);
        if (response.ok) {
          const results = await response.json();
          if (Array.isArray(results)) {
            setMfSearchResults(results.slice(0, 8)); // Top 8 suggestions
          }
        }
      } catch (err) {
        console.warn("Mutual fund live search fetch failed:", err);
      } finally {
        setIsSearchingMf(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [mfSearchQuery, type]);

  // Action on selecting a stock suggestion row
  const handleSelectStock = async (item: { symbol: string; rawSymbol: string; name: string; exch: string }) => {
    setSymbol(item.symbol);
    setStockSearchQuery(item.name);
    setStockSearchResults([]);
    setIsLookingUpTicker(true);
    try {
      const info = await fetchStockPrice(item.rawSymbol);
      if (info && info.currentPrice > 0) {
        setBuyPrice(info.currentPrice.toString());
        setTickerLookupResult({
          price: info.currentPrice,
          name: info.longName,
          change: info.dayChangePercent
        });
      }
    } catch (err) {
      console.warn("Stock price resolution failed on selection:", err);
    } finally {
      setIsLookingUpTicker(false);
    }
  };

  // Action on selecting a mutual fund suggestion row
  const handleSelectMfScheme = async (schemeCode: number, schemeName: string) => {
    setMfSchemeCode(schemeCode.toString());
    setMfSearchQuery(schemeName);
    setMfSearchResults([]);
    setIsLookingUpTicker(true);
    try {
      const info = await fetchMutualFundNav(schemeCode.toString());
      if (info && info.currentNav > 0) {
        setBuyPrice(info.currentNav.toString());
        setTickerLookupResult({
          price: info.currentNav,
          name: info.fundName,
          change: 0
        });
      }
    } catch (err) {
      console.warn("MF Nav resolution failed on selection:", err);
    } finally {
      setIsLookingUpTicker(false);
    }
  };



  // Calculations
  const processedHoldings = holdings.map(h => {
    const key = h.type === 'stock' ? `stock_${h.symbol}` : `mf_${h.schemeCode}`;
    const live = livePrices[key];
    const currentPrice = live ? live.currentPrice : h.buyPrice;
    const currentVal = currentPrice * h.quantity;
    const investedVal = h.buyPrice * h.quantity;
    const profitLoss = currentVal - investedVal;
    const profitLossPercent = investedVal > 0 ? (profitLoss / investedVal) * 100 : 0;
    const dayChangePercent = live ? live.dayChange : 0;

    // Calculate XIRR rate for this individual holding
    // Outflows: purchase cost (-) on buyDate, Inflow: current value (+) today
    const xirr = calculateXIRR([-investedVal, currentVal], [h.buyDate, new Date().toISOString().substring(0, 10)]);

    return {
      ...h,
      displayName: live ? live.name : (h.type === 'stock' ? h.symbol : h.name || `Mutual Fund (${h.schemeCode})`),
      currentPrice,
      currentValue: currentVal,
      investedValue: investedVal,
      pnl: profitLoss,
      pnlPercent: profitLossPercent,
      dayChange: dayChangePercent,
      xirr
    };
  });

  const aggregate = processedHoldings.reduce((acc, h) => {
    acc.totalInvested += h.investedValue;
    acc.totalCurrent += h.currentValue;
    return acc;
  }, { totalInvested: 0, totalCurrent: 0 });

  const totalPnL = aggregate.totalCurrent - aggregate.totalInvested;
  const totalPnLPercent = aggregate.totalInvested > 0 ? (totalPnL / aggregate.totalInvested) * 100 : 0;

  // Calculate overall Portfolio XIRR
  const portfolioXirr = React.useMemo(() => {
    if (processedHoldings.length === 0) return 0;
    const cashflows: number[] = [];
    const dates: string[] = [];

    // Add negative outflows (purchases)
    processedHoldings.forEach(h => {
      cashflows.push(-h.investedValue);
      dates.push(h.buyDate);
    });

    // Add positive current valuation flow (today)
    cashflows.push(aggregate.totalCurrent);
    dates.push(new Date().toISOString().substring(0, 10));

    return calculateXIRR(cashflows, dates);
  }, [processedHoldings, aggregate.totalCurrent]);

  // Group by Asset Class
  const assetAllocation = React.useMemo(() => {
    const groups: Record<string, number> = { Equity: 0, Debt: 0, Gold: 0, Cash: 0 };
    processedHoldings.forEach(h => {
      groups[h.assetClass] = (groups[h.assetClass] || 0) + h.currentValue;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
  }, [processedHoldings]);

  // Asset colors
  const COLORS = {
    Equity: '#10B981', // Emerald
    Debt: '#3B82F6',   // Blue
    Gold: '#F59E0B',   // Gold
    Cash: '#6B7280'    // Grey
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyPrice || !quantity) return;

    const bPrice = parseFloat(buyPrice);
    const qty = parseFloat(quantity);
    const buyCost = bPrice * qty;

    if (deductCashFromWallet) {
      const currentCash = userSettings?.investmentCashBalance || 0;
      if (buyCost > currentCash) {
        alert(`Insufficient cash in your Investment Wallet (Available: ₹${currentCash.toLocaleString('en-IN')}) to complete this purchase of ₹${buyCost.toLocaleString('en-IN')}. Please deposit cash first or uncheck the "Deduct buy cost" option.`);
        return;
      }
      try {
        await onUpdateSmartApiSettings({
          investmentCashBalance: parseFloat((currentCash - buyCost).toFixed(2))
        });
      } catch (err: any) {
        alert(`Failed to deduct cash from wallet: ${err.message || err}`);
        return;
      }
    }

    const resolvedName = type === 'mf'
      ? (tickerLookupResult?.name || `Mutual Fund (Code: ${mfSchemeCode})`)
      : (tickerLookupResult?.name || symbol.toUpperCase());

    try {
      await onAddHolding({
        type,
        symbol: type === 'stock' ? symbol.toUpperCase() : undefined,
        name: resolvedName,
        buyPrice: bPrice,
        quantity: qty,
        buyDate,
        assetClass,
        broker,
        schemeCode: type === 'mf' ? mfSchemeCode : undefined
      });
      setIsAdding(false);
      toast.success('Holding saved successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Error saving holding: ${err.message || String(err)}\nPlease take a screenshot.`);
    }
    // Reset form
    setSymbol('');
    setMfSchemeCode('');
    setMfSearchQuery('');
    setMfSearchResults([]);
    setStockSearchQuery('');
    setStockSearchResults([]);
    setTickerLookupResult(null);
    setBuyPrice('');
    setQuantity('');
    setDeductCashFromWallet(false);
  };

  const handleAddWatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddToWatchlist({
      type: watchType,
      symbol: watchType === 'stock' ? watchSymbol.toUpperCase() : undefined,
      name: watchType === 'mf' ? `MF Tracker (${watchScheme})` : undefined,
      schemeCode: watchType === 'mf' ? watchScheme : undefined
    });

    setIsAddingWatch(false);
    setWatchSymbol('');
    setWatchScheme('');
  };

  // --- CASH WALLET MANAGEMENT HANDLER ---
  const handleCashWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cashAmountInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    const currentBalance = userSettings?.investmentCashBalance || 0;
    let nextBalance = currentBalance;

    if (cashActionType === 'deposit') {
      nextBalance = currentBalance + amount;
    } else if (cashActionType === 'withdraw') {
      if (amount > currentBalance) {
        alert("Insufficient cash balance available for withdrawal.");
        return;
      }
      nextBalance = currentBalance - amount;
    }

    try {
      await onUpdateSmartApiSettings({
        investmentCashBalance: parseFloat(nextBalance.toFixed(2))
      });
      alert(`Successfully ${cashActionType === 'deposit' ? 'deposited' : 'withdrawn'} ₹${amount.toLocaleString('en-IN')}!`);
      setCashActionType(null);
      setCashAmountInput('');
      setCashNoteInput('');
    } catch (err: any) {
      alert(`Failed to update cash balance: ${err.message || err}`);
    }
  };

  // --- EXIT & BOOK POSITION PROFIT/LOSS HANDLER ---
  const handleExitPositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitingHolding) return;

    const qtyToSell = parseFloat(exitQuantity);
    const sellPrice = parseFloat(exitPrice);

    if (isNaN(qtyToSell) || qtyToSell <= 0 || qtyToSell > exitingHolding.quantity) {
      alert(`Invalid quantity! Max quantity you can sell is ${exitingHolding.quantity}.`);
      return;
    }
    if (isNaN(sellPrice) || sellPrice <= 0) {
      alert("Please enter a valid exit price.");
      return;
    }

    try {
      // Calculate booked calculations
      const buyPrice = exitingHolding.buyPrice;
      const realizedPnLOfTrade = parseFloat(((sellPrice - buyPrice) * qtyToSell).toFixed(2));
      const proceedsVal = parseFloat((sellPrice * qtyToSell).toFixed(2));

      // Book Realized Trade inside the global database
      await onAddRealizedTrade({
        type: exitingHolding.type,
        symbol: exitingHolding.symbol || undefined,
        name: exitingHolding.name || exitingHolding.displayName,
        buyPrice: buyPrice,
        exitPrice: sellPrice,
        quantity: qtyToSell,
        pnl: realizedPnLOfTrade,
        exitDate: new Date().toISOString().substring(0, 10)
      });

      // Adjust remaining holding quantity
      const nextQty = parseFloat((exitingHolding.quantity - qtyToSell).toFixed(6));
      if (nextQty <= 0) {
        await onDeleteHolding(exitingHolding.id);
      } else {
        await onUpdateHolding(exitingHolding.id, {
          quantity: nextQty
        });
      }

      // Sync wallet balance adjustments (if proceeds selected)
      const currentCash = userSettings?.investmentCashBalance || 0;
      const currentRealizedPnL = userSettings?.realizedPnL || 0;

      const updates: Partial<UserSettings> = {};
      if (addProceedsToCash) {
        updates.investmentCashBalance = parseFloat((currentCash + proceedsVal).toFixed(2));
      }
      updates.realizedPnL = parseFloat((currentRealizedPnL + realizedPnLOfTrade).toFixed(2));

      if (Object.keys(updates).length > 0) {
        await onUpdateSmartApiSettings(updates);
      }

      alert(`🎉 Sale completed! Booked P&L: ₹${realizedPnLOfTrade.toLocaleString('en-IN')}`);
      setExitingHolding(null);
      setExitQuantity('');
      setExitPrice('');
    } catch (err: any) {
      alert(`Failed to exit position: ${err.message || err}`);
    }
  };

  // --- CHART DATA GENERATION HELPER ---
  const generateSimulatedChartData = (currentPrice: number, assetName: string, timeframe: '1M' | '3M' | '6M' | '1Y' = '3M') => {
    const data = [];
    const dateToday = new Date();
    
    let daysLimit = 30;
    if (timeframe === '3M') daysLimit = 90;
    if (timeframe === '6M') daysLimit = 180;
    if (timeframe === '1Y') daysLimit = 365;

    // Pick daily variations depending on symbol hash to keep it consistent
    const hash = assetName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const volatility = ((hash % 10) + 4) / 600; // between 0.6% and 2.3%

    let runningPrice = currentPrice * (1 - volatility * (daysLimit / 6)); // start lower for positive performance

    for (let i = daysLimit; i >= 0; i--) {
      const d = new Date();
      d.setDate(dateToday.getDate() - i);
      const dayStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      const randFactor = Math.sin((i + hash) / 8) * volatility + (Math.random() * volatility - volatility / 2);
      runningPrice = runningPrice * (1 + randFactor);
      
      // Force last price to equal current live price
      if (i === 0) {
        runningPrice = currentPrice;
      }

      data.push({
        date: dayStr,
        price: parseFloat(runningPrice.toFixed(2)),
        pct: parseFloat((((runningPrice - currentPrice) / currentPrice) * 100).toFixed(2))
      });
    }
    return data;
  };

  return (
    <div className="space-y-3">
      {/* Portfolio Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-slate-900 text-white rounded-2xl p-2 shadow-sm border border-slate-800">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Portfolio Value</p>
          <p className="text-2xl font-black mt-1 font-display">₹{aggregate.totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-slate-500 font-medium">Invested: ₹{aggregate.totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-150">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Absolute Profit & Loss</p>
          <p className={`text-2xl font-black mt-1 font-display flex items-center gap-1 ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            {totalPnL >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
            <span className={`text-xs font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-500 font-medium">All Time</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-150">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Portfolio XIRR</p>
          <p className="text-2xl font-black mt-1 font-display text-slate-900">
            {portfolioXirr > 0 ? '+' : ''}{portfolioXirr.toFixed(2)}%
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ShieldCheck size={14} className="text-blue-500" />
            <span className="text-[10px] text-slate-500 font-medium font-sans">Compounded Annualized Return</span>
          </div>
        </div>

      </div>

      {/* Cash Wallet & Realized P&L Bento Segment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Cash Wallet Card */}
        <div className="bg-linear-to-br from-rose-500 to-rose-600 rounded-2xl p-4 shadow-lg border border-rose-400 relative overflow-hidden text-white flex-1 min-w-[200px]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Wallet className="text-white/80" size={16} />
              <h4 className="font-bold text-xs text-white">Investment Cash Balance</h4>
            </div>
            <span className="text-[9px] bg-white/20 text-white font-bold px-1 py-0.5 rounded-full">Liquid cash</span>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono flex items-center gap-2">
              ₹{((userSettings?.investmentCashBalance || 0) + (brokerFunds?.totalAvailable || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              {isSyncingBrokerData && <RefreshCw size={12} className="animate-spin text-white" />}
            </div>
            <p className="text-[10px] text-white/70 mt-1">
              Manual: ₹{(userSettings?.investmentCashBalance || 0).toLocaleString('en-IN')} | Broker: ₹{(brokerFunds?.totalAvailable || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex gap-1 pt-1">
            <button
              onClick={() => { setCashActionType('deposit'); setCashAmountInput(''); }}
              className="flex-1 text-center py-1.5 bg-white text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
            >
              + Deposit Cash
            </button>
            <button
              onClick={() => { setCashActionType('withdraw'); setCashAmountInput(''); }}
              className="flex-1 text-center py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
            >
              - Withdraw Cash
            </button>
          </div>
        </div>

        {/* Realized P&L Summary Card */}
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-lg border border-emerald-400 relative overflow-hidden text-white flex-1 min-w-[200px]">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-100">
              <FolderCheck size={16} />
              <h4 className="font-bold text-xs text-white">Booked (Realized) Profit/Loss</h4>
            </div>
            <p className="text-[10px] text-emerald-50">Cumulative lock-in profit/loss booked from closed trades.</p>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black font-mono text-white">
              ₹{(userSettings?.realizedPnL || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-emerald-100 mt-1.5">
              Ledger database tracks {realizedTrades?.length || 0} exited positions.
            </p>
          </div>
        </div>

        {/* Total Net Worth Card */}
        <div className="bg-linear-to-br from-indigo-950 to-slate-900 rounded-2xl p-4 shadow-xl border border-indigo-900/30 text-white relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">Total Portfolio Net Worth</p>
            <p className="text-[10px] text-slate-350">Combined sum of active securities and liquid cash.</p>
          </div>
          <div className="mt-1">
            <div className="text-2xl font-black font-mono text-indigo-200">
              ₹{(aggregate.totalCurrent + (userSettings?.investmentCashBalance || 0) + (brokerFunds?.totalAvailable || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-indigo-200/80 font-medium mt-1.5">
              Holdings: {((aggregate.totalCurrent / (aggregate.totalCurrent + (userSettings?.investmentCashBalance || 0) + (brokerFunds?.totalAvailable || 0) || 1)) * 100).toFixed(1)}% | Cash: {((((userSettings?.investmentCashBalance || 0) + (brokerFunds?.totalAvailable || 0)) / (aggregate.totalCurrent + (userSettings?.investmentCashBalance || 0) + (brokerFunds?.totalAvailable || 0) || 1)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>


      {/* Main Grid: Entries on Left, Chart/Watchlist on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Holdings List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 border-b border-slate-150 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <FolderCheck className="text-slate-800" size={18} />
                  <h2 className="font-bold text-sm text-slate-850 font-display">Investment Holdings</h2>
                </div>
                
                {/* View Mode Tabs */}
                <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200/85 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode('holdings')}
                    className={`px-1 py-1 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'holdings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-800'}`}
                  >
                    Active ({processedHoldings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode('ledger')}
                    className={`px-1 py-1 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-800'}`}
                  >
                    Exited / Booked ({realizedTrades?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode('orders')}
                    className={`px-1 py-1 rounded-md transition-all cursor-pointer ${portfolioViewMode === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-700 hover:text-slate-800'}`}
                  >
                    Live Orders ({brokerOrders?.length || 0})
                  </button>
                </div>
              </div>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-1 rounded-lg text-xs cursor-pointer transition-all"
              >
                <Plus size={14} /> Add Asset
              </button>
            </div>

            {/* Expandable Add Asset Form */}
            <AnimatePresence>
              {isAdding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-150 bg-slate-50/20"
                >
                  <form onSubmit={handleAddSubmit} className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-sans">
                    <div className="col-span-1 md:col-span-3 flex gap-1 border-b border-slate-100 pb-1">
                      <button
                        type="button"
                        onClick={() => { setType('stock'); setAssetClass('Equity'); }}
                        className={`px-1 py-1.5 rounded-md font-bold ${type === 'stock' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        Indian Stock (Equity)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setType('mf'); setAssetClass('Equity'); }}
                        className={`px-1 py-1.5 rounded-md font-bold ${type === 'mf' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                      >
                        Mutual Fund
                      </button>
                    </div>

                    {type === 'stock' ? (
                      <div className="relative col-span-1 md:col-span-2">
                        <label className="block text-slate-700 font-semibold mb-1">Search & Select Stock (NSE/BSE)</label>
                        <input
                          type="text"
                          placeholder="Type stock name or symbol (e.g. Reliance, TCS, HDFC, Zomato)..."
                          value={stockSearchQuery}
                          onChange={(e) => {
                            setStockSearchQuery(e.target.value);
                            if (!e.target.value) {
                              setSymbol('');
                              setTickerLookupResult(null);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
                        />

                        {isSearchingStock && (
                          <span className="text-[9px] text-zinc-400 animate-pulse mt-0.5 block">Searching stock directories...</span>
                        )}

                        <AnimatePresence>
                          {stockSearchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 text-left font-sans"
                            >
                              {stockSearchResults.map((stock) => (
                                <button
                                  key={stock.rawSymbol}
                                  type="button"
                                  onClick={() => handleSelectStock(stock)}
                                  className="w-full p-1 hover:bg-slate-50 text-left block text-[10px] text-slate-700 transition-colors font-medium border-0 cursor-pointer"
                                >
                                  <span className="font-bold text-slate-900 block">[{stock.exch}: {stock.symbol}]</span>
                                  <span>{stock.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {symbol && (
                          <div className="text-[10px] bg-slate-900 text-white p-1 rounded-md mt-1 font-mono flex justify-between items-center shadow-inner">
                            <span>Selected Symbol: {symbol}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSymbol('');
                                setStockSearchQuery('');
                                setTickerLookupResult(null);
                              }}
                              className="text-amber-400 hover:underline hover:text-amber-300 text-[9px] font-bold cursor-pointer"
                            >
                              Clear Selection
                            </button>
                          </div>
                        )}
                        
                        {/* Quick selector stock pills list */}
                        <div className="flex flex-wrap gap-1.5 mt-1 max-h-[50px] overflow-y-auto">
                          {POPULAR_STOCKS.map((p) => (
                            <button
                              key={p.symbol}
                              type="button"
                              onClick={() => {
                                handleSelectStock({
                                  symbol: p.symbol,
                                  rawSymbol: p.symbol + '.NS',
                                  name: p.name,
                                  exch: 'NSE'
                                });
                                setAssetClass(p.class as any);
                              }}
                              className="text-[9px] bg-white hover:bg-slate-100 border border-slate-200 transition-colors px-1.5 py-0.5 rounded text-slate-600 font-bold cursor-pointer"
                            >
                              +{p.symbol}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative col-span-1 md:col-span-2">
                        <label className="block text-slate-700 font-semibold mb-1">Search & Select Mutual Fund Scheme</label>
                        <input
                          type="text"
                          placeholder="Type fund name (e.g., HDFC Top 100, Quant Active, SBI Bluechip)..."
                          value={mfSearchQuery}
                          onChange={(e) => {
                            setMfSearchQuery(e.target.value);
                            // Clear code as they type unless selected
                            if (!e.target.value) setMfSchemeCode('');
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
                        />

                        {/* Search feedback indicator */}
                        {isSearchingMf && (
                          <span className="text-[9px] text-zinc-400 animate-pulse mt-0.5 block">Searching scheme directories...</span>
                        )}
                        
                        {/* Auto-suggest dropdown scheme list */}
                        <AnimatePresence>
                          {mfSearchResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 text-left font-sans"
                            >
                              {mfSearchResults.map((mfs) => (
                                <button
                                  key={mfs.schemeCode}
                                  type="button"
                                  onClick={() => handleSelectMfScheme(mfs.schemeCode, mfs.schemeName)}
                                  className="w-full p-1 hover:bg-slate-50 text-left block text-[10px] text-slate-700 transition-colors font-medium border-0 cursor-pointer"
                                >
                                  <span className="font-bold text-slate-900 block">[AMFI Code: {mfs.schemeCode}]</span>
                                  <span>{mfs.schemeName}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {mfSchemeCode && (
                          <div className="text-[10px] bg-slate-900 text-white p-1 rounded-md mt-1 font-mono flex justify-between items-center shadow-inner">
                            <span>Selected Code: {mfSchemeCode}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setMfSchemeCode('');
                                setMfSearchQuery('');
                                setTickerLookupResult(null);
                              }}
                              className="text-amber-400 hover:underline hover:text-amber-300 text-[9px] font-bold cursor-pointer"
                            >
                              Clear Selection
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Live Ticker Lookup & Price Verification Feedback Board */}
                    {(isLookingUpTicker || tickerLookupResult) && (
                      <div className="col-span-1 md:col-span-3 bg-slate-900 text-white p-1.5 rounded-xl border border-slate-800 text-xs font-mono space-y-1 shadow-md">
                        {isLookingUpTicker ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="inline-block animate-spin font-extrabold font-mono">↻</span> 
                            <span>Fetching live price & validating asset with market gates...</span>
                          </div>
                        ) : (
                          tickerLookupResult && (
                            <div className="flex justify-between items-center flex-wrap gap-1">
                              <div>
                                <span className="text-[9px] text-slate-500 block uppercase font-sans font-extrabold tracking-wider">Matched Security Resolved</span>
                                <span className="font-sans font-bold text-slate-100 tracking-tight">{tickerLookupResult.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-slate-500 block uppercase font-sans font-extrabold tracking-wider">Current Live Quote</span>
                                <span className="text-emerald-400 font-extrabold text-sm">₹{tickerLookupResult.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                {tickerLookupResult.change !== 0 && (
                                  <span className={`text-[10px] font-extrabold ml-1.5 ${tickerLookupResult.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ({tickerLookupResult.change >= 0 ? '+' : ''}{tickerLookupResult.change.toFixed(2)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{type === 'stock' ? 'Buy Price (₹)' : 'NAV at purchase (₹)'}</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{type === 'stock' ? 'Quantity' : 'Units Purchased'}</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        placeholder="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Purchase Date</label>
                      <input
                        type="date"
                        required
                        value={buyDate}
                        onChange={(e) => setBuyDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Asset Allocation Class</label>
                      <select
                        value={assetClass}
                        onChange={(e) => setAssetClass(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      >
                        <option value="Equity">Equity (Shares/Crypto/Mfs)</option>
                        <option value="Debt">Debt (SGBs, Debt Funds, FDs)</option>
                        <option value="Gold">Gold (Physical, Gold Bees)</option>
                        <option value="Cash">Cash (Liquid, Bank Savings)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Broker Tag / Source</label>
                      <select
                        value={broker}
                        onChange={(e) => setBroker(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs"
                      >
                        <option value="Zerodha">Zerodha (Kite)</option>
                        <option value="Groww">Groww</option>
                        <option value="Upstox">Upstox</option>
                        <option value="AngelOne">Angel One</option>
                        <option value="Direct">Direct / Bank</option>
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-1 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          id="deductCashFromWallet"
                          checked={deductCashFromWallet}
                          onChange={(e) => setDeductCashFromWallet(e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                        />
                        <label htmlFor="deductCashFromWallet" className="font-bold text-slate-705 cursor-pointer">
                          Deduct total purchase cost from Investment Cash Wallet
                        </label>
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        Available Balance: ₹{(userSettings?.investmentCashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="col-span-1 md:col-span-3 flex justify-end gap-1 border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="px-2 py-1 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 cursor-pointer"
                      >
                        Add to portfolio
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Holdings Table */}
            {portfolioViewMode === 'orders' ? (
              (!brokerOrders || brokerOrders.length === 0) ? (
                <div className="p-4 flex flex-col items-center text-center space-y-1">
                  <div className="p-1 bg-slate-50 rounded-full text-slate-500">
                    <Layers size={21} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-705">No recent orders found</h3>
                  <p className="text-[10px] text-slate-500 max-w-xs">
                    Your synced broker order book will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 bg-slate-50/40 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                        <th className="p-2">Symbol</th>
                        <th className="p-2 text-center">Type</th>
                        <th className="p-2 text-center">Side</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokerOrders.map((o, idx) => (
                        <tr key={`ord-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-2 font-bold text-slate-800">{o.trading_symbol || o.instrument_token}</td>
                          <td className="p-2 text-center font-mono text-[10px]">{o.transaction_type}</td>
                          <td className="p-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded-md font-bold text-[9px] ${o.transaction_type === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {o.transaction_type}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono text-[11px]">{o.quantity}</td>
                          <td className="p-2 text-right font-mono text-[11px]">₹{parseFloat(o.price || o.average_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="p-2 text-center text-[10px] font-bold text-slate-600">{o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : portfolioViewMode === 'ledger' ? (
              (!realizedTrades || realizedTrades.length === 0) ? (
                <div className="p-4 flex flex-col items-center text-center space-y-1">
                  <div className="p-1 bg-slate-50 rounded-full text-slate-500">
                    <Layers size={21} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-705">No closed trades recorded</h3>
                  <p className="text-[10px] text-slate-500 max-w-xs">
                    Exit active security positions or log sales to register profit/loss transaction records.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 bg-slate-50/40 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                        <th className="p-2">Investment Name</th>
                        <th className="p-2 text-center">Closing Qty</th>
                        <th className="p-2 text-right">Purchase Avg</th>
                        <th className="p-2 text-right">Exit Price</th>
                        <th className="p-2 text-right">Booked Gain/Loss</th>
                        <th className="p-2 text-center font-sans font-bold">Exited Date</th>
                        <th className="p-2 text-center">ROI %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realizedTrades.map((rt) => {
                        const isWin = rt.pnl >= 0;
                        const roi = ((rt.exitPrice - rt.buyPrice) / (rt.buyPrice || 1)) * 100;
                        return (
                          <tr key={rt.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-2">
                              <button 
                                type="button" 
                                onClick={() => setViewingAssetDetails({
                                  ...rt,
                                  displayName: rt.name,
                                  currentPrice: rt.exitPrice,
                                  holdings: []
                                })}
                                className="font-bold text-slate-800 hover:text-indigo-600 hover:underline text-left block border-0 bg-transparent p-0 cursor-pointer"
                              >
                                {rt.name || rt.symbol}
                              </button>
                              <div className="text-[9px] text-slate-500 font-medium">
                                {rt.type === 'stock' ? `Stock (${rt.symbol})` : 'Mutual Fund Record'}
                              </div>
                            </td>
                            <td className="p-2 text-center font-mono font-medium text-[11px]">{rt.quantity}</td>
                            <td className="p-2 text-right font-mono text-[11px]">₹{rt.buyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-mono text-[11px]">₹{rt.exitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right font-bold text-[11px] font-mono">
                              <span className={isWin ? 'text-emerald-600' : 'text-rose-600'}>
                                ₹{rt.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-2 text-center text-slate-700 font-mono text-[10px]">{rt.exitDate || '-'}</td>
                            <td className="p-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded-md font-bold text-[9px] font-mono ${isWin ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {isWin ? '+' : ''}{roi.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              processedHoldings.length === 0 ? (
                <div className="p-4 flex flex-col items-center text-center space-y-1">
                  <div className="p-1 bg-slate-50 rounded-full text-slate-500">
                    <Wallet size={24} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700">No holdings logged</h3>
                  <p className="text-[10px] text-slate-500 max-w-xs font-medium">Maintain manual tracking records for your stocks, indices and mutual funds.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 bg-slate-50/40 text-slate-500 uppercase tracking-wider text-[9px] font-bold">
                        <th className="p-2">Holdings Descriptor</th>
                        <th className="p-2">Broker / Class</th>
                        <th className="p-2 text-right">Cost vs Live</th>
                        <th className="p-2 text-right">Valuation</th>
                        <th className="p-2 text-right">Returns (P&L)</th>
                        <th className="p-2 text-center">XIRR</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedHoldings.map((h) => {
                        const isProfit = h.pnl >= 0;
                        return (
                          <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="p-2 max-w-[200px]">
                              <button
                                type="button"
                                onClick={() => setViewingAssetDetails(h)}
                                className="font-bold text-slate-800 hover:text-indigo-600 hover:underline truncate text-left flex items-center gap-1 border-0 bg-transparent p-0 cursor-pointer"
                                title="Click to view charts & analysis"
                              >
                                <span className="truncate">{h.displayName}</span>
                                <Eye size={11} className="text-slate-500 shrink-0" />
                              </button>
                              <div className="text-[10px] text-slate-500 font-medium">
                                Qty: {h.quantity} • Buy Date: {h.buyDate}
                              </div>
                            </td>
                            <td className="p-2">
                              <span className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700 mr-1.5">{h.broker}</span>
                              <span className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white" style={{ backgroundColor: COLORS[h.assetClass as keyof typeof COLORS] }}>{h.assetClass}</span>
                            </td>
                            <td className="p-2 text-right font-mono text-[11px]">
                              <div>₹{h.buyPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</div>
                              <div className="text-[10px] text-slate-500 font-medium">₹{h.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</div>
                            </td>
                            <td className="p-2 text-right font-bold text-[11px] font-mono">
                              <div>₹{h.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</div>
                              <div className="text-[10px] text-slate-450 font-normal">Invested: ₹{h.investedValue.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</div>
                            </td>
                            <td className="p-2 text-right">
                              <div className={`font-bold font-mono text-[11px] ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ₹{h.pnl.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                              </div>
                              <div className={`text-[10px] font-bold ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isProfit ? '+' : ''}{h.pnlPercent.toFixed(1)}%
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px] font-mono">
                                {h.xirr > 0 ? '+' : ''}{h.xirr.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              {h.isAutoSynced ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                    Auto-Synced
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTradeSymbol(h.symbol);
                                      setTradeLtp(h.currentPrice);
                                      setTradeModalOpen(true);
                                    }}
                                    className="text-slate-500 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                                    title="View TradingView Chart & Trade"
                                  >
                                    <TrendingUp size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingAssetDetails(h)}
                                    className="text-slate-500 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                                    title="View Interactive Stock Chart"
                                  >
                                    <BarChart3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExitingHolding(h);
                                      setExitQuantity(h.quantity.toString());
                                      setExitPrice((h.currentPrice || h.buyPrice).toString());
                                    }}
                                    className="text-slate-450 hover:text-emerald-600 p-1 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                                    title="Exit/Sell Position"
                                  >
                                    <ArrowUpRight size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTradeSymbol(h.symbol);
                                      setTradeLtp(h.currentPrice);
                                      setTradeModalOpen(true);
                                    }}
                                    className="text-slate-500 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                                    title="Trade / Route Order"
                                  >
                                    <TrendingUp size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete ${h.displayName}? This will refund the invested amount (₹${h.investedValue.toLocaleString('en-IN')}) to your cash balance.`)) {
                                        const currentCash = userSettings?.investmentCashBalance || 0;
                                        onUpdateSmartApiSettings({
                                          investmentCashBalance: parseFloat((currentCash + h.investedValue).toFixed(2))
                                        }).then(() => onDeleteHolding(h.id));
                                      }
                                    }}
                                    className="text-slate-500 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer border-0 bg-transparent"
                                    title="Delete Holding record & Refund Capital"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Dynamic Side Allocation & Watchlist */}
        <div className="space-y-3">
          {/* Asset Allocation Pie Chart */}
          <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <PieIcon size={16} className="text-slate-700" />
              <h3 className="font-bold text-xs text-slate-700 font-display">Asset Class Allocation</h3>
            </div>
            {assetAllocation.length === 0 ? (
              <div className="text-center py-3 text-[11px] text-slate-500">Add asset holdings to construct pie chart.</div>
            ) : (
              <div className="space-y-1">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#E5E7EB'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Valuation']} 
                        contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {assetAllocation.map((entry) => {
                    const color = COLORS[entry.name as keyof typeof COLORS];
                    const pct = (entry.value / aggregate.totalCurrent) * 100;
                    return (
                      <div key={entry.name} className="flex items-center gap-1 border border-slate-50 p-1.5 rounded-lg">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                        <div className="truncate">
                          <p className="font-bold text-slate-700">{entry.name}</p>
                          <p className="text-[9px] text-slate-500 font-semibold">{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Watchlist Section */}
          <div className="bg-white border border-slate-150 rounded-2xl p-2 shadow-sm space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Eye size={16} className="text-slate-700" />
                <h3 className="font-bold text-xs text-slate-700 font-display">Watchlist Tracker</h3>
              </div>
              <button
                onClick={() => setIsAddingWatch(!isAddingWatch)}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-1 py-1 rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
              >
                <Plus size={11} /> Add
              </button>
            </div>

            {/* Expandable Watch Add Form */}
            <AnimatePresence>
              {isAddingWatch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-slate-50 rounded-xl"
                >
                  <form onSubmit={handleAddWatchSubmit} className="p-1 space-y-1 text-xs">
                    <div className="flex gap-1.5 border-b border-slate-200/50 pb-1.5">
                      <button
                        type="button"
                        onClick={() => setWatchType('stock')}
                        className={`px-1 py-1 rounded font-bold text-[10px] ${watchType === 'stock' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                      >
                        Indian Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatchType('mf')}
                        className={`px-1 py-1 rounded font-bold text-[10px] ${watchType === 'mf' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}
                      >
                        Mutual Fund
                      </button>
                    </div>

                    {watchType === 'stock' ? (
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="e.g. RELIANCE, TCS"
                          value={watchSymbol}
                          onChange={(e) => setWatchSymbol(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs uppercase"
                        />
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 102885, 120503"
                          value={watchScheme}
                          onChange={(e) => setWatchScheme(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-xs"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-1.5 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddingWatch(false)}
                        className="px-1 py-1 border border-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-1.5 py-1 bg-slate-900 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Watch
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Watchlist list items */}
            {watchlist.length === 0 ? (
              <p className="text-[10px] text-slate-500 text-center py-2">Your watchlist is currently empty.</p>
            ) : (
              <div className="space-y-1">
                {watchlist.map((item) => {
                  const key = item.type === 'stock' ? `stock_${item.symbol}` : `mf_${item.schemeCode}`;
                  const live = livePrices[key];
                  const price = live ? live.currentPrice : null;
                  const change = live ? live.dayChange : 0;
                  const nameStr = live ? live.name : (item.type === 'stock' ? item.symbol : `MF (${item.schemeCode})`);
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-1.5 border border-slate-100 hover:border-slate-200 rounded-xl transition-all">
                      <div className="truncate max-w-[130px]">
                        <p className="font-bold text-slate-800 truncate text-[11px]" title={nameStr}>{nameStr}</p>
                        <p className="text-[9px] text-slate-500 capitalize w-fit px-1 bg-slate-50 rounded mt-0.5">{item.type}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <div className="text-right font-mono">
                          <p className="font-bold text-slate-900 text-[11px]">{price ? `₹${price}` : '---'}</p>
                          {item.type === 'stock' && (
                            <p className={`text-[9px] font-bold ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => onRemoveFromWatchlist(item.id)}
                          className="text-slate-300 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                          title="Remove from watchlist"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Cash Wallet Action Dialog (Deposit / Withdraw) */}
      <AnimatePresence>
        {cashActionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Wallet size={18} className="text-slate-700" />
                    <h3 className="font-extrabold text-sm text-slate-800 capitalize">
                      {cashActionType} Investment Cash
                    </h3>
                  </div>
                  <button
                    onClick={() => setCashActionType(null)}
                    className="text-slate-500 hover:text-slate-600 text-sm font-bold border-0 bg-transparent cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Update your liquid cash statement ledger balance for asset transactions.
                </p>
              </div>

              <form onSubmit={handleCashWalletSubmit} className="p-2 space-y-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Enter Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 50000"
                    value={cashAmountInput}
                    onChange={(e) => setCashAmountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                  {cashActionType === 'withdraw' && (
                    <span className="text-[9px] text-amber-600 font-medium block mt-1">
                      Max withdrawable limit: ₹{(userSettings?.investmentCashBalance || 0).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Reference Note / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deposit from bank, Dividend credited..."
                    value={cashNoteInput}
                    onChange={(e) => setCashNoteInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex gap-1 border-t border-slate-100 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setCashActionType(null)}
                    className="flex-1 py-1 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Confirm {cashActionType}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Exit / Sell Position Action Dialog */}
      <AnimatePresence>
        {exitingHolding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <ArrowUpRight size={18} className="text-emerald-600 animate-bounce" />
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">
                        Exit Position / Sell Asset
                      </h3>
                      <p className="text-[10px] text-slate-450 font-mono text-slate-700 mt-0.5">
                        {exitingHolding.displayName || exitingHolding.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExitingHolding(null)}
                    className="text-slate-500 hover:text-slate-600 text-sm font-bold border-0 bg-transparent cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleExitPositionSubmit} className="p-2 space-y-2 font-sans text-xs">
                {/* Holdings Snapshot */}
                <div className="grid grid-cols-3 gap-1 bg-slate-50 border border-slate-150 p-1 rounded-xl text-center">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">My Shares</span>
                    <span className="font-mono font-bold text-slate-750 text-xs">{exitingHolding.quantity}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">Buy Average</span>
                    <span className="font-mono font-bold text-slate-750 text-xs">₹{exitingHolding.buyPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">Live Valuation</span>
                    <span className="font-mono font-extrabold text-slate-850 text-xs text-emerald-600">₹{exitingHolding.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-550 mb-1">
                      Quantity to Sell
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      max={exitingHolding.quantity}
                      min="0.0001"
                      required
                      value={exitQuantity}
                      onChange={(e) => setExitQuantity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono font-bold text-xs focus:ring-1 focus:ring-slate-900"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      Partial exits supported.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-550 mb-1">
                      Sale Execution Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-mono font-bold text-xs focus:ring-1 focus:ring-slate-900"
                    />
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      LTP or custom limit sell value.
                    </span>
                  </div>
                </div>

                {/* Sell Proceeds Estimator Board */}
                <div className="bg-slate-900 text-zinc-300 p-1 rounded-xl font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Proceeds:</span>
                    <span className="text-slate-105 font-bold">
                      ₹{((parseFloat(exitQuantity) || 0) * (parseFloat(exitPrice) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acquisition Cost:</span>
                    <span>
                      ₹{((parseFloat(exitQuantity) || 0) * exitingHolding.buyPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800 pt-1 mt-1">
                    <span>Net Booked P&L:</span>
                    <span className={`font-bold ${((parseFloat(exitPrice) || 0) - exitingHolding.buyPrice) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{(((parseFloat(exitPrice) || 0) - exitingHolding.buyPrice) * (parseFloat(exitQuantity) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Proceeds Action Switch */}
                <div className="bg-slate-50 border border-slate-200 p-1 rounded-xl flex items-center gap-1">
                  <input
                    type="checkbox"
                    id="addProceedsToCash"
                    checked={addProceedsToCash}
                    onChange={(e) => setAddProceedsToCash(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                  />
                  <label htmlFor="addProceedsToCash" className="text-[11px] font-bold text-slate-650 cursor-pointer">
                    Credit gross trade proceeds directly back to Investment Cash Wallet
                  </label>
                </div>

                <div className="flex gap-1 border-t border-slate-100 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setExitingHolding(null)}
                    className="flex-1 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Execute Selling Position
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Interactive Recharts Asset Chart & Financial Stats Card */}
      <AnimatePresence>
        {viewingAssetDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden"
            >
              {/* Header */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                <div className="flex items-center gap-1">
                  <BarChart3 size={18} className="text-slate-805" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">
                      {viewingAssetDetails.displayName || viewingAssetDetails.name} Real-time Performance
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Type: {viewingAssetDetails.type === 'stock' ? `Stock (${viewingAssetDetails.symbol})` : 'Mutual Fund Basket'} • Class: {viewingAssetDetails.assetClass || 'Equity'}
                    </p>
                  </div>
                </div>

                {/* Sub-Header Timer filters */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-extrabold font-mono shrink-0">
                  {(['1M', '3M', '6M', '1Y'] as const).map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setChartTimeframe(time)}
                      className={`px-1 py-1 rounded-md transition-all cursor-pointer ${chartTimeframe === time ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body chart container */}
              <div className="p-3 space-y-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 font-mono">
                    Historical Trend Chart ({chartTimeframe} simulated quote points)
                  </div>
                  
                  <div className="h-56 w-full border border-slate-100 bg-slate-50/20 rounded-xl p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generateSimulatedChartData(
                        viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice || viewingAssetDetails.buyPrice || 0,
                        viewingAssetDetails.displayName || viewingAssetDetails.name || viewingAssetDetails.symbol || 'Asset',
                        chartTimeframe
                      )}>
                        <XAxis 
                          dataKey="date" 
                          stroke="#94A3B8"
                          fontSize={9}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#94A3B8"
                          fontSize={9}
                          tickLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(val: number) => `₹${val.toFixed(0)}`}
                        />
                        <Tooltip 
                          formatter={(v: any) => [`₹${parseFloat(v).toFixed(2)}`, 'Valuation Quote']}
                          contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke={((viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice) >= (viewingAssetDetails.buyPrice || viewingAssetDetails.currentPrice)) ? '#10B981' : '#F43F5E'} 
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Asset Financial Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">Quote Price</span>
                    <span className="font-mono font-extrabold text-slate-800 text-xs">
                      ₹{(viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">52-Week High</span>
                    <span className="font-mono font-bold text-slate-700 text-xs">
                      ₹{((viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice || 0) * 1.15).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">52-Week Low</span>
                    <span className="font-mono font-bold text-slate-700 text-xs">
                      ₹{((viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice || 0) * 0.82).toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 mb-0.5">1-Month Return</span>
                    <span className={`font-mono font-bold text-xs ${((viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice) >= (viewingAssetDetails.buyPrice || viewingAssetDetails.currentPrice)) ? 'text-emerald-505 text-emerald-600' : 'text-rose-505 text-rose-600'}`}>
                      {((viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice) >= (viewingAssetDetails.buyPrice || viewingAssetDetails.currentPrice)) ? '+' : ''}
                      {((((viewingAssetDetails.currentPrice || viewingAssetDetails.exitPrice) - (viewingAssetDetails.buyPrice || viewingAssetDetails.currentPrice)) / (viewingAssetDetails.buyPrice || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {viewingAssetDetails.quantity && (
                  <div className="bg-indigo-50 border border-indigo-100 p-1 rounded-xl flex items-center justify-between text-indigo-950 font-sans text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-indigo-400 block tracking-wider">My Investment Holding Valuation</span>
                      <span className="font-bold">₹{(viewingAssetDetails.quantity * (viewingAssetDetails.currentPrice || viewingAssetDetails.buyPrice)).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-indigo-600/90 font-medium ml-1.5">({viewingAssetDetails.quantity} unit shares)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-extrabold text-indigo-400 block tracking-wider">Current Return</span>
                      <span className={`font-mono font-extrabold ${((viewingAssetDetails.currentPrice || viewingAssetDetails.buyPrice) >= viewingAssetDetails.buyPrice) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{Math.abs(viewingAssetDetails.quantity * ((viewingAssetDetails.currentPrice || viewingAssetDetails.buyPrice) - viewingAssetDetails.buyPrice)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setViewingAssetDetails(null)}
                    className="w-full sm:w-auto px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer text-center"
                  >
                    Close Analytics Screen
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TradeExecutionModal 
        isOpen={tradeModalOpen} 
        onClose={() => setTradeModalOpen(false)} 
        symbol={tradeSymbol}
        ltp={tradeLtp}
      />
    </div>
  );
}
