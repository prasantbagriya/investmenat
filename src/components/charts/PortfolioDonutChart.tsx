import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface PortfolioDonutChartProps {
  holdings: { name: string; currentValue: number; type?: string }[];
  theme?: 'dark' | 'light';
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
];

const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({ holdings, theme = 'light' }) => {
  const options = useMemo(() => {
    // Group by type (Equity, MF, ETF, etc.)
    const groups: Record<string, number> = {};
    holdings.forEach(h => {
      const key = h.type || 'Equity';
      groups[key] = (groups[key] || 0) + (h.currentValue || 0);
    });

    const data = Object.entries(groups).map(([name, value], i) => ({
      name,
      value: parseFloat(value.toFixed(2)),
      itemStyle: { color: COLORS[i % COLORS.length] }
    }));

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const textColor = theme === 'dark' ? '#e2e8f0' : '#1e293b';
    const subTextColor = theme === 'dark' ? '#94a3b8' : '#64748b';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
          return `<b>${params.name}</b><br/>₹${params.value.toLocaleString('en-IN')}<br/><b>${pct}%</b>`;
        }
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: subTextColor, fontSize: 11, fontWeight: 'bold' },
        itemWidth: 10,
        itemHeight: 10
      },
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '44%',
          style: {
            text: `₹${(total / 100000).toFixed(1)}L`,
            textAlign: 'center',
            fill: textColor,
            fontSize: 18,
            fontWeight: 'bold'
          }
        },
        {
          type: 'text',
          left: 'center',
          top: '53%',
          style: {
            text: 'Portfolio Value',
            textAlign: 'center',
            fill: subTextColor,
            fontSize: 11
          }
        }
      ],
      series: [
        {
          name: 'Portfolio',
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: theme === 'dark' ? '#1e293b' : '#f8fafc', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold', color: textColor },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' }
          },
          data
        }
      ]
    };
  }, [holdings, theme]);

  if (!holdings || holdings.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">No portfolio data</div>;
  }

  return (
    <ReactECharts
      option={options}
      style={{ height: '280px', width: '100%' }}
    />
  );
};

export default PortfolioDonutChart;
