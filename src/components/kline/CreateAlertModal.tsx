import React, { useState } from 'react';
import { X, Clock, HelpCircle } from 'lucide-react';

interface CreateAlertModalProps {
  theme: 'light' | 'dark';
  onClose: () => void;
  symbol: string;
}

export default function CreateAlertModal({ theme, onClose, symbol }: CreateAlertModalProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1e222d' : '#ffffff';
  const border = isDark ? '#2b2b43' : '#e0e3eb';
  const text = isDark ? '#d1d4dc' : '#131722';
  const subtext = isDark ? '#787b86' : '#9098a1';
  const hoverBg = isDark ? '#2a2e39' : '#f0f3fa';
  const inputBg = isDark ? '#131722' : '#ffffff';

  const [condition, setCondition] = useState('Crossing');
  const [value, setValue] = useState('62609.63');
  const [trigger, setTrigger] = useState('Only Once');
  const [message, setMessage] = useState(`${symbol} Crossing ${value}`);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div 
        style={{ background: bg, borderColor: border, color: text }}
        className="w-full max-w-[500px] mx-4 sm:mx-auto border rounded-lg flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: border }}>
          <h2 className="text-lg font-bold">Create alert on {symbol}</h2>
          <button onClick={onClose} className="p-1 hover:opacity-70 rounded transition-opacity"><X size={20} /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[600px]">
          {/* Condition */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: subtext }}>Condition</label>
            <div className="flex gap-2">
              <select className="flex-1 p-2 rounded text-sm border outline-none cursor-pointer" style={{ background: inputBg, borderColor: border, color: text }}>
                <option>{symbol}</option>
              </select>
              <select 
                className="flex-1 p-2 rounded text-sm border outline-none cursor-pointer" 
                style={{ background: inputBg, borderColor: border, color: text }}
                value={condition}
                onChange={e => setCondition(e.target.value)}
              >
                <option>Crossing</option>
                <option>Crossing Up</option>
                <option>Crossing Down</option>
                <option>Greater Than</option>
                <option>Less Than</option>
              </select>
            </div>
            <div className="flex gap-2 mt-1">
              <select className="w-1/3 p-2 rounded text-sm border outline-none cursor-pointer" style={{ background: inputBg, borderColor: border, color: text }}>
                <option>Value</option>
              </select>
              <input 
                type="text" 
                className="w-2/3 p-2 rounded text-sm border outline-none font-mono" 
                style={{ background: inputBg, borderColor: border, color: text }}
                value={value}
                onChange={e => setValue(e.target.value)}
              />
            </div>
            <div className="text-sm font-semibold mt-1 cursor-pointer hover:underline" style={{ color: text }}>
              + Add condition
            </div>
          </div>

          {/* Trigger */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: subtext }}>Trigger</label>
            <select 
              className="w-full p-2 rounded text-sm border outline-none cursor-pointer" 
              style={{ background: inputBg, borderColor: border, color: text }}
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
            >
              <option>Only Once</option>
              <option>Once Per Bar</option>
              <option>Once Per Bar Close</option>
              <option>Once Per Minute</option>
            </select>
          </div>

          {/* Expiration */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold" style={{ color: subtext }}>Expiration</label>
              <Clock size={12} style={{ color: subtext }} />
            </div>
            <input 
              type="datetime-local" 
              className="w-full p-2 rounded text-sm border outline-none cursor-pointer" 
              style={{ background: inputBg, borderColor: border, color: text }}
              defaultValue="2026-09-02T12:46"
            />
          </div>

          {/* Alert name */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs font-semibold" style={{ color: subtext }}>Alert name</label>
              <HelpCircle size={12} style={{ color: subtext }} />
            </div>
            <input 
              type="text" 
              className="w-full p-2 rounded text-sm border outline-none" 
              style={{ background: inputBg, borderColor: border, color: text }}
              placeholder="Alert name"
            />
          </div>

          {/* Message */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold" style={{ color: subtext }}>Message</label>
            <textarea 
              className="w-full p-2 rounded text-sm border outline-none min-h-[80px]" 
              style={{ background: inputBg, borderColor: border, color: text }}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2" style={{ borderColor: border }}>
          <button onClick={onClose} className="px-4 py-2 rounded text-sm hover:opacity-80 transition-opacity">Cancel</button>
          <button onClick={onClose} className="px-6 py-2 rounded text-sm text-white dark:text-black font-semibold transition-opacity bg-black dark:bg-white hover:opacity-80">Create</button>
        </div>
      </div>
    </div>
  );
}
