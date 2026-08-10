import React, { useState } from 'react';
import { DollarSign, ArrowLeft, Plus } from 'lucide-react';
import { LedgerProfile } from '../types';
import { LedgerList } from './Ledger/LedgerList';
import { LedgerProfileView } from './Ledger/LedgerProfileView';
import LogEntryForm from './LogEntryForm';

interface PendingPaymentsProps {
  user?: any;
  onNavigateToTab?: (tab: string) => void;
  // We keep the other props optional in case App.tsx still passes them,
  // even though we don't use them anymore.
  pendingPayments?: any;
  onAddPayment?: any;
  onEditPayment?: any;
  onDeletePayment?: any;
  
  bankAccounts?: any[];
  onAddGlobalTransaction?: (tx: any) => Promise<void>;
  onDeleteGlobalTransaction?: (id: string) => Promise<void>;
}

export default function PendingPayments({
  user,
  onNavigateToTab,
  bankAccounts,
  onAddGlobalTransaction,
  onDeleteGlobalTransaction
}: PendingPaymentsProps) {
  const [selectedProfile, setSelectedProfile] = useState<LedgerProfile | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLogFormOpen, setIsLogFormOpen] = useState(false);

  return (
    <div className="space-y-3" id="payments-tab">
      
      {/* Header and Trigger button (Only show when NO profile is selected) */}
      {!selectedProfile && (
        <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-2 px-1 mb-2">
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight ">
              Outstanding Balances (Khata)
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Clear track of payments due or receivable, with date and alerts.
            </p>
          </div>
          
          <div className="flex shrink-0">
            <div className="flex flex-nowrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateToTab?.('recurring-bills')}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-sm whitespace-nowrap"
              >
                <DollarSign size={14} /> Auto-Bills
              </button>
              {onAddGlobalTransaction && (
                <button
                  type="button"
                  onClick={() => setIsLogFormOpen(!isLogFormOpen)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} /> Log Entry
                </button>
              )}
              <button 
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} /> New Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Global Log Entry Form (Moves from TransactionTracker) */}
      {!selectedProfile && onAddGlobalTransaction && (
        <div className="mt-2">
          <LogEntryForm 
            onAddTransaction={onAddGlobalTransaction} 
            bankAccounts={bankAccounts} 
            isFormOpen={isLogFormOpen} 
            setIsFormOpen={setIsLogFormOpen} 
          />
        </div>
      )}

      {selectedProfile ? (
        <LedgerProfileView 
          profile={selectedProfile} 
          userId={user?.uid} 
          onBack={() => setSelectedProfile(null)}
          bankAccounts={bankAccounts}
          onAddGlobalTransaction={onAddGlobalTransaction}
          onDeleteGlobalTransaction={onDeleteGlobalTransaction}
        />
      ) : (
        <LedgerList 
          onSelectProfile={setSelectedProfile} 
          userId={user?.uid} 
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
        />
      )}

    </div>
  );
}
