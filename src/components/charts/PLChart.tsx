import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface PLDataPoint {
  date: string;   // 'YYYY-MM' or 'YYYY-MM-DD'
  realized: number;
  unrealized?: number;
}

interface PLChartProps {
  data: PLDataPoint[];
  theme?: 'dark' | 'light';
}

const PLChart: React.FC<PLChartProps> = ({ data, theme = 'light' }) => {
  const options = useMemo(() => {
    const textColor = theme === 'dark' ? '#e2e8f0' : '#1e293b';
    const gridColor = theme === 'dark' ? '#1e293b' : '#f1f5f9';
    const subText = theme === 'dark' ? '#94a3b8' : '#64748b';

    const dates = data.map(d => d.date);
    const realized = data.map(d => d.realized);
    const unrealized = data.map(d => d.unrealized ?? 0);

    // Running cumulative P&L
    const cumulative = realized.reduce((acc: number[], val, i) => {
      acc.push((acc[i - 1] || 0) + val);
      return acc;
    }, []);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any[]) => {
          let s = `<b>${params[0].axisValue}</b><br/>`;
          params.forEach(p => {
            const sign = p.value >= 0 ? '+' : '';
            const color = p.value >= 0 ? '#10b981' : '#ef4444';
            s += `${p.marker} ${p.seriesName}: <b style="color:${color}">${sign}₹${Math.abs(p.value).toLocaleString('en-IN')}</b><br/>`;
          });
          return s;
        }
      },
      legend: {
        data: ['Realized P&L', 'Unrealized P&L', 'Cumulative'],
        bottom: 0,
        textStyle: { color: subText, fontSize: 11 }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: subText, fontSize: 10 },
        axisLine: { lineStyle: { color: gridColor } }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: subText,
          fontSize: 10,
          formatter: (val: number) => val >= 0 ? `+₹${(val/1000).toFixed(0)}k` : `-₹${(Math.abs(val)/1000).toFixed(0)}k`
        },
        splitLine: { lineStyle: { color: gridColor } }
      },
      series: [
        {
          name: 'Realized P&L',
          type: 'bar',
          data: realized.map(v => ({
            value: v,
            itemStyle: { color: v >= 0 ? '#10b981' : '#ef4444', borderRadius: [4, 4, 0, 0] }
          })),
          barMaxWidth: 30
        },
        {
          name: 'Unrealized P&L',
          type: 'bar',
          data: unrealized.map(v => ({
            value: v,
            itemStyle: { color: v >= 0 ? '#6366f1' : '#f59e0b', borderRadius: [4, 4, 0, 0], opacity: 0.7 }
          })),
          barMaxWidth: 30,
          stack: 'unrealized'
        },
        {
          name: 'Cumulative',
          type: 'line',
          data: cumulative,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.02)' }
              ]
            }
          }
        }
      ]
    };
  }, [data, theme]);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">No P&L data available</div>;
  }

  return (
    <ReactECharts
      option={options}
      style={{ height: '320px', width: '100%' }}
    />
  );
};

export default PLChart;
