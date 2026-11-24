import React, { useState } from 'react';
import { Landmark, Search, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyBankAccount, BankVerificationResponse } from '../../services/quickoService';

export default function BankVerification() {
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BankVerificationResponse | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !ifsc || ifsc.length !== 11) {
      toast.error('Please enter a valid Account Number and 11-digit IFSC.');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await verifyBankAccount(accountNumber, ifsc);
      setResult(response);
      toast.success('Penny Drop Verification Successful!');
    } catch (err: any) {
      toast.error(err.message || 'Verification Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
        <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
          <Landmark size={20} className="text-emerald-400" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Bank Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quicko Penny Drop API</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Account Number</label>
          <input
            type="password"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">IFSC Code</label>
          <div className="relative">
            <input
              type="text"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              maxLength={11}
              placeholder="HDFC0000123"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-xs disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin text-white" />
          ) : (
            <span>Drop Penny ₹1</span>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-200/80 pb-3">
            <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle size={15} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">Penny Dropped!</p>
              <p className="text-[11px] text-slate-500">Account successfully matched</p>
            </div>
          </div>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Beneficiary Name</span>
              <span className="font-semibold text-slate-900">{result.beneficiaryName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
              <span className="text-slate-500 font-medium">Bank Name</span>
              <span className="font-semibold text-slate-900">{result.bankName}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Status</span>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-xl font-medium text-[11px]">
                {result.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
