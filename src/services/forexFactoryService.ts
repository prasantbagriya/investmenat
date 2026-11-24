import { proxyFetch } from '../utils/proxyFetch';

export interface ForexFactoryEvent {
  title: string;
  country: string;
  date: string; // ISO string or datetime
  impact: 'High' | 'Medium' | 'Low' | 'Holiday' | string;
  forecast?: string;
  previous?: string;
  actual?: string;
  url?: string;
}

const CACHE_KEY = 'forexfactory_calendar_cache_v1';
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchForexFactoryCalendar(): Promise<ForexFactoryEvent[]> {
  // 1. Check local storage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY_MS && Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // ignore local cache error
  }

  // 2. Try proxyFetch from backend server
  try {
    const res = await proxyFetch('/api/forexfactory/calendar');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        return data;
      }
    }
  } catch (e) {
    // backend not reachable, proceed to static fallback
  }

  // 3. Fallback: load static public bundle
  try {
    const staticRes = await fetch('/data/forexfactory_calendar.json');
    if (staticRes.ok) {
      const data = await staticRes.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        return data;
      }
    }
  } catch (e) {
    // static file error
  }

  // 4. Return cached even if stale
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}

  return [];
}

export function getImpactDetails(impact: string) {
  const norm = (impact || '').toLowerCase();
  if (norm.includes('high')) {
    return {
      label: 'High Impact',
      code: 'high',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dotClass: 'bg-rose-500',
      folderColor: '#e11d48',
    };
  }
  if (norm.includes('med')) {
    return {
      label: 'Medium',
      code: 'medium',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
      dotClass: 'bg-amber-500',
      folderColor: '#f59e0b',
    };
  }
  if (norm.includes('low')) {
    return {
      label: 'Low',
      code: 'low',
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200/80',
      dotClass: 'bg-yellow-500',
      folderColor: '#eab308',
    };
  }
  return {
    label: 'Holiday / Info',
    code: 'holiday',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dotClass: 'bg-slate-400',
    folderColor: '#94a3b8',
  };
}

export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
    AUD: '🇦🇺',
    CAD: '🇨🇦',
    CHF: '🇨🇭',
    NZD: '🇳🇿',
    CNY: '🇨🇳',
    INR: '🇮🇳',
    ALL: '🌐',
  };
  return flags[country.toUpperCase()] || '🌐';
}

export function formatEventTime(dateStr: string): { dateLabel: string; timeLabel: string; isToday: boolean; isPast: boolean } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { dateLabel: dateStr, timeLabel: '', isToday: false, isPast: false };
    }
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const isPast = d.getTime() < today.getTime();

    const dateLabel = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const timeLabel = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return { dateLabel, timeLabel, isToday, isPast };
  } catch (e) {
    return { dateLabel: dateStr, timeLabel: '', isToday: false, isPast: false };
  }
}
