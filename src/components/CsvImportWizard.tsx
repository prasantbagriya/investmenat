import React, { useState } from 'react';
import { UploadCloud, FileText, Check, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { Transaction, BankAccount } from '../types';
import { proxyFetch } from '../utils/proxyFetch';

interface CsvImportWizardProps {
  onAddTransaction: (t: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  bankAccounts: BankAccount[];
  onClose: () => void;
}

export default function CsvImportWizard({ onAddTransaction, bankAccounts, onClose }: CsvImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setParsedData(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      // To avoid huge token usage, we could slice the text.
      // But let's assume the user uploads a reasonable CSV for 1-3 months.
      // E.g., max 20,000 chars. If it's too big, we should chunk it, but for now we'll pass it whole.
      const safeText = text.length > 30000 ? text.substring(0, 30000) + "\n...[TRUNCATED]" : text;

      const res = await proxyFetch('/api/parse-csv-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: safeText, bankAccounts })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse CSV');

      setParsedData(data.transactions);
      // Select all by default
      setSelectedIndices(new Set(data.transactions.map((_: any, i: number) => i)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setImporting(true);
    try {
      for (const idx of Array.from(selectedIndices)) {
        const item = parsedData[idx];
        await onAddTransaction({
          date: item.date || new Date().toISOString().split('T')[0],
          amount: Number(item.amount),
          type: item.type === 'income' ? 'income' : 'expense',
          category: item.category || 'Other',
          notes: item.note || 'Imported via CSV',
          bankAccountId: item.matched_bank_account_id || undefined,
        });
      }
      onClose(); // Close modal/wizard on success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-800">AI Bank Statement Import</h2>
          <p className="text-xs text-slate-700 font-bold mt-1">Upload your Bank CSV and let AI do the data entry.</p>
        </div>
      </div>

      {!parsedData ? (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50 relative hover:bg-slate-100 transition-colors">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud size={48} className="text-indigo-400 mb-4" />
            <p className="font-bold text-slate-700 text-sm">
              {file ? file.name : 'Tap to upload or drag & drop CSV'}
            </p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Only CSV files supported</p>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            disabled={!file || loading}
            onClick={handleParse}
            className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">AI is reading statement...</span>
            ) : (
              <>Analyze with AI <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={16} />
              <p>Found {parsedData.length} transactions!</p>
            </div>
            <button 
              onClick={() => setParsedData(null)}
              className="text-emerald-800 underline cursor-pointer"
            >
              Upload another
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            {parsedData.map((item, idx) => {
              const isSelected = selectedIndices.has(idx);
              const bankName = item.matched_bank_account_id ? bankAccounts.find(b => b.id === item.matched_bank_account_id)?.bankName : 'Cash/Wallet';
              return (
                <div 
                  key={idx} 
                  onClick={() => toggleSelect(idx)}
                  className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'}`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{item.note}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-500">
                      <span>{item.date}</span>
                      <span>•</span>
                      <span className="bg-slate-100 px-1.5 rounded">{item.category}</span>
                      <span>•</span>
                      <span className="text-indigo-400">{bankName}</span>
                    </div>
                  </div>
                  <div className={`font-black font-mono tracking-tight shrink-0 ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.type === 'income' ? '+' : '-'}₹{Number(item.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            disabled={importing || selectedIndices.size === 0}
            onClick={handleImport}
            className="w-full bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {importing ? (
              <span className="animate-pulse">Importing...</span>
            ) : (
              <>Import {selectedIndices.size} Transactions</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
