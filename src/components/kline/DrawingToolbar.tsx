import React, { useState } from 'react';
import { 
  Crosshair, Plus, Minus, Type, Pencil, Image as ImageIcon,
  Ruler, ZoomIn, Magnet, Lock, EyeOff, Trash2, AlignLeft, Target, GripVertical, Star, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DrawingToolbarProps {
  theme: 'light' | 'dark';
  activeMode: string;
  onSelectMode: (mode: string) => void;
  onClearAll: () => void;
}

export default function DrawingToolbar({
  theme, activeMode, onSelectMode, onClearAll
}: DrawingToolbarProps) {
  const navigate = useNavigate();
  const dark = theme === 'dark';
  const bg       = dark ? '#131722' : '#ffffff';
  const border   = dark ? '#2b2b43' : '#e0e3eb';
  const text     = dark ? '#b2b5be' : '#787b86';
  const subtext  = dark ? '#787b86' : '#9098a1';
  const hoverBg  = dark ? '#2a2e39' : '#f0f3fa';
  const activeBg = dark ? '#2a2e39' : '#f0f3fa';
  const activeIcon = dark ? '#ffffff' : '#000000';

  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  const ToolButton = ({ icon: Icon, id, label, hideArrow = false, subTools = [] }: any) => {
    const isActive = activeMode === id;
    
    return (
      <div 
        className="relative group w-full px-1"
        onMouseEnter={() => subTools.length > 0 && setHoveredMenu(id)}
        onMouseLeave={() => setHoveredMenu(null)}
      >
        <button
          onClick={() => onSelectMode(id)}
          className="w-full flex items-center justify-center p-2 rounded transition-colors"
          style={{ 
            color: isActive ? activeIcon : text, 
            background: isActive ? activeBg : 'transparent' 
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          title={label}
        >
          <Icon size={20} strokeWidth={1.5} />
        </button>
        {!hideArrow && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 rotate-45 border-r border-b" style={{ borderColor: text }} />
          </div>
        )}
        
        {/* Flyout Menu */}
        {hoveredMenu === id && subTools.length > 0 && (
          <div 
            className="absolute left-full top-0 ml-1 py-2 rounded-lg  z-50 min-w-[200px]"
            style={{ background: bg, border: `1px solid ${border}`, color: text }}
          >
            {subTools.map((st: any, i: number) => (
              <div 
                key={i}
                onClick={() => { onSelectMode(st.id || id); setHoveredMenu(null); }}
                className="flex items-center justify-between px-4 py-2 cursor-pointer text-sm font-medium transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="flex items-center gap-3">
                  <st.icon size={16} style={{ color: subtext }} />
                  {st.label}
                </div>
                <Star size={14} style={{ color: subtext }} className="opacity-0 hover:opacity-100 hover:text-yellow-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const Divider = () => (
    <div style={{ background: border, height: 1, width: 24, margin: '8px 0' }} />
  );

  return (
    <div 
      className="flex flex-col items-center py-2 border-r h-full shrink-0 z-10 relative"
      style={{ width: 50, background: bg, borderColor: border }}
    >
      <div className="flex flex-col items-center gap-1 w-full flex-1 overflow-y-visible no-scrollbar">
        {/* Profile/Menu equivalent icon */}
        <ToolButton icon={Crosshair} id="normal" label="Cursor" subTools={[{icon: Crosshair, label: 'Cross'}, {icon: Minus, label: 'Dot'}, {icon: Plus, label: 'Arrow'}]} />
        
        {/* Drawing tools */}
        <ToolButton icon={AlignLeft} id="trend_line" label="Trend Line Tools" subTools={[
          {icon: Minus, label: 'Trend Line', id: 'trend_line'}, 
          {icon: Minus, label: 'Horizontal Ray', id: 'horizontal_ray'}, 
          {icon: Minus, label: 'Horizontal Line', id: 'horizontal_line'}
        ]} />
        <ToolButton icon={Target} id="fib_retracement" label="Gann and Fibonacci Tools" subTools={[
          {icon: AlignLeft, label: 'Fib Retracement', id: 'fib_retracement'}
        ]} />
        <ToolButton icon={Pencil} id="brush" label="Geometric Shapes" subTools={[
          {icon: Pencil, label: 'Brush', id: 'brush'}, 
          {icon: Pencil, label: 'Rectangle', id: 'rectangle'}
        ]} />
        <ToolButton icon={Type} id="text" label="Annotation Tools" subTools={[
          {icon: Type, label: 'Text', id: 'text'}
        ]} />
        <ToolButton icon={GripVertical} id="long_position" label="Prediction and Measurement Tools" subTools={[
          {icon: GripVertical, label: 'Long Position', id: 'long_position'}, 
          {icon: GripVertical, label: 'Short Position', id: 'short_position'}
        ]} />
        <ToolButton icon={Trash2} id="eraser" label="Eraser" hideArrow />

        <Divider />

        <ToolButton icon={Ruler} id="measure" label="Measure" hideArrow />
        <ToolButton icon={ZoomIn} id="zoomIn" label="Zoom In" hideArrow />
        <ToolButton icon={Magnet} id="magnet" label="Magnet Mode" />

        <Divider />

        <ToolButton icon={Lock} id="lock" label="Lock All Drawing Tools" hideArrow />
        <ToolButton icon={EyeOff} id="hide" label="Hide All Drawings" hideArrow />
        
        {/* Delete */}
        <div className="mt-2 w-full px-1">
          <button
            onClick={onClearAll}
            className="w-full flex items-center justify-center p-2 rounded transition-colors"
            style={{ color: text }}
            onMouseEnter={e => e.currentTarget.style.background = hoverBg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Remove Objects"
          >
            <Trash2 size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Exit */}
        <div className="w-full px-1 pb-4">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center p-2 rounded transition-colors"
            style={{ color: text }}
            onMouseEnter={e => e.currentTarget.style.background = hoverBg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Exit Terminal"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
