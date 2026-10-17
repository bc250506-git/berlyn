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

/**
 * In banking and compound interest deposits, interest accrues over the 1-month term
 * and is paid out at maturity (exactly 1 month after startDate).
 * E.g. If startDate is 2026-10-14, the 1st interest payout date is 2026-11-14.
 */
export function getFirstInterestPayoutDate(startDateStr?: string): string {
  if (!startDateStr) return '';
  const parts = startDateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return startDateStr;
  }
  const y = parts[0];
  const m = parts[1]; // 1-12
  const d = parts[2]; // 1-31

  let nextY = y;
  let nextM = m + 1;
  if (nextM > 12) {
    nextY += 1;
    nextM = 1;
  }
  const daysInNextMonth = new Date(nextY, nextM, 0).getDate();
  const nextD = Math.min(d, daysInNextMonth);

  const mm = String(nextM).padStart(2, '0');
  const dd = String(nextD).padStart(2, '0');
  return `${nextY}-${mm}-${dd}`;
}

export function getFirstInterestPayoutMonthTag(startDateStr?: string): string {
  const payoutDate = getFirstInterestPayoutDate(startDateStr);
  return payoutDate ? payoutDate.slice(0, 7) : '';
}

export function calculateTotalMonthlyInterestTRY(
  accounts: CompoundInterestAccount[],
  rates: Record<Currency, number> = DEFAULT_KKTC_RATES,
  targetYearMonth?: string // YYYY-MM
): number {
  return accounts.reduce((sum, acc) => {
    // In banking, a 1-month compound deposit pays out 1 month after start date!
    // E.g. Started 2026-10-14 -> 1st payout is 2026-11-14. No payout in 2026-10.
    if (targetYearMonth && acc.startDate) {
      const firstPayoutMonth = getFirstInterestPayoutMonthTag(acc.startDate);
      if (firstPayoutMonth && firstPayoutMonth > targetYearMonth) {
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
    if (!local) return [];
    const parsed = JSON.parse(local);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function getLocalRecurringPayments(): RecurringPayment[] {
  try {
    const local = localStorage.getItem('berlyn_finance_recurring');
    if (!local) return [];
    const parsed = JSON.parse(local);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
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
    if (!local) return [];
    const parsed = JSON.parse(local);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
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
    if (!local) return [];
    const parsed = JSON.parse(local);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
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
    if (!acc.startDate) return;

    const firstPayoutDate = getFirstInterestPayoutDate(acc.startDate);
    const firstPayoutMonth = getFirstInterestPayoutMonthTag(acc.startDate);

    // 1. Clean up any premature interest transactions logged before 1st maturity month
    // (e.g. Account starting on 2026-10-14 cannot yield interest in 2026-10; 1st payout is 2026-11-14)
    const premature = updated.filter((t) => {
      const isMatch = t.compoundAccountId === acc.id || t.title.includes(acc.name);
      const isInt = t.isInterest || t.title.startsWith('Interest Yield:');
      if (!isMatch || !isInt) return false;
      const txMonth = t.date ? t.date.slice(0, 7) : '';
      return txMonth && txMonth < firstPayoutMonth;
    });

    if (premature.length > 0) {
      updated = updated.filter((t) => !premature.includes(t));
      changed = true;
    }

    // 2. If target month is earlier than the first payout month, do not generate interest!
    if (targetMonthTag < firstPayoutMonth) return;

    // 3. Check if an interest transaction already exists for this account in this target month
    const existing = updated.find(
      (t) => (t.compoundAccountId === acc.id || t.title.includes(acc.name)) &&
             t.date?.startsWith(targetMonthTag)
    );

    if (!existing) {
      const grossMonthly = (acc.principal * (acc.annualRate / 100)) / 12;
      const netMonthly = Math.round(grossMonthly * (1 - (acc.withholdingTax || 0) / 100));
      if (netMonthly > 0) {
        const [tY, tM] = targetMonthTag.split('-').map(Number);
        const daysInTargetMonth = new Date(tY, tM, 0).getDate();
        const origDay = Number(acc.startDate.split('-')[2]) || 1;
        const finalDay = String(Math.min(origDay, daysInTargetMonth)).padStart(2, '0');

        const newInterestTx: FinanceItem = {
          id: `interest-${acc.id}-${targetMonthTag}`,
          type: 'income',
          title: `Interest Yield: ${acc.name}`,
          amount: netMonthly,
          currency: acc.currency,
          category: 'Passive Income',
          user: 'shared',
          date: `${targetMonthTag}-${finalDay}`,
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

