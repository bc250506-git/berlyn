import { createClient } from './supabase/client';
import { 
  FinanceItem, 
  InvestmentAsset, 
  CompoundInterestAccount, 
  RecurringPayment,
  Currency, 
  CoupleUser,
  FinancePayer 
} from '@/types';

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
  if (from === to || !amount) return amount || 0;
  const amountInTRY = from === 'TRY' ? amount : amount * (rates[from] || DEFAULT_KKTC_RATES[from]);
  const finalAmount = to === 'TRY' ? amountInTRY : amountInTRY / (rates[to] || DEFAULT_KKTC_RATES[to]);
  return finalAmount;
}

export const INITIAL_TRANSACTIONS: FinanceItem[] = [];

export const INITIAL_RECURRING_PAYMENTS: RecurringPayment[] = [];

export const INITIAL_ASSETS: InvestmentAsset[] = [];

export const INITIAL_COMPOUND_ACCOUNTS: CompoundInterestAccount[] = [];

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
      label: `Month ${m}`,
      startingBalance: start,
      monthlyInterest: interest,
      endingBalance: currentBalance,
      cumulativeInterest: totalInterest,
    });
  }

  const effectiveYield = account.principal > 0
    ? ((currentBalance - account.principal) / account.principal) * 100
    : 0;

  return {
    points,
    finalBalance: currentBalance,
    totalInterestEarned: totalInterest,
    monthlyAveragePassiveIncome: totalInterest / 12,
    effectiveAnnualYield: effectiveYield,
  };
}

export function calculateTotalMonthlyInterestTRY(
  accounts: CompoundInterestAccount[],
  rates: Record<Currency, number> = DEFAULT_KKTC_RATES,
  targetYearMonth?: string // YYYY-MM
): number {
  return accounts.reduce((sum, acc) => {
    // If target month is given, do not count accounts that haven't started yet!
    if (targetYearMonth && acc.startDate) {
      const accMonth = acc.startDate.slice(0, 7);
      if (accMonth > targetYearMonth) {
        return sum;
      }
    }
    const traj = calculate12MonthTrajectory(acc);
    const inTRY = convertCurrency(traj.monthlyAveragePassiveIncome, acc.currency, 'TRY', rates);
    return sum + inTRY;
  }, 0);
}

export async function fetchFinanceData(): Promise<{
  transactions: FinanceItem[];
  recurringPayments: RecurringPayment[];
  assets: InvestmentAsset[];
  compoundAccounts: CompoundInterestAccount[];
}> {
  try {
    const tx = getLocalTransactions();
    const recurringPayments = getLocalRecurringPayments();
    const assets = getLocalAssets();
    const compoundAccounts = getLocalCompoundAccounts();

    return { transactions: tx, recurringPayments, assets, compoundAccounts };
  } catch {
    return {
      transactions: getLocalTransactions(),
      recurringPayments: getLocalRecurringPayments(),
      assets: getLocalAssets(),
      compoundAccounts: getLocalCompoundAccounts(),
    };
  }
}

export function getLocalTransactions(): FinanceItem[] {
  try {
    const local = localStorage.getItem('berlyn_finance_tx');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function getLocalRecurringPayments(): RecurringPayment[] {
  try {
    const local = localStorage.getItem('berlyn_finance_recurring');
    return local ? JSON.parse(local) : INITIAL_RECURRING_PAYMENTS;
  } catch {
    return INITIAL_RECURRING_PAYMENTS;
  }
}

export function saveRecurringPayment(item: RecurringPayment): RecurringPayment[] {
  try {
    const current = getLocalRecurringPayments();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: RecurringPayment[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem('berlyn_finance_recurring', JSON.stringify(updated));
    return updated;
  } catch {
    return [item];
  }
}

export function deleteRecurringPayment(id: string): RecurringPayment[] {
  try {
    const updated = getLocalRecurringPayments().filter((i) => i.id !== id);
    localStorage.setItem('berlyn_finance_recurring', JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getLocalAssets(): InvestmentAsset[] {
  try {
    const local = localStorage.getItem('berlyn_finance_assets');
    return local ? JSON.parse(local) : INITIAL_ASSETS;
  } catch {
    return INITIAL_ASSETS;
  }
}

export function saveAsset(asset: InvestmentAsset): InvestmentAsset[] {
  try {
    const assets = getLocalAssets();
    const idx = assets.findIndex((a) => a.id === asset.id);
    if (idx >= 0) {
      assets[idx] = asset;
    } else {
      assets.unshift(asset);
    }
    localStorage.setItem('berlyn_finance_assets', JSON.stringify(assets));
    return assets;
  } catch {
    return [asset];
  }
}

export function deleteAsset(id: string): InvestmentAsset[] {
  try {
    const assets = getLocalAssets().filter((a) => a.id !== id);
    localStorage.setItem('berlyn_finance_assets', JSON.stringify(assets));
    return assets;
  } catch {
    return [];
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

export function deleteCompoundAccount(id: string): CompoundInterestAccount[] {
  try {
    const accounts = getLocalCompoundAccounts().filter((a) => a.id !== id);
    localStorage.setItem('berlyn_compound_accounts', JSON.stringify(accounts));
    return accounts;
  } catch {
    return [];
  }
}

export async function saveTransaction(item: Partial<FinanceItem>): Promise<FinanceItem> {
  const newItem: FinanceItem = {
    id: item.id || `f-${Date.now()}`,
    type: item.type || 'expense',
    title: item.title || 'Transaction',
    amount: Number(item.amount) || 0,
    currency: item.currency || 'TRY',
    category: item.category || 'General',
    user: item.user || 'shared',
    date: item.date || new Date().toISOString().split('T')[0],
    recurring: Boolean(item.recurring),
    isInterest: Boolean(item.isInterest),
    compoundAccountId: item.compoundAccountId,
  };

  try {
    const current = getLocalTransactions();
    const idx = current.findIndex((i) => i.id === newItem.id);
    let updated: FinanceItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = newItem;
    } else {
      updated = [newItem, ...current];
    }
    localStorage.setItem('berlyn_finance_tx', JSON.stringify(updated));
  } catch {
    // ignore
  }

  return newItem;
}

export function deleteTransaction(id: string): FinanceItem[] {
  try {
    const current = getLocalTransactions().filter((i) => i.id !== id);
    localStorage.setItem('berlyn_finance_tx', JSON.stringify(current));
    return current;
  } catch {
    return [];
  }
}

export function ensureMonthlyInterestTransactions(
  transactions: FinanceItem[],
  compoundAccounts: CompoundInterestAccount[],
  targetMonthTag: string
): FinanceItem[] {
  let updated = [...transactions];
  let changed = false;

  compoundAccounts.forEach((acc) => {
    if (!acc.startDate || acc.startDate.slice(0, 7) > targetMonthTag) return;

    // Check if an interest transaction already exists for this account in this target month
    const existing = updated.find(
      (t) => (t.compoundAccountId === acc.id || t.title.includes(acc.name)) &&
             t.date?.startsWith(targetMonthTag)
    );

    if (!existing) {
      const grossMonthly = (acc.principal * (acc.annualRate / 100)) / 12;
      const netMonthly = Math.round(grossMonthly * (1 - (acc.withholdingTax || 0) / 100));
      if (netMonthly > 0) {
        const dayStr = acc.startDate.split('-')[2] || '01';
        const newInterestTx: FinanceItem = {
          id: `interest-${acc.id}-${targetMonthTag}`,
          type: 'income',
          title: `Interest Yield: ${acc.name}`,
          amount: netMonthly,
          currency: acc.currency,
          category: 'Passive Income',
          user: 'shared',
          date: `${targetMonthTag}-${dayStr}`,
          isInterest: true,
          compoundAccountId: acc.id,
        };
        updated.push(newInterestTx);
        changed = true;
      }
    }
  });

  if (changed && typeof window !== 'undefined') {
    try {
      localStorage.setItem('berlyn_finance_tx', JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  return changed ? updated : transactions;
}

