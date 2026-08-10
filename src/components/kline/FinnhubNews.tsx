import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, AlertTriangle, Bell, Check, Loader2 } from 'lucide-react';

interface FinnhubNewsProps {
  category: string; // 'cryptocurrency', 'forex', 'stock', 'index'
  theme: 'light' | 'dark';
}

interface NewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  id_str: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export default function FinnhubNews({ category, theme }: FinnhubNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Alert system state
  const [alertKeyword, setAlertKeyword] = useState(() => localStorage.getItem('finnhub_alert_keyword') || '');
  const [tempKeyword, setTempKeyword] = useState(alertKeyword);
  const [activeAlerts, setActiveAlerts] = useState<number[]>([]);

  // Map our UI category to Finnhub's category
  const getFinnhubCategory = (cat: string) => {
    if (cat === 'cryptocurrency') return 'crypto';
    if (cat === 'forex') return 'forex';
    if (cat === 'stock' || cat === 'index') return 'general';
    return 'general';
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const fhCategory = getFinnhubCategory(category);
      const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
      
      if (!apiKey) {
        throw new Error("Finnhub API key is missing from .env");
      }

      const res = await fetch(`https://finnhub.io/api/v1/news?category=${fhCategory}&token=${apiKey}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch news from Finnhub");
      }
      
      const data: NewsItem[] = await res.json();
      setNews(data);
      
      // Check for alerts
      if (alertKeyword.trim().length > 0) {
        const keyword = alertKeyword.toLowerCase();
        const triggered = data.filter(item => 
          item.headline.toLowerCase().includes(keyword) || 
          item.summary.toLowerCase().includes(keyword)
        ).map(i => i.id);
        
        setActiveAlerts(triggered);
        
        // Simple browser notification if supported and permission granted
        if (triggered.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification("Market Alert Triggered", {
            body: `New news matching your keyword "${alertKeyword}"`,
            icon: "/pwa-192x192.png"
          });
        }
      } else {
        setActiveAlerts([]);
      }
      
    } catch (err: any) {
      setError(err.message || 'Error fetching news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchNews();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [category, alertKeyword]);

  const handleSaveAlert = () => {
    localStorage.setItem('finnhub_alert_keyword', tempKeyword);
    setAlertKeyword(tempKeyword);
    
    if (tempKeyword.trim().length > 0 && 'Notification' in window) {
      Notification.requestPermission();
    }
  };

  const text = theme === 'dark' ? '#D1D4DC' : '#000000';
  const subtext = theme === 'dark' ? '#787B86' : '#333333';
  const border = theme === 'dark' ? '#2B2B36' : '#e0e3eb';
  const cardBg = theme === 'dark' ? '#1E222D' : '#ffffff';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Alert Configuration Bar */}
      <div className="p-3 flex gap-2 items-center" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex-1 relative">
          <input
            type="text"
            value={tempKeyword}
            onChange={(e) => setTempKeyword(e.target.value)}
            placeholder="Set keyword alert (e.g. BTC, Fed)"
            className="w-full text-xs px-3 py-1.5 rounded outline-none border"
            style={{ 
              backgroundColor: theme === 'dark' ? '#131722' : '#ffffff',
              borderColor: border,
              color: text
            }}
          />
        </div>
        <button 
          onClick={handleSaveAlert}
          className="p-1.5 rounded transition-colors bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
          title="Save Alert"
        >
          {alertKeyword === tempKeyword && tempKeyword.length > 0 ? <Check size={14} /> : <Bell size={14} />}
        </button>
      </div>

      {/* News Feed */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">
        {loading && news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: text }}>
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading market news...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded border border-red-500/20 bg-red-500/10 text-red-500 text-xs flex flex-col items-center text-center gap-2">
            <AlertTriangle size={20} />
            {error}
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 text-xs text-center px-4" style={{ color: text }}>
            No news found for this category at the moment.
          </div>
        ) : (
          news.map((item) => {
            const isAlertTriggered = activeAlerts.includes(item.id);
            
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: isAlertTriggered ? (theme === 'dark' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.05)') : cardBg,
                  borderColor: isAlertTriggered ? '#4f46e5' : border,
                }}
              >
                {isAlertTriggered && (
                  <div className="text-xs font-bold text-indigo-500 mb-1 flex items-center gap-1 capitalize ">
                    <Bell size={10} /> Keyword Match
                  </div>
                )}
                
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.headline}
                    className="w-full h-24 object-cover rounded mb-2 bg-slate-200 dark:bg-slate-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                
                <h4 className="font-bold text-sm leading-tight mb-1.5" style={{ color: text }}>
                  {item.headline}
                </h4>
                
                <p className="text-xs line-clamp-2 mb-2" style={{ color: subtext }}>
                  {item.summary}
                </p>
                
                <div className="flex justify-between items-center text-xs" style={{ color: subtext }}>
                  <div className="font-semibold capitalize text-indigo-500">
                    {item.source}
                  </div>
                  <div className="flex items-center gap-1 opacity-80">
                    <Clock size={10} />
                    {new Date(item.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
