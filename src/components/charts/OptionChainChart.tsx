import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface OptionChainChartProps {
  data: any[]; // Array of option chain data objects from Upstox
  theme?: 'dark' | 'light';
}

const OptionChainChart: React.FC<OptionChainChartProps> = ({ data, theme = 'dark' }) => {
  const options = useMemo(() => {
    // Process Upstox Option Chain Data
    // Usually provides an array of strikes with CE and PE data
    // Example: [{ strike_price: 21000, call_options: { instrument_key: "...", market_data: { oi: 150000, ltp: 150 } }, put_options: { ... } }]
    
    // Sort by strike price
    const sortedData = [...data].sort((a, b) => a.strike_price - b.strike_price);

    const strikes = [];
    const callOI = [];
    const putOI = [];

    sortedData.forEach(item => {
      strikes.push(item.strike_price);
      callOI.push(item.call_options?.market_data?.oi || 0);
      putOI.push(item.put_options?.market_data?.oi || 0);
    });

    return {
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      title: {
        text: 'Option Chain Open Interest',
        left: 'center',
        textStyle: { color: theme === 'dark' ? '#fff' : '#000' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Call OI', 'Put OI'],
        bottom: 0,
        textStyle: { color: theme === 'dark' ? '#ccc' : '#333' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: strikes,
        axisLabel: { color: theme === 'dark' ? '#ccc' : '#333' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: theme === 'dark' ? '#ccc' : '#333' }
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', bottom: '5%' }
      ],
      series: [
        {
          name: 'Call OI',
          type: 'bar',
          data: callOI,
          itemStyle: { color: '#ec0000' } // Red for Calls (Resistance)
        },
        {
          name: 'Put OI',
          type: 'bar',
          data: putOI,
          itemStyle: { color: '#00da3c' } // Green for Puts (Support)
        }
      ]
    };
  }, [data, theme]);

  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-gray-500">No option chain data available</div>;
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

export default OptionChainChart;
