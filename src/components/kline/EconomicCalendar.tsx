import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Loader2, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { proxyFetch } from '../../utils/proxyFetch';

interface EconomicCalendarProps {
  theme: 'light' | 'dark';
}

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

export default function EconomicCalendar({ theme }: EconomicCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterImpact, setFilterImpact] = useState<string>('All'); // All, High, Medium
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]); // empty means all

  // Get unique currencies from events
  const allCurrencies = Array.from(new Set(events.map(e => e.country))).filter(Boolean).sort();

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isNative = Capacitor.isNativePlatform();
      const url = isNative 
        ? 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
        : '/api/ff_calendar';
        
      const res = isNative ? await fetch(url) : await proxyFetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch calendar data");
      }
      
      const textResponse = await res.text();
      let data: CalendarEvent[];
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        throw new Error("Server returned HTML instead of data. This means the Proxy is not running (e.g., on Live Firebase Hosting). Please run on Local Dev or Android APK.");
      }
      
      // Sort by date
      const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setEvents(sortedData);
    } catch (err: any) {
      setError(err.message || 'Error fetching calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
    const interval = setInterval(fetchCalendarData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // TradingView Style Impact Colors
  const getImpactColor = (impact: string) => {
    switch(impact) {
      case 'High': return '#ef5350'; // Red
      case 'Medium': return '#ff9800'; // Orange
      case 'Low': return '#fcc419'; // Yellow
      case 'Holiday': return '#9ca3af';
      default: return '#9ca3af';
    }
  };

  // TradingView exact colors
  const text = theme === 'dark' ? '#D1D4DC' : '#000000';
  const subtext = theme === 'dark' ? '#787B86' : '#131722';
  const border = theme === 'dark' ? '#2B2B36' : '#E0E3EB';
  const headerBg = theme === 'dark' ? '#131722' : '#FFFFFF';
  const rowHoverBg = theme === 'dark' ? '#2A2E39' : '#F8F9FD';

  // Filter events
  const filteredEvents = events.filter(e => {
    // Check Impact
    let impactMatch = true;
    if (filterImpact === 'High') impactMatch = e.impact === 'High';
    if (filterImpact === 'Medium') impactMatch = e.impact === 'High' || e.impact === 'Medium';
    
    // Check Currency
    let currencyMatch = true;
    if (selectedCurrencies.length > 0) {
      currencyMatch = selectedCurrencies.includes(e.country);
    }
    
    return impactMatch && currencyMatch;
  });

  const toggleCurrency = (currency: string) => {
    if (selectedCurrencies.includes(currency)) {
      setSelectedCurrencies(selectedCurrencies.filter(c => c !== currency));
    } else {
      setSelectedCurrencies([...selectedCurrencies, currency]);
    }
  };

  // Group by date for TradingView style headers
  const groupedEvents: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach(e => {
    const d = new Date(e.date);
    const dateStr = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groupedEvents[dateStr]) groupedEvents[dateStr] = [];
    groupedEvents[dateStr].push(e);
  });

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs" style={{ backgroundColor: headerBg }}>
      {/* Header and Filter */}
      <div className="p-3 flex justify-between items-center" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="font-bold text-sm flex items-center gap-2" style={{ color: text }}>
          <CalendarIcon size={16} /> Economic Calendar
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{ 
              backgroundColor: showFilters ? (theme === 'dark' ? '#131722' : '#000000') : (theme === 'dark' ? '#1E222D' : '#F0F3FA'),
              color: showFilters ? '#FFFFFF' : text,
              border: `1px solid ${showFilters ? (theme === 'dark' ? '#131722' : '#000000') : border}`
            }}
          >
            <Filter size={12} />
            Filters {selectedCurrencies.length > 0 ? `(${selectedCurrencies.length})` : ''}
          </button>
        </div>
      </div>

      {/* Filter Panel (Expandable) */}
      {showFilters && (
        <div className="p-3 text-xs" style={{ backgroundColor: theme === 'dark' ? '#1E222D' : '#F8F9FD', borderBottom: `1px solid ${border}` }}>
          
          <div className="mb-3">
            <div className="font-semibold mb-1.5" style={{ color: subtext }}>Importance</div>
            <div className="flex gap-2">
              {['All', 'Medium', 'High'].map(imp => (
                <button
                  key={imp}
                  onClick={() => setFilterImpact(imp)}
                  className="px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: filterImpact === imp ? (theme === 'dark' ? '#131722' : '#000000') : 'transparent',
                    color: filterImpact === imp ? '#FFFFFF' : text,
                    border: `1px solid ${filterImpact === imp ? (theme === 'dark' ? '#131722' : '#000000') : border}`
                  }}
                >
                  {imp === 'Medium' ? 'Medium & High' : imp === 'High' ? 'High Only' : 'All Impacts'}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <div className="font-semibold mb-1.5 flex justify-between">
              <span style={{ color: subtext }}>Currencies</span>
              {selectedCurrencies.length > 0 && (
                <span className="cursor-pointer text-blue-500 hover:underline" onClick={() => setSelectedCurrencies([])}>Clear All</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allCurrencies.map(currency => (
                <button
                  key={currency}
                  onClick={() => toggleCurrency(currency)}
                  className="px-2 py-0.5 rounded font-bold"
                  style={{
                    backgroundColor: selectedCurrencies.includes(currency) ? (theme === 'dark' ? '#2B2B36' : '#E0E3EB') : 'transparent',
                    color: text,
                    border: `1px solid ${selectedCurrencies.includes(currency) ? (theme === 'dark' ? '#434651' : '#B2B5BE') : border}`,
                    opacity: selectedCurrencies.length === 0 || selectedCurrencies.includes(currency) ? 1 : 0.5
                  }}
                >
                  {currency}
                </button>
              ))}
            </div>
          </div>
          
        </div>
      )}

      {/* Calendar List (TradingView Style) */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50" style={{ color: text }}>
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p>Loading economic calendar...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded border border-red-500/20 bg-red-500/10 text-red-500 flex flex-col items-center text-center gap-2 m-4">
            <AlertTriangle size={20} />
            {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 text-center px-4" style={{ color: text }}>
            No events found for selected filter.
          </div>
        ) : (
          Object.entries(groupedEvents).map(([dateStr, dayEvents]) => (
            <div key={dateStr}>
              {/* Date Header */}
              <div 
                className="px-4 py-1.5 font-semibold text-xs sticky top-0 z-10 capitalize "
                style={{ backgroundColor: theme === 'dark' ? '#1E222D' : '#F0F3FA', color: subtext, borderBottom: `1px solid ${border}` }}
              >
                {dateStr}
              </div>
              
              {/* Events for this date */}
              <div className="flex flex-col">
                {dayEvents.map((item, idx) => {
                  const eventDate = new Date(item.date);
                  const isPast = eventDate.getTime() < new Date().getTime();
                  const impactColor = getImpactColor(item.impact);
                  
                  return (
                    <div
                      key={`${item.title}-${idx}`}
                      className="flex items-center px-4 py-2.5 transition-colors cursor-pointer"
                      style={{ 
                        borderBottom: `1px solid ${border}`,
                        opacity: isPast ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = rowHoverBg}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Time */}
                      <div className="w-12 flex-shrink-0 font-medium" style={{ color: subtext }}>
                        {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                      
                      {/* Country & Impact Indicator */}
                      <div className="w-10 flex-shrink-0 flex items-center gap-1.5 font-bold" style={{ color: text }}>
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: impactColor, boxShadow: `0 0 4px ${impactColor}80` }} 
                        />
                        {item.country}
                      </div>
                      
                      {/* Event Title */}
                      <div className="flex-1 pr-2 truncate font-medium" style={{ color: text }} title={item.title}>
                        {item.title}
                      </div>
                      
                      {/* Actual/Forecast/Prev Data */}
                      {item.impact !== 'Holiday' ? (
                        <div className="flex items-center gap-3 text-right">
                          <div className="flex items-center gap-1 font-semibold whitespace-nowrap" style={{ color: text }}>
                            <span className="text-xs font-normal" style={{ color: subtext }}>Est:</span> 
                            {item.forecast || '-'}
                          </div>
                          <div className="flex items-center gap-1 font-semibold whitespace-nowrap" style={{ color: subtext }}>
                            <span className="text-xs font-normal" style={{ color: subtext }}>Prev:</span> 
                            {item.previous || '-'}
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 text-right italic font-medium text-xs" style={{ color: subtext }}>
                          Holiday
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
