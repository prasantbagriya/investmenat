import React, { memo } from 'react';

const EconomicCalendarWidget = ({ theme = 'light' }: { theme?: 'light' | 'dark' }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-white">
      <iframe
        src={`https://s.tradingview.com/embed-widget/events/?locale=in#${encodeURIComponent(JSON.stringify({
          colorTheme: theme,
          isTransparent: true,
          width: "100%",
          height: "100%",
          importanceFilter: "-1,0,1",
          countryFilter: "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
          utm_source: window.location.hostname,
          utm_medium: "widget",
          utm_campaign: "events"
        }))}`}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Economic Calendar"
      />
    </div>
  );
};

export default memo(EconomicCalendarWidget);
