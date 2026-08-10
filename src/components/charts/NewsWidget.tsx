import React, { memo, useEffect, useState } from 'react';
import { ExternalLink, Clock, Newspaper, AlertTriangle } from 'lucide-react';
import { upstoxApi } from '../../services/upstoxApi';

interface NewsWidgetProps {
  theme?: 'light' | 'dark';
  instrumentKey?: string;
  compact?: boolean;
}

const NewsWidget = ({ theme = 'light', instrumentKey, compact = false }: NewsWidgetProps) => {
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      const token = localStorage.getItem('upstox_access_token');
      setIsLoading(true);
      setError(null);
      
      try {
        if (!token) {
          // If no token, maybe we just show empty or a message
          setError("Upstox connection required for live market news.");
          setIsLoading(false);
          return;
        }

        let category: 'instrument_keys' | 'positions' = 'positions';
        let keys: string[] = [];

        if (instrumentKey) {
          category = 'instrument_keys';
          keys = [instrumentKey];
        }

        const response = await upstoxApi.getNews(token, category, keys);
        
        if (response?.data) {
          // Flatten the news data from different instrument keys if needed
          let allNews: any[] = [];
          Object.values(response.data).forEach((articles: any) => {
            if (Array.isArray(articles)) {
              allNews = [...allNews, ...articles];
            }
          });
          
          // Sort by publish time descending
          allNews.sort((a, b) => b.published_time - a.published_time);
          setNews(allNews);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch news');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [instrumentKey]);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-white p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-xs text-slate-500 font-medium">Fetching live news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertTriangle size={32} className="text-amber-500 mb-3" />
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <p className="text-xs text-slate-500 mt-2">Connect to Upstox to view real-time market updates.</p>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-white p-6 text-center">
        <Newspaper size={32} className="text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-700">No News Found</p>
        <p className="text-xs text-slate-500 mt-2">No recent news articles available for this selection.</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full overflow-y-auto bg-white ${compact ? 'p-2' : 'p-4'}`}>
      <div className="space-y-4">
        {news.map((item, idx) => (
          <a
            key={idx}
            href={item.article_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
          >
            {item.thumbnail && !compact && (
              <img 
                src={item.thumbnail} 
                alt="Thumbnail" 
                className="w-32 h-32 object-cover rounded-lg shrink-0 border border-slate-200 shadow-sm"
              />
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h4 className={`font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-tight mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
                {item.heading}
              </h4>
              
              <p className={`text-slate-600 mb-3 ${compact ? 'text-xs line-clamp-3' : 'text-sm line-clamp-4'}`}>
                {item.summary}
              </p>
              
              <div className="flex items-center gap-3 text-xs font-bold text-slate-400 capitalize mt-auto">
                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.published_time).toLocaleString()}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default memo(NewsWidget);
