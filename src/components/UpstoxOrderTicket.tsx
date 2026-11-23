import React, { useState } from 'react';
import { Send, AlertCircle, TrendingUp, TrendingDown, Info, Tag, Layers, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { upstoxApi } from '../services/upstoxApi';

interface UpstoxOrderTicketProps {
  initialSymbol?: string;
  onOrderPlaced?: () => void;
}

const POPULAR_STOCKS = [
  { label: 'NIFTY 50', key: 'NSE_INDEX|Nifty 50' },
  { label: 'Reliance', key: 'NSE_EQ|INE002A01018' },
  { label: 'TCS', key: 'NSE_EQ|INE467B01029' },
  { label: 'Infosys', key: 'NSE_EQ|INE009A01021' },
  { label: 'HDFC Bank', key: 'NSE_EQ|INE040A01034' },
  { label: 'ICICI Bank', key: 'NSE_EQ|INE090A01021' },
  { label: 'Wipro', key: 'NSE_EQ|INE075A01022' },
  { label: 'SBI', key: 'NSE_EQ|INE062A01020' },
];

const UpstoxOrderTicket: React.FC<UpstoxOrderTicketProps> = ({ initialSymbol = 'NSE_EQ|INE002A01018', onOrderPlaced }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [displaySymbol, setDisplaySymbol] = useState(() => {
    const match = POPULAR_STOCKS.find(s => s.key === initialSymbol);
    return match ? match.label : initialSymbol;
  });
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL' | 'SL-M'>('MARKET');
  const [product, setProduct] = useState<'D' | 'I'>('D'); // D = Delivery, I = Intraday
  const [validity, setValidity] = useState<'DAY' | 'IOC'>('DAY');
  
  const [isLoading, setIsLoading] = useState(false);

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem('upstox_access_token');
    if (!token) {
      toast.error('Upstox Access Token is missing. Please connect Upstox first.');
      return;
    }

    if (!symbol.trim()) {
      toast.error('Please enter a valid Instrument Key.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        instrument_token: symbol,
        quantity: Number(quantity),
        transaction_type: transactionType,
        order_type: orderType,
        product: product,
        validity: validity,
        is_amo: false
      };

      if (orderType === 'LIMIT' || orderType === 'SL') {
        payload.price = Number(price);
      }

      await upstoxApi.placeOrder(token, payload);
      toast.success(`${transactionType} order placed successfully!`);
      if (onOrderPlaced) onOrderPlaced();
    } catch (err: any) {
      toast.error(`Order Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs max-w-lg w-full mx-auto">
      <div className="p-5 flex items-center justify-between border-b bg-slate-900 border-slate-800">
        <h3 className="text-white font-medium text-lg flex items-center gap-2">
          {transactionType === 'BUY' ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          {transactionType} ORDER
        </h3>
        <div className="bg-slate-800 border border-slate-700/80 px-3 py-1 rounded-xl text-slate-200 text-xs font-medium">
          UPSTOX API
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Toggle BUY / SELL */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTransactionType('BUY')}
            className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              transactionType === 'BUY' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setTransactionType('SELL')}
            className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              transactionType === 'SELL' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SELL
          </button>
        </div>

        {/* Symbol */}
        <div>
          <label className="block text-xs font-medium text-slate-600 capitalize mb-2">Instrument Key</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Tag size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              list="order-popular-stocks"
              value={displaySymbol}
              onChange={(e) => {
                const val = e.target.value;
                setDisplaySymbol(val);
                const match = POPULAR_STOCKS.find(s => s.label.toLowerCase() === val.toLowerCase() || s.key === val);
                if (match) {
                  setSymbol(match.key);
                  setDisplaySymbol(match.label); // snap to friendly name
                } else {
                  setSymbol(val);
                }
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none transition-colors"
              placeholder="Search NIFTY, Reliance... or enter key"
            />
            <datalist id="order-popular-stocks">
              {POPULAR_STOCKS.map(s => (
                <option key={s.key} value={s.label}>{s.key}</option>
              ))}
            </datalist>
          </div>
        </div>

        {/* Quantity & Price */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 capitalize mb-2">Qty</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 capitalize mb-2">Price</label>
            <input
              type="number"
              step="0.05"
              disabled={orderType === 'MARKET'}
              value={orderType === 'MARKET' ? '' : price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={orderType === 'MARKET' ? 'MARKET' : '0.00'}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:border-slate-400 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        {/* Product & Order Type */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['D', 'I'] as const).map(p => (
              <button
                key={p}
                onClick={() => setProduct(p)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  product === p 
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs' 
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p === 'D' ? 'DELIVERY' : 'INTRADAY'}
              </button>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(['MARKET', 'LIMIT', 'SL', 'SL-M'] as const).map(ot => (
              <button
                key={ot}
                onClick={() => setOrderType(ot)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  orderType === ot 
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs' 
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {ot}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isLoading}
          className={`w-full py-2.5 rounded-xl font-medium text-xs sm:text-sm text-white transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-xs ${
            isLoading ? 'opacity-75 cursor-not-allowed bg-slate-800' :
            'bg-slate-900 hover:bg-slate-800 active:bg-slate-950'
          }`}
        >
          {isLoading ? (
            <><RefreshCw size={14} className="animate-spin" /> Processing...</>
          ) : (
            <><Send size={14} /> Place {transactionType.toLowerCase()} order</>
          )}
        </button>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <AlertCircle size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600 font-medium">
            Trading involves significant risk. This API connection bypasses broker UI safeguards. Ensure your parameters are correct.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpstoxOrderTicket;
