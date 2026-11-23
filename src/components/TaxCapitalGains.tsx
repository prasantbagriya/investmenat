import React, { useState } from 'react';
import { 
  Percent, Download, HelpCircle, ShieldAlert, CheckCircle, 
  Pocket, FileText, Landmark, Info, Plus, Trash2, Library, UploadCloud, Search, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Holding, UserSettings, Tax80CDeclaration } from '../types';
import { parseForm16, checkITRStatus, ITRStatusResponse } from '../services/quickoService';

interface TaxCapitalGainsProps {
  holdings: Holding[];
  livePrices?: Record<string, { currentPrice: number; dayChange: number; name: string }>;
  userSettings?: UserSettings | null;
  onUpdateSettings?: (settings: Partial<UserSettings>) => void;
}

export default function TaxCapitalGains({ holdings, livePrices = {}, userSettings, onUpdateSettings }: TaxCapitalGainsProps) {
  const [selectedFY, setSelectedFY] = useState('2024-25');
  
  // Use Firebase userSettings as the source of truth, fallback to local storage for backward compatibility during migration
  const [declarations, setDeclarations] = useState<Tax80CDeclaration[]>(() => {
    if (userSettings?.tax80cDeclarations) return userSettings.tax80cDeclarations;
    try {
      const saved = localStorage.getItem('tax_80c_declarations');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Re-sync if userSettings change from cloud
  React.useEffect(() => {
    if (userSettings?.tax80cDeclarations) {
      setDeclarations(userSettings.tax80cDeclarations);
    }
  }, [userSettings?.tax80cDeclarations]);

  const [newCat, setNewCat] = useState<'ELSS' | 'PPF' | 'NPS' | 'LIC' | 'Tax-FD' | 'Others'>('ELSS');
  const [newAmt, setNewAmt] = useState('');
  const [newNote, setNewNote] = useState('');

  // Income & Regime Calculator State
  const [grossSalary, setGrossSalary] = useState(() => {
    if (userSettings?.taxGrossSalary) return userSettings.taxGrossSalary;
    try {
      return parseInt(localStorage.getItem('tax_gross_salary') || '1200000');
    } catch { return 1200000; }
  });

  React.useEffect(() => {
    if (userSettings?.taxGrossSalary) {
      setGrossSalary(userSettings.taxGrossSalary);
    }
  }, [userSettings?.taxGrossSalary]);

  // Quicko Advanced Tax States
  const [form16Loading, setForm16Loading] = useState(false);
  const [form16Error, setForm16Error] = useState('');
  
  const [itrPan, setItrPan] = useState('');
  const [itrStatus, setItrStatus] = useState<ITRStatusResponse | null>(null);
  const [itrLoading, setItrLoading] = useState(false);
  const [itrError, setItrError] = useState('');

  // 80C Limit - standard Indian Tax rule is 1.5 Lakhs (1,50,000 INR)
  const LIMIT_80C = 150000;

  const total80C = declarations.reduce((sum, d) => sum + d.amount, 0);
  const remaining80C = Math.max(0, LIMIT_80C - total80C);
  const percent80C = Math.min(100, (total80C / LIMIT_80C) * 100);

  // Capital Gains math — uses live prices when available, else simulates growth
  const gainsMapping = holdings.map(h => {
    const buyValue = h.buyPrice * h.quantity;

    // Time elapsed (defined outside IIFE so accessible later)
    const start = new Date(h.buyDate);
    const today = new Date();

    // Try to get live/real price first
    const key = h.type === 'stock' ? `stock_${h.symbol}` : h.type === 'crypto' ? `crypto_${h.name || h.symbol}` : `mf_${h.schemeCode}`;
    const live = livePrices[key];
    const currentPrice = live ? live.currentPrice : (() => {
      // Fallback: simulate typical growth based on holding duration
      const monthsElapsed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
      const estAppreciationRate = 0.015 * monthsElapsed;
      return h.buyPrice * (1 + estAppreciationRate);
    })();

    const currentVal = currentPrice * h.quantity;
    const gain = currentVal - buyValue;

    // Time elapsed in days
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isLTCG = diffDays > 365; // Held > 1 year

    return {
      ...h,
      buyValue,
      currentValue: currentVal,
      gain,
      isLTCG,
      days: diffDays
    };
  });

  const aggregateGains = gainsMapping.reduce((acc, h) => {
    if (h.gain > 0) {
      if (h.isLTCG) {
        acc.ltcgGains += h.gain;
      } else {
        acc.stcgGains += h.gain;
      }
    }
    return acc;
  }, { stcgGains: 0, ltcgGains: 0 });

  // Indian Budget 2024 LTCG & STCG tax calculations:
  // STCG: 20% on equity Short-term
  // LTCG: 12.5% on equity Long-term above 1.25 Lakhs (1,25,000 INR) free exemption limit rules
  const stcgTax = aggregateGains.stcgGains * 0.20;
  
  const ltcgExemptionLimit = 125000;
  const taxableLtcgGains = Math.max(0, aggregateGains.ltcgGains - ltcgExemptionLimit);
  const ltcgTax = taxableLtcgGains * 0.125;
  const totalTaxLiability = stcgTax + ltcgTax;

  // --- REGIME CALCULATOR ---
  const saveGrossSalary = (val: number) => {
    setGrossSalary(val);
    if (onUpdateSettings) {
      onUpdateSettings({ taxGrossSalary: val });
    } else {
      localStorage.setItem('tax_gross_salary', val.toString());
    }
  };

  const stdDeductionOld = 50000;
  const stdDeductionNew = 75000; // Updated for FY 24-25

  // Old Regime Tax Math
  const netIncomeOld = Math.max(0, grossSalary - stdDeductionOld - total80C);
  let oldTax = 0;
  if (netIncomeOld > 500000) {
    if (netIncomeOld > 1000000) {
      oldTax = (250000 * 0.05) + (500000 * 0.20) + ((netIncomeOld - 1000000) * 0.30);
    } else {
      oldTax = (250000 * 0.05) + ((netIncomeOld - 500000) * 0.20);
    }
  }

  // New Regime Tax Math (FY 2024-25)
  const netIncomeNew = Math.max(0, grossSalary - stdDeductionNew);
  let newTax = 0;
  if (netIncomeNew > 700000) {
    if (netIncomeNew <= 1000000) {
      newTax = (400000 * 0.05) + ((netIncomeNew - 700000) * 0.10);
    } else if (netIncomeNew <= 1200000) {
      newTax = (400000 * 0.05) + (300000 * 0.10) + ((netIncomeNew - 1000000) * 0.15);
    } else if (netIncomeNew <= 1500000) {
      newTax = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + ((netIncomeNew - 1200000) * 0.20);
    } else {
      newTax = (400000 * 0.05) + (300000 * 0.10) + (200000 * 0.15) + (300000 * 0.20) + ((netIncomeNew - 1500000) * 0.30);
    }
  }

  const oldTotalWithCess = oldTax * 1.04;
  const newTotalWithCess = newTax * 1.04;
  const recommendedRegime = newTotalWithCess < oldTotalWithCess ? 'NEW REGIME' : oldTotalWithCess < newTotalWithCess ? 'OLD REGIME' : 'EITHER (SAME)';
  const taxSaved = Math.abs(oldTotalWithCess - newTotalWithCess);

  const handleForm16Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setForm16Loading(true);
    setForm16Error('');
    try {
      const data = await parseForm16(file);
      saveGrossSalary(data.grossSalary);
      toast.success(`Form 16 Parsed Successfully!\nEmployer: ${data.employerName}\nGross Salary: ₹${data.grossSalary.toLocaleString('en-IN')}\nTDS Deducted: ₹${data.tdsDeducted.toLocaleString('en-IN')}`);
    } catch (err: any) {
      setForm16Error(err.message);
    } finally {
      setForm16Loading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCheckITR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itrPan || itrPan.length !== 10) {
      setItrError('Enter a valid 10-digit PAN');
      return;
    }
    setItrLoading(true);
    setItrError('');
    setItrStatus(null);
    try {
      const status = await checkITRStatus(itrPan.toUpperCase(), selectedFY);
      setItrStatus(status);
    } catch (err: any) {
      setItrError(err.message);
    } finally {
      setItrLoading(false);
    }
  };

  const handleAddDeclaration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmt) return;
    
    const amount = parseFloat(newAmt);
    if (isNaN(amount) || amount <= 0) return;

    const dec: Tax80CDeclaration = {
      id: Date.now().toString(),
      category: newCat,
      amount,
      note: newNote || undefined
    };

    const updated = [...declarations, dec];
    setDeclarations(updated);
    if (onUpdateSettings) {
      onUpdateSettings({ tax80cDeclarations: updated });
    } else {
      localStorage.setItem('tax_80c_declarations', JSON.stringify(updated));
    }
    setNewAmt('');
    setNewNote('');
  };

  const handleDeleteDeclaration = (id: string) => {
    const updated = declarations.filter(d => d.id !== id);
    setDeclarations(updated);
    if (onUpdateSettings) {
      onUpdateSettings({ tax80cDeclarations: updated });
    } else {
      localStorage.setItem('tax_80c_declarations', JSON.stringify(updated));
    }
  };

  const exportPDFStatement = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Aesthetic Styling
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39); // deep slate/black
    doc.text("INVESTMANT", 16, 20);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // grey
    doc.text(`Taxation Capital Gains & Section 80C Saving Statement — Financial Year ${selectedFY}`, 16, 26);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`, 16, 31);
    
    doc.line(16, 36, 194, 36);

    // Capital gains block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text("1. Capital Gains Summary (Union Budget 2024 Terms)", 16, 46);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Short Term Capital Gains (STCG - Held < 1 year):`, 16, 56);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${aggregateGains.stcgGains.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 130, 56);

    doc.setFont("Helvetica", "normal");
    doc.text(`Short Term Tax Rate:`, 16, 62);
    doc.setFont("Helvetica", "bold");
    doc.text("20.00%", 130, 62);

    doc.setFont("Helvetica", "normal");
    doc.text(`Estimated STCG Tax Due:`, 16, 68);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${stcgTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 130, 68);

    doc.setFont("Helvetica", "normal");
    doc.text(`Long Term Capital Gains (LTCG - Held > 1 year):`, 16, 76);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${aggregateGains.ltcgGains.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 130, 76);

    doc.setFont("Helvetica", "normal");
    doc.text(`Exemption Limit Allowed:`, 16, 82);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${ltcgExemptionLimit.toLocaleString()}`, 130, 82);

    doc.setFont("Helvetica", "normal");
    doc.text(`Taxable LTCG Base value:`, 16, 88);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${taxableLtcgGains.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 130, 88);

    doc.setFont("Helvetica", "normal");
    doc.text(`Long Term Tax Rate:`, 16, 94);
    doc.setFont("Helvetica", "bold");
    doc.text("12.50%", 130, 94);

    doc.setFont("Helvetica", "normal");
    doc.text(`Estimated LTCG Tax Due:`, 16, 100);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${ltcgTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 130, 100);

    doc.setFillColor(243, 244, 246);
    doc.rect(16, 106, 178, 12, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("Total Estimated Capital Gains Tax Liability:", 20, 114);
    doc.text(`Rs. ${totalTaxLiability.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 130, 114);

    // Section 80C block
    doc.setFontSize(14);
    doc.text("2. Section 80C Deductions (Rs. 1.50 Lakh Limit)", 16, 134);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    let yIdx = 144;
    declarations.forEach((d) => {
      doc.text(`• ${d.category} — ${d.note || 'Deduction'}`, 20, yIdx);
      doc.setFont("Helvetica", "bold");
      doc.text(`Rs. ${d.amount.toLocaleString('en-IN')}`, 130, yIdx);
      doc.setFont("Helvetica", "normal");
      yIdx += 6;
    });

    doc.line(16, yIdx + 2, 194, yIdx + 2);
    doc.setFont("Helvetica", "bold");
    doc.text("Total 80C Deductions Declared:", 16, yIdx + 10);
    doc.text(`Rs. ${total80C.toLocaleString('en-IN')}`, 130, yIdx + 10);

    doc.setFont("Helvetica", "normal");
    doc.text("Pending Section 80C Gap:", 16, yIdx + 16);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${remaining80C.toLocaleString('en-IN')}`, 130, yIdx + 16);

    // Safe compliance note footer
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Disclaimer: Calculated tax liability is indicative based on logged buy prices and simulated valuations. Consult chartered tax professional (CA) for actual file structures.", 16, 275);

    doc.save(`invest_mant_tax_FY${selectedFY}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 sm:p-5 border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Capital gains & tax ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">Estimating STCG/LTCG taxes under 2024 budget rules and 80C relief benchmarks</p>
        </div>
        <div className="flex gap-2 text-xs">
          <select 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl py-2 px-3 font-medium text-slate-700 outline-none text-xs sm:text-sm focus:border-slate-400"
          >
            <option value="2024-25">FY 2024-25</option>
            <option value="2025-26">FY 2025-26</option>
            <option value="2023-24">FY 2023-24</option>
          </select>

          <button
            onClick={exportPDFStatement}
            className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-medium cursor-pointer transition-colors text-xs sm:text-sm shadow-xs"
          >
            <Download size={14} /> Export tax statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Side: Capital gains breakdown card */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Percent className="text-slate-700" size={16} />
              <h3 className="font-semibold text-sm text-slate-900">Capital gains computation (FY {selectedFY})</h3>
            </div>

            {holdings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Register holdings inside the Stock & MF Tracker to calculate gains.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Short term card */}
                  <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                      <span>Short-term gains (STCG)</span>
                      <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums">Held &lt; 365 days</span>
                    </div>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                      ₹{aggregateGains.stcgGains.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </p>
                    <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                      <span>Tax rate:</span>
                      <span className="font-medium text-slate-800">20% under 2024 budget</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-700 font-medium">
                      <span>Estimated tax:</span>
                      <span className="font-mono tabular-nums font-semibold">₹{stcgTax.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>

                  {/* Long term card */}
                  <div className="border border-slate-200 p-4 rounded-xl space-y-2 bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                      <span>Long-term gains (LTCG)</span>
                      <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums">Held &gt; 365 days</span>
                    </div>
                    <p className="text-xl font-bold font-mono tabular-nums text-slate-900">
                      ₹{aggregateGains.ltcgGains.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </p>
                    <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                      <span>LTCG threshold exemption:</span>
                      <span className="font-medium text-slate-800 font-mono tabular-nums">₹1,25,000</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tax rate (above exempt):</span>
                      <span className="font-medium text-slate-800">12.5%</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-700 font-medium">
                      <span>Estimated tax:</span>
                      <span className="font-mono tabular-nums font-semibold">₹{ltcgTax.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-white rounded-xl p-3.5 flex justify-between items-center shadow-xs">
                  <div>
                    <h5 className="font-semibold text-xs text-slate-300">Aggregate Estimated Gains Tax Liability</h5>
                    <p className="text-xs text-slate-400 mt-0.5">Indicative tax payable based on total profit declarations.</p>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="text-lg font-bold text-rose-300">₹{totalTaxLiability.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                  </div>
                </div>

                {/* Footnote warnings */}
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex gap-2 items-start text-xs text-amber-800 leading-relaxed">
                  <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Federal Compliance Note:</strong> In budget terms modified on July 23, 2024, equity LTCG tax increased from 10% to 12.5% while the free threshold shifted to ₹1.25L. STCG increased to 20%. Ensure correct acquisition period mappings before making files.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Section 80C Tracker Card */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Pocket className="text-slate-800" size={16} />
              <h3 className="font-semibold text-sm text-slate-900">Section 80C Tax Savings Tracker</h3>
            </div>
            
            {/* Limit Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-medium text-slate-600 font-mono tabular-nums">
                <span>Deduction Base</span>
                <span>₹{total80C.toLocaleString()} / ₹1,50,000 max</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${percent80C === 100 ? 'bg-emerald-600' : 'bg-slate-900'}`}
                  style={{ width: `${percent80C}%` }}
                />
              </div>
              <div className="flex justify-between text-xs leading-relaxed mt-1">
                <span className="text-slate-500">Term coverage: <strong className="text-slate-700 font-mono tabular-nums">{percent80C.toFixed(0)}%</strong></span>
                {remaining80C > 0 ? (
                  <span className="text-slate-700 font-medium">Lacks ₹{remaining80C.toLocaleString()} more</span>
                ) : (
                  <span className="text-emerald-700 font-medium flex items-center gap-0.5">✔ limit reached!</span>
                )}
              </div>
            </div>

            {/* List Declarations */}
            <div className="space-y-1.5 border-t border-slate-100 pt-2">
              <div className="flex justify-between text-[11px] font-medium text-slate-500">
                <span>ACTIVE DECLARATIONS</span>
                <span>AMOUNT</span>
              </div>
              {declarations.map(d => (
                <div key={d.id} className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <span className="font-medium text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md text-[11px]">{d.category}</span>
                    <span className="text-xs text-slate-600 ml-1.5">{d.note}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono tabular-nums">
                    <span className="font-semibold text-slate-900">₹{d.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => handleDeleteDeclaration(d.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Declaration */}
            <form onSubmit={handleAddDeclaration} className="space-y-2 border-t border-slate-100 pt-2.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium text-xs mb-1">Deduction Category</label>
                <select 
                  value={newCat} 
                  onChange={(e: any) => setNewCat(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400"
                >
                  <option value="ELSS">ELSS Mutual Fund</option>
                  <option value="PPF">Public Provident Fund (PPF)</option>
                  <option value="NPS">National Pension System (NPS)</option>
                  <option value="LIC">LIC Premium Premium</option>
                  <option value="Tax-FD">5-Year Tax Saving FD</option>
                  <option value="Others">Others (EPF, Tuition Fee)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-medium text-xs mb-1">Amount (₹)</label>
                  <input 
                    type="number"
                    required
                    placeholder="15000"
                    value={newAmt}
                    onChange={(e) => setNewAmt(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium text-xs mb-1">Note</label>
                  <input 
                    type="text"
                    placeholder="e.g. SBI, LIC"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs shadow-xs"
              >
                <Plus size={13} /> Log Tax Deductible
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Quicko Advanced Tax Services */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs mt-4">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
             <Percent size={15} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight text-slate-900 text-sm sm:text-base">Quicko Tax Services</h3>
            <p className="text-slate-500 text-xs">Sandbox API connection for Form 16 & ITR status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Form 16 Parser */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-slate-900 text-xs font-semibold mb-1 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-700"/> Form 16 Auto-Parser
            </h4>
            <p className="text-slate-600 text-xs mb-3 leading-relaxed">
              Upload your Form 16 PDF to auto-extract Gross Salary and TDS directly into the Tax Planner.
            </p>
            <div className="relative">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleForm16Upload}
                disabled={form16Loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              />
              <div className={`bg-white border-2 border-dashed ${form16Error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300 hover:border-slate-400'} rounded-xl p-4 flex flex-col items-center justify-center transition-colors text-center h-24`}>
                {form16Loading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-slate-700 mb-1.5" size={18} />
                    <span className="text-slate-700 text-xs font-medium">Parsing PDF...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={20} className={form16Error ? 'text-rose-500 mb-1' : 'text-slate-500 mb-1'} />
                    <span className="text-slate-800 text-xs font-medium">{form16Error ? 'Upload failed - retry' : 'Click or drag Form 16 PDF here'}</span>
                  </>
                )}
              </div>
            </div>
            {form16Error && <p className="text-rose-700 text-xs mt-2 bg-rose-50 p-2 rounded-xl border border-rose-200">{form16Error}</p>}
          </div>

          {/* ITR Status Tracker */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col">
            <h4 className="text-slate-900 text-xs font-semibold mb-1 flex items-center gap-1.5">
              <Search size={14} className="text-slate-700"/> ITR Status Check
            </h4>
            <p className="text-slate-600 text-xs mb-3 leading-relaxed">
              Track your Income Tax Return status directly from the ITD portal via Quicko API.
            </p>
            
            <form onSubmit={handleCheckITR} className="flex gap-2 mb-2">
              <input 
                type="text" 
                placeholder="Enter 10-digit PAN"
                value={itrPan}
                onChange={e => setItrPan(e.target.value.toUpperCase())}
                maxLength={10}
                className="bg-white border border-slate-200 rounded-xl p-2 px-3 text-xs text-slate-900 placeholder-slate-400 w-full focus:border-slate-400 focus:outline-none uppercase font-mono tabular-nums font-medium"
              />
              <button 
                type="submit"
                disabled={itrLoading}
                className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center min-w-[75px] cursor-pointer shadow-xs"
              >
                {itrLoading ? <Loader2 size={14} className="animate-spin text-white" /> : 'Check status'}
              </button>
            </form>

            {itrError && <p className="text-rose-700 text-xs mt-1 bg-rose-50 p-2 rounded-xl border border-rose-200">{itrError}</p>}
            
            {itrStatus && !itrError && (
              <div className="mt-auto bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 space-y-1.5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-600"/> Status: {itrStatus.status}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono tabular-nums text-[11px] font-medium">AY {itrStatus.assessmentYear}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Filing date:</span>
                  <span className="font-mono tabular-nums text-slate-900 font-medium">{itrStatus.filingDate}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Expected refund:</span>
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">₹{itrStatus.refundAmount?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width Tax Planner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs mt-4">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
            <Landmark size={15} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight text-slate-900 text-sm sm:text-base">Salary Tax Planner (FY 2024-25)</h3>
            <p className="text-slate-500 text-xs">Old vs New tax regime comparative estimator</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3 space-y-2">
            <label className="block text-slate-700 font-medium text-xs">Gross annual salary (₹)</label>
            <input 
              type="number" 
              value={grossSalary} 
              onChange={(e) => saveGrossSalary(parseInt(e.target.value) || 0)}
              className="w-full text-base font-semibold font-mono tabular-nums px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-slate-400 focus:outline-none text-slate-900"
            />
            <p className="text-xs text-slate-500 leading-relaxed">
              Assumes standard deduction (₹50,000 Old / ₹75,000 New) and mapped 80C deductions (₹{total80C.toLocaleString()}).
            </p>
          </div>

          <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Old Regime Box */}
            <div className={`p-4 rounded-xl border transition-all ${recommendedRegime === 'OLD REGIME' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-slate-800">Old tax regime</h4>
                {recommendedRegime === 'OLD REGIME' && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded-full">Recommended</span>
                )}
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 my-1.5">₹{oldTotalWithCess.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <div className="text-xs text-slate-600 space-y-1 mt-2 pt-2 border-t border-slate-200/60 font-mono tabular-nums">
                <p className="flex justify-between"><span className="font-sans text-slate-500">Taxable base:</span> ₹{netIncomeOld.toLocaleString('en-IN')}</p>
                <p className="flex justify-between"><span className="font-sans text-slate-500">80C used:</span> ₹{total80C.toLocaleString('en-IN')}</p>
                <p className="flex justify-between"><span className="font-sans text-slate-500">Std. deduction:</span> ₹50,000</p>
              </div>
              {recommendedRegime === 'OLD REGIME' && (
                <div className="mt-2.5 text-xs font-semibold text-emerald-700">Saves ₹{taxSaved.toLocaleString('en-IN')} vs New Regime</div>
              )}
            </div>

            {/* New Regime Box */}
            <div className={`p-4 rounded-xl border transition-all ${recommendedRegime === 'NEW REGIME' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-slate-800">New tax regime</h4>
                {recommendedRegime === 'NEW REGIME' && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded-full">Recommended</span>
                )}
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 my-1.5">₹{newTotalWithCess.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <div className="text-xs text-slate-600 space-y-1 mt-2 pt-2 border-t border-slate-200/60 font-mono tabular-nums">
                <p className="flex justify-between"><span className="font-sans text-slate-500">Taxable base:</span> ₹{netIncomeNew.toLocaleString('en-IN')}</p>
                <p className="flex justify-between"><span className="font-sans text-slate-500">80C:</span> Not applicable</p>
                <p className="flex justify-between"><span className="font-sans text-slate-500">Std. deduction:</span> ₹75,000</p>
              </div>
              {recommendedRegime === 'NEW REGIME' && (
                <div className="mt-2.5 text-xs font-semibold text-emerald-700">Saves ₹{taxSaved.toLocaleString('en-IN')} vs Old Regime</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
