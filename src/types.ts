export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'transfer' | 'cash_withdrawal';
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  bankAccountId?: string; // Links transaction to a specific bank account profile
  toBankAccountId?: string; // For transfers
  createdAt?: any;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string; // e.g. HDFC, SBI, Paytm
  accountName: string; // e.g. Savings, Salary
  accountNumber?: string; // Optional last 4 digits
  ifscCode?: string;
  upiIds?: string[]; // E.g. user@okhdfcbank
  cards?: { id: string; type: 'debit' | 'credit'; name: string; last4: string; expiry: string }[];
  initialBalance: number;
  currentBalance: number;
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
}

export interface Holding {
  id: string;
  userId: string;
  type: 'stock' | 'mf';
  symbol?: string; // stocks (e.g., RELIANCE)
  name?: string; // name
  buyPrice: number; // buy price (NAV or stock price)
  quantity: number; // quantity (shares or units)
  buyDate: string; // YYYY-MM-DD
  assetClass: 'Equity' | 'Debt' | 'Gold' | 'Cash' | 'Options' | 'F&O' | 'Intraday';
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
  assetClass: 'Equity' | 'Debt' | 'Gold' | 'Cash';
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
  type: 'stock' | 'mf';
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
  type: 'stock' | 'mf';
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
  dueDate: string; // YYYY-MM-DD
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
  createdAt?: any;
}

export interface EmiItem {
  id: string;
  userId: string;
  itemName: string;
  totalAmount: number;
  emiAmount: number;
  totalMonths: number;
  paidMonths: number;
  startDate: string; // YYYY-MM-DD
  bank?: string;
  notes?: string;
  createdAt?: any;
}

export interface PhysicalAsset {
  id: string;
  userId: string;
  name: string;
  type: 'Real Estate' | 'Gold' | 'Vehicle' | 'Jewellery' | 'Electronics' | 'Other';
  purchasePrice: number;
  purchaseDate: string; // YYYY-MM-DD
  currentValue: number;
  notes?: string;
  createdAt?: any;
}

