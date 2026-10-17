import { createClient } from './supabase/client';
import { FinanceItem, InvestmentAsset, Currency, CoupleUser } from '@/types';

// Multi-currency conversion rates (Base: USD)
export const CURRENCY_RATES: Record<Currency, number> = {
  USD: 1.0,
  TRY: 38.5, // USD to TRY
  PHP: 58.0, // USD to PHP
  EUR: 0.92, // USD to EUR
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  TRY: '₺',
  PHP: '₱',
  EUR: '€',
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  // Convert from -> USD -> to
  const inUSD = amount / CURRENCY_RATES[from];
  return inUSD * CURRENCY_RATES[to];
}

export const INITIAL_TRANSACTIONS: FinanceItem[] = [
  {
    id: 'f-1',
    type: 'income',
    title: 'Berk Maaş / Gelir',
    amount: 3200,
    currency: 'USD',
    category: 'Maaş',
    user: 'berk',
    date: '2026-10-01',
    recurring: true,
  },
  {
    id: 'f-2',
    type: 'income',
    title: 'Jaquilyn Gelir',
    amount: 110000,
    currency: 'PHP',
    category: 'Maaş',
    user: 'jaquilyn',
    date: '2026-10-01',
    recurring: true,
  },
  {
    id: 'f-3',
    type: 'expense',
    title: 'Kira & Ortak Ev Masrafı',
    amount: 950,
    currency: 'USD',
    category: 'Ev & Yaşam',
    user: 'shared',
    date: '2026-10-05',
    recurring: true,
  },
  {
    id: 'f-4',
    type: 'expense',
    title: 'Market & Haftalık Mutfak',
    amount: 14500,
    currency: 'PHP',
    category: 'Market & Yemek',
    user: 'jaquilyn',
    date: '2026-10-10',
    recurring: false,
  },
  {
    id: 'f-5',
    type: 'investment',
    title: 'Altın & Fon Birikimi',
    amount: 600,
    currency: 'USD',
    category: 'Yatırım',
    user: 'shared',
    date: '2026-10-08',
    recurring: true,
  },
];

export const INITIAL_ASSETS: InvestmentAsset[] = [
  {
    id: 'a-1',
    name: 'Fiziki Altın & Birikim',
    category: 'gold',
    current_value: 12500,
    currency: 'USD',
    target_value: 25000,
    monthly_contribution: 400,
  },
  {
    id: 'a-2',
    name: 'Hisse Senedi & Endeks Fonları (S&P 500)',
    category: 'stocks',
    current_value: 18000,
    currency: 'USD',
    target_value: 50000,
    monthly_contribution: 500,
  },
  {
    id: 'a-3',
    name: 'Kripto Varlıklar (BTC / ETH)',
    category: 'crypto',
    current_value: 6500,
    currency: 'USD',
    target_value: 15000,
    monthly_contribution: 150,
  },
  {
    id: 'a-4',
    name: 'Acil Durum Nakit Fonu (USD/PHP)',
    category: 'cash_savings',
    current_value: 8000,
    currency: 'USD',
    target_value: 15000,
    monthly_contribution: 200,
  },
];

export async function fetchFinanceData(): Promise<{
  transactions: FinanceItem[];
  assets: InvestmentAsset[];
}> {
  try {
    const supabase = createClient();
    const [txRes, assetRes] = await Promise.all([
      supabase.from('finance_items').select('*').order('date', { ascending: false }),
      supabase.from('investment_assets').select('*'),
    ]);

    const tx =
      txRes.data && txRes.data.length > 0
        ? (txRes.data as FinanceItem[])
        : getLocalTransactions();

    const assets =
      assetRes.data && assetRes.data.length > 0
        ? (assetRes.data as InvestmentAsset[])
        : getLocalAssets();

    return { transactions: tx, assets };
  } catch {
    return {
      transactions: getLocalTransactions(),
      assets: getLocalAssets(),
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

export async function saveTransaction(item: Partial<FinanceItem>): Promise<FinanceItem> {
  const newItem: FinanceItem = {
    id: item.id || `f-${Date.now()}`,
    type: item.type || 'expense',
    title: item.title || 'Masraf',
    amount: Number(item.amount) || 0,
    currency: item.currency || 'USD',
    category: item.category || 'Genel',
    user: item.user || 'shared',
    date: item.date || new Date().toISOString().split('T')[0],
    recurring: Boolean(item.recurring),
  };

  try {
    const supabase = createClient();
    await supabase.from('finance_items').upsert(newItem);
  } catch {
    // offline fallback
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
