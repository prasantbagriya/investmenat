export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer' | 'cash_withdrawal' | 'refund';
  category: string;
  amount: number;
  currency?: 'INR' | 'USD' | 'USDT';
  exchangeRate?: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  bankAccountId?: string; // Links transaction to a specific bank account profile
  toBankAccountId?: string; // For transfers
  createdAt?: any;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountType?: 'Bank' | 'Crypto Wallet' | 'Platform Wallet' | 'Cash'; 
  bankName: string; // e.g. HDFC, Binance, Rise, Cash
  accountName: string; // e.g. Savings, USDT Wallet, Main
  accountNumber?: string; // Optional last 4 digits
  ifscCode?: string;
  upiIds?: string[]; // E.g. user@okhdfcbank
  cards?: { id: string; type: 'debit' | 'credit'; name: string; last4: string; expiry: string }[];
  initialBalance: number;
  currentBalance: number;
  currency?: string; // Relaxed to allow 'BTC', 'ETH' in transactions, though usually 'INR'/'USD'/'USDT' for the main bank
  cryptoBalances?: Record<string, number>; // Maps 'BTC' -> 0.05, 'USDT' -> 1000, etc.
  createdAt?: any;
}

export interface PendingPayment {
  id: string;
  userId: string;
  type: 'owe' | 'owed'; // owe = user owes money to person, owed = person owes money to user
  person: string;
  contactResourceName?: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  notified?: boolean;
  notes?: string;
  createdAt?: any;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentSavings: number;
  deadline: string; // YYYY-MM-DD
  createdAt?: any;
}

export interface BudgetLimit {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  month: string; // YYYY-MM
  createdAt?: any;
}

export interface RecurringBill {
  id: string;
  userId: string;
  type?: 'income' | 'expense'; // Optional for backwards compatibility
  title: string;
  amount: number;
  category: string;
  nextDueDate: string; // YYYY-MM-DD
  frequency: 'monthly' | 'yearly';
  notified?: boolean;
  bankAccountId?: string;
  createdAt?: any;
}

export interface ScheduledTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: any; // Firestore Timestamp
  status: 'pending' | 'completed';
  notified: boolean;
  emailSent?: boolean;
  googleTaskId?: string;
  googleCalendarEventId?: string;
  syncedToCalendar?: boolean;
  syncedToTasks?: boolean;
  createdAt?: any;
}

export interface UserSettings {
  id: string; // userId
  pin?: string; // 4-digit PIN lock
  darkMode?: boolean;
  smartApiAppName?: string;
  smartApiRedirectUrl?: string;
  smartApiPostbackUrl?: string;
  smartApiPrimaryIp?: string;
  smartApiSecondaryIp?: string;
  smartApiKey?: string;
  smartApiClientId?: string;
  smartApiTotpSecret?: string;
  smartApiIsActive?: boolean;
  googleSpreadsheetId?: string;
  googleSpreadsheetName?: string;
  investmentCashBalance?: number;
  realizedPnL?: number;
  binanceApiKey?: string;
  binanceApiSecret?: string;
  binanceIsActive?: boolean;
  taxGrossSalary?: number;
  tax80cDeclarations?: Tax80CDeclaration[];
  integrations?: Record<string, boolean>;
  researchTerminal?: {
    tvNativeWatchlist?: any[];
    tvChartSymbolsV3?: any[];
    lastInstrumentKey?: string;
    lastInputKey?: string;
  };
}

export interface Tax80CDeclaration {
  id: string;
  category: 'ELSS' | 'PPF' | 'NPS' | 'LIC' | 'Tax-FD' | 'Others' | string; // Allow string fallback
  amount: number;
  note?: string;
}

export interface Holding {
  id: string;
  userId: string;
  type: 'stock' | 'mf' | 'crypto';
  symbol?: string; // stocks (e.g., RELIANCE)
  name?: string; // name
  buyPrice: number; // buy price (NAV or stock price)
  quantity: number; // quantity (shares or units)
  buyDate: string; // YYYY-MM-DD
  assetClass: 'Equity' | 'Debt' | 'Gold' | 'Cash' | 'Options' | 'F&O' | 'Intraday' | 'Crypto';
  broker?: string; // Zerodha, Groww, Upstox, etc.
  schemeCode?: string; // MF Scheme Code (e.g., 102885)
  isAutoSynced?: boolean; // Flag to indicate if this holding is auto-synced from a broker
  createdAt?: any;
}

export interface Sip {
  id: string;
  userId: string;
  name: string;
  amount: number;
  startDate: string; // YYYY-MM-DD
  sipDate: number; // 1-28
  assetClass: 'Equity' | 'Debt' | 'Gold' | 'Cash' | 'Crypto';
  broker?: string;
  createdAt?: any;
}

export interface Fd {
  id: string;
  userId: string;
  bankName: string;
  principal: number;
  interestRate: number; // % per annum, e.g. 7.15
  tenure: number; // month duration
  startDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  isRd?: boolean;
  notes?: string;
  createdAt?: any;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  type: 'stock' | 'mf' | 'crypto';
  symbol?: string; // stock symbol e.g. TCS
  name?: string; // stock or MF name
  schemeCode?: string; // MF scheme ID
}

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Dining Out',
  'Transportation',
  'Entertainment',
  'Health & Fitness',
  'Shopping',
  'Education',
  'Insurance',
  'Others'
] as const;

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments',
  'Gifts',
  'Refunds',
  'Other Income'
] as const;

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
export type IncomeCategory = typeof INCOME_CATEGORIES[number];

export interface RealizedTrade {
  id: string;
  userId: string;
  type: 'stock' | 'mf' | 'crypto';
  symbol?: string;
  name?: string;
  buyPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  exitDate: string; // YYYY-MM-DD
  createdAt?: any;
}

export interface CreditCardBill {
  id: string;
  userId: string;
  cardName: string;
  bank: string;
  amount: number;
  dueEmi?: number;
  penalty?: number;
  annualCharges?: number;
  dueDate: string; // YYYY-MM-DD
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
  bankAccountId?: string;
  createdAt?: any;
}

export interface EmiPaymentLog {
  id: string;
  date: string; // YYYY-MM-DDTHH:mm:ss.sssZ
  amount: number;
  bankAccountId?: string;
  notes?: string;
}

export interface EmiItem {
  id: string;
  userId: string;
  itemName: string;
  loanNumber?: string;
  loanType?: 'Home Loan' | 'Car Loan' | 'Personal Loan' | 'Education Loan' | 'Consumer Goods' | 'Other';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  totalAmount: number;
  penalty?: number;
  otherCharges?: number;
  emiAmount: number;
  totalMonths: number;
  paidMonths: number;
  startDate: string; // YYYY-MM-DD
  bank?: string;
  notes?: string;
  bankAccountId?: string;
  paymentHistory?: EmiPaymentLog[];
  createdAt?: any;
}

export interface PhysicalAsset {
  id: string;
  userId: string;
  name: string;
  type: 'Real Estate' | 'Gold' | 'Vehicle' | 'Jewellery' | 'Electronics' | 'Other' | string;
  purchasePrice: number;
  purchaseDate: string; // YYYY-MM-DD
  currentValue: number;
  notes?: string;
  createdAt?: any;
}

export interface LedgerProfile {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  netBalance: number; // positive = they owe you (You gave), negative = you owe them (You got)
  createdAt?: any;
}

export interface LedgerTransaction {
  id: string;
  ledgerId: string; // references LedgerProfile.id
  userId: string;
  amount: number;
  type: 'gave' | 'got'; // gave = money out from you to them, got = money in from them to you
  date: string; // YYYY-MM-DD
  notes?: string;
  memo?: string;
  paymentMethod?: string; // 'cash' or BankAccount.id
  linkedGlobalTxId?: string; // ID of the linked global Transaction
  createdAt?: any;
}

export interface PropFirmChallenge {
  id: string;
  userId: string;
  firmName: string;
  accountSize: number;
  cost: number;
  activationFee?: number;
  isGiveaway?: boolean;
  phase: 'Phase 1' | 'Phase 2' | 'Phase 3' | 'Instant Funded' | 'Funded' | 'Failed';
  purchaseDate: string; // YYYY-MM-DD
  platform?: string; // MT4, MT5, cTrader
  maxDrawdownLimit?: number;
  dailyLossLimit?: number;
  profitTarget?: number;
  payoutFrequency?: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'On-Demand';
  nextPayoutDate?: string; // YYYY-MM-DD
  statusUpdatedAt?: string; // YYYY-MM-DD
  notes?: string;
  createdAt?: any;
}

export interface PropFirmAccount {
  id: string;
  userId: string;
  firmName: string;
  accountName: string;
  accountNumber?: string;
  accountSize: number;
  status: 'Active' | 'Breached' | 'Passed';
  currentBalance: number;
  maxDrawdownLimit: number;
  dailyLossLimit: number;
  profitTarget?: number;
  payoutFrequency?: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'On-Demand';
  nextPayoutDate?: string; // YYYY-MM-DD
  statusUpdatedAt?: string; // YYYY-MM-DD
  challengeId?: string;
  createdAt?: any;
}

export interface PropFirmPayout {
  id: string;
  userId: string;
  accountId?: string;
  firmName: string;
  amount: number; // usually in USD
  payoutMethod?: 'Rise' | 'Deel' | 'Crypto' | 'Direct Bank' | 'Wallet' | 'Other';
  cryptoCurrency?: 'USDT' | 'BTC' | 'ETH' | 'Other';
  exchangeRate?: number;
  finalAmountINR?: number;
  transferredTo?: 'Bank' | 'Cash' | 'Wallet' | 'None';
  bankAccountId?: string;
  transactionId?: string;
  payoutDate: string; // YYYY-MM-DD
  status: 'Requested' | 'Processing' | 'Paid';
  certificateUrl?: string;
  emailProofUrl?: string;
  notes?: string;
  createdAt?: any;
}
