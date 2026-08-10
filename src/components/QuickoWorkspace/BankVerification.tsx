import React, { useState } from 'react';
import { Landmark, Search, IndianRupee, CheckCircle } from 'lucide-react';
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
    <div className="bg-white/80 backdrop-blur-xl border border-white/20 p-4 sm:p-6 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
      
      <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-emerald-100/50 rounded-full blur-3xl group-hover:bg-emerald-200/50 transition-colors" />
      
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
          <Landmark size={24} className="stroke-[2.5px]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Bank Verification</h2>
          <p className="text-xs sm:text-xs font-semibold text-slate-500 mt-0.5">Quicko Penny Drop API</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-bold text-slate-700 capitalize mb-2">Account Number</label>
          <div className="relative">
            <input
              type="password"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 capitalize mb-2">IFSC Code</label>
          <div className="relative">
            <input
              type="text"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              maxLength={11}
              placeholder="HDFC0000123"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all capitalize placeholder:normal-case placeholder:font-normal"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Drop Penny ₹1</>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 sm:p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl relative z-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-4 border-b border-emerald-100 pb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle size={20} className="stroke-[2.5px]" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">Penny Dropped!</p>
              <p className="text-xs font-medium text-emerald-700">Account successfully matched.</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 capitalize ">Beneficiary Name</span>
              <span className="text-sm font-black text-slate-900">{result.beneficiaryName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 capitalize ">Bank Name</span>
              <span className="text-sm font-black text-slate-900">{result.bankName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 capitalize ">Status</span>
              <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md capitalize ">
                {result.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
