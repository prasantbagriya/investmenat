import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center ml-1.5 cursor-pointer align-middle"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <Info size={14} className="text-slate-500 hover:text-slate-600 transition-colors" />
      {show && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1 w-48 bg-slate-800 text-white text-[10px] font-medium p-1.5 rounded shadow-lg text-center leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
