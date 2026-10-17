import { createClient } from './supabase/client';
import { FinanceItem, InvestmentAsset, CompoundInterestAccount, Currency, CoupleUser } from '@/types';

// Default KKTC MB Official Rates (Base: TRY)
export const DEFAULT_KKTC_RATES: Record<Currency, number> = {
  TRY: 1.0,
  USD: 49.4463, // 1 USD = 49.4463 TRY
  GBP: 66.0056, // 1 GBP = 66.0056 TRY
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  GBP: '£',
};

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number> = DEFAULT_KKTC_RATES
): number {
  if (from === to) return amount;
  // Convert from -> TRY -> to
  const amountInTRY = from === 'TRY' ? amount : amount * (rates[from] || DEFAULT_KKTC_RATES[from]);
  const finalAmount = to === 'TRY' ? amountInTRY : amountInTRY / (rates[to] || DEFAULT_KKTC_RATES[to]);
  return finalAmount;
}

export const INITIAL_TRANSACTIONS: FinanceItem[] = [
  {
    id: 'f-1',
    type: 'income',
    title: 'Berk Maaş / Gelir',
    amount: 155000,
    currency: 'TRY',
    category: 'Maaş',
    user: 'berk',
    date: '2026-10-01',
    recurring: true,
  },
  {
    id: 'f-2',
    type: 'income',
    title: 'Jaquilyn Gelir',
    amount: 2200,
    currency: 'USD',
    category: 'Maaş',
    user: 'jaquilyn',
    date: '2026-10-01',
    recurring: true,
  },
  {
    id: 'f-3',
    type: 'expense',
    title: 'Kira & Ortak Ev Masrafı',
    amount: 45000,
    currency: 'TRY',
    category: 'Ev & Yaşam',
    user: 'shared',
    date: '2026-10-05',
    recurring: true,
  },
  {
    id: 'f-4',
    type: 'expense',
    title: 'Market & Haftalık Mutfak',
    amount: 12500,
    currency: 'TRY',
    category: 'Market & Yemek',
    user: 'shared',
    date: '2026-10-10',
    recurring: false,
  },
  {
    id: 'f-5',
    type: 'investment',
    title: 'Fiziki Altın & Birikim Alımı',
    amount: 30000,
    currency: 'TRY',
    category: 'Yatırım',
    user: 'shared',
    date: '2026-10-08',
    recurring: true,
  },
];

export const INITIAL_ASSETS: InvestmentAsset[] = [
  {
    id: 'a-1',
    name: 'Fiziki Altın Birikimi',
    category: 'gold',
    current_value: 650000,
    currency: 'TRY',
    target_value: 1200000,
    monthly_contribution: 25000,
  },
  {
    id: 'a-2',
    name: 'Bileşik Faizli Vadeli Hesap (TRY)',
    category: 'cash_savings',
    current_value: 400000,
    currency: 'TRY',
    target_value: 1000000,
    monthly_contribution: 20000,
  },
  {
    id: 'a-3',
    name: 'Sterlin Birikim Fonu (GBP)',
    category: 'cash_savings',
    current_value: 8500,
    currency: 'GBP',
    target_value: 20000,
    monthly_contribution: 400,
  },
  {
    id: 'a-4',
    name: 'Dolar & Endeks Yatırımları (USD)',
    category: 'stocks',
    current_value: 14000,
    currency: 'USD',
    target_value: 35000,
    monthly_contribution: 500,
  },
];

export const INITIAL_COMPOUND_ACCOUNTS: CompoundInterestAccount[] = [
  {
    id: 'c-1',
    name: 'TRY Yüksek Getirili Vadeli Hesap',
    principal: 350000,
    currency: 'TRY',
    annualRate: 46, // %46 yıllık
    compoundingFrequency: 'monthly',
    startDate: '2026-03-01',
    withholdingTax: 10, // %10 stopaj
    note: 'Faiz her ay anaparaya eklenerek bileşik büyüyor',
  },
  {
    id: 'c-2',
    name: 'İngiliz Sterlini (GBP) Vadeli Fon',
    principal: 6000,
    currency: 'GBP',
    annualRate: 5.5, // %5.5
    compoundingFrequency: 'monthly',
    startDate: '2026-04-15',
    withholdingTax: 0,
    note: 'KKTC bankası döviz mevduatı',
  },
];

export interface MonthlyTrajectoryPoint {
  month: number;
  label: string;
  startingBalance: number;
  monthlyInterest: number;
  endingBalance: number;
  cumulativeInterest: number;
}

export function calculate12MonthTrajectory(account: CompoundInterestAccount): {
  points: MonthlyTrajectoryPoint[];
  finalBalance: number;
  totalInterestEarned: number;
  monthlyAveragePassiveIncome: number;
  effectiveAnnualYield: number;
} {
  const points: MonthlyTrajectoryPoint[] = [];
  let currentBalance = account.principal;
  let totalInterest = 0;

  // Monthly nominal rate after tax
  const nominalAnnual = account.annualRate / 100;
  const taxMultiplier = 1 - (account.withholdingTax || 0) / 100;
  const monthlyRate = (nominalAnnual / 12) * taxMultiplier;

  for (let m = 1; m <= 12; m++) {
    const interest = currentBalance * monthlyRate;
    const start = currentBalance;
    currentBalance += interest;
    totalInterest += interest;

    points.push({
      month: m,
      label: `${m}. Ay`,
      startingBalance: start,
      monthlyInterest: interest,
      endingBalance: currentBalance,
      cumulativeInterest: totalInterest,
    });
  }

  const effectiveYield = ((currentBalance - account.principal) / account.principal) * 100;

  return {
    points,
    finalBalance: currentBalance,
    totalInterestEarned: totalInterest,
    monthlyAveragePassiveIncome: totalInterest / 12,
    effectiveAnnualYield: effectiveYield,
  };
}

export async function fetchFinanceData(): Promise<{
  transactions: FinanceItem[];
  assets: InvestmentAsset[];
  compoundAccounts: CompoundInterestAccount[];
}> {
  try {
    const supabase = createClient();
    const [txRes, assetRes] = await Promise.all([
      supabase.from('finance_items').select('*').order('date', { ascending: false }),
      supabase.from('investment_assets').select('*'),
    ]);

    const tx = txRes.data && txRes.data.length > 0 ? (txRes.data as FinanceItem[]) : getLocalTransactions();
    const assets = assetRes.data && assetRes.data.length > 0 ? (assetRes.data as InvestmentAsset[]) : getLocalAssets();
    const compoundAccounts = getLocalCompoundAccounts();

    return { transactions: tx, assets, compoundAccounts };
  } catch {
    return {
      transactions: getLocalTransactions(),
      assets: getLocalAssets(),
      compoundAccounts: getLocalCompoundAccounts(),
    };
  }
}

function getLocalTransactions(): FinanceItem[] {
  try {
    const local = localStorage.getItem('berlyn_finance_tx');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

function getLocalAssets(): InvestmentAsset[] {
  try {
    const local = localStorage.getItem('berlyn_finance_assets');
    return local ? JSON.parse(local) : INITIAL_ASSETS;
  } catch {
    return INITIAL_ASSETS;
  }
}

export function getLocalCompoundAccounts(): CompoundInterestAccount[] {
  try {
    const local = localStorage.getItem('berlyn_compound_accounts');
    return local ? JSON.parse(local) : INITIAL_COMPOUND_ACCOUNTS;
  } catch {
    return INITIAL_COMPOUND_ACCOUNTS;
  }
}

export function saveCompoundAccount(account: CompoundInterestAccount): CompoundInterestAccount[] {
  try {
    const accounts = getLocalCompoundAccounts();
    const idx = accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      accounts[idx] = account;
    } else {
      accounts.unshift(account);
    }
    localStorage.setItem('berlyn_compound_accounts', JSON.stringify(accounts));
    return accounts;
  } catch {
    return [account];
  }
}

export async function saveTransaction(item: Partial<FinanceItem>): Promise<FinanceItem> {
  const newItem: FinanceItem = {
    id: item.id || `f-${Date.now()}`,
    type: item.type || 'expense',
    title: item.title || 'Masraf',
    amount: Number(item.amount) || 0,
    currency: item.currency || 'TRY',
    category: item.category || 'Genel',
    user: item.user || 'shared',
    date: item.date || new Date().toISOString().split('T')[0],
    recurring: Boolean(item.recurring),
  };

  try {
    const supabase = createClient();
    await supabase.from('finance_items').upsert(newItem);
  } catch {
    // fallback
  }

  try {
    const current = getLocalTransactions();
    const updated = [newItem, ...current.filter((i) => i.id !== newItem.id)];
    localStorage.setItem('berlyn_finance_tx', JSON.stringify(updated));
  } catch {
    // ignore
  }

  return newItem;
}
