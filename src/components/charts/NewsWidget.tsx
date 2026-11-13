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
      <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-white p-6 text-center">
        <AlertCircle size={32} className="text-rose-500 mb-3" />
        <p className="text-sm font-semibold text-slate-800">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // COMPACT SIDEBAR VIEW
  if (compact) {
    return (
      <div className="w-full h-full flex flex-col bg-white text-xs">
        {/* Compact Filter */}
        <div className="p-2 border-b border-slate-150 flex items-center justify-between gap-1 bg-slate-50/50">
          <div className="flex gap-1">
            <button
              onClick={() => setSelectedImpact('all')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                selectedImpact === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedImpact('high')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                selectedImpact === 'high' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              High
            </button>
          </div>
          <button
            onClick={loadData}
            title="Refresh feed"
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* List of events */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredEvents.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">No matching events.</div>
          ) : (
            filteredEvents.slice(0, 35).map((item, idx) => {
              const impact = getImpactDetails(item.impact);
              const { timeLabel, dateLabel, isToday } = formatEventTime(item.date);
              const flag = getCountryFlag(item.country);

              return (
                <div key={idx} className="p-2.5 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{flag}</span>
                      <span className="font-semibold text-slate-800 text-[11px]">{item.country}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${impact.badgeClass}`}>
                        {item.impact}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono tabular-nums ${isToday ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                      {timeLabel || dateLabel}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 text-xs leading-snug line-clamp-2">
                    {item.title}
                  </p>
                  {(item.forecast || item.previous) && (
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-mono tabular-nums text-slate-500">
                      {item.forecast && <span>Exp: <strong className="text-slate-700">{item.forecast}</strong></span>}
                      {item.previous && <span>Prev: <span className="text-slate-600">{item.previous}</span></span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // FULL VIEW
  return (
    <div className="w-full h-full flex flex-col bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
      {/* Top Header & Branding */}
      <div className="p-3 sm:p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              Forex Factory Economic News & Calendar
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Live institutional economic releases, interest rate decisions, CPI & employment reports from Forex Factory.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <span className="text-xs font-mono tabular-nums text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            {filteredEvents.length} events
          </span>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 border-b border-slate-200/80 bg-white flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search news releases (e.g. CPI, Fed, NFP, GDP, PMI)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Impact Selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              onClick={() => setSelectedImpact('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedImpact === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedImpact('high')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                selectedImpact === 'high' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-rose-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              High
            </button>
            <button
              onClick={() => setSelectedImpact('medium')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                selectedImpact === 'medium' ? 'bg-white text-amber-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-amber-600'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Medium+
            </button>
          </div>

          {/* Currency Dropdown */}
          <select
            value={selectedCurrency}
            onChange={e => setSelectedCurrency(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium outline-none focus:border-slate-400"
          >
            <option value="all">🌐 All Currencies</option>
            {currencies.map(c => (
              <option key={c} value={c}>
                {getCountryFlag(c)} {c}
              </option>
            ))}
          </select>

          {/* Time Filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                timeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                timeFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('upcoming')}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                timeFilter === 'upcoming' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>
      </div>

      {/* Events Table / List */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No Forex Factory events match your active filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-150">
            {filteredEvents.map((item, idx) => {
              const impact = getImpactDetails(item.impact);
              const { timeLabel, dateLabel, isToday, isPast } = formatEventTime(item.date);
              const flag = getCountryFlag(item.country);
              const ffUrl = item.url || `https://www.forexfactory.com/calendar?day=${encodeURIComponent(item.date.split('T')[0] || '')}`;

              return (
                <div
                  key={idx}
                  className={`p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors ${
                    isToday ? 'bg-rose-50/20' : ''
                  }`}
                >
                  {/* Left: Date, Time & Country */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-20 sm:w-24 text-left">
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        {dateLabel}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                        {timeLabel || 'All Day'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200/60 w-18 justify-center shrink-0">
                      <span className="text-base">{flag}</span>
                      <span className="font-semibold text-xs text-slate-800">{item.country}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1.5 shrink-0 ${impact.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${impact.dotClass}`} />
                      {item.impact}
                    </span>
                  </div>

                  {/* Middle: Event Title */}
                  <div className="flex-1 min-w-0 pr-2">
                    <a
                      href={ffUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      <span className="line-clamp-2 md:line-clamp-1">{item.title}</span>
                      <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 shrink-0" />
                    </a>
                    {isToday && (
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-rose-600 uppercase tracking-wider">
                        Today's Key Release
                      </span>
                    )}
                  </div>

                  {/* Right: Forecast & Previous figures */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end md:self-auto text-xs font-mono tabular-nums">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Forecast</span>
                      <span className="font-semibold text-slate-800">{item.forecast || '—'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Previous</span>
                      <span className="font-medium text-slate-600">{item.previous || '—'}</span>
                    </div>
                    {item.actual && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Actual</span>
                        <span className="font-semibold text-emerald-600">{item.actual}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(NewsWidget);
