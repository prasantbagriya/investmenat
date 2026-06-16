import React, { useState } from 'react';
import { CreditCard, CalendarDays, PlusCircle, AlertCircle, CheckCircle } from 'lucide-react';

interface Bill {
  id: string;
  cardName: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

interface EMI {
  id: string;
  itemName: string;
  totalAmount: number;
  emiAmount: number;
  totalMonths: number;
  paidMonths: number;
}

export function CreditCardsEMI() {
  const [activeTab, setActiveTab] = useState<'cards' | 'emis'>('cards');

  // Dummy data for now - will be connected to DB later
  const [bills, setBills] = useState<Bill[]>([
    { id: '1', cardName: 'HDFC Millennia', amount: 15400, dueDate: '2026-06-20', isPaid: false },
    { id: '2', cardName: 'SBI Cashback', amount: 8200, dueDate: '2026-06-25', isPaid: false }
  ]);

  const [emis, setEmis] = useState<EMI[]>([
    { id: '1', itemName: 'iPhone 15', totalAmount: 75000, emiAmount: 6250, totalMonths: 12, paidMonths: 4 },
    { id: '2', itemName: 'Washing Machine', totalAmount: 24000, emiAmount: 2000, totalMonths: 12, paidMonths: 2 }
  ]);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          Credit Cards & EMIs
        </h1>
        <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors flex items-center gap-2">
          <PlusCircle className="h-4 w-4" />
          Add {activeTab === 'cards' ? 'Bill' : 'EMI'}
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'cards' ? 'bg-primary text-background' : 'bg-surface text-text-secondary hover:text-white'
          }`}
        >
          Credit Card Bills
        </button>
        <button
          onClick={() => setActiveTab('emis')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'emis' ? 'bg-primary text-background' : 'bg-surface text-text-secondary hover:text-white'
          }`}
        >
          Active EMIs
        </button>
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {activeTab === 'cards' ? (
          <div className="divide-y divide-white/5">
            {bills.map(bill => (
              <div key={bill.id} className="p-6 flex items-center justify-between hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${bill.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {bill.isPaid ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{bill.cardName}</h3>
                    <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                      <CalendarDays className="h-3 w-3" /> Due on {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">₹{bill.amount.toLocaleString()}</p>
                  <button className={`mt-2 text-sm font-medium px-4 py-1.5 rounded-lg ${
                    bill.isPaid ? 'bg-green-500/10 text-green-400' : 'bg-primary text-background'
                  }`}>
                    {bill.isPaid ? 'Paid' : 'Mark as Paid'}
                  </button>
                </div>
              </div>
            ))}
            {bills.length === 0 && (
              <div className="p-8 text-center text-text-secondary">
                No active credit card bills.
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {emis.map(emi => (
              <div key={emi.id} className="p-6 flex items-center justify-between hover:bg-white/2 transition-colors">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white">{emi.itemName}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-text-secondary">
                      EMI: <span className="text-white font-medium">₹{emi.emiAmount.toLocaleString()}</span>/mo
                    </p>
                    <p className="text-sm text-text-secondary">
                      Total: ₹{emi.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${(emi.paidMonths / emi.totalMonths) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-secondary">
                      {emi.paidMonths} / {emi.totalMonths} months
                    </span>
                  </div>
                </div>
              </div>
            ))}
             {emis.length === 0 && (
              <div className="p-8 text-center text-text-secondary">
                No active EMIs.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
