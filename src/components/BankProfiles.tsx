import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, X, Building2, Wallet, Landmark, TrendingUp, TrendingDown, ArrowRight, ArrowLeftRight, ChevronRight, ArrowDownRight, ArrowUpRight, Save } from 'lucide-react';
import { BankAccount, Transaction } from '../types';

interface BankProfilesProps {
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  onAddBankAccount: (acc: Omit<BankAccount, 'id' | 'userId' | 'currentBalance'>) => Promise<void>;
  onEditBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  onDeleteBankAccount: (id: string) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export default function BankProfiles({
  bankAccounts,
  transactions,
  onAddBankAccount,
  onEditBankAccount,
  onDeleteBankAccount,
  onNavigateToTab
}: BankProfilesProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const openAddForm = () => {
    setEditingBank(null);
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setInitialBalance('');
    setIsFormOpen(true);
  };

  const openEditForm = (bank: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from navigating
    setEditingBank(bank);
    setBankName(bank.bankName);
    setAccountName(bank.accountName);
    setAccountNumber(bank.accountNumber || '');
    setInitialBalance(String(bank.initialBalance ?? bank.currentBalance));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBank(null);
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setInitialBalance('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(initialBalance);
    if (isNaN(balanceNum)) return;

    if (editingBank) {
      // Edit mode — only update name/label/accountNumber fields, not balance
      await onEditBankAccount(editingBank.id, {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim() || undefined,
      });
    } else {
      // Add mode
      const accPayload: Omit<BankAccount, 'id' | 'userId' | 'currentBalance'> = {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        initialBalance: balanceNum
      };
      if (accountNumber.trim()) {
        accPayload.accountNumber = accountNumber.trim();
      }
      await onAddBankAccount(accPayload);
    }

    closeForm();
  };

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
  
  const bankTransactions = React.useMemo(() => {
    if (!selectedBankId) return [];
    return transactions.filter(t => t.bankAccountId === selectedBankId).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedBankId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans">Banking Hub</h2>
          <p className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <Building2 size={20} className="text-indigo-600" /> Bank Profiles
          </p>
        </div>
        <div className="flex gap-2">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('transactions')}
              className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-xs"
            >
              <ArrowLeftRight size={14} /> Journal Ledger
            </button>
          )}
          <button
            onClick={openAddForm}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
          >
            <Plus size={14} /> Add Bank
          </button>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xl relative"
          >
            <button
              onClick={closeForm}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="font-bold text-slate-800 mb-3 text-sm flex items-center gap-1.5">
              {editingBank ? <><Edit2 size={14} className="text-indigo-600" /> Edit Bank Profile</> : <><Plus size={14} className="text-indigo-600" /> Add New Bank Account</>}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Bank Name</label>
                <input required placeholder="e.g. HDFC, SBI" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Account Label</label>
                <input required placeholder="e.g. Primary Savings" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">A/C Number (Last 4 digits)</label>
                <input placeholder="e.g. 1234 (Optional)" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-slate-50 focus:bg-white focus:outline-none" />
              </div>
              {!editingBank && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">Initial Balance (₹)</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              )}
              {editingBank && (
                <div className="flex items-end">
                  <p className="text-[10px] text-slate-500 italic">Current balance is auto-managed by transactions. Edit the initial balance via a manual correction transaction.</p>
                </div>
              )}
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Save size={14} /> {editingBank ? 'Save Changes' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Bank Cards */}
      {!selectedBankId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bankAccounts.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl">
              <Landmark size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bank profiles added yet.</p>
              <button onClick={openAddForm} className="mt-3 text-indigo-600 font-bold text-xs hover:underline cursor-pointer">+ Add your first bank</button>
            </div>
          ) : (
            bankAccounts.map(b => (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                key={b.id} 
                onClick={() => setSelectedBankId(b.id)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Landmark size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 leading-tight">{b.bankName}</h4>
                      <p className="text-xs text-slate-700">{b.accountName} {b.accountNumber ? `(..${b.accountNumber})` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditForm(b, e)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit profile"
                    >
                      <Edit2 size={13} />
                    </button>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Current Balance</p>
                  <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">₹{b.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Specific Bank History View */}
      {selectedBankId && selectedBank && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
            <div>
              <button onClick={() => setSelectedBankId(null)} className="text-slate-500 hover:text-white text-xs font-bold mb-1 flex items-center gap-1 cursor-pointer">
                ← Back to Profiles
              </button>
              <h3 className="text-lg font-black flex items-center gap-2">
                <Landmark size={18} className="text-indigo-400" /> {selectedBank.bankName} - {selectedBank.accountName}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Live Balance</p>
              <p className="text-xl font-mono font-bold">₹{selectedBank.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="p-0">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Passbook History</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditForm(selectedBank, e as any);
                    setSelectedBankId(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={12} /> Edit Profile
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this bank profile? Transactions will not be deleted but will lose linkage.')) {
                      await onDeleteBankAccount(selectedBank.id);
                      setSelectedBankId(null);
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} /> Remove Profile
                </button>
              </div>
            </div>

            {bankTransactions.length === 0 ? (
              <p className="text-center text-slate-700 py-8 text-sm">No transactions logged for this bank yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
                {bankTransactions.map(t => (
                  <div key={t.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {t.type === 'income' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{t.category}</p>
                        <p className="text-[10px] text-slate-700 truncate max-w-[150px] md:max-w-xs">{t.notes || t.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-bold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">{t.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
