import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, X, Building2, Wallet, Landmark, TrendingUp, TrendingDown, ArrowRight, ArrowLeftRight, ChevronRight, ArrowDownRight, ArrowUpRight, Save, Search, Calendar, Filter, RefreshCcw } from 'lucide-react';
import { BankAccount, Transaction } from '../types';

interface BankProfilesProps {
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  onAddBankAccount: (acc: Omit<BankAccount, 'id' | 'userId' | 'currentBalance'>) => Promise<void>;
  onEditBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  onDeleteBankAccount: (id: string) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
  onAddTransaction?: (txData: Omit<Transaction, 'id' | 'userId'> & { id?: string }) => Promise<void>;
}

export default function BankProfiles({
  bankAccounts,
  transactions,
  onAddBankAccount,
  onEditBankAccount,
  onDeleteBankAccount,
  onNavigateToTab,
  onAddTransaction
}: BankProfilesProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [accountType, setAccountType] = useState<'Bank' | 'Crypto Wallet' | 'Platform Wallet' | 'Cash'>('Bank');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiIdsText, setUpiIdsText] = useState(''); // comma separated
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState<string>('INR');

  // Withdrawal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawRate, setWithdrawRate] = useState('85');
  const [withdrawCoin, setWithdrawCoin] = useState('');
  const [withdrawToBankId, setWithdrawToBankId] = useState('');
  
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTransaction || !selectedBankId) return;
    
    const amt = parseFloat(withdrawAmount);
    const rate = parseFloat(withdrawRate);
    if (isNaN(amt) || isNaN(rate) || !withdrawToBankId) return;

    const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
    if (!selectedBank) return;

    const inrAmount = amt * rate;
    const withdrawTxId = 'tx_' + Math.random().toString(36).substring(2, 11);
    
    // Determine the currency we are deducting
    const sourceCurrency = selectedBank.accountType === 'Crypto Wallet' ? (withdrawCoin || selectedBank.currency || 'USDT') : (selectedBank.currency || 'USD');
    
    // 1. Deduct from Crypto Wallet
    await onAddTransaction({
      id: withdrawTxId + '_out',
      type: 'transfer',
      category: 'Withdrawal/Exchange',
      amount: amt,
      currency: sourceCurrency as any,
      date: new Date().toISOString().split('T')[0],
      notes: `Exchange ${amt} ${selectedBank.currency} @ ${rate}`,
      bankAccountId: selectedBank.id
    });

    // 2. Add to INR Bank
    await onAddTransaction({
      id: withdrawTxId + '_in',
      type: 'transfer',
      category: 'Withdrawal/Exchange',
      amount: inrAmount,
      currency: 'INR',
      date: new Date().toISOString().split('T')[0],
      notes: `Received from ${selectedBank.bankName} Exchange`,
      bankAccountId: withdrawToBankId
    });

    setIsWithdrawModalOpen(false);
    setWithdrawAmount('');
    setWithdrawRate('85');
    setWithdrawCoin('');
    setWithdrawToBankId('');
  };

  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!editingBank) {
      if (accountType === 'Crypto Wallet') setCurrency('USDT');
      else if (accountType === 'Platform Wallet') setCurrency('USD');
      else setCurrency('INR');
    }
  }, [accountType, editingBank]);

  const formatBalance = (bal: number, curr?: string) => {
    if (curr === 'USD') return `$${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (curr === 'USDT') return `${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`;
    return `₹${bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const openAddForm = () => {
    setEditingBank(null);
    setAccountType('Bank');
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setIfscCode('');
    setUpiIdsText('');
    setInitialBalance('');
    setCurrency('INR');
    setIsFormOpen(true);
  };

  const openEditForm = (bank: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from navigating
    setEditingBank(bank);
    setAccountType(bank.accountType || 'Bank');
    setBankName(bank.bankName);
    setAccountName(bank.accountName);
    setAccountNumber(bank.accountNumber || '');
    setIfscCode(bank.ifscCode || '');
    setUpiIdsText(bank.upiIds?.join(', ') || '');
    setInitialBalance(String(bank.initialBalance ?? bank.currentBalance));
    setCurrency(bank.currency || 'INR');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBank(null);
    setAccountType('Bank');
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setIfscCode('');
    setUpiIdsText('');
    setInitialBalance('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = parseFloat(initialBalance);
    if (isNaN(balanceNum)) return;

    const upiArray = upiIdsText.split(',').map(u => u.trim()).filter(Boolean);

    if (editingBank) {
      // Edit mode — only update name/label/accountNumber fields, not balance
      await onEditBankAccount(editingBank.id, {
        accountType,
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        ifscCode: ifscCode.trim() || undefined,
        upiIds: upiArray.length > 0 ? upiArray : undefined,
        currentBalance: balanceNum
      });
    } else {
      // Add mode
      const accPayload: Omit<BankAccount, 'id' | 'userId' | 'currentBalance'> & { cryptoBalances?: Record<string, number> } = {
        accountType,
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        initialBalance: balanceNum,
        currency
      };
      if (accountType === 'Crypto Wallet') {
        accPayload.cryptoBalances = { [currency]: balanceNum };
      }
      if (accountNumber.trim()) {
        accPayload.accountNumber = accountNumber.trim();
      }
      if (ifscCode.trim()) {
        accPayload.ifscCode = ifscCode.trim();
      }
      if (upiArray.length > 0) {
        accPayload.upiIds = upiArray;
      }
      await onAddBankAccount(accPayload);
    }

    closeForm();
  };

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
  
  const handleSyncBalance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedBank) return;
    if (selectedBank.accountType === 'Crypto Wallet') {
       alert("Sync not supported for Crypto Wallets yet.");
       return;
    }
    
    let diff = 0;
    transactions.forEach(t => {
      if (t.bankAccountId === selectedBank.id) {
        if (t.type === 'income' || t.type === 'refund') diff += t.amount;
        else if (t.type === 'expense' || t.type === 'cash_withdrawal' || t.type === 'transfer') diff -= t.amount;
      }
      if (t.toBankAccountId === selectedBank.id && t.type === 'transfer') {
        diff += t.amount;
      }
    });

    const newBalance = Number(selectedBank.initialBalance || 0) + diff;
    await onEditBankAccount(selectedBank.id, { currentBalance: newBalance });
    alert(`Bank balance synced from transactions! New balance: ${formatBalance(newBalance, selectedBank.currency)}`);
  };
  
  const filteredTransactions = React.useMemo(() => {
    let list = transactions.filter(t => t.bankAccountId === selectedBankId || (t.type === 'transfer' && t.toBankAccountId === selectedBankId)).sort((a, b) => b.date.localeCompare(a.date));
    const isSearchingOrFiltering = searchQuery.trim() !== '' || filterType !== 'all' || startDate !== '' || endDate !== '';
    
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.category.toLowerCase().includes(lowerQ) || 
        (t.notes && t.notes.toLowerCase().includes(lowerQ))
      );
    }
    
    if (filterType !== 'all') {
      list = list.filter(t => t.type === filterType);
    }

    if (startDate) {
      list = list.filter(t => t.date >= startDate);
    }
    
    if (endDate) {
      list = list.filter(t => t.date <= endDate);
    }
    
    if (!isSearchingOrFiltering) {
      return list.slice(0, 10);
    }
    
    return list;
  }, [transactions, selectedBankId, searchQuery, filterType, startDate, endDate]);

  return (
    <div className="space-y-4 -mb-12 sm:mb-0">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 px-1 mb-2">
        <p className="text-base sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 sm:gap-2 capitalize whitespace-nowrap">
          <Wallet className="text-slate-800 shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Accounts & Wallets</span>
          <span className="sm:hidden">Accounts</span>
        </p>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs sm:text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span>Journal Ledger</span>
            </button>
          )}
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs sm:text-xs transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span>Add Account</span>
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
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xl relative"
          >
            <button
              onClick={closeForm}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pr-6">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 shrink-0">
                {editingBank ? <><Edit2 size={14} className="text-slate-800" /> Edit Account Profile</> : <><Plus size={14} className="text-slate-800" /> Add New Account/Wallet</>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Bank', 'Crypto Wallet', 'Platform Wallet', 'Cash'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${accountType === type ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">{accountType === 'Bank' ? 'Bank Name' : 'Platform / Name'}</label>
                <input required placeholder={accountType === 'Bank' ? 'e.g. HDFC, SBI' : accountType === 'Crypto Wallet' ? 'e.g. Binance, Trust Wallet' : accountType === 'Platform Wallet' ? 'e.g. Rise, Deel' : 'e.g. Petty Cash'} value={bankName} onChange={e => setBankName(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all " />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Account Label</label>
                <input required placeholder="e.g. Primary Savings" value={accountName} onChange={e => setAccountName(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all " />
              </div>
              {accountType !== 'Cash' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {accountType === 'Bank' ? 'A/C Number (Last 4 digits)' : 
                     accountType === 'Crypto Wallet' ? 'Crypto Address' : 'Platform ID / Rise ID'}
                  </label>
                  <input placeholder={accountType === 'Bank' ? 'e.g. 1234 (Optional)' : accountType === 'Crypto Wallet' ? 'e.g. 0x... (Optional)' : 'e.g. Rise-123 (Optional)'} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all " />
                </div>
              )}
              {accountType === 'Bank' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">IFSC Code</label>
                    <input placeholder="e.g. HDFC0001234 (Optional)" value={ifscCode} onChange={e => setIfscCode(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all " />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 block mb-1">UPI IDs (Comma separated)</label>
                    <input placeholder="e.g. user@upi, 9876543210@paytm" value={upiIdsText} onChange={e => setUpiIdsText(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all " />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">{editingBank ? 'Adjust Current Balance' : 'Initial Balance'} ({currency === 'INR' ? '₹' : currency === 'USD' ? '$' : 'USDT'})</label>
                <input required type="number" step="0.01" placeholder="0.00" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-250 rounded-md focus:outline-hidden bg-white transition-all font-mono" />
              </div>
              {editingBank && (
                <div className="flex items-end md:col-span-2">
                  <p className="text-xs text-slate-500 italic ">Adjusting the current balance here will directly overwrite it to match your real-world bank account.</p>
                </div>
              )}
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full px-4 py-1.5 bg-slate-900 hover:bg-slate-950 text-white font-semibold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                  <Save size={14} /> {editingBank ? 'Save Changes' : 'Save Account'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid of Bank Cards */}
      {!selectedBankId && (
        <div className="space-y-6">
          {bankAccounts.length === 0 ? (
            <div className="py-10 text-center text-slate-500 border border-dashed border-slate-300 rounded-lg">
              <Landmark size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No accounts or wallets added yet.</p>
              <button onClick={openAddForm} className="mt-3 text-slate-900 font-bold text-xs hover:underline cursor-pointer">+ Add your first account</button>
            </div>
          ) : (
            ['Bank', 'Crypto Wallet', 'Platform Wallet', 'Cash'].map(groupType => {
              const groupAccounts = bankAccounts.filter(b => (b.accountType || 'Bank') === groupType);
              if (groupAccounts.length === 0) return null;
              return (
                <div key={groupType}>
                  <h3 className="text-xs font-bold text-slate-500 capitalize mb-3 border-b border-slate-100 pb-1">{groupType}s</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupAccounts.map(b => (
                      <motion.div 
                        whileHover={{ y: -2, scale: 1.01 }}
                        key={b.id} 
                        onClick={() => setSelectedBankId(b.id)}
                        className="bg-white p-5 rounded-lg border border-slate-200/60 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                      >
                        
                        <div className="flex justify-between items-start relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 shadow-inner">
                              {b.accountType === 'Crypto Wallet' ? <TrendingUp size={20} /> : b.accountType === 'Cash' ? <Wallet size={20} /> : <Landmark size={20} />}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-lg leading-tight">{b.bankName}</h4>
                              <p className="text-xs text-slate-500 font-medium">{b.accountName} {b.accountNumber ? `(..${b.accountNumber})` : ''}</p>
                              {b.upiIds && b.upiIds.length > 0 && (
                                <p className="text-xs text-slate-400 mt-1 truncate max-w-[150px]">UPI: {b.upiIds[0]}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => openEditForm(b, e)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit profile"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100/80 flex justify-between items-end relative z-10">
                          <div>
                            <p className="text-xs capitalize font-bold text-slate-400 ">Current Balance</p>
                            {b.accountType === 'Crypto Wallet' && b.cryptoBalances ? (
                              <div className="mt-1 flex flex-col gap-0.5">
                                {Object.entries(b.cryptoBalances).map(([coin, amount]) => (
                                  <p key={coin} className="text-lg font-black text-slate-900 font-mono tracking-tight leading-none">{amount.toLocaleString()} <span className="text-xs font-bold text-slate-500">{coin}</span></p>
                                ))}
                                {Object.keys(b.cryptoBalances).length === 0 && <p className="text-lg font-black text-slate-900 font-mono tracking-tight leading-none">0 <span className="text-xs font-bold text-slate-500">Coins</span></p>}
                              </div>
                            ) : (
                              <p className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-0.5">{formatBalance(b.currentBalance, b.currency)}</p>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Specific Bank History View */}
      {selectedBankId && selectedBank && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-2 sm:mb-0"
        >
          {/* App-like Card Header */}
          <div className="bg-slate-900 px-3 py-3 sm:px-3 sm:py-4 text-white flex flex-col justify-between gap-3 sm:gap-4 rounded-xl mx-0.5 my-1 sm:mx-0.5 sm:my-1.5 shadow-lg relative overflow-hidden">
            {/* Background design */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl -ml-5 -mb-5 pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 capitalize mb-1">{selectedBank.bankName}</p>
                <h3 className="text-lg font-bold text-white mb-4 leading-tight">{selectedBank.accountName}</h3>
              </div>
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm shrink-0 border border-white/5 shadow-xs">
                {selectedBank.accountType === 'Crypto Wallet' ? <TrendingUp size={20} className="text-white" /> : selectedBank.accountType === 'Cash' ? <Wallet size={20} className="text-white" /> : <Landmark size={20} className="text-white" />}
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400 capitalize mb-0.5">Available Balance</p>
                  {selectedBank.accountType === 'Crypto Wallet' && selectedBank.cryptoBalances ? (
                    <div className="flex flex-col gap-1">
                      {Object.entries(selectedBank.cryptoBalances).map(([coin, amount]) => (
                        <p key={coin} className="text-3xl font-mono font-black tracking-tight leading-none drop-shadow-sm">{amount.toLocaleString()} <span className="text-xs text-slate-300">{coin}</span></p>
                      ))}
                      {Object.keys(selectedBank.cryptoBalances).length === 0 && <p className="text-3xl font-mono font-black tracking-tight leading-none drop-shadow-sm">0</p>}
                    </div>
                  ) : (
                    <p className="text-3xl font-mono font-black tracking-tight drop-shadow-sm">{formatBalance(selectedBank.currentBalance, selectedBank.currency)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="">
            {/* Search and Filter Controls */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white p-3 sm:p-4 rounded-lg border border-slate-200/60 shadow-sm mx-1 mb-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <span className="font-bold text-slate-800 text-xs ">Filter Transactions</span>
                    <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                      {filteredTransactions.length} results
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400"><Search size={14} /></span>
                      <input 
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-hidden placeholder:text-slate-400"
                      />
                    </div>
                    
                    <div>
                      <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-hidden appearance-none cursor-pointer"
                      >
                        <option value="all">All Transactions</option>
                        <option value="income">Credits Only</option>
                        <option value="expense">Debits Only</option>
                      </select>
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-hidden text-slate-700 cursor-pointer"
                        title="Start Date"
                      />
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-xl font-mono focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-hidden text-slate-700 cursor-pointer"
                        title="End Date"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transactions List */}
            <div className="mx-1 mt-3">
              <div className="flex flex-wrap items-center justify-between mb-3 ml-2 mr-1 gap-2">
                <h4 className="text-sm font-bold text-slate-700 capitalize ">Recent History</h4>
                <div className="flex items-center gap-1.5 flex-wrap">

                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all border ${
                      showFilters
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Filter size={12} /> Filters
                  </button>
                  {((selectedBank.currency === 'USD' || selectedBank.currency === 'USDT') || selectedBank.accountType === 'Crypto Wallet') && onAddTransaction && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsWithdrawModalOpen(true); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer font-bold text-xs border border-indigo-100"
                      title="Withdraw / Exchange"
                    >
                      <ArrowDownRight size={12} /> <span className="hidden sm:inline">Withdraw</span>
                    </button>
                  )}
                  <button
                    onClick={handleSyncBalance}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer font-bold text-xs"
                    title="Recalculate balance from transactions"
                  >
                    <RefreshCcw size={12} /> <span className="hidden sm:inline">Sync</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditForm(selectedBank, e as any);
                      setSelectedBankId(null);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer font-bold text-xs"
                    title="Edit Profile"
                  >
                    <Edit2 size={12} /> <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this bank profile? Transactions will not be deleted but will lose linkage.')) {
                        await onDeleteBankAccount(selectedBank.id);
                        setSelectedBankId(null);
                      }
                    }}
                    className="flex items-center justify-center p-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                    title="Remove Profile"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {filteredTransactions.length === 0 ? (
                <div className="py-8 text-center bg-white rounded-xl shadow-xs border border-slate-100">
                  <p className="text-slate-400 text-sm font-medium">No transactions found.</p>
                </div>
              ) : (
                <div className="overflow-hidden divide-y divide-slate-100/80 max-h-[50vh] overflow-y-auto bg-white rounded-xl shadow-xs border border-slate-100">
                  {filteredTransactions.map(t => {
                    const isCredit = t.type === 'income' || t.type === 'refund' || (t.type === 'transfer' && t.toBankAccountId === selectedBankId);
                    
                    return (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={t.id} 
                      className="p-3.5 sm:p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group cursor-default"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                          {isCredit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            {t.category} 
                            {t.type === 'transfer' && <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold capitalize border border-indigo-100">Transfer</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[220px] md:max-w-sm mt-0.5">{t.notes || 'No description'}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono font-bold text-sm sm:text-base ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {isCredit ? '+' : '-'}₹{t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">{t.date}</p>
                      </div>
                    </motion.div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Withdraw Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && selectedBank && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 ">Withdraw / Exchange</h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
              </div>
              <form onSubmit={handleWithdrawSubmit} className="p-4 space-y-4">
                {selectedBank.accountType === 'Crypto Wallet' && selectedBank.cryptoBalances && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Select Coin</label>
                    <select required value={withdrawCoin} onChange={e => setWithdrawCoin(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
                      <option value="">-- Choose Coin --</option>
                      {Object.keys(selectedBank.cryptoBalances).map(coin => (
                        <option key={coin} value={coin}>{coin} (Available: {selectedBank.cryptoBalances![coin]})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Amount ({selectedBank.accountType === 'Crypto Wallet' && withdrawCoin ? withdrawCoin : selectedBank.currency})</label>
                  <input required type="number" step="0.01" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500" placeholder={`Max ${selectedBank.accountType === 'Crypto Wallet' ? (selectedBank.cryptoBalances?.[withdrawCoin] ?? 0) : selectedBank.currentBalance}`} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Exchange Rate (1 {selectedBank.accountType === 'Crypto Wallet' && withdrawCoin ? withdrawCoin : selectedBank.currency} = ? INR)</label>
                  <input required type="number" step="0.01" value={withdrawRate} onChange={e => setWithdrawRate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 capitalize mb-1">Transfer to Bank Account</label>
                  <select required value={withdrawToBankId} onChange={e => setWithdrawToBankId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500">
                    <option value="">-- Choose Indian Bank --</option>
                    {bankAccounts.filter(b => b.currency === 'INR' || !b.currency).map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                    ))}
                  </select>
                </div>
                {withdrawAmount && withdrawRate && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-bold border border-emerald-200">
                    You will receive: ₹{(parseFloat(withdrawAmount) * parseFloat(withdrawRate)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </div>
                )}
                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2 rounded-lg hover:bg-slate-800 transition-colors">Confirm Withdrawal</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
