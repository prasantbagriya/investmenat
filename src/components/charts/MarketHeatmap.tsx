import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface HeatmapStock {
  name: string;
  symbol?: string;
  change: number;         // % change e.g. +2.5, -1.3
  value?: number;         // market cap or volume (determines tile size)
}

interface MarketHeatmapProps {
  stocks: HeatmapStock[];
  title?: string;
  theme?: 'dark' | 'light';
}

const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ stocks, title = 'Market Heatmap', theme = 'light' }) => {
  const options = useMemo(() => {
    const textColor = theme === 'dark' ? '#e2e8f0' : '#1e293b';

    // Sort by absolute change for visual impact
    const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    const data = sorted.map(s => ({
      name: s.name,
      value: [s.value || Math.abs(s.change) * 10 + 20, s.change],
      label: {
        show: true,
        formatter: (params: any) => {
          const ch = params.data.value[1];
          return `{name|${params.name}}\n{change|${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%}`;
        },
        rich: {
          name: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
          change: { fontSize: 10, color: 'rgba(255,255,255,0.85)' }
        }
      },
      itemStyle: {
        color: s.change >= 3 ? '#059669'
          : s.change >= 1 ? '#10b981'
          : s.change >= 0 ? '#34d399'
          : s.change >= -1 ? '#f87171'
          : s.change >= -3 ? '#ef4444'
          : '#dc2626',
        borderColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
        borderWidth: 2,
        borderRadius: 6
      }
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: { color: textColor, fontSize: 13, fontWeight: 'bold' },
        left: 0,
        top: 0
      },
      tooltip: {
        formatter: (params: any) => {
          const ch = params.data.value[1];
          return `<b>${params.name}</b><br/>Change: <b style="color:${ch >= 0 ? '#10b981' : '#ef4444'}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</b>`;
        }
      },
      series: [
        {
          type: 'treemap',
          data,
          roam: false,
          nodeClick: false,
          visibleMin: 10,
          breadcrumb: { show: false },
          itemStyle: { borderColor: theme === 'dark' ? '#0f172a' : '#f8fafc', borderWidth: 1, gapWidth: 2 },
          levels: [{ itemStyle: { borderWidth: 0, gapWidth: 4 } }]
        }
      ]
    };
  }, [stocks, title, theme]);

  if (!stocks || stocks.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">No market data</div>;
  }

  return (
    <ReactECharts
      option={options}
      style={{ height: '320px', width: '100%' }}
    />
  );
};

export default MarketHeatmap;
