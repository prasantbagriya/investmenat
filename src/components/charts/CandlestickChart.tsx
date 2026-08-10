import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

interface CandlestickChartProps {
  data: any[]; // Array of [timestamp, open, high, low, close, volume, oi]
  instrumentName?: string;
  theme?: 'dark' | 'light';
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, instrumentName = 'Instrument', theme = 'dark' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Determine colors based on theme
    const backgroundColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const textColor = theme === 'dark' ? '#d1d5db' : '#374151';
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const upColor = '#26a69a';
    const downColor = '#ef5350';

    // Create Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor, style: 1 },
        horzLines: { color: gridColor, style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        mode: 1, // Normal crosshair
      }
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: upColor,
      downColor: downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
    seriesRef.current = candleSeries;

    // Add Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });
    
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Volume takes up the bottom 20% of the chart
        bottom: 0,
      },
    });
    volumeRef.current = volumeSeries;

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [theme]); // Re-initialize chart when theme changes

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || !data || data.length === 0) return;

    // Format Data for Lightweight Charts
    // Ensure chronological order
    const sortedData = [...data].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    const candleData = [];
    const volumeData = [];

    const upColor = '#26a69a';
    const downColor = '#ef5350';

    for (const item of sortedData) {
      // time must be a unix timestamp in seconds for intraday, or string 'YYYY-MM-DD' for daily
      const timeMs = new Date(item[0]).getTime();
      const time = (timeMs / 1000) as Time; 
      
      const open = item[1];
      const high = item[2];
      const low = item[3];
      const close = item[4];
      const volume = item[5] || 0;

      candleData.push({ time, open, high, low, close });

      const isUp = close >= open;
      volumeData.push({
        time,
        value: volume,
        color: isUp ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      });
    }

    seriesRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();

  }, [data]);

  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-slate-500 font-medium">No historical data available</div>;
  }

  return (
    <div className="w-full h-96 relative">
      {/* Title Overlay */}
      <div className={`absolute top-3 left-4 z-10 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
        {instrumentName}
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default CandlestickChart;
