import React, { memo, useState } from 'react';
import NewsWidget from './NewsWidget';

const EconomicCalendarWidget = ({ theme = 'light' }: { theme?: 'light' | 'dark' }) => {
  const [provider, setProvider] = useState<'forexfactory' | 'tradingview'>('forexfactory');

  return (
    <div className="w-full h-full relative overflow-hidden bg-white flex flex-col">
      {/* Switcher Tab */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setProvider('forexfactory')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              provider === 'forexfactory' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Forex Factory Calendar
          </button>
          <button
            onClick={() => setProvider('tradingview')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              provider === 'tradingview' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Global Economic View
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {provider === 'forexfactory' ? (
          <NewsWidget theme={theme} />
        ) : (
          <iframe
            src={`https://s.tradingview.com/embed-widget/events/?locale=in#${encodeURIComponent(JSON.stringify({
              colorTheme: theme,
              isTransparent: true,
              width: "100%",
              height: "100%",
              importanceFilter: "-1,0,1",
              countryFilter: "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
              utm_source: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
              utm_medium: "widget",
              utm_campaign: "events"
            }))}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Economic Calendar"
          />
        )}
      </div>
    </div>
  );
};

export default memo(EconomicCalendarWidget);
