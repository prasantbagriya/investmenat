import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface CandlestickChartProps {
  data: any[]; // Array of [timestamp, open, high, low, close, volume, oi]
  instrumentName?: string;
  theme?: 'dark' | 'light';
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, instrumentName = 'Instrument', theme = 'dark' }) => {
  const options = useMemo(() => {
    // Upstox historical data format: ["2024-01-01T09:15:00+05:30", 100, 105, 95, 102, 1000, 0]
    const categoryData = [];
    const values = [];

    // Parse data from bottom up if Upstox sends newest first, or just iterate
    // Usually APIs send oldest first or newest first. Assuming it's already sorted chronologically.
    const sortedData = [...data].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      // Format time
      const date = new Date(item[0]);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      categoryData.push(timeStr);
      // ECharts candlestick expects [open, close, lowest, highest]
      // Upstox provides [timestamp, open, high, low, close, volume, oi]
      values.push([item[1], item[4], item[3], item[2]]);
    }

    const upColor = '#00da3c';
    const downColor = '#ec0000';

    return {
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      title: {
        text: instrumentName,
        left: 0,
        textStyle: { color: theme === 'dark' ? '#fff' : '#000' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: categoryData,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      yAxis: {
        scale: true,
        splitArea: { show: true }
      },
      dataZoom: [
        { type: 'inside', start: 50, end: 100 },
        { show: true, type: 'slider', top: '90%', start: 50, end: 100 }
      ],
      series: [
        {
          name: instrumentName,
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor
          }
        }
      ]
    };
  }, [data, instrumentName, theme]);

  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-gray-500">No historical data available</div>;
  }

  return (
    <div className="w-full h-96">
      <ReactECharts 
        option={options} 
        style={{ height: '100%', width: '100%' }} 
        theme={theme}
      />
    </div>
  );
};

export default CandlestickChart;
