import React, { memo, useEffect, useState, useMemo } from 'react';
import { ExternalLink, Clock, RefreshCw, Search, Filter, AlertCircle, Calendar } from 'lucide-react';
import { fetchForexFactoryCalendar, ForexFactoryEvent, getImpactDetails, getCountryFlag, formatEventTime } from '../../services/forexFactoryService';

interface NewsWidgetProps {
  theme?: 'light' | 'dark';
  instrumentKey?: string;
  compact?: boolean;
}

const NewsWidget = ({ theme = 'light', compact = false }: NewsWidgetProps) => {
  const [events, setEvents] = useState<ForexFactoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImpact, setSelectedImpact] = useState<string>('all'); // 'all', 'high', 'medium', 'low'
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchForexFactoryCalendar();
      if (!data || data.length === 0) {
        setError('No Forex Factory events currently available.');
      } else {
        setEvents(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Forex Factory calendar');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const currencies = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      if (e.country) set.add(e.country.toUpperCase());
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Impact filter
      if (selectedImpact !== 'all') {
        const norm = (e.impact || '').toLowerCase();
        if (selectedImpact === 'high' && !norm.includes('high')) return false;
        if (selectedImpact === 'medium' && (!norm.includes('med') && !norm.includes('high'))) return false;
        if (selectedImpact === 'low' && !norm.includes('low')) return false;
      }

      // Currency filter
      if (selectedCurrency !== 'all' && e.country.toUpperCase() !== selectedCurrency.toUpperCase()) {
        return false;
      }

      // Time filter
      if (timeFilter !== 'all') {
        const { isToday, isPast } = formatEventTime(e.date);
        if (timeFilter === 'today' && !isToday) return false;
        if (timeFilter === 'upcoming' && isPast) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (e.title || '').toLowerCase().includes(q);
        const countryMatch = (e.country || '').toLowerCase().includes(q);
        if (!titleMatch && !countryMatch) return false;
      }

      return true;
    });
  }, [events, selectedImpact, selectedCurrency, timeFilter, searchQuery]);

  if (isLoading && events.length === 0) {
    return (
      <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-white p-6 text-center">
        <RefreshCw className="animate-spin text-slate-700 w-7 h-7 mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading Forex Factory Calendar...</p>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertTriangle size={32} className="text-amber-500 mb-3" />
        <p className="text-sm font-medium text-slate-700">{error}</p>
        <p className="text-xs text-slate-500 mt-2">Connect to Upstox to view real-time market updates.</p>
      </div>
    );
  }

  // COMPACT SIDEBAR VIEW
  if (compact) {
    return (
      <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center bg-white p-6 text-center">
        <Newspaper size={32} className="text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-700">No News Found</p>
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
            className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all group"
          >
            {item.thumbnail && !compact && (
              <img 
                src={item.thumbnail} 
                alt="Thumbnail" 
                className="w-32 h-32 object-cover rounded-xl shrink-0 border border-slate-200 shadow-xs"
              />
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h4 className={`font-medium text-slate-900 group-hover:text-slate-900 transition-colors leading-tight mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
                {item.heading}
              </h4>
              
              <p className={`text-slate-600 mb-3 ${compact ? 'text-xs line-clamp-3' : 'text-sm line-clamp-4'}`}>
                {item.summary}
              </p>
              
              <div className="flex items-center gap-3 text-xs font-medium text-slate-500 capitalize mt-auto">
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
