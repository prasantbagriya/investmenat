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
    const key = h.type === 'stock' ? `stock_${h.symbol}` : `mf_${h.schemeCode}`;
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
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 bg-white p-2.5 border border-slate-200/80 rounded-lg shadow-xs">
        <div>
          <h2 className="font-bold text-sm text-slate-800 font-display">Indian Capital Gains & Tax-Saving Ledger</h2>
          <p className="text-xs text-slate-500 mt-1">Estimating STCG/LTCG taxes under 2024 budget rules and mapping 80C relief benchmarks.</p>
        </div>
        <div className="flex gap-1.5 text-xs text-sans font-bold">
          <select 
            value={selectedFY} 
            onChange={(e) => setSelectedFY(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg p-1.5 px-1 font-semibold text-slate-700"
          >
            <option value="2024-25">FY 2024-25</option>
            <option value="2025-26">FY 2025-26</option>
            <option value="2023-24">FY 2023-24</option>
          </select>

          <button
            onClick={exportPDFStatement}
            className="bg-slate-900 hover:bg-slate-800 text-white p-1.5 px-1 border border-slate-900 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
          >
            <Download size={13} /> Export Tax Statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Left Side: Capital gains breakdown card */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-150 rounded-lg p-2 shadow-sm space-y-2">
            <div className="flex items-center gap-1 border-b border-slate-100 pb-1">
              <Percent className="text-slate-800" size={16} />
              <h3 className="font-bold text-xs text-slate-700 font-display">Capital Gains Computation (FY {selectedFY})</h3>
            </div>

            {holdings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">Register holdings inside the Stock & MF Tracker to calculate gains.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Short term card */}
                  <div className="border border-slate-100 p-2 rounded-xl space-y-1 bg-slate-50/20">
                    <div className="flex justify-between items-center text-xs capitalize text-slate-500 font-bold">
                      <span>Short-Term Gains (STCG)</span>
                      <span className="bg-amber-100 text-amber-800 p-0.5 px-1 rounded font-bold text-xs">HELD &lt; 365 Days</span>
                    </div>
                    <p className="text-xl font-black font-mono text-slate-800">
                      ₹{aggregateGains.stcgGains.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </p>
                    <div className="flex justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                      <span>Tax Rate:</span>
                      <span className="font-bold text-slate-700">20% under 2024 budget</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600 font-bold">
                      <span>Estimated Tax:</span>
                      <span className="font-mono">₹{stcgTax.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>

                  {/* Long term card */}
                  <div className="border border-slate-100 p-2 rounded-xl space-y-1 bg-slate-50/20">
                    <div className="flex justify-between items-center text-xs capitalize text-slate-500 font-bold">
                      <span>Long-Term Gains (LTCG)</span>
                      <span className="bg-emerald-100 text-emerald-800 p-0.5 px-1 rounded font-bold text-xs">HELD &gt; 365 Days</span>
                    </div>
                    <p className="text-xl font-black font-mono text-slate-800">
                      ₹{aggregateGains.ltcgGains.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                    </p>
                    <div className="flex justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                      <span>LTCG Free Threshold Exemption:</span>
                      <span className="font-bold text-slate-700">₹1,25,000</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tax Rate (above exempt):</span>
                      <span className="font-bold text-slate-700">12.5%</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600 font-bold">
                      <span>Estimated Tax:</span>
                      <span className="font-mono">₹{ltcgTax.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-white rounded-xl p-2 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-xs text-slate-350 capitalize ">Aggregate Estimated Gains Tax Liability</h5>
                    <p className="text-xs text-slate-500 mt-0.5">Indicative tax payable based on total profit declarations.</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-lg font-black text-rose-400">₹{totalTaxLiability.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                  </div>
                </div>

                {/* Footnote warnings */}
                <div className="p-1 bg-amber-50 border border-amber-100 rounded-xl flex gap-1.5 items-start text-xs text-amber-800 leading-relaxed ">
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
          <div className="bg-white border border-slate-150 rounded-lg p-2 shadow-sm space-y-2">
            <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5">
              <Pocket className="text-slate-800" size={16} />
              <h3 className="font-bold text-xs text-slate-700 font-display">Section 80C Tax Savings Tracker</h3>
            </div>
            
            {/* Limit Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 font-mono">
                <span>Deduction Base</span>
                <span>₹{total80C.toLocaleString()} / ₹1,50,000 max</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${percent80C === 100 ? 'bg-emerald-500' : 'bg-slate-900'}`}
                  style={{ width: `${percent80C}%` }}
                />
              </div>
              <div className="flex justify-between text-xs leading-relaxed mt-1">
                <span className="text-slate-500">Term coverage: <strong className="text-slate-700 font-mono">{percent80C.toFixed(0)}%</strong></span>
                {remaining80C > 0 ? (
                  <span className="text-blue-600 font-bold">Lacks ₹{remaining80C.toLocaleString()} more</span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">✔ limit reached!</span>
                )}
              </div>
            </div>

            {/* List Declarations */}
            <div className="space-y-1 border-t border-slate-100 pt-1">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>ACTIVE DECLARATIONS</span>
                <span>MOUNTED</span>
              </div>
              {declarations.map(d => (
                <div key={d.id} className="flex justify-between items-center bg-slate-50/50 p-1 border border-slate-100 rounded-lg text-xs ">
                  <div>
                    <span className="font-black text-slate-900 bg-white border border-slate-100 px-1 py-0.5 rounded text-xs">{d.category}</span>
                    <span className="text-xs text-slate-700 ml-1.5">{d.note}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="font-bold">₹{d.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => handleDeleteDeclaration(d.id)}
                      className="text-slate-350 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Declaration */}
            <form onSubmit={handleAddDeclaration} className="space-y-1.5 border-t border-slate-100 pt-1.5 text-xs ">
              <div>
                <label className="block text-slate-500 font-bold text-xs mb-1">DEDUCTION CATEGORY</label>
                <select 
                  value={newCat} 
                  onChange={(e: any) => setNewCat(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ELSS">ELSS Mutual Fund</option>
                  <option value="PPF">Public Provident Fund (PPF)</option>
                  <option value="NPS">National Pension System (NPS)</option>
                  <option value="LIC">LIC Premium Premium</option>
                  <option value="Tax-FD">5-Year Tax Saving FD</option>
                  <option value="Others">Others (EPF, Tuition Fee)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-slate-500 font-bold text-xs mb-1">AMOUNT (₹)</label>
                  <input 
                    type="number"
                    required
                    placeholder="15000"
                    value={newAmt}
                    onChange={(e) => setNewAmt(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold text-xs mb-1">NOTE</label>
                  <input 
                    type="text"
                    placeholder="e.g. SBI, LIC"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer transition-all text-xs shadow-xs"
              >
                <Plus size={12} /> Log Tax Deductible
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Quicko Advanced Tax Services */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800 rounded-lg p-4 shadow-xl mt-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <ShieldAlert size={120} />
        </div>
        
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <div className="bg-indigo-500 p-1.5 rounded-lg text-white">
             <Percent size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">⚡ Quicko Advanced Tax Services</h3>
            <p className="text-indigo-200 text-xs">Connected to Quicko Open Sandbox API</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {/* Form 16 Parser */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3">
            <h4 className="text-white text-xs font-bold mb-2 flex items-center gap-1"><FileText size={14} className="text-indigo-300"/> Form 16 Auto-Parser</h4>
            <p className="text-indigo-100 text-xs mb-3 leading-relaxed">
              Upload your Form 16 PDF. We will parse your Gross Salary and TDS directly into the Tax Planner below.
            </p>
            <div className="relative">
              <input 
                type="file" 
                accept="application/pdf"
                onChange={handleForm16Upload}
                disabled={form16Loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              />
              <div className={`bg-white/5 border border-dashed ${form16Error ? 'border-red-400' : 'border-indigo-400/50 hover:border-indigo-300 hover:bg-white/10'} rounded-lg p-4 flex flex-col items-center justify-center transition-all text-center h-24`}>
                {form16Loading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-white mb-2" size={20} />
                    <span className="text-white text-xs font-semibold">Parsing PDF...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={20} className={form16Error ? 'text-red-400 mb-1' : 'text-indigo-300 mb-1'} />
                    <span className="text-white text-xs font-semibold">{form16Error ? 'Upload Failed - Retry' : 'Click or Drag PDF here'}</span>
                  </>
                )}
              </div>
            </div>
            {form16Error && <p className="text-red-300 text-xs mt-2 bg-red-900/30 p-1.5 rounded border border-red-500/30">{form16Error}</p>}
          </div>

          {/* ITR Status Tracker */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col">
            <h4 className="text-white text-xs font-bold mb-2 flex items-center gap-1"><Search size={14} className="text-indigo-300"/> ITR Status Check</h4>
            <p className="text-indigo-100 text-xs mb-3 leading-relaxed">
              Track your Income Tax Return status directly from the ITD portal via Quicko API.
            </p>
            
            <form onSubmit={handleCheckITR} className="flex gap-2 mb-2">
              <input 
                type="text" 
                placeholder="Enter 10-digit PAN"
                value={itrPan}
                onChange={e => setItrPan(e.target.value.toUpperCase())}
                maxLength={10}
                className="bg-slate-900/50 border border-white/10 rounded-lg p-1.5 px-2 text-xs text-white placeholder-slate-400 w-full focus:ring-1 focus:ring-indigo-400 focus:outline-none capitalize font-mono"
              />
              <button 
                type="submit"
                disabled={itrLoading}
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap flex items-center justify-center min-w-[70px]"
              >
                {itrLoading ? <Loader2 size={14} className="animate-spin" /> : 'Check'}
              </button>
            </form>

            {itrError && <p className="text-red-300 text-xs mt-1 bg-red-900/30 p-1.5 rounded border border-red-500/30">{itrError}</p>}
            
            {itrStatus && !itrError && (
              <div className="mt-auto bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-2 text-xs text-emerald-100 space-y-1">
                <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1 mb-1">
                  <span className="font-bold flex items-center gap-1"><CheckCircle size={10} className="text-emerald-400"/> Status: {itrStatus.status}</span>
                  <span className="bg-emerald-500/20 px-1 rounded font-mono">AY {itrStatus.assessmentYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200/70">Filing Date:</span>
                  <span className="font-mono">{itrStatus.filingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200/70">Expected Refund:</span>
                  <span className="font-mono font-bold text-emerald-300">₹{itrStatus.refundAmount?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width Tax Planner */}
      <div className="bg-white border border-slate-150 rounded-lg p-4 shadow-sm mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="text-indigo-600" size={20} />
          <h3 className="font-bold text-slate-800">Salary Tax Planner: Old vs New Regime (FY 2024-25)</h3>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="w-full md:w-1/3">
            <label className="block text-slate-700 font-bold text-xs mb-1">GROSS ANNUAL SALARY (₹)</label>
            <input 
              type="number" 
              value={grossSalary} 
              onChange={(e) => saveGrossSalary(parseInt(e.target.value) || 0)}
              className="w-full text-lg font-bold p-2 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
            <p className="text-xs text-slate-500 mt-2">
              Note: This calculator assumes standard deduction (₹50k Old / ₹75k New) and maps your logged 80C deductions (₹{total80C.toLocaleString()}).
            </p>
          </div>

          <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Old Regime Box */}
            <div className={`p-3 rounded-lg border-2 transition-all ${recommendedRegime === 'OLD REGIME' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-50'}`}>
              <h4 className="text-xs font-bold text-slate-700 capitalize">Old Tax Regime</h4>
              <p className="text-2xl font-black text-slate-800 my-1">₹{oldTotalWithCess.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <div className="text-xs text-slate-700 space-y-0.5 mt-2">
                <p>Taxable Base: ₹{netIncomeOld.toLocaleString('en-IN')}</p>
                <p>80C Deductions Used: ₹{total80C.toLocaleString('en-IN')}</p>
                <p>Std. Deduction: ₹50,000</p>
              </div>
              {recommendedRegime === 'OLD REGIME' && (
                <div className="mt-3 inline-block bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">RECOMMENDED — SAVES ₹{taxSaved.toLocaleString('en-IN')}</div>
              )}
            </div>

            {/* New Regime Box */}
            <div className={`p-3 rounded-lg border-2 transition-all ${recommendedRegime === 'NEW REGIME' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-50'}`}>
              <h4 className="text-xs font-bold text-slate-700 capitalize">New Tax Regime</h4>
              <p className="text-2xl font-black text-slate-800 my-1">₹{newTotalWithCess.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <div className="text-xs text-slate-700 space-y-0.5 mt-2">
                <p>Taxable Base: ₹{netIncomeNew.toLocaleString('en-IN')}</p>
                <p>80C Disabled (0 mapped)</p>
                <p>Std. Deduction: ₹75,000</p>
              </div>
              {recommendedRegime === 'NEW REGIME' && (
                <div className="mt-3 inline-block bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">RECOMMENDED — SAVES ₹{taxSaved.toLocaleString('en-IN')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
