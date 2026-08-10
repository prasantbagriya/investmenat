import React, { useEffect, useRef, useState } from 'react';
import { TV_CONFIG } from './chartConfig';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Drawing {
  id: string;
  type: string;
  p1: { time: number, price: number };
  p2?: { time: number, price: number };
  points?: { time: number, price: number }[];
  text?: string;
}

interface CanvasChartProps {
  data: CandleData[];
  theme: 'light' | 'dark';
  chartType?: string;
  activeMode?: string;
  drawings?: Drawing[];
  indicators?: string[];
  symbol?: string;
  timeframe?: string;
  onDrawEnd?: (d: Drawing) => void;
  onRemoveDrawing?: (id: string) => void;
  onOpenSettings?: () => void;
}

export default function CanvasChart({ data, theme, chartType = 'candle_solid', symbol = '', timeframe = '', activeMode = 'normal', drawings = [], indicators = [], onDrawEnd, onRemoveDrawing, onOpenSettings }: CanvasChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const crosshairCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  const stateRef = useRef({
    candleWidth: 8,
    offsetX: 0,
    isDragging: false,
    lastX: 0,
    isYDragging: false,
    lastY: 0,
    yStretch: 1,
    yOffset: 0,
    isAutoFit: true,
    mousePos: null as {x: number, y: number} | null,
    activeDrawing: null as Drawing | null
  });

  const drawRef = useRef<number | undefined>(undefined);
  const yAxisState = useRef<{maxPrice: number, minPrice: number, chartHeight: number, chartWidth: number} | null>(null);

  const Y_AXIS_WIDTH = 60;
  const X_AXIS_HEIGHT = 30;

  const isDark = theme === 'dark';
  const colors = isDark ? TV_CONFIG.colors.dark : TV_CONFIG.colors.light;

  const getPriceFromY = (y: number) => {
    if (!yAxisState.current) return 0;
    const { maxPrice, minPrice, chartHeight } = yAxisState.current;
    return minPrice + ((chartHeight - y) / chartHeight) * (maxPrice - minPrice);
  };

  const getTimeFromX = (x: number) => {
    if (!yAxisState.current) return 0;
    const { chartWidth } = yAxisState.current;
    const rightMargin = 50;
    const distanceToRight = chartWidth - rightMargin - x + stateRef.current.offsetX;
    let index = Math.round(distanceToRight / stateRef.current.candleWidth);
    index = Math.max(0, Math.min(index, data.length - 1));
    const candle = data[data.length - 1 - index];
    return candle ? candle.timestamp : 0;
  };

  const draw = () => {
    if (!containerRef.current || !bgCanvasRef.current || !mainCanvasRef.current || !crosshairCanvasRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const mainCtx = mainCanvasRef.current.getContext('2d');
    const bgCtx = bgCanvasRef.current.getContext('2d');
    const crossCtx = crosshairCanvasRef.current.getContext('2d');
    if (!mainCtx || !bgCtx || !crossCtx) return;

    mainCtx.clearRect(0, 0, width, height);
    bgCtx.clearRect(0, 0, width, height);
    crossCtx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    const { candleWidth, offsetX, mousePos } = stateRef.current;
    const chartWidth = width - Y_AXIS_WIDTH;
    const chartHeight = height - X_AXIS_HEIGHT;
    const rightMargin = 50; 
    
    let maxPrice = -Infinity;
    let minPrice = Infinity;
    let maxVol = 0;
    let startIndex = -1;
    let endIndex = -1;
    
    const visibleData = [];
    for (let i = 0; i < data.length; i++) {
      const candle = data[data.length - 1 - i];
      const x = chartWidth - rightMargin - (i * candleWidth) + offsetX;
      if (x > -candleWidth && x < chartWidth + candleWidth) {
        if (startIndex === -1) startIndex = i;
        endIndex = i;
        visibleData.push(candle);
        if (candle.high > maxPrice) maxPrice = candle.high;
        if (candle.low < minPrice) minPrice = candle.low;
        if (candle.volume > maxVol) maxVol = candle.volume;
      }
    }

    if (visibleData.length === 0) return;
  
    let renderMaxPrice = 0;
    let renderMinPrice = 0;

    if (stateRef.current.isAutoFit) {
      const range = maxPrice - minPrice;
      maxPrice += range * 0.1;
      minPrice -= range * 0.1;
      renderMaxPrice = maxPrice;
      renderMinPrice = minPrice;
      
      if (!yAxisState.current) yAxisState.current = { maxPrice: 0, minPrice: 0, chartHeight, chartWidth };
      yAxisState.current.maxPrice = maxPrice;
      yAxisState.current.minPrice = minPrice;
    } else {
      const baseMax = yAxisState.current ? yAxisState.current.maxPrice : maxPrice;
      const baseMin = yAxisState.current ? yAxisState.current.minPrice : minPrice;
      
      const midPrice = (baseMax + baseMin) / 2;
      const currentRange = baseMax - baseMin;
      const newRange = currentRange * stateRef.current.yStretch;
      
      const offsetPrice = (stateRef.current.yOffset / chartHeight) * newRange;
      renderMaxPrice = (midPrice + newRange / 2) + offsetPrice;
      renderMinPrice = (midPrice - newRange / 2) + offsetPrice;
    }

    const priceToY = (price: number) => {
      return chartHeight - ((price - renderMinPrice) / (renderMaxPrice - renderMinPrice)) * chartHeight;
    };

    yAxisState.current = { maxPrice: renderMaxPrice, minPrice: renderMinPrice, chartHeight, chartWidth };

    bgCtx.fillStyle = colors.bg;
    bgCtx.fillRect(0, 0, width, height);

    if (symbol) {
      bgCtx.textAlign = 'center';
      bgCtx.textBaseline = 'middle';
      bgCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
      bgCtx.font = 'bold 120px Inter, sans-serif';
      bgCtx.fillText(symbol, chartWidth / 2, chartHeight / 2 - 40);
      bgCtx.font = 'bold 60px Inter, sans-serif';
      bgCtx.fillText(timeframe || '1D', chartWidth / 2, chartHeight / 2 + 50);
    }

    bgCtx.strokeStyle = colors.grid;
    bgCtx.lineWidth = 1;
    bgCtx.setLineDash([2, 2]); 
    
    const priceStep = (yAxisState.current.maxPrice - yAxisState.current.minPrice) / 8;
    bgCtx.fillStyle = colors.text;
    bgCtx.font = '11px Inter, sans-serif';
    bgCtx.textAlign = 'left';
    bgCtx.textBaseline = 'middle';
    
    for (let i = 0; i <= 8; i++) {
      const p = yAxisState.current.minPrice + (i * priceStep);
      const y = priceToY(p);
      bgCtx.beginPath();
      bgCtx.moveTo(0, y);
      bgCtx.lineTo(chartWidth, y);
      bgCtx.stroke();
      bgCtx.fillText(p.toFixed(2), chartWidth + 5, y);
    }
    bgCtx.setLineDash([]);
    bgCtx.strokeStyle = colors.grid;

    bgCtx.beginPath();
    bgCtx.moveTo(chartWidth, 0);
    bgCtx.lineTo(chartWidth, chartHeight);
    bgCtx.stroke();

    bgCtx.beginPath();
    bgCtx.moveTo(0, chartHeight);
    bgCtx.lineTo(chartWidth, chartHeight);
    bgCtx.stroke();

    const volHeightMax = chartHeight * 0.2; 
    mainCtx.lineWidth = 1.5;

    if (chartType === 'area' || chartType === 'line') {
      mainCtx.beginPath();
      mainCtx.strokeStyle = TV_CONFIG.lineStyle.color;
      mainCtx.lineWidth = TV_CONFIG.lineStyle.linewidth;
      
      let started = false;
      for (let i = 0; i < data.length; i++) {
        const candle = data[data.length - 1 - i];
        const x = chartWidth - rightMargin - (i * candleWidth) + offsetX + candleWidth/2;
        if (x < -candleWidth || x > chartWidth) continue;
        const y = priceToY(candle.close);
        
        if (!started) {
          mainCtx.moveTo(x, y);
          started = true;
        } else {
          mainCtx.lineTo(x, y);
        }
      }
      mainCtx.stroke();

      if (chartType === 'area') {
        mainCtx.lineTo(chartWidth, chartHeight);
        mainCtx.lineTo(0, chartHeight);
        const gradient = mainCtx.createLinearGradient(0, 0, 0, chartHeight);
        gradient.addColorStop(0, TV_CONFIG.areaStyle.color1);
        gradient.addColorStop(1, TV_CONFIG.areaStyle.color2);
        mainCtx.fillStyle = gradient;
        mainCtx.fill();
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        const candle = data[data.length - 1 - i];
        const x = chartWidth - rightMargin - (i * candleWidth) + offsetX;
        if (x < -candleWidth || x > chartWidth) continue;

        const yOpen = priceToY(candle.open);
        const yClose = priceToY(candle.close);
        const yHigh = priceToY(candle.high);
        const yLow = priceToY(candle.low);
        const isUp = candle.close >= candle.open;
        const style = TV_CONFIG.candleStyle;
        
        if (maxVol > 0) {
          const volH = (candle.volume / maxVol) * volHeightMax;
          mainCtx.fillStyle = isUp ? style.upColor : style.downColor;
          mainCtx.globalAlpha = 0.3;
          mainCtx.fillRect(x + 1, chartHeight - volH, candleWidth - 2, volH);
          mainCtx.globalAlpha = 1.0;
        }
        
        mainCtx.strokeStyle = isUp ? style.wickUpColor : style.wickDownColor;
        mainCtx.beginPath();
        mainCtx.moveTo(x + candleWidth/2, yHigh);
        mainCtx.lineTo(x + candleWidth/2, yLow);
        mainCtx.stroke();
        
        mainCtx.fillStyle = isUp ? style.upColor : style.downColor;
        mainCtx.strokeStyle = isUp ? style.borderUpColor : style.borderDownColor;
        const bodyY = Math.min(yOpen, yClose);
        const bodyH = Math.max(Math.abs(yOpen - yClose), 1);
        mainCtx.fillRect(x + 1, bodyY, candleWidth - 2, bodyH);
        mainCtx.strokeRect(x + 1, bodyY, candleWidth - 2, bodyH);
        
        if (i % Math.max(2, Math.floor(50 / candleWidth)) === 0 && x > 0 && x < chartWidth) {
          bgCtx.fillStyle = colors.text;
          bgCtx.textAlign = 'center';
          const date = new Date(candle.timestamp);
          const timeStr = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
          bgCtx.fillText(timeStr, x + candleWidth/2, chartHeight + 15);
          
          bgCtx.strokeStyle = colors.grid;
          bgCtx.setLineDash([2, 2]);
          bgCtx.beginPath();
          bgCtx.moveTo(x + candleWidth/2, chartHeight);
          bgCtx.lineTo(x + candleWidth/2, 0);
          bgCtx.stroke();
          bgCtx.setLineDash([]);
        }
      }
    }

    const latestCandle = data[data.length - 1];
    const latestPrice = latestCandle.close;
    const latestY = priceToY(latestPrice);
    const isLatestUp = latestCandle.close >= latestCandle.open;
    const latestColor = isLatestUp ? TV_CONFIG.candleStyle.upColor : TV_CONFIG.candleStyle.downColor;

    mainCtx.strokeStyle = latestColor;
    mainCtx.setLineDash([2, 2]);
    mainCtx.beginPath();
    mainCtx.moveTo(0, latestY);
    mainCtx.lineTo(chartWidth, latestY);
    mainCtx.stroke();
    mainCtx.setLineDash([]);

    mainCtx.fillStyle = latestColor;
    mainCtx.beginPath();
    mainCtx.moveTo(chartWidth, latestY);
    mainCtx.lineTo(chartWidth + 6, latestY - 10);
    mainCtx.lineTo(chartWidth + Y_AXIS_WIDTH, latestY - 10);
    mainCtx.lineTo(chartWidth + Y_AXIS_WIDTH, latestY + 10);
    mainCtx.lineTo(chartWidth + 6, latestY + 10);
    mainCtx.closePath();
    mainCtx.fill();

    mainCtx.fillStyle = '#ffffff';
    mainCtx.textAlign = 'left';
    mainCtx.textBaseline = 'middle';
    mainCtx.font = 'bold 11px Inter, sans-serif';
    mainCtx.fillText(latestPrice.toFixed(2), chartWidth + 8, latestY);

    const hoverCandleX = mousePos ? mousePos.x : chartWidth - rightMargin + offsetX;
    const distanceToRight = chartWidth - rightMargin - hoverCandleX + offsetX;
    let hoverIndex = Math.round(distanceToRight / candleWidth);
    hoverIndex = Math.max(0, Math.min(hoverIndex, data.length - 1));
    const hoverCandle = data[data.length - 1 - hoverIndex];

    if (hoverCandle) {
      crossCtx.font = 'bold 22px Inter, sans-serif';
      crossCtx.textAlign = 'left';
      crossCtx.textBaseline = 'top';
      crossCtx.fillStyle = colors.text;
      crossCtx.fillText(`${symbol}`, 15, 10);
      
      crossCtx.font = '12px Inter, sans-serif';
      crossCtx.fillText(`${timeframe}`, 15, 38);

      const ohlcText = `O ${hoverCandle.open.toFixed(2)}  H ${hoverCandle.high.toFixed(2)}  L ${hoverCandle.low.toFixed(2)}  C ${hoverCandle.close.toFixed(2)}`;
      crossCtx.fillText(ohlcText, 45, 38);
    }

    const drawSMA = (period: number, color: string) => {
      mainCtx.beginPath();
      mainCtx.strokeStyle = color;
      mainCtx.lineWidth = 1.5;
      
      let started = false;
      for (let i = Math.max(0, startIndex); i <= endIndex; i++) {
        const dataIdx = data.length - 1 - i;
        if (dataIdx - period + 1 < 0) continue;
        
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[dataIdx - j].close;
        }
        const avg = sum / period;
        
        const x = chartWidth - rightMargin - (i * candleWidth) + offsetX + candleWidth/2;
        const y = priceToY(avg);
        
        if (!started) {
          mainCtx.moveTo(x, y);
          started = true;
        } else {
          mainCtx.lineTo(x, y);
        }
      }
      mainCtx.stroke();
    };

    if (indicators.includes('MA_20')) drawSMA(20, '#FF9800');
    if (indicators.includes('MA_50')) drawSMA(50, '#2196F3');

    const drawShape = (d: Drawing, isActive = false) => {
      if (activeMode === 'hide' && !isActive) return;

      const timeToX = (t: number) => {
        const idx = data.findIndex(c => c.timestamp === t);
        if (idx === -1) {
          if (data.length > 1) {
             const candleSpan = data[1].timestamp - data[0].timestamp;
             const offsetCandles = (t - data[data.length - 1].timestamp) / candleSpan;
             return chartWidth - rightMargin + offsetX + candleWidth/2 + (offsetCandles * candleWidth);
          }
          return -1;
        }
        const revIdx = data.length - 1 - idx;
        return chartWidth - rightMargin - (revIdx * candleWidth) + offsetX + candleWidth/2;
      };

      const x1 = timeToX(d.p1.time);
      const y1 = priceToY(d.p1.price);
      if (x1 === -1 && !isActive) return;

      let x2 = -1;
      let y2 = -1;
      if (d.p2) {
        x2 = timeToX(d.p2.time);
        y2 = priceToY(d.p2.price);
      } else if (isActive && mousePos) {
        x2 = mousePos.x;
        y2 = mousePos.y;
      }

      const drawingColor = isDark ? '#ffffff' : '#000000';
      mainCtx.strokeStyle = drawingColor;
      mainCtx.fillStyle = drawingColor;
      mainCtx.lineWidth = 2;

      if (d.type === 'trend_line' || d.type === 'segment') {
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        if (x2 !== -1) mainCtx.lineTo(x2, y2);
        mainCtx.stroke();
      } 
      else if (d.type === 'horizontal_line') {
        mainCtx.beginPath();
        mainCtx.moveTo(0, y1);
        mainCtx.lineTo(chartWidth, y1);
        mainCtx.stroke();
      }
      else if (d.type === 'horizontal_ray') {
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        mainCtx.lineTo(chartWidth, y1);
        mainCtx.stroke();
      }
      else if (d.type === 'text') {
        mainCtx.font = '14px Inter, sans-serif';
        mainCtx.fillText("Text Note", x1, y1);
      }
      else if (d.type === 'fib_retracement' && x2 !== -1) {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const colors = ['#787b86', '#f44336', '#ff9800', '#4caf50', '#2196f3', '#9c27b0', '#787b86'];
        const priceDiff = d.p1.price - (d.p2 ? d.p2.price : getPriceFromY(y2));
        
        levels.forEach((lvl, i) => {
          const lvlPrice = (d.p2 ? d.p2.price : getPriceFromY(y2)) + (priceDiff * lvl);
          const lvlY = priceToY(lvlPrice);
          mainCtx.strokeStyle = colors[i];
          mainCtx.beginPath();
          mainCtx.moveTo(Math.min(x1, x2), lvlY);
          mainCtx.lineTo(Math.max(x1, x2) + 100, lvlY);
          mainCtx.stroke();
          
          mainCtx.fillStyle = colors[i];
          mainCtx.font = '10px Inter';
          mainCtx.fillText(`${lvl} (${lvlPrice.toFixed(2)})`, Math.min(x1, x2), lvlY - 4);
        });
        
        mainCtx.strokeStyle = '#787b86';
        mainCtx.setLineDash([4, 4]);
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        mainCtx.lineTo(x2, y2);
        mainCtx.stroke();
        mainCtx.setLineDash([]);
      }
      else if (d.type === 'long_position' && x2 !== -1) {
        const tpPrice = getPriceFromY(y2);
        const slPrice = d.p1.price - (tpPrice - d.p1.price);
        const slY = priceToY(slPrice);
        const width = 100;
        
        mainCtx.globalAlpha = 0.2;
        mainCtx.fillStyle = '#4caf50';
        mainCtx.fillRect(x1, Math.min(y1, y2), width, Math.abs(y1 - y2));
        mainCtx.fillStyle = '#f44336';
        mainCtx.fillRect(x1, Math.min(y1, slY), width, Math.abs(slY - y1));
        mainCtx.globalAlpha = 1.0;
        
        mainCtx.strokeStyle = '#787b86';
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        mainCtx.lineTo(x1 + width, y1);
        mainCtx.stroke();
      }
      else if (d.type === 'short_position' && x2 !== -1) {
        const tpPrice = getPriceFromY(y2);
        const slPrice = d.p1.price + (d.p1.price - tpPrice);
        const slY = priceToY(slPrice);
        const width = 100;
        
        mainCtx.globalAlpha = 0.2;
        mainCtx.fillStyle = '#4caf50';
        mainCtx.fillRect(x1, Math.min(y1, y2), width, Math.abs(y2 - y1));
        mainCtx.fillStyle = '#f44336';
        mainCtx.fillRect(x1, Math.min(y1, slY), width, Math.abs(y1 - slY));
        mainCtx.globalAlpha = 1.0;
        
        mainCtx.strokeStyle = '#787b86';
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        mainCtx.lineTo(x1 + width, y1);
        mainCtx.stroke();
      }
      else if (d.type === 'rectangle' && x2 !== -1) {
        mainCtx.globalAlpha = 0.2;
        mainCtx.fillStyle = drawingColor;
        mainCtx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        mainCtx.globalAlpha = 1.0;
        mainCtx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      }
      else if (d.type === 'brush' && d.points) {
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        d.points.forEach(pt => {
           const px = timeToX(pt.time);
           const py = priceToY(pt.price);
           if (px !== -1) mainCtx.lineTo(px, py);
        });
        mainCtx.stroke();
      }
      else if (d.type === 'measure' && x2 !== -1) {
        mainCtx.globalAlpha = 0.2;
        mainCtx.fillStyle = '#2196f3';
        mainCtx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        mainCtx.globalAlpha = 1.0;
        mainCtx.strokeStyle = '#2196f3';
        mainCtx.beginPath();
        mainCtx.moveTo(x1, y1);
        mainCtx.lineTo(x2, y2);
        mainCtx.stroke();
        
        const priceDiff = getPriceFromY(y2) - d.p1.price;
        const pctDiff = (priceDiff / d.p1.price) * 100;
        const barDiff = Math.round(Math.abs(x2 - x1) / stateRef.current.candleWidth);
        const textStr = `${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} (${pctDiff.toFixed(2)}%) ${barDiff} bars`;
        mainCtx.fillStyle = drawingColor;
        mainCtx.font = '12px Inter';
        mainCtx.fillText(textStr, x2 + 10, y2 - 10);
      }
    };

    drawings.forEach(d => drawShape(d));
    if (stateRef.current.activeDrawing) drawShape(stateRef.current.activeDrawing, true);

    if (mousePos && mousePos.x <= chartWidth && mousePos.y <= chartHeight) {
      crossCtx.strokeStyle = colors.crosshair;
      crossCtx.setLineDash([4, 4]);
      crossCtx.lineWidth = 1;

      crossCtx.beginPath();
      crossCtx.moveTo(mousePos.x, 0);
      crossCtx.lineTo(mousePos.x, chartHeight);
      crossCtx.stroke();

      crossCtx.beginPath();
      crossCtx.moveTo(0, mousePos.y);
      crossCtx.lineTo(chartWidth, mousePos.y);
      crossCtx.stroke();
      
      crossCtx.setLineDash([]);

      const hoverPrice = renderMinPrice + ((chartHeight - mousePos.y) / chartHeight) * (renderMaxPrice - renderMinPrice);
      crossCtx.fillStyle = colors.text;
      crossCtx.fillRect(chartWidth, mousePos.y - 10, Y_AXIS_WIDTH, 20);
      crossCtx.fillStyle = colors.bg;
      crossCtx.textAlign = 'left';
      crossCtx.textBaseline = 'middle';
      crossCtx.font = 'bold 11px Inter, sans-serif';
      crossCtx.fillText(hoverPrice.toFixed(2), chartWidth + 5, mousePos.y);
    }
  };

  const scheduleDraw = () => {
    if (drawRef.current) cancelAnimationFrame(drawRef.current);
    drawRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const dpr = window.devicePixelRatio || 1;
      [bgCanvasRef, mainCanvasRef, crosshairCanvasRef].forEach(ref => {
        if (ref.current) {
          ref.current.width = clientWidth * dpr;
          ref.current.height = clientHeight * dpr;
          ref.current.style.width = `${clientWidth}px`;
          ref.current.style.height = `${clientHeight}px`;
          const ctx = ref.current.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
          }
        }
      });
      scheduleDraw();
    };

    handleResize();
    
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    scheduleDraw();
  }, [data, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerDown = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      const chartWidth = rect.width - Y_AXIS_WIDTH;

      if (x > chartWidth) {
        stateRef.current.isYDragging = true;
        stateRef.current.lastY = e.clientY;
        container.style.cursor = 'grabbing';
      } else {
        if (activeMode === 'eraser' && onRemoveDrawing) {
           const clickPrice = getPriceFromY(y);
           const clickTime = getTimeFromX(x);
           let closestId = null;
           let minDiff = Infinity;
           drawings.forEach(d => {
              if (d.type === 'horizontal_line' || d.type === 'horizontal_ray') {
                 const diff = Math.abs(d.p1.price - clickPrice);
                 if (diff < minDiff && diff < (yAxisState.current!.maxPrice - yAxisState.current!.minPrice) * 0.05) {
                    minDiff = diff;
                    closestId = d.id;
                 }
              } else if (d.p2) {
                 const tMin = Math.min(d.p1.time, d.p2.time);
                 const tMax = Math.max(d.p1.time, d.p2.time);
                 if (clickTime >= tMin && clickTime <= tMax) {
                    const priceRange = Math.abs(d.p1.price - d.p2.price) || 0.0001;
                    const diff = Math.abs(clickPrice - d.p1.price);
                    if (diff < minDiff && diff < (yAxisState.current!.maxPrice - yAxisState.current!.minPrice) * 0.1) {
                       minDiff = diff;
                       closestId = d.id;
                    }
                 }
              }
           });
           if (closestId) onRemoveDrawing(closestId);
           return;
        }

        const isDrawingMode = ['trend_line', 'horizontal_line', 'horizontal_ray', 'fib_retracement', 'long_position', 'short_position', 'text', 'rectangle', 'brush', 'measure'].includes(activeMode);
        if (isDrawingMode) {
          const price = getPriceFromY(y);
          const time = getTimeFromX(x);
          stateRef.current.activeDrawing = {
            id: Date.now().toString(),
            type: activeMode,
            p1: { time, price },
            points: activeMode === 'brush' ? [{ time, price }] : undefined
          };
          container.style.cursor = 'crosshair';
        } else {
          stateRef.current.isDragging = true;
          stateRef.current.lastX = e.clientX;
          container.style.cursor = 'grabbing';
        }
      }
      container.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      if (activeMode === 'magnet') {
         const chartWidth = rect.width - Y_AXIS_WIDTH;
         const rightMargin = 50;
         const distanceToRight = chartWidth - rightMargin - x + stateRef.current.offsetX;
         let hoverIndex = Math.round(distanceToRight / stateRef.current.candleWidth);
         hoverIndex = Math.max(0, Math.min(hoverIndex, data.length - 1));
         const hoverCandle = data[data.length - 1 - hoverIndex];
         
         if (hoverCandle && yAxisState.current) {
            const chartHeight = rect.height - X_AXIS_HEIGHT;
            const priceToY = (price: number) => chartHeight - ((price - yAxisState.current!.minPrice) / (yAxisState.current!.maxPrice - yAxisState.current!.minPrice)) * chartHeight;
            const o = priceToY(hoverCandle.open);
            const h = priceToY(hoverCandle.high);
            const l = priceToY(hoverCandle.low);
            const c = priceToY(hoverCandle.close);
            
            const dists = [{v: o, n: 'o'}, {v: h, n: 'h'}, {v: l, n: 'l'}, {v: c, n: 'c'}];
            let closest = dists[0];
            dists.forEach(d => { if (Math.abs(y - d.v) < Math.abs(y - closest.v)) closest = d; });
            
            if (Math.abs(y - closest.v) < 30) y = closest.v;
         }
      }

      stateRef.current.mousePos = { x, y };

      const isDrawingMode = ['trend_line', 'horizontal_line', 'horizontal_ray', 'fib_retracement', 'long_position', 'short_position', 'text', 'rectangle', 'brush', 'measure'].includes(activeMode);
      if (stateRef.current.activeDrawing && isDrawingMode) {
         if (activeMode === 'brush') {
            const time = getTimeFromX(x);
            const price = getPriceFromY(y);
            stateRef.current.activeDrawing.points!.push({ time, price });
         }
      } else if (stateRef.current.isDragging) {
        const deltaX = e.clientX - stateRef.current.lastX;
        stateRef.current.offsetX += deltaX;
        stateRef.current.lastX = e.clientX;
        
        if (!stateRef.current.isAutoFit) {
          const deltaY = e.clientY - stateRef.current.lastY;
          stateRef.current.yOffset += deltaY;
        }
        stateRef.current.lastY = e.clientY;
      }
      
      if (stateRef.current.isYDragging) {
        stateRef.current.isAutoFit = false;
        const deltaY = e.clientY - stateRef.current.lastY;
        const newStretch = stateRef.current.yStretch * (1 + deltaY * 0.003); // Slowed down from 0.01
        stateRef.current.yStretch = Math.max(0.01, Math.min(newStretch, 100));
        stateRef.current.lastY = e.clientY;
      }
      scheduleDraw();
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth = rect.width - Y_AXIS_WIDTH;
      if (x > chartWidth) {
        stateRef.current.isAutoFit = true;
        stateRef.current.yStretch = 1;
        stateRef.current.yOffset = 0;
        scheduleDraw();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const isDrawingMode = ['trend_line', 'horizontal_line', 'horizontal_ray', 'fib_retracement', 'long_position', 'short_position', 'text', 'rectangle', 'brush', 'measure'].includes(activeMode);
      if (stateRef.current.activeDrawing && isDrawingMode) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        if (stateRef.current.mousePos) y = stateRef.current.mousePos.y; // Use magnet-adjusted pos if available
        const price = getPriceFromY(y);
        const time = getTimeFromX(x);
        
        const finalDrawing = {
          ...stateRef.current.activeDrawing,
          p2: { time, price }
        };
        
        if (onDrawEnd) onDrawEnd(finalDrawing);
        stateRef.current.activeDrawing = null;
      }

      stateRef.current.isDragging = false;
      stateRef.current.isYDragging = false;
      container.style.cursor = 'crosshair';
      container.releasePointerCapture(e.pointerId);
      scheduleDraw();
    };
    
    const handlePointerLeave = () => {
      stateRef.current.mousePos = null;
      stateRef.current.isDragging = false;
      stateRef.current.isYDragging = false;
      if (stateRef.current.activeDrawing) {
        stateRef.current.activeDrawing = null;
      }
      container.style.cursor = 'crosshair';
      scheduleDraw();
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.015 : 0.985;
      const newWidth = Math.max(1, Math.min(stateRef.current.candleWidth * zoomFactor, 100));
      
      if (stateRef.current.mousePos) {
        const chartWidth = container.clientWidth - Y_AXIS_WIDTH;
        const rightMargin = 50;
        const xPos = stateRef.current.mousePos.x;
        if (xPos < chartWidth) {
          const distanceToRight = chartWidth - rightMargin - xPos + stateRef.current.offsetX;
          const indexAtMouse = distanceToRight / stateRef.current.candleWidth;
          stateRef.current.offsetX = distanceToRight - (indexAtMouse * newWidth);
        }
      }
      
      stateRef.current.candleWidth = newWidth;
      scheduleDraw();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.offsetX, y: e.offsetY });
    };

    let initialPinchDistance = -1;
    let initialCandleWidth = -1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialCandleWidth = stateRef.current.candleWidth;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        const ratio = currentDistance / initialPinchDistance;
        
        const newWidth = Math.max(1, Math.min(initialCandleWidth * ratio, 100));
        
        if (stateRef.current.mousePos) {
          const chartWidth = container.clientWidth - Y_AXIS_WIDTH;
          const rightMargin = 50;
          const xPos = stateRef.current.mousePos.x;
          if (xPos < chartWidth) {
            const distanceToRight = chartWidth - rightMargin - xPos + stateRef.current.offsetX;
            const indexAtMouse = distanceToRight / stateRef.current.candleWidth;
            stateRef.current.offsetX = distanceToRight - (indexAtMouse * newWidth);
          }
        }
        
        stateRef.current.candleWidth = newWidth;
        scheduleDraw();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialPinchDistance = -1;
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('dblclick', handleDoubleClick);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('dblclick', handleDoubleClick);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [draw, activeMode, data, onDrawEnd]); 

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full cursor-crosshair overflow-hidden outline-none"
      style={{ touchAction: 'none' }}
      tabIndex={0}
      onClick={() => setContextMenu(null)}
    >
      <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none" />
      <canvas ref={mainCanvasRef} className="absolute inset-0 pointer-events-none" />
      <canvas ref={crosshairCanvasRef} className="absolute inset-0 pointer-events-none" />
      
      {contextMenu && (
        <div 
          className="absolute z-50 rounded py-1 text-sm font-medium border shadow-lg"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            background: colors.bg,
            color: colors.text,
            borderColor: colors.grid,
            minWidth: 160
          }}
        >
          <div className="px-4 py-2 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => {
              stateRef.current.isAutoFit = true;
              stateRef.current.yStretch = 1;
              stateRef.current.yOffset = 0;
              scheduleDraw();
              setContextMenu(null);
          }}>Reset Chart</div>
          <div className="px-4 py-2 cursor-pointer hover:opacity-70 transition-opacity">Copy Price</div>
          <div className="px-4 py-2 cursor-pointer hover:opacity-70 transition-opacity">Add Alert</div>
          <div className="h-px w-full my-1" style={{ background: colors.grid }} />
          <div 
            className="px-4 py-2 cursor-pointer hover:opacity-70 transition-opacity flex items-center justify-between"
            onClick={() => {
              setContextMenu(null);
              if (onOpenSettings) onOpenSettings();
            }}
          >
            <span>Settings...</span>
          </div>
        </div>
      )}
    </div>
  );
}
