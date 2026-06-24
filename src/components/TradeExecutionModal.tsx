import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, Building2, AlertCircle } from 'lucide-react';
import { proxyFetch } from '../utils/proxyFetch';

interface TradeExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  ltp?: number;
}

export default function TradeExecutionModal({ isOpen, onClose, symbol, ltp }: TradeExecutionModalProps) {
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [productType, setProductType] = useState<'DELIVERY' | 'INTRADAY'>('DELIVERY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(ltp || 0);
  const [selectedBroker, setSelectedBroker] = useState<'upstox' | 'angel' | 'dhan' | 'zerodha' | ''>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // GTT Support
  const [isGtt, setIsGtt] = useState<boolean>(false);
  const [triggerPrice, setTriggerPrice] = useState<number>(ltp || 0);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!selectedBroker) {
      setTradeMessage({ type: 'error', text: 'Please select a broker.' });
      return;
    }

    setIsExecuting(true);
    setTradeMessage(null);

    try {
      let endpoint = '';
      let headers: any = { 'Content-Type': 'application/json' };
      let payload: any = {};

      if (selectedBroker === 'upstox') {
        const token = localStorage.getItem('upstox_access_token');
        if (!token) throw new Error('Upstox not connected.');
        
        if (isGtt) {
          endpoint = '/api/upstox/gtt-order';
          headers['Authorization'] = `Bearer ${token}`;
          payload = {
            instrument_token: symbol,
            quantity: quantity,
            product: productType === 'DELIVERY' ? 'D' : 'I',
            transaction_type: orderSide,
            type: orderType,
            price: 0,
            rules: [
              {
                strategy: 'ENTRY',
                trigger_type: 'SINGLE',
                trigger_price: triggerPrice,
                limit_price: orderType === 'LIMIT' ? price : triggerPrice
              }
            ]
          };
        } else {
          endpoint = '/api/upstox/order';
          headers['Authorization'] = `Bearer ${token}`;
          payload = {
            instrument_token: symbol,
            quantity: quantity,
            product: productType === 'DELIVERY' ? 'D' : 'I',
            validity: 'DAY',
            price: orderType === 'LIMIT' ? price : 0,
            tag: 'unified_dashboard',
            transaction_type: orderSide,
            order_type: orderType,
            is_amo: false
          };
        }
      } else if (selectedBroker === 'angel') {
        const token = localStorage.getItem('angel_access_token');
        const apiKey = localStorage.getItem('angel_api_key');
        if (!token || !apiKey) throw new Error('Angel One not connected.');
        endpoint = '/api/angel/order';
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-privatekey'] = apiKey;
        payload = {
          variety: 'NORMAL',
          tradingsymbol: symbol + '-EQ', // Simplified assumption for equity
          symboltoken: '3045', // Need real token lookup in prod
          transactiontype: orderSide,
          exchange: 'NSE',
          ordertype: orderType,
          producttype: productType === 'DELIVERY' ? 'DELIVERY' : 'INTRADAY',
          duration: 'DAY',
          price: orderType === 'LIMIT' ? price.toString() : '0',
          squareoff: '0',
          stoploss: '0',
          quantity: quantity.toString()
        };
      } else if (selectedBroker === 'dhan') {
        const token = localStorage.getItem('dhan_access_token');
        const clientId = localStorage.getItem('dhan_client_id');
        if (!token || !clientId) throw new Error('Dhan not connected.');
        endpoint = '/api/dhan/order';
        headers['access-token'] = token;
        headers['client-id'] = clientId;
        payload = {
          dhanClientId: clientId,
          correlationId: `trade_${Date.now()}`,
          transactionType: orderSide,
          exchangeSegment: 'NSE_EQ',
          productType: productType === 'DELIVERY' ? 'CNC' : 'INTRADAY',
          orderType: orderType,
          validity: 'DAY',
          tradingSymbol: symbol,
          securityId: '1333', // Need real ID lookup
          quantity: quantity,
          price: orderType === 'LIMIT' ? price : 0
        };
      } else if (selectedBroker === 'zerodha') {
        const token = localStorage.getItem('kite_access_token');
        const apiKey = localStorage.getItem('kite_api_key');
        if (!token || !apiKey) throw new Error('Zerodha not connected.');
        endpoint = '/api/kite/order';
        headers['Authorization'] = `token ${apiKey}:${token}`;
        payload = {
          tradingsymbol: symbol,
          exchange: 'NSE',
          transaction_type: orderSide,
          order_type: orderType,
          quantity: quantity,
          product: productType === 'DELIVERY' ? 'CNC' : 'MIS',
          price: orderType === 'LIMIT' ? price : 0
        };
      }

      const res = await proxyFetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || data.error || 'Failed to place order');
      }

      setTradeMessage({ type: 'success', text: `Order placed successfully via ${selectedBroker.toUpperCase()}` });
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error(err);
      setTradeMessage({ type: 'error', text: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-h-[95vh] overflow-y-auto"
          >
            {/* Header */}
            <div className={`p-4 text-white flex justify-between items-center sticky top-0 z-10 ${orderSide === 'BUY' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
              <div>
                <h2 className="text-xl font-black">{symbol}</h2>
                {ltp && <p className="text-sm opacity-90 text-white/80">LTP: ₹{ltp.toFixed(2)}</p>}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              
              {/* TradingView Chart */}
              <div className="w-full h-[350px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                <iframe 
                  src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_1&symbol=${encodeURIComponent('NSE:' + symbol.replace('.NS', '').replace('.BO', ''))}&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=light&style=1&timezone=Asia%2FKolkata&withdateranges=1`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="TradingView Advanced Chart"
                />
              </div>

              {/* Buy / Sell Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setOrderSide('BUY')}
                  className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${orderSide === 'BUY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-700'}`}
                >
                  <TrendingUp size={16} className="inline mr-1" /> BUY
                </button>
                <button
                  onClick={() => setOrderSide('SELL')}
                  className={`flex-1 py-2 font-bold text-sm rounded-lg transition-all ${orderSide === 'SELL' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-700'}`}
                >
                  <TrendingDown size={16} className="inline mr-1" /> SELL
                </button>
              </div>

              {/* Order Options */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Product</label>
                  <select 
                    value={productType} 
                    onChange={(e: any) => setProductType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="DELIVERY">Delivery (CNC)</option>
                    <option value="INTRADAY">Intraday (MIS)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Type</label>
                  <select 
                    value={orderType} 
                    onChange={(e: any) => setOrderType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                  </select>
                </div>
              </div>

              {/* GTT Toggle */}
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="gtt-toggle" 
                  checked={isGtt} 
                  onChange={(e) => setIsGtt(e.target.checked)} 
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="gtt-toggle" className="text-xs font-bold text-slate-700">
                  Create GTT (Good-Till-Triggered) Order
                </label>
              </div>

              {/* Qty & Price */}
              <div className={`grid ${isGtt ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                {isGtt && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Trigger Price</label>
                    <input 
                      type="number" 
                      value={triggerPrice}
                      onChange={(e) => setTriggerPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{isGtt ? 'Limit Price' : 'Price'}</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    disabled={!isGtt && orderType === 'MARKET'}
                    className={`w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-400 ${!isGtt && orderType === 'MARKET' ? 'text-slate-500' : 'text-slate-800'}`}
                  />
                </div>
              </div>

              {/* Broker Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Route Order Via</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'upstox', name: 'Upstox', color: 'indigo' },
                    { id: 'zerodha', name: 'Zerodha', color: 'rose' },
                    { id: 'dhan', name: 'Dhan', color: 'emerald' },
                    { id: 'angel', name: 'Angel One', color: 'orange' }
                  ].map(broker => (
                    <button
                      key={broker.id}
                      onClick={() => setSelectedBroker(broker.id as any)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedBroker === broker.id 
                          ? `border-${broker.color}-500 bg-${broker.color}-50 text-${broker.color}-700` 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building2 size={14} /> {broker.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              {tradeMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${tradeMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {tradeMessage.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <TrendingUp size={14} className="mt-0.5 shrink-0" />}
                  {tradeMessage.text}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleExecute}
                disabled={isExecuting || !selectedBroker}
                className={`w-full py-3.5 rounded-xl font-black text-white shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  orderSide === 'BUY' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {isExecuting ? 'PLACING ORDER...' : `CONFIRM ${orderSide}`}
              </button>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
