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
  const localTx = getLocalTransactions();
  const localRecurring = getLocalRecurringPayments();
  const localAssets = getLocalAssets();
  const localCompound = getLocalCompoundAccounts();

  try {
    const supabase = createClient();
    if (supabase) {
      const [txRes, assetRes, compRes, recRes] = await Promise.all([
        supabase.from('finance_transactions').select('*'),
        supabase.from('finance_assets').select('*'),
        supabase.from('compound_accounts').select('*'),
        supabase.from('finance_recurring').select('*'),
      ]);

      // 1. Transactions Upstream Sync:
      const remoteTx: FinanceItem[] = (txRes.data || []).map((r: any) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        amount: Number(r.amount),
        currency: r.currency || 'TRY',
        category: r.category,
        user: r.user_tag || 'shared',
        date: r.date,
        recurring: Boolean(r.recurring),
        isInterest: Boolean(r.is_interest),
        compoundAccountId: r.compound_account_id,
      }));

      const remoteTxMap = new Map<string, FinanceItem>();
      remoteTx.forEach(t => remoteTxMap.set(t.id, t));

      // Push local items that are missing in Supabase up to the cloud!
      const missingTx = localTx.filter(lt => !remoteTxMap.has(lt.id));
      if (missingTx.length > 0) {
        supabase.from('finance_transactions').upsert(
          missingTx.map(t => ({
            id: t.id,
            type: t.type,
            title: t.title,
            amount: t.amount,
            currency: t.currency,
            category: t.category,
            user_tag: t.user,
            date: t.date,
            recurring: t.recurring,
            is_interest: t.isInterest,
            compound_account_id: t.compoundAccountId,
          }))
        ).then(() => {});
      }

      const txMap = new Map<string, FinanceItem>();
      remoteTx.forEach(t => txMap.set(t.id, t));
      localTx.forEach(t => txMap.set(t.id, t));
      const finalTx = Array.from(txMap.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('berlyn_finance_tx', JSON.stringify(finalTx));
      }

      // 2. Compound Accounts Upstream Sync (Ignore any legacy phantom 28k deposit):
      const remoteComp: CompoundInterestAccount[] = (compRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        principal: Number(r.principal),
        currency: r.currency || 'TRY',
        annualRate: Number(r.annual_rate),
        compoundingFrequency: 'monthly',
        startDate: r.start_date,
        withholdingTax: Number(r.withholding_tax || 0),
      }));

      const remoteCompMap = new Map<string, CompoundInterestAccount>();
      remoteComp.forEach(c => remoteCompMap.set(c.id, c));

      // Filter out any legacy test 28k deposits
      const cleanLocalComp = localCompound.filter(
        (lc) => !lc.id.includes('term-deposit-28k') && !lc.id.includes('dummy') && lc.principal !== 28000
      );

      // If remote has no compound accounts, clean out legacy local storage
      if (remoteComp.length === 0 && typeof window !== 'undefined') {
        localStorage.removeItem('berlyn_compound_accounts');
      }

      const missingComp = cleanLocalComp.filter(lc => !remoteCompMap.has(lc.id));
      if (missingComp.length > 0) {
        supabase.from('compound_accounts').upsert(
          missingComp.map(c => ({
            id: c.id,
            name: c.name,
            bank_name: c.name,
            principal: c.principal,
            currency: c.currency,
            annual_rate: c.annualRate,
            withholding_tax: c.withholdingTax,
            start_date: c.startDate,
          }))
        ).then(() => {});
      }

      const compMap = new Map<string, CompoundInterestAccount>();
      remoteComp.forEach(c => compMap.set(c.id, c));
      cleanLocalComp.forEach(c => compMap.set(c.id, c));
      const finalComp = Array.from(compMap.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('berlyn_compound_accounts', JSON.stringify(finalComp));
      }

      // 3. Recurring Payments Upstream Sync:
      const remoteRec: RecurringPayment[] = (recRes.data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        amount: Number(r.amount),
        currency: r.currency || 'TRY',
        category: r.category,
        type: (r.category?.toLowerCase().includes('salary') || r.title?.toLowerCase().includes('salary')) ? 'income' : 'expense',
        dayOfMonth: Number(r.due_day || 1),
        user: (r.payer || 'shared') as FinancePayer,
      }));

      const remoteRecMap = new Map<string, RecurringPayment>();
      remoteRec.forEach(r => remoteRecMap.set(r.id, r));

      // Push local recurring payments that are missing in Supabase up to the cloud!
      const missingRec = localRecurring.filter(lr => !remoteRecMap.has(lr.id));
      if (missingRec.length > 0) {
        supabase.from('finance_recurring').upsert(
          missingRec.map(r => ({
            id: r.id,
            title: r.title,
            amount: r.amount,
            currency: r.currency,
            category: r.category,
            due_day: r.dayOfMonth,
            payer: r.user,
            is_active: true,
          }))
        ).then(() => {});
      }

      const recMap = new Map<string, RecurringPayment>();
      remoteRec.forEach(i => recMap.set(i.id, i));
      localRecurring.forEach(i => recMap.set(i.id, i));
      const finalRec = Array.from(recMap.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('berlyn_finance_recurring', JSON.stringify(finalRec));
      }

      // 4. Assets Upstream Sync:
      const remoteAssets: InvestmentAsset[] = (assetRes.data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        current_value: Number(r.current_value),
        currency: r.currency || 'TRY',
        target_value: r.target_value ? Number(r.target_value) : undefined,
        monthly_contribution: r.monthly_contribution ? Number(r.monthly_contribution) : undefined,
      }));

      const remoteAssetMap = new Map<string, InvestmentAsset>();
      remoteAssets.forEach(a => remoteAssetMap.set(a.id, a));

      // Push local assets that are missing in Supabase up to the cloud!
      const missingAssets = localAssets.filter(la => !remoteAssetMap.has(la.id));
      if (missingAssets.length > 0) {
        supabase.from('finance_assets').upsert(
          missingAssets.map(a => ({
            id: a.id,
            name: a.name,
            category: a.category,
            current_value: a.current_value,
            currency: a.currency,
            target_value: a.target_value,
            monthly_contribution: a.monthly_contribution,
          }))
        ).then(() => {});
      }

      const assetMap = new Map<string, InvestmentAsset>();
      remoteAssets.forEach(a => assetMap.set(a.id, a));
      localAssets.forEach(a => assetMap.set(a.id, a));
      const finalAssets = Array.from(assetMap.values());
      if (typeof window !== 'undefined') {
        localStorage.setItem('berlyn_finance_assets', JSON.stringify(finalAssets));
      }

      return {
        transactions: finalTx,
        recurringPayments: finalRec,
        assets: finalAssets,
        compoundAccounts: finalComp,
      };
    }
  } catch {
    // Fallback to local
  }

  return {
    transactions: localTx,
    recurringPayments: localRecurring,
    assets: localAssets,
    compoundAccounts: localCompound,
  };
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

    const supabase = createClient();
    if (supabase) {
      supabase.from('finance_recurring').upsert({
        id: item.id,
        title: item.title,
        amount: item.amount,
        currency: item.currency,
        category: item.category,
        due_day: item.dayOfMonth,
        payer: item.user,
        is_active: true,
      }).then(() => {});
    }

    return updated;
  } catch {
    return [item];
  }
}

export function deleteRecurringPayment(id: string): RecurringPayment[] {
  try {
    const updated = getLocalRecurringPayments().filter((i) => i.id !== id);
    localStorage.setItem('berlyn_finance_recurring', JSON.stringify(updated));

    const supabase = createClient();
    if (supabase) {
      supabase.from('finance_recurring').delete().eq('id', id).then(() => {});
    }

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

    const supabase = createClient();
    if (supabase) {
      supabase.from('finance_assets').upsert({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        current_value: asset.current_value,
        currency: asset.currency,
        target_value: asset.target_value,
        monthly_contribution: asset.monthly_contribution,
      }).then(() => {});
    }

    return assets;
  } catch {
    return [asset];
  }
}

export function deleteAsset(id: string): InvestmentAsset[] {
  try {
    const assets = getLocalAssets().filter((a) => a.id !== id);
    localStorage.setItem('berlyn_finance_assets', JSON.stringify(assets));

    const supabase = createClient();
    if (supabase) {
      supabase.from('finance_assets').delete().eq('id', id).then(() => {});
    }

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

    const supabase = createClient();
    if (supabase) {
      supabase.from('compound_accounts').upsert({
        id: account.id,
        name: account.name,
        bank_name: account.name,
        principal: account.principal,
        currency: account.currency,
        annual_rate: account.annualRate,
        withholding_tax: account.withholdingTax,
        start_date: account.startDate,
      }).then(() => {});
    }

    return accounts;
  } catch {
    return [account];
  }
}

export function deleteCompoundAccount(id: string): CompoundInterestAccount[] {
  try {
    const accounts = getLocalCompoundAccounts().filter((a) => a.id !== id);
    localStorage.setItem('berlyn_compound_accounts', JSON.stringify(accounts));

    const supabase = createClient();
    if (supabase) {
      supabase.from('compound_accounts').delete().eq('id', id).then(() => {});
    }

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

    const supabase = createClient();
    if (supabase) {
      await supabase.from('finance_transactions').upsert({
        id: newItem.id,
        type: newItem.type,
        title: newItem.title,
        amount: newItem.amount,
        currency: newItem.currency,
        category: newItem.category,
        user_tag: newItem.user,
        date: newItem.date,
        recurring: newItem.recurring,
        is_interest: newItem.isInterest,
        compound_account_id: newItem.compoundAccountId,
      });
    }
  } catch {
    // ignore
  }

  return newItem;
}

export function deleteTransaction(id: string): FinanceItem[] {
  try {
    const current = getLocalTransactions().filter((i) => i.id !== id);
    localStorage.setItem('berlyn_finance_tx', JSON.stringify(current));

    const supabase = createClient();
    if (supabase) {
      supabase.from('finance_transactions').delete().eq('id', id).then(() => {});
    }

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

