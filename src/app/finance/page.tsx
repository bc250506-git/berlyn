'use client';

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Plus, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Coins, 
  Percent, 
  BarChart3, 
  Calendar,
  X,
  Pencil,
  Trash2,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Check,
  BookOpen,
  HeartHandshake,
  RotateCcw,
  Clock
} from 'lucide-react';
import { 
  FinanceItem, 
  InvestmentAsset, 
  CompoundInterestAccount, 
  RecurringPayment,
  Currency, 
  CoupleUser,
  FinancePayer 
} from '@/types';
import { 
  fetchFinanceData, 
  saveTransaction, 
  deleteTransaction,
  saveAsset,
  deleteAsset,
  saveCompoundAccount,
  deleteCompoundAccount,
  saveRecurringPayment,
  deleteRecurringPayment,
  convertCurrency, 
  calculate12MonthTrajectory,
  calculateTotalMonthlyInterestTRY,
  ensureMonthlyInterestTransactions,
  getFirstInterestPayoutDate,
  getFirstInterestPayoutMonthTag,
  CURRENCY_SYMBOLS,
  DEFAULT_KKTC_RATES,
  INITIAL_TRANSACTIONS,
  INITIAL_RECURRING_PAYMENTS,
  INITIAL_ASSETS,
  INITIAL_COMPOUND_ACCOUNTS,
  getLocalTransactions,
  getLocalRecurringPayments,
  getLocalAssets,
  getLocalCompoundAccounts
} from '@/lib/finance-service';
import { useCurrentUser } from '@/components/UserContext';
import { useConfirm } from '@/components/ConfirmModal';
import { formatDateDDMMYYYY, MONTH_NAMES_EN } from '@/lib/date';
import confetti from 'canvas-confetti';
import { playCash, playTap, playCrystal, playSafeLock } from '@/lib/sound-effects';

export default function FinancePage() {
  const { currentUser } = useCurrentUser();
  const confirm = useConfirm();

  // Currency selection: Default is TRY
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('TRY');

  // Background Central Bank live rates (Silent auto-fetch)
  const [liveRates, setLiveRates] = useState<Record<Currency, number>>(DEFAULT_KKTC_RATES);

  // Data states (instantly populated from localStorage)
  const [transactions, setTransactions] = useState<FinanceItem[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalTransactions();
    }
    return INITIAL_TRANSACTIONS;
  });
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalRecurringPayments();
    }
    return INITIAL_RECURRING_PAYMENTS;
  });
  const [assets, setAssets] = useState<InvestmentAsset[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalAssets();
    }
    return INITIAL_ASSETS;
  });
  const [compoundAccounts, setCompoundAccounts] = useState<CompoundInterestAccount[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalCompoundAccounts();
    }
    return INITIAL_COMPOUND_ACCOUNTS;
  });
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const accs = getLocalCompoundAccounts();
      return accs[0]?.id || 'c-1';
    }
    return 'c-1';
  });

  // Tabs: Default is 'transactions' (Income & Expenses)
  const [activeTab, setActiveTab] = useState<'transactions' | 'overview' | 'compound' | 'simulation'>('transactions');

  // Month navigation for past accounting ledger (Defter)
  const [ledgerYear, setLedgerYear] = useState<number>(2026);
  const [ledgerMonth, setLedgerMonth] = useState<number>(10); // 1-12 (October)
  const ledgerMonthKey = `${ledgerYear}-${String(ledgerMonth).padStart(2, '0')}`;

  // Transaction Modal State (Add or Edit)
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<Currency>('TRY');
  const [txType, setTxType] = useState<'income' | 'expense' | 'investment'>('expense');
  const [txCategory, setTxCategory] = useState('Food & Groceries');
  const [txUser, setTxUser] = useState<FinancePayer>('shared');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Recurring Payment Modal State (Add or Edit)
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState<Currency>('TRY');
  const [recType, setRecType] = useState<'income' | 'expense'>('expense');
  const [recCategory, setRecCategory] = useState('Housing & Living');
  const [recDay, setRecDay] = useState('5');
  const [recUser, setRecUser] = useState<FinancePayer>('shared');

  // Compound Account Modal State (Add or Edit)
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [editingCompoundId, setEditingCompoundId] = useState<string | null>(null);
  const [cpName, setCpName] = useState('');
  const [cpPrincipal, setCpPrincipal] = useState('350000');
  const [cpCurrency, setCpCurrency] = useState<Currency>('TRY');
  const [cpRate, setCpRate] = useState('48');
  const [cpTax, setCpTax] = useState('10');
  const [cpStartDate, setCpStartDate] = useState('2026-10-01');
  const [cpNote, setCpNote] = useState('Interest compounds monthly into principal');

  // Asset Modal State (Add or Edit)
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<InvestmentAsset['category']>('gold');
  const [assetValue, setAssetValue] = useState('');
  const [assetCurrency, setAssetCurrency] = useState<Currency>('TRY');
  const [assetTarget, setAssetTarget] = useState('');
  const [assetContribution, setAssetContribution] = useState('');

  // Realistic Simulation parameters (in TRY)
  const [simMonthlyTRY, setSimMonthlyTRY] = useState<number>(35000); // 35,000 TRY/month
  const [simAnnualReturn, setSimAnnualReturn] = useState<number>(25); // 25% net annual compound yield

  // Auto-fetch Central Bank rates in background silently
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch('/api/finance/rates');
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            setLiveRates(data.rates);
          }
        }
      } catch {
        // silent fallback
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 300000); // refresh every 5 mins in background

    const loadFinance = () => {
      fetchFinanceData().then((data) => {
        const cAccs = data?.compoundAccounts || [];
        let txs = data?.transactions || [];
        
        const todayDate = new Date();
        const calYear = todayDate.getFullYear();
        const calMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
        const monthTag = `${calYear}-${calMonth}`;

        if (cAccs.length > 0) {
          txs = ensureMonthlyInterestTransactions(txs, cAccs, monthTag);
        }

        setTransactions(txs);
        setRecurringPayments(data?.recurringPayments || []);
        setAssets(data?.assets || []);
        setCompoundAccounts(cAccs);
      });
    };

    loadFinance();

    const handleFocus = () => {
      loadFinance();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Ensure monthly interest transactions for the selected ledger month (matures 1 month after start date)
  useEffect(() => {
    if (compoundAccounts.length > 0) {
      setTransactions((prev) => ensureMonthlyInterestTransactions(prev, compoundAccounts, ledgerMonthKey));
    }
  }, [ledgerMonthKey, compoundAccounts]);

  const symbol = CURRENCY_SYMBOLS[selectedCurrency];

  const todayDate = new Date();
  const currentCalYear = todayDate.getFullYear();
  const currentCalMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
  const currentCalDay = todayDate.getDate();
  const currentMonthTag = `${currentCalYear}-${currentCalMonth}`;

  // Current Month calculations (Dynamic Calendar Month)
  const currentMonthTransactions = transactions.filter((t) => {
    if (!t.date) return false;
    const [y, m] = t.date.split('-');
    return parseInt(y) === currentCalYear && parseInt(m) === parseInt(currentCalMonth);
  });

  const manualMonthlyIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  // Passive interest calculation: check if any active compound accounts are NOT yet logged in transactions
  const unloggedActiveAccounts = compoundAccounts.filter(acc => {
    if (acc.startDate) {
      const firstPayoutMonth = getFirstInterestPayoutMonthTag(acc.startDate);
      if (firstPayoutMonth && firstPayoutMonth > currentMonthTag) return false;
    }
    return !currentMonthTransactions.some(
      t => (t.compoundAccountId === acc.id || t.title.includes(acc.name)) && (t.isInterest || t.title.startsWith('Interest Yield:'))
    );
  });
  const unloggedMonthlyInterestTRY = calculateTotalMonthlyInterestTRY(unloggedActiveAccounts, liveRates, currentMonthTag);
  const unloggedMonthlyInterestSelected = convertCurrency(unloggedMonthlyInterestTRY, 'TRY', selectedCurrency, liveRates);

  // Total passive interest across all active accounts
  const totalMonthlyInterestTRY = calculateTotalMonthlyInterestTRY(compoundAccounts, liveRates, currentMonthTag);
  const totalMonthlyInterestSelected = convertCurrency(totalMonthlyInterestTRY, 'TRY', selectedCurrency, liveRates);

  // Total income = all income transactions (which includes logged interest!) + any unlogged passive interest
  const totalMonthlyIncome = manualMonthlyIncome + unloggedMonthlyInterestSelected;

  // 1. Total Portfolio Assets (Gold, Stocks, Crypto, Real Estate, etc.)
  const totalAssetsTRY = assets.reduce((sum, a) => {
    return sum + convertCurrency(a.current_value, a.currency, 'TRY', liveRates);
  }, 0);
  const totalAssetsSelected = convertCurrency(totalAssetsTRY, 'TRY', selectedCurrency, liveRates);

  // 2. Total Compound Interest Term Deposits (Principal in active compound accounts)
  const totalCompoundPrincipalTRY = compoundAccounts.reduce((sum, acc) => {
    return sum + convertCurrency(acc.principal, acc.currency, 'TRY', liveRates);
  }, 0);
  const totalCompoundPrincipalSelected = convertCurrency(totalCompoundPrincipalTRY, 'TRY', selectedCurrency, liveRates);

  // 3. Net Cash Reserves / Cumulative Savings from all recorded transactions
  // (Total Income - Non-Family Out-of-Pocket Expenses)
  const cumulativeCashSavingsTRY = transactions.reduce((sum, t) => {
    if (t.type === 'income') {
      return sum + convertCurrency(t.amount, t.currency, 'TRY', liveRates);
    }
    if (t.type === 'expense' && t.user !== 'family') {
      return sum - convertCurrency(t.amount, t.currency, 'TRY', liveRates);
    }
    return sum;
  }, 0);
  const cumulativeCashSavingsSelected = convertCurrency(cumulativeCashSavingsTRY, 'TRY', selectedCurrency, liveRates);

  // Total Couple Net Worth: Liquid Cash Savings + Portfolio Assets + Compound Term Deposits
  const totalNetWorthTRY = Math.max(0, cumulativeCashSavingsTRY + totalAssetsTRY + totalCompoundPrincipalTRY);
  const totalNetWorth = convertCurrency(totalNetWorthTRY, 'TRY', selectedCurrency, liveRates);

  // Family Support Expenses (Never deducted from couple net worth or savings)
  const familyMonthlyExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense' && t.user === 'family')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  // Berk & Jaquilyn Out-of-Pocket Expenses
  const ourMonthlyExpense = currentMonthTransactions
    .filter((t) => t.type === 'expense' && t.user !== 'family')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const totalMonthlyExpense = ourMonthlyExpense;

  // Total Living Cost without Family Aid
  const totalLivingCostWithoutFamilyAid = ourMonthlyExpense + familyMonthlyExpense;

  const totalMonthlyInvestments = currentMonthTransactions
    .filter((t) => t.type === 'investment')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  // Couple Net Savings: Income - Real Expenses (Family aid does not decrease savings)
  const monthlySavings = totalMonthlyIncome - ourMonthlyExpense;
  const savingsRate = totalMonthlyIncome > 0 ? Math.round((monthlySavings / totalMonthlyIncome) * 100) : 0;

  // Selected Month Ledger calculations (Respects compound account start date!)
  const ledgerTransactions = transactions
    .filter((t) => {
      if (!t.date) return false;
      const [y, m] = t.date.split('-');
      return parseInt(y) === ledgerYear && parseInt(m) === ledgerMonth;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const ledgerManualIncome = ledgerTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  // Calculate unlogged passive interest for this specific ledger month
  const unloggedLedgerAccounts = compoundAccounts.filter(acc => {
    if (acc.startDate) {
      const firstPayoutMonth = getFirstInterestPayoutMonthTag(acc.startDate);
      if (firstPayoutMonth && firstPayoutMonth > ledgerMonthKey) return false;
    }
    return !ledgerTransactions.some(
      t => (t.compoundAccountId === acc.id || t.title.includes(acc.name)) && (t.isInterest || t.title.startsWith('Interest Yield:'))
    );
  });
  const ledgerUnloggedInterestTRY = calculateTotalMonthlyInterestTRY(unloggedLedgerAccounts, liveRates, ledgerMonthKey);
  const ledgerMonthlyInterestSelected = convertCurrency(ledgerUnloggedInterestTRY, 'TRY', selectedCurrency, liveRates);

  const ledgerTotalIncome = ledgerManualIncome + ledgerMonthlyInterestSelected;

  const ledgerFamilyExpense = ledgerTransactions
    .filter((t) => t.type === 'expense' && t.user === 'family')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const ledgerOurExpense = ledgerTransactions
    .filter((t) => t.type === 'expense' && t.user !== 'family')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const ledgerTotalLivingCost = ledgerOurExpense + ledgerFamilyExpense;
  const ledgerNet = ledgerTotalIncome - ledgerOurExpense;

  const renderPayerBadge = (user: FinancePayer) => {
    switch (user) {
      case 'family':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-semibold">
            🏠 Family Aid
          </span>
        );
      case 'berk':
        return <span className="text-[10px] text-blue-300 font-medium">🦁 Berk</span>;
      case 'jaquilyn':
        return <span className="text-[10px] text-pink-300 font-medium">🌸 Jaquilyn</span>;
      default:
        return <span className="text-[10px] text-slate-300 font-medium">🤝 Shared</span>;
    }
  };

  const handlePrevMonth = () => {
    if (ledgerMonth === 1) {
      setLedgerYear(ledgerYear - 1);
      setLedgerMonth(12);
    } else {
      setLedgerMonth(ledgerMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (ledgerMonth === 12) {
      setLedgerYear(ledgerYear + 1);
      setLedgerMonth(1);
    } else {
      setLedgerMonth(ledgerMonth + 1);
    }
  };

  // Realistic 5-Year Calculation Breakdown
  const calculateRealistic5Year = (years: number) => {
    const r = simAnnualReturn / 100;
    const n = 12;
    const P = totalNetWorthTRY;
    const PMT = simMonthlyTRY;

    const pocketPrincipal = P + (PMT * 12 * years);
    const compoundP = P * Math.pow(1 + r / n, n * years);
    const compoundPMT = PMT * ((Math.pow(1 + r / n, n * years) - 1) / (r / n));
    const totalTRY = compoundP + compoundPMT;
    const interestProfitTRY = Math.max(0, totalTRY - pocketPrincipal);

    return {
      total: convertCurrency(totalTRY, 'TRY', selectedCurrency, liveRates),
      pocketPrincipal: convertCurrency(pocketPrincipal, 'TRY', selectedCurrency, liveRates),
      interestProfit: convertCurrency(interestProfitTRY, 'TRY', selectedCurrency, liveRates),
    };
  };

  // Selected Compound Account Trajectory
  const activeCompoundAccount =
    compoundAccounts.find((a) => a.id === selectedCompoundId) || compoundAccounts[0];
  const trajectory = activeCompoundAccount
    ? calculate12MonthTrajectory(activeCompoundAccount)
    : null;

  // Process a Recurring Payment as Paid / Received
  const handleProcessRecurring = async (rec: RecurringPayment) => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(rec.dayOfMonth).padStart(2, '0');
    const txDate = `${curYear}-${curMonth}-${dayStr}`;

    const newTx: Partial<FinanceItem> = {
      title: rec.title,
      amount: rec.amount,
      currency: rec.currency,
      type: rec.type,
      category: rec.category,
      user: rec.user,
      date: txDate,
      recurring: true,
    };

    const saved = await saveTransaction(newTx);
    setTransactions([saved, ...transactions]);

    // Update lastProcessedMonth on the recurring payment
    const updatedRec = { ...rec, lastProcessedMonth: currentMonthTag };
    const updatedList = saveRecurringPayment(updatedRec);
    setRecurringPayments(updatedList);

    if (rec.type === 'income') {
      playCash();
    } else {
      playTap();
    }
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
  };

  // Revert a Recurring Payment from Processed/Paid back to Unpaid & retract transaction
  const handleUnprocessRecurring = (rec: RecurringPayment) => {
    // 1. Revert lastProcessedMonth
    const updatedRec = { ...rec, lastProcessedMonth: '' };
    const updatedList = saveRecurringPayment(updatedRec);
    setRecurringPayments(updatedList);

    // 2. Remove the corresponding transaction from current month
    const matchingTx = transactions.find(
      (t) =>
        t.title === rec.title &&
        t.recurring &&
        t.date?.startsWith(currentMonthTag)
    );
    if (matchingTx) {
      const updatedTxs = deleteTransaction(matchingTx.id);
      setTransactions(updatedTxs);
    }
  };

  const handleOpenAddTx = (defaultDate?: string) => {
    setEditingTxId(null);
    setTxTitle('');
    setTxAmount('');
    setTxCurrency(selectedCurrency);
    setTxType('expense');
    setTxCategory('Food & Groceries');
    setTxUser('shared');
    setTxDate(defaultDate || new Date().toISOString().split('T')[0]);
    setShowTxModal(true);
  };

  // Save / Edit Transaction
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || !txAmount) return;

    const existingTx = editingTxId ? transactions.find((t) => t.id === editingTxId) : null;
    const finalDate = txDate || existingTx?.date || new Date().toISOString().split('T')[0];

    const item: Partial<FinanceItem> = {
      id: editingTxId || undefined,
      title: txTitle,
      amount: parseFloat(txAmount),
      currency: txCurrency,
      type: txType,
      category: txCategory,
      user: txUser,
      date: finalDate,
      recurring: existingTx?.recurring || false,
      isInterest: existingTx?.isInterest || false,
      compoundAccountId: existingTx?.compoundAccountId,
    };

    const saved = await saveTransaction(item);
    if (editingTxId) {
      setTransactions(transactions.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTransactions([saved, ...transactions]);
    }

    // If date is set to another month, sync ledger view so user can immediately view it
    if (finalDate) {
      const [y, m] = finalDate.split('-');
      if (y && m) {
        setLedgerYear(parseInt(y));
        setLedgerMonth(parseInt(m));
      }
    }

    setShowTxModal(false);
    setEditingTxId(null);
    setTxTitle('');
    setTxAmount('');
    if (txType === 'income') {
      playCash();
    } else {
      playTap();
    }
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
  };

  const handleEditTx = (tx: FinanceItem) => {
    setEditingTxId(tx.id);
    setTxTitle(tx.title);
    setTxAmount(tx.amount.toString());
    setTxCurrency(tx.currency);
    setTxType(tx.type);
    setTxCategory(tx.category);
    setTxUser(tx.user);
    setTxDate(tx.date || new Date().toISOString().split('T')[0]);
    setShowTxModal(true);
  };

  const handleDeleteTx = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Transaction?',
      message: 'Are you sure you want to delete this transaction from your records?',
      confirmText: 'Delete',
    });
    if (ok) {
      const updated = deleteTransaction(id);
      setTransactions(updated);
    }
  };

  const handleOpenAddRecurring = () => {
    setEditingRecurringId(null);
    setRecTitle('');
    setRecAmount('');
    setRecCurrency(selectedCurrency);
    setRecType('expense');
    setRecCategory('Housing & Living');
    setRecDay('5');
    setRecUser('shared');
    setShowRecurringModal(true);
  };

  const handleEditRecurring = (rec: RecurringPayment) => {
    setEditingRecurringId(rec.id);
    setRecTitle(rec.title);
    setRecAmount(rec.amount.toString());
    setRecCurrency(rec.currency);
    setRecType(rec.type);
    setRecCategory(rec.category);
    setRecDay(rec.dayOfMonth.toString());
    setRecUser(rec.user);
    setShowRecurringModal(true);
  };

  // Save Recurring Payment (Add or Edit)
  const handleSaveRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle.trim() || !recAmount) return;

    const existing = editingRecurringId ? recurringPayments.find(r => r.id === editingRecurringId) : null;

    const recItem: RecurringPayment = {
      id: editingRecurringId || `rec-${Date.now()}`,
      title: recTitle.trim(),
      amount: parseFloat(recAmount),
      currency: recCurrency,
      type: recType,
      category: recCategory,
      dayOfMonth: parseInt(recDay) || 1,
      user: recUser,
      lastProcessedMonth: existing ? existing.lastProcessedMonth : '',
    };

    const updated = saveRecurringPayment(recItem);
    setRecurringPayments(updated);
    setShowRecurringModal(false);
    setEditingRecurringId(null);
    setRecTitle('');
    setRecAmount('');
    if (recType === 'income') {
      playCash();
    } else {
      playTap();
    }
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
  };

  const handleDeleteRecurring = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Recurring Payment?',
      message: 'Are you sure you want to delete this recurring bill / payment?',
      confirmText: 'Delete',
    });
    if (ok) {
      const updated = deleteRecurringPayment(id);
      setRecurringPayments(updated);
    }
  };

  // Asset Handlers (Add, Edit, Delete)
  const handleOpenAssetModal = (asset?: InvestmentAsset) => {
    if (asset) {
      setEditingAssetId(asset.id);
      setAssetName(asset.name);
      setAssetCategory(asset.category);
      setAssetValue(asset.current_value.toString());
      setAssetCurrency(asset.currency);
      setAssetTarget(asset.target_value ? asset.target_value.toString() : '');
      setAssetContribution(asset.monthly_contribution ? asset.monthly_contribution.toString() : '');
    } else {
      setEditingAssetId(null);
      setAssetName('');
      setAssetCategory('gold');
      setAssetValue('');
      setAssetCurrency(selectedCurrency);
      setAssetTarget('');
      setAssetContribution('');
    }
    setShowAssetModal(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || !assetValue) return;

    const numVal = parseFloat(assetValue) || 0;
    const numTarget = assetTarget ? parseFloat(assetTarget) : undefined;
    const numContribution = assetContribution ? parseFloat(assetContribution) : undefined;

    const assetObj: InvestmentAsset = {
      id: editingAssetId || `asset-${Date.now()}`,
      name: assetName.trim(),
      category: assetCategory,
      current_value: numVal,
      currency: assetCurrency,
      target_value: numTarget,
      monthly_contribution: numContribution,
    };

    const updated = saveAsset(assetObj);
    setAssets(updated);
    setShowAssetModal(false);
    setEditingAssetId(null);
    playCrystal();
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
  };

  const handleDeleteAsset = async (id: string) => {
    const ok = await confirm({
      title: 'Remove Asset?',
      message: 'Are you sure you want to remove this asset from your portfolio?',
      confirmText: 'Remove',
    });
    if (ok) {
      const updated = deleteAsset(id);
      setAssets(updated);
    }
  };

  // Save Compound Account (With customizable Start Date!)
  const handleSaveCompound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim() || !cpPrincipal || !cpRate) return;

    const account: CompoundInterestAccount = {
      id: editingCompoundId || `c-${Date.now()}`,
      name: cpName,
      principal: parseFloat(cpPrincipal),
      currency: cpCurrency,
      annualRate: parseFloat(cpRate),
      compoundingFrequency: 'monthly',
      startDate: cpStartDate || new Date().toISOString().split('T')[0],
      withholdingTax: parseFloat(cpTax) || 0,
      note: cpNote,
    };

    const updated = saveCompoundAccount(account);
    setCompoundAccounts(updated);
    setSelectedCompoundId(account.id);

    // Auto-ensure interest transaction exists if startDate <= currentMonthTag
    const updatedTxs = ensureMonthlyInterestTransactions(transactions, updated, currentMonthTag);
    setTransactions(updatedTxs);

    setShowCompoundModal(false);
    setEditingCompoundId(null);
    setCpName('');
    playSafeLock();
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleEditCompound = (acc: CompoundInterestAccount) => {
    setEditingCompoundId(acc.id);
    setCpName(acc.name);
    setCpPrincipal(acc.principal.toString());
    setCpCurrency(acc.currency);
    setCpRate(acc.annualRate.toString());
    setCpTax(acc.withholdingTax.toString());
    setCpStartDate(acc.startDate || new Date().toISOString().split('T')[0]);
    setCpNote(acc.note || '');
    setShowCompoundModal(true);
  };

  const handleDeleteCompound = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Savings Account?',
      message: 'Are you sure you want to delete this compound savings account?',
      confirmText: 'Delete',
    });
    if (ok) {
      const updated = deleteCompoundAccount(id);
      setCompoundAccounts(updated);
      if (updated.length > 0) {
        setSelectedCompoundId(updated[0].id);
      }
    }
  };

  const incomeList = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const expenseList = currentMonthTransactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const investmentList = currentMonthTransactions
    .filter((t) => t.type === 'investment')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* 1. Main Overview Card (Default: TRY, Currency Toggle: TRY, USD, GBP) */}
      <div className="card-cozy p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-rose-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Shared Financial Sanctuary</span>
            </span>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-1 bg-[#161e2c] p-1 rounded-xl border border-white/[0.08]">
            {(['TRY', 'USD', 'GBP'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedCurrency === c
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'TRY' ? '₺ TRY' : c === 'USD' ? '$ USD' : '£ GBP'}
              </button>
            ))}
          </div>
        </div>

        {/* Total Net Worth */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Couple Net Worth</span>
            {totalNetWorth > 0 && (
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                {cumulativeCashSavingsSelected > 0 && `💵 +${symbol}${Math.round(cumulativeCashSavingsSelected).toLocaleString()} Savings`}
                {totalCompoundPrincipalSelected > 0 && ` • 📈 +${symbol}${Math.round(totalCompoundPrincipalSelected).toLocaleString()} Deposits`}
                {totalAssetsSelected > 0 && ` • 🪙 +${symbol}${Math.round(totalAssetsSelected).toLocaleString()} Assets`}
              </span>
            )}
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
            {symbol}{Math.round(totalNetWorth).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400">
            {totalCompoundPrincipalSelected > 0 || totalAssetsSelected > 0 ? (
              `✨ Combines net cash savings (${symbol}${Math.round(Math.max(0, cumulativeCashSavingsSelected)).toLocaleString()})${
                totalCompoundPrincipalSelected > 0 ? ` + deposits (${symbol}${Math.round(totalCompoundPrincipalSelected).toLocaleString()})` : ''
              }${totalAssetsSelected > 0 ? ` + assets (${symbol}${Math.round(totalAssetsSelected).toLocaleString()})` : ''}`
            ) : (
              `✨ Liquid couple cash savings (Total Income - Real Expenses)`
            )}
          </p>
        </div>

        {/* Monthly Income / Expense */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mb-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>Total Monthly Income</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              +{symbol}{Math.round(totalMonthlyIncome).toLocaleString()}
            </div>
          </div>

          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold mb-0.5">
              <ArrowDownRight className="w-3 h-3" />
              <span>Our Real Expenses</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              -{symbol}{Math.round(totalMonthlyExpense).toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Net out-of-pocket</div>
          </div>
        </div>

        {/* Indicator 1: Couple Savings Rate */}
        <div className="flex items-center justify-between text-[11px] bg-[#141b28] px-3 py-2 rounded-xl border border-white/[0.06]">
          <span className="text-slate-300 font-medium">Couple Savings Rate:</span>
          <span className="text-emerald-400 font-mono font-bold">
            {savingsRate}% (Saved: {symbol}{Math.round(monthlySavings).toLocaleString()})
          </span>
        </div>

        {/* Indicator 2: Monthly Passive Investment & Interest Income */}
        <div className="flex items-center justify-between text-[11px] bg-[#141b28] px-3 py-2 rounded-xl border border-white/[0.06]">
          <span className="text-slate-300 font-medium">Monthly Passive Cash Flow:</span>
          <span className="text-amber-400 font-mono font-bold">
            +{symbol}{Math.round(totalMonthlyInterestSelected).toLocaleString()} / mo (Passive Yield)
          </span>
        </div>

        {/* Indicator 3: Family Support Contribution (Non-deductible) */}
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/25 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-indigo-200 font-bold flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-indigo-400" />
              <span>Family Support Contribution:</span>
            </span>
            <span className="text-indigo-300 font-mono font-bold text-xs">
              {symbol}{Math.round(familyMonthlyExpense).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-indigo-500/15">
            <span className="text-indigo-300/80">✨ Funded by family — zero deduction from our couple savings</span>
            <span className="text-slate-400 font-mono text-[10px]">
              Full cost without aid: <span className="text-slate-300 font-semibold">{symbol}{Math.round(totalLivingCostWithoutFamilyAid).toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'transactions', label: '💳 Income & Expenses' },
          { id: 'overview', label: '🪙 Asset Allocation' },
          { id: 'compound', label: '📈 Compound Interest' },
          { id: 'simulation', label: '🚀 5-Year Projection' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-rose-600 text-white'
                : 'bg-[#121824] border border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INCOME & EXPENSES                                */}
      {/* ======================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* 1. RECURRING INCOME & EXPENSES */}
          <div className="card-cozy p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-amber-400" />
                  <span>Recurring Income & Expenses (Monthly)</span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Payments recurring on specific days. Tap when processed to log into records.
                </p>
              </div>
              <button
                onClick={handleOpenAddRecurring}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {recurringPayments.map((rec) => {
                const isPaidThisMonth = rec.lastProcessedMonth === currentMonthTag;
                const isIncome = rec.type === 'income';
                const isDueNow = currentCalDay >= rec.dayOfMonth;
                const daysUntilDue = rec.dayOfMonth - currentCalDay;

                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-2xl bg-[#161e2c] border flex items-center justify-between text-xs group transition-all ${
                      !isPaidThisMonth && isDueNow 
                        ? 'border-amber-500/30 shadow-sm shadow-amber-500/5' 
                        : 'border-white/[0.04]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        {/* Compact colorful day number badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                            isPaidThisMonth
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : isDueNow
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/[0.06] text-slate-300 border-white/[0.1]'
                          }`}
                          title={`Due on day ${rec.dayOfMonth} of every month`}
                        >
                          {rec.dayOfMonth}
                        </span>
                        <span>{rec.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                        {renderPayerBadge(rec.user)}
                        <span>•</span>
                        <span>{rec.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-xs ${
                          isIncome
                            ? 'text-emerald-400'
                            : rec.user === 'family'
                            ? 'text-indigo-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{CURRENCY_SYMBOLS[rec.currency]}{rec.amount.toLocaleString()}
                      </span>

                      {/* Due-aware interactive button */}
                      {isPaidThisMonth ? (
                        <button
                          onClick={() => handleUnprocessRecurring(rec)}
                          className="px-2 py-1 rounded-xl bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer group/undo"
                          title="Click to revert to unpaid & retract from transactions"
                        >
                          <Check className="w-3 h-3 group-hover/undo:hidden" />
                          <RotateCcw className="w-3 h-3 hidden group-hover/undo:inline" />
                          <span className="group-hover/undo:hidden">Processed</span>
                          <span className="hidden group-hover/undo:inline">Undo</span>
                        </button>
                      ) : isDueNow ? (
                        <button
                          onClick={() => handleProcessRecurring(rec)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-[10px] transition-colors shadow-sm flex items-center gap-1 cursor-pointer"
                          title={`Payment due on day ${rec.dayOfMonth}. Click to process.`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Due • {isIncome ? 'Mark Received' : 'Mark Paid'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleProcessRecurring(rec)}
                          className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/[0.08] text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Scheduled for day ${rec.dayOfMonth} (${daysUntilDue} days left). Click to pay early.`}
                        >
                          <span>In {daysUntilDue}d • Pay</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleEditRecurring(rec)}
                        className="text-slate-500 hover:text-amber-400 p-1 cursor-pointer transition-colors"
                        title="Edit recurring payment"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => handleDeleteRecurring(rec.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                        title="Delete recurring payment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. CURRENT MONTH TRANSACTIONS LIST */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white">
              {MONTH_NAMES_EN[todayDate.getMonth()]} {currentCalYear} Transactions
            </span>
            <button
              onClick={() => handleOpenAddTx()}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Transaction</span>
            </button>
          </div>

          {/* INCOME */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" />
                <span>Monthly Income</span>
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                +{symbol}{Math.round(totalMonthlyIncome).toLocaleString()}
              </span>
            </div>

            {/* Unlogged Passive Interest Line (Only shown if any account is unlogged) */}
            {unloggedMonthlyInterestSelected > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Accruing Passive Compound Interest</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80">
                    Calculated from active compound term savings accounts
                  </span>
                </div>
                <div className="font-mono font-bold text-amber-300 text-xs">
                  +{symbol}{Math.round(unloggedMonthlyInterestSelected).toLocaleString()}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {incomeList.length === 0 && unloggedMonthlyInterestSelected === 0 && (
                <div className="p-5 rounded-xl border border-dashed border-white/[0.06] text-center text-slate-500 text-xs">
                  No income recorded for this month yet. ✨
                </div>
              )}
              {incomeList.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-[#161e2c] border border-white/[0.04] flex items-center justify-between text-xs group"
                >
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{t.title}</span>
                      {t.isInterest && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Passive Return</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {renderPayerBadge(t.user)}
                      <span>•</span>
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{formatDateDDMMYYYY(t.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      +{CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </span>
                    <button 
                      onClick={() => handleEditTx(t)} 
                      className="text-slate-500 hover:text-white p-1 cursor-pointer"
                      title="Edit amount or details"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTx(t.id)} 
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EXPENSES */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div>
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Living Expenses & Bills</span>
                </span>
                <span className="text-[10px] text-slate-500 block">Out of our couple pocket</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-rose-400">
                  -{symbol}{Math.round(totalMonthlyExpense).toLocaleString()}
                </span>
                {familyMonthlyExpense > 0 && (
                  <span className="block text-[9px] text-indigo-300 font-mono">
                    +{symbol}{Math.round(familyMonthlyExpense).toLocaleString()} Family Aid
                  </span>
                )}
              </div>
            </div>

            {familyMonthlyExpense > 0 && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-indigo-300">
                  <HeartHandshake className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-[11px]">
                    Paid via Family Support (Zero impact on our couple savings):
                  </span>
                </div>
                <span className="font-mono font-bold text-indigo-300 text-xs">
                  {symbol}{Math.round(familyMonthlyExpense).toLocaleString()}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              {expenseList.length === 0 && (
                <div className="p-5 rounded-xl border border-dashed border-white/[0.06] text-center text-slate-500 text-xs">
                  No expenses recorded for this month yet. ✨
                </div>
              )}
              {expenseList.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs group ${
                    t.user === 'family'
                      ? 'bg-indigo-950/20 border-indigo-500/20'
                      : 'bg-[#161e2c] border-white/[0.04]'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-xs">
                      {t.title}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {renderPayerBadge(t.user)}
                      <span>•</span>
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{formatDateDDMMYYYY(t.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold text-xs ${
                        t.user === 'family' ? 'text-indigo-300' : 'text-rose-400'
                      }`}
                    >
                      -{CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </span>
                    <button onClick={() => handleEditTx(t)} className="text-slate-500 hover:text-white p-1">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteTx(t.id)} className="text-slate-500 hover:text-rose-400 p-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INVESTMENTS */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>Investments & Asset Purchases</span>
              </span>
              <span className="font-mono text-xs font-bold text-amber-400">
                {symbol}{Math.round(totalMonthlyInvestments).toLocaleString()}
              </span>
            </div>

            <div className="space-y-1.5">
              {investmentList.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-[#161e2c] border border-white/[0.04] flex items-center justify-between text-xs group"
                >
                  <div>
                    <div className="font-bold text-white text-xs">{t.title}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {renderPayerBadge(t.user)}
                      <span>•</span>
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{formatDateDDMMYYYY(t.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </span>
                    <button onClick={() => handleEditTx(t)} className="text-slate-500 hover:text-white p-1">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteTx(t.id)} className="text-slate-500 hover:text-rose-400 p-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. HISTORICAL ACCOUNTING LEDGER (MONTH NAVIGATION)       */}
          {/* ======================================================== */}
          <div className="card-cozy p-5 space-y-4 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-rose-400" />
                  <span>Historical Accounting Ledger</span>
                </span>
                <span className="text-[10px] text-slate-500 block">Month-by-month record review</span>
              </div>
              <button
                onClick={() => handleOpenAddTx(`${ledgerYear}-${String(ledgerMonth).padStart(2, '0')}-01`)}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 rounded-lg border border-white/[0.08] transition-colors"
                title={`Add a transaction directly into ${MONTH_NAMES_EN[ledgerMonth - 1]} ${ledgerYear}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to {MONTH_NAMES_EN[ledgerMonth - 1]}</span>
              </button>
            </div>

            {/* Month Navigation Button Bar */}
            <div className="flex items-center justify-between bg-[#161e2c] p-2 rounded-2xl border border-white/[0.06]">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-[#121824] hover:bg-white/[0.08] text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              <div className="text-center">
                <span className="font-bold text-white text-sm">
                  {MONTH_NAMES_EN[ledgerMonth - 1]} {ledgerYear}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {ledgerTransactions.length + (ledgerMonthlyInterestSelected > 0 ? 1 : 0)} Records
                </span>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-[#121824] hover:bg-white/[0.08] text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Month Summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Total Income</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">
                  +{symbol}{Math.round(ledgerTotalIncome).toLocaleString()}
                </span>
              </div>
              <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Our Expense</span>
                <span className="font-mono font-bold text-rose-400 text-xs">
                  -{symbol}{Math.round(ledgerOurExpense).toLocaleString()}
                </span>
              </div>
              <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400 block">Net Balance</span>
                <span
                  className={`font-mono font-bold text-xs ${
                    ledgerNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {ledgerNet >= 0 ? '+' : ''}{symbol}{Math.round(ledgerNet).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Family Support Info Bar in Ledger */}
            {ledgerFamilyExpense > 0 && (
              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                  <HeartHandshake className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Period Family Support: <strong>{symbol}{Math.round(ledgerFamilyExpense).toLocaleString()}</strong></span>
                </div>
                <span className="text-slate-400 font-mono text-[10px]">
                  Total living cost without aid: {symbol}{Math.round(ledgerTotalLivingCost).toLocaleString()}
                </span>
              </div>
            )}

            {/* Selected Month Ledger Records Table */}
            <div className="space-y-1.5 pt-1">
              {/* If active interest existed in this month, display it */}
              {ledgerMonthlyInterestSelected > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-amber-300 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Passive Interest Yield (Period Accounts)</span>
                    </div>
                    <div className="text-[10px] text-amber-400/80 mt-0.5">
                      Automated yield active from start date
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-amber-300">
                      +{symbol}{Math.round(ledgerMonthlyInterestSelected).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {ledgerTransactions.length > 0 ? (
                ledgerTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-[#141b28] border border-white/[0.04] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white text-xs">
                        {tx.title}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {renderPayerBadge(tx.user)}
                        <span>•</span>
                        <span>{tx.category}</span>
                        <span>•</span>
                        <span>{formatDateDDMMYYYY(tx.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-xs ${
                          tx.type === 'income'
                            ? 'text-emerald-400'
                            : tx.type === 'investment'
                            ? 'text-amber-400'
                            : tx.user === 'family'
                            ? 'text-indigo-300'
                            : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}{CURRENCY_SYMBOLS[tx.currency]}{tx.amount.toLocaleString()}
                      </span>
                      <button 
                        onClick={() => handleEditTx(tx)} 
                        className="text-slate-500 hover:text-white p-1 cursor-pointer transition-colors"
                        title="Edit transaction"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTx(tx.id)} 
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : ledgerMonthlyInterestSelected === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 italic bg-[#141b28] rounded-xl border border-white/[0.04]">
                  No financial records found for {MONTH_NAMES_EN[ledgerMonth - 1]} {ledgerYear}.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ASSET ALLOCATION (PORTFOLIO)                      */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              <span>Asset Allocation & Portfolio</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">{assets.length} Items</span>
              <button
                onClick={() => handleOpenAssetModal()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Asset</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Automated Liquid Cash Savings from Transactions */}
            {cumulativeCashSavingsSelected > 0 && (
              <div className="card-cozy p-3.5 space-y-2 border border-emerald-500/25 bg-emerald-950/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Liquid Cash & Bank Reserves</span>
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        Live Ledger Savings
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Accumulated net cash savings from all income & living expenses
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-emerald-400">
                      +{symbol}{Math.round(cumulativeCashSavingsSelected).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      Available Cash
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Automated Compound Term Deposits */}
            {totalCompoundPrincipalSelected > 0 && (
              <div className="card-cozy p-3.5 space-y-2 border border-amber-500/25 bg-amber-950/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        <span>Compound Term Deposits (Principal)</span>
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                        Yield Accounts
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Total principal committed across compound interest savings accounts
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-amber-300">
                      +{symbol}{Math.round(totalCompoundPrincipalSelected).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      {compoundAccounts.length} Active Account{compoundAccounts.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {assets.length === 0 ? (
              <div className="card-cozy p-6 text-center space-y-2">
                <PieChart className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No additional custom assets (Gold, Stocks, Crypto) in your portfolio yet.</p>
                <button
                  onClick={() => handleOpenAssetModal()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                >
                  + Add First Custom Asset
                </button>
              </div>
            ) : (
              assets.map((asset) => {
                const val = convertCurrency(asset.current_value, asset.currency, selectedCurrency, liveRates);
                const target = asset.target_value
                  ? convertCurrency(asset.target_value, asset.currency, selectedCurrency, liveRates)
                  : null;
                const percent = target ? Math.min(100, Math.round((val / target) * 100)) : 100;

                return (
                  <div key={asset.id} className="card-cozy p-3.5 space-y-2 group transition-all border border-white/[0.07] hover:border-white/[0.14]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{asset.name}</h4>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-amber-300 font-medium capitalize">
                            {asset.category.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Original: {CURRENCY_SYMBOLS[asset.currency]}
                          {asset.current_value.toLocaleString()}
                          {asset.monthly_contribution ? ` • +${CURRENCY_SYMBOLS[asset.currency]}${asset.monthly_contribution.toLocaleString()}/mo` : ''}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-white">
                            {symbol}{Math.round(val).toLocaleString()}
                          </div>
                          {target && (
                            <div className="text-[9px] text-slate-500 font-mono">
                              Target: {symbol}{Math.round(target).toLocaleString()}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons: Edit & Delete */}
                        <div className="flex items-center gap-1 pl-1 border-l border-white/[0.08]">
                          <button
                            onClick={() => handleOpenAssetModal(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Edit Asset"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {target && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>Progress to Target</span>
                          <span className="text-amber-400 font-semibold">{percent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COMPOUND INTEREST ENGINE                          */}
      {/* ======================================================== */}
      {activeTab === 'compound' && (
        <div className="space-y-3">
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compound Interest Growth Engine</span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Interest compounds monthly into principal (The Snowball Effect)
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCompoundId(null);
                  setCpName('');
                  setCpPrincipal('350000');
                  setCpRate('48');
                  setCpTax('10');
                  setCpStartDate(new Date().toISOString().split('T')[0]);
                  setCpNote('Interest compounds monthly into principal');
                  setShowCompoundModal(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Account</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              {compoundAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedCompoundId(acc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeCompoundAccount?.id === acc.id
                      ? 'bg-amber-500 text-slate-900 font-bold'
                      : 'bg-[#161e2c] border border-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  {acc.name} ({acc.annualRate}% {acc.currency})
                </button>
              ))}
            </div>
          </div>

          {activeCompoundAccount && trajectory && (
            <div className="card-cozy p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{activeCompoundAccount.name}</span>
                    <button
                      onClick={() => handleEditCompound(activeCompoundAccount)}
                      className="text-slate-400 hover:text-amber-400"
                      title="Edit savings account"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {compoundAccounts.length > 1 && (
                      <button
                        onClick={() => handleDeleteCompound(activeCompoundAccount.id)}
                        className="text-slate-400 hover:text-rose-400"
                        title="Delete savings account"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium mt-0.5 space-x-1 flex flex-wrap items-center">
                    <span>Principal: {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}{activeCompoundAccount.principal.toLocaleString()}</span>
                    <span>•</span>
                    <span>Annual Rate: {activeCompoundAccount.annualRate}%</span>
                    <span>•</span>
                    <span>Tax: {activeCompoundAccount.withholdingTax}%</span>
                    <span>•</span>
                    <span className="text-slate-300 font-mono">Started: {formatDateDDMMYYYY(activeCompoundAccount.startDate)}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono font-semibold">1st Payout: {formatDateDDMMYYYY(getFirstInterestPayoutDate(activeCompoundAccount.startDate))}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">1-Year Ending Balance</span>
                  <div className="font-mono text-lg font-extrabold text-emerald-400">
                    {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.finalBalance).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-300/80 font-mono font-semibold">
                    Net Profit: +{CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.totalInterestEarned).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Avg. Monthly Passive Income</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    +{CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.monthlyAveragePassiveIncome).toLocaleString()} / mo
                  </span>
                </div>
                <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Effective Annual Yield (APY)</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {trajectory.effectiveAnnualYield.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* 1-Year Compound Growth Chart */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>1-Year Compound Snowball Trajectory Chart</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">12 Months</span>
                </div>

                <div className="bg-[#141b28] p-3 rounded-2xl border border-white/[0.06] space-y-2">
                  <div className="h-28 flex items-end justify-between gap-1.5 w-full">
                    {trajectory.points.map((pt) => {
                      const maxBal = trajectory.finalBalance;
                      const minBal = activeCompoundAccount.principal * 0.95;
                      const ratio = (pt.endingBalance - minBal) / (maxBal - minBal);
                      const heightPx = Math.max(16, Math.min(96, Math.round(ratio * 96)));

                      return (
                        <div
                          key={pt.month}
                          className="flex-1 flex flex-col justify-end items-center h-full group relative"
                        >
                          <div className="hidden group-hover:block absolute bottom-full mb-1.5 p-1.5 bg-[#090d16] border border-white/20 rounded-lg text-[9px] font-mono whitespace-nowrap z-30 text-white shadow-xl pointer-events-none">
                            <div className="font-bold">Month {pt.month}</div>
                            <div className="text-emerald-400">+{Math.round(pt.monthlyInterest).toLocaleString()} interest</div>
                            <div>{Math.round(pt.endingBalance).toLocaleString()} balance</div>
                          </div>

                          <div
                            className="w-full max-w-[18px] bg-gradient-to-t from-amber-600 via-amber-500 to-rose-500 rounded-t-md transition-all group-hover:brightness-125"
                            style={{ height: `${heightPx}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-white/[0.06]">
                    {trajectory.points.map((pt) => (
                      <span key={pt.month} className="flex-1 text-center">
                        M{pt.month}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: 5-YEAR PROJECTION                                 */}
      {/* ======================================================== */}
      {activeTab === 'simulation' && (
        <div className="card-cozy p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5-Year Wealth & Future Projection</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Mathematical compound growth model: Out-of-pocket savings + compounding investment yield
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#161e2c] border border-white/[0.06] text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>How are these numbers calculated?</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[10px]">
              <strong>1. Our Own Monthly Savings:</strong> Current principal + (Monthly Savings × 12 Months × Years). This is guaranteed equity saved from our income.
              <br />
              <strong>2. Compounded Investment Return:</strong> Capital growth generated by reinvesting our deposits at your chosen annual yield ({simAnnualReturn}%).
            </p>
          </div>

          <div className="space-y-3 bg-[#161e2c] p-3.5 rounded-2xl border border-white/[0.04]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>Monthly Couple Savings Target:</span>
                <span className="font-mono text-sm font-bold text-rose-400">
                  {symbol}
                  {Math.round(convertCurrency(simMonthlyTRY, 'TRY', selectedCurrency, liveRates)).toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="100000"
                step="2500"
                value={simMonthlyTRY}
                onChange={(e) => setSimMonthlyTRY(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="text-[11px] text-slate-300 mb-1.5">Expected Annual Net Return Rate:</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Conservative (15%)', val: 15 },
                  { label: 'Balanced (25%)', val: 25 },
                  { label: 'Aggressive (35%)', val: 35 },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => setSimAnnualReturn(item.val)}
                    className={`py-1.5 rounded-xl text-[10px] font-semibold transition-all cursor-pointer ${
                      simAnnualReturn === item.val
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#121824] border border-white/[0.08] text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              { year: 1, title: 'Year 1 End', badge: '🛡️ Strong Emergency Fund & Foundation' },
              { year: 2, title: 'Year 2 End', badge: '✈️ Luxury Couple Getaway & Momentum' },
              { year: 3, title: 'Year 3 End', badge: '🏠 Dream Home Down Payment / Real Estate' },
              { year: 5, title: 'Year 5 End', badge: '👑 Financial Freedom Milestone' },
            ].map((milestone) => {
              const res = calculateRealistic5Year(milestone.year);
              return (
                <div
                  key={milestone.year}
                  className="p-3.5 rounded-2xl bg-[#141b28] border border-white/[0.06] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-white font-bold">{milestone.title}</span>
                      <span className="text-[10px] text-amber-300/90 font-medium block">
                        {milestone.badge}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-base font-extrabold text-white">
                        {symbol}{Math.round(res.total).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-white/[0.04]">
                    <div>
                      <span className="text-slate-500 block">Our Own Saved Equity:</span>
                      <span className="font-mono text-slate-300 font-semibold">
                        {symbol}{Math.round(res.pocketPrincipal).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Compounded Wealth Profit:</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        +{symbol}{Math.round(res.interestProfit).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT SAVINGS & COMPOUND ACCOUNT           */}
      {/* ======================================================== */}
      {showCompoundModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-400" />
                <span>{editingCompoundId ? 'Edit Savings Account' : 'Add New Savings Account'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowCompoundModal(false);
                  setEditingCompoundId(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleSaveCompound} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Account / Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Yield TRY Term, Sterling Fund..."
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Principal Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="350000"
                    value={cpPrincipal}
                    onChange={(e) => setCpPrincipal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                  <select
                    value={cpCurrency}
                    onChange={(e) => setCpCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="48"
                    value={cpRate}
                    onChange={(e) => setCpRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Withholding Tax (%)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="10"
                    value={cpTax}
                    onChange={(e) => setCpTax(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Start Date field: Ensures we know when it started and avoids applying to earlier ledger months! */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Account Start Date</label>
                <input
                  type="date"
                  required
                  value={cpStartDate}
                  onChange={(e) => setCpStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Description / Note</label>
                <input
                  type="text"
                  placeholder="Interest compounds monthly into principal..."
                  value={cpNote}
                  onChange={(e) => setCpNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors mt-2 cursor-pointer"
              >
                {editingCompoundId ? 'Update Changes' : 'Save Account & View Trajectory'}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT TRANSACTION                          */}
      {/* ======================================================== */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white">
                {editingTxId ? 'Edit Transaction' : 'Add New Transaction'}
              </h3>
              <button
                onClick={() => {
                  setShowTxModal(false);
                  setEditingTxId(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleSaveTx} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'expense', label: 'Expense' },
                    { id: 'income', label: 'Income' },
                    { id: 'investment', label: 'Investment' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTxType(item.id as any)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        txType === item.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#161e2c] border border-white/[0.08] text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Description / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Groceries, Rent, Salary, Gold purchase..."
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                  <select
                    value={txCurrency}
                    onChange={(e) => setTxCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500 font-mono"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" />
                    <span>Transaction Date (Past, Today, or Future)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setTxDate(new Date().toISOString().split('T')[0])}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline transition-colors"
                  >
                    Set to Today
                  </button>
                </div>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500 font-mono text-xs cursor-pointer [color-scheme:dark]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Select any custom date to backdate receipts or schedule future transactions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Food & Groceries">Food & Groceries</option>
                    <option value="Housing & Living">Housing & Living / Rent</option>
                    <option value="Salary">Salary / Income</option>
                    <option value="Investment">Investment & Savings</option>
                    <option value="Entertainment">Entertainment & Date Night</option>
                    <option value="Utilities">Utilities & Bills</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Payer</label>
                  <select
                    value={txUser}
                    onChange={(e) => setTxUser(e.target.value as FinancePayer)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="berk">🦁 Berk</option>
                    <option value="jaquilyn">🌸 Jaquilyn</option>
                    <option value="shared">🤝 Shared</option>
                    <option value="family">🏠 Family (Family Support)</option>
                  </select>
                </div>
              </div>

              {txUser === 'family' && (
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/25 flex items-start gap-2 text-[11px] text-indigo-300 animate-fade-in">
                  <HeartHandshake className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Family Aid Rule:</strong> Amounts paid by family are <strong>never deducted</strong> from your couple net worth or monthly savings. They appear solely on the expense breakdown for full transparency.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors mt-2 cursor-pointer"
              >
                {editingTxId ? 'Update Transaction' : 'Save Transaction'}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD RECURRING PAYMENT                           */}
      {/* ======================================================== */}
      {showRecurringModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-amber-400" />
                <span>{editingRecurringId ? 'Edit Recurring Payment' : 'Add Recurring Payment'}</span>
              </h3>
              <button
                onClick={() => setShowRecurringModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleSaveRecurring} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecType('expense')}
                    className={`py-2 rounded-xl text-xs font-semibold ${recType === 'expense' ? 'bg-rose-600 text-white' : 'bg-[#161e2c] text-slate-400'}`}
                  >
                    Recurring Expense (Rent, Bills...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecType('income')}
                    className={`py-2 rounded-xl text-xs font-semibold ${recType === 'income' ? 'bg-emerald-600 text-white' : 'bg-[#161e2c] text-slate-400'}`}
                  >
                    Recurring Income (Salary...)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apartment Rent, Internet & Utilities, Salary..."
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    required
                    step="any"
                    placeholder="45000"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                  <select
                    value={recCurrency}
                    onChange={(e) => setRecCurrency(e.target.value as Currency)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={recDay}
                    onChange={(e) => setRecDay(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Payer</label>
                  <select
                    value={recUser}
                    onChange={(e) => setRecUser(e.target.value as FinancePayer)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="berk">🦁 Berk</option>
                    <option value="jaquilyn">🌸 Jaquilyn</option>
                    <option value="shared">🤝 Shared</option>
                    <option value="family">🏠 Family (Family Support)</option>
                  </select>
                </div>
              </div>

              {recUser === 'family' && (
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/25 flex items-start gap-2 text-[11px] text-indigo-300 animate-fade-in">
                  <HeartHandshake className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Family Support Rule:</strong> When this monthly payment is processed, it does not decrease your own savings; it is recognized as family contribution.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors mt-2 cursor-pointer"
              >
                {editingRecurringId ? 'Save Changes' : 'Save Recurring Payment'}
              </button>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD / EDIT ASSET                                */}
      {/* ======================================================== */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-amber-400" />
                <span>{editingAssetId ? 'Edit Portfolio Asset' : 'Add New Portfolio Asset'}</span>
              </h3>
              <button
                onClick={() => setShowAssetModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleSaveAsset} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physical Gold Savings, Apple Stocks, Bitcoin..."
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                    <select
                      value={assetCategory}
                      onChange={(e) => setAssetCategory(e.target.value as InvestmentAsset['category'])}
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="gold">🪙 Physical Gold</option>
                      <option value="cash_savings">💵 Cash / Savings Fund</option>
                      <option value="stocks">📈 Stocks & ETFs</option>
                      <option value="crypto">⚡ Crypto</option>
                      <option value="real_estate">🏢 Real Estate / Land</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Currency</label>
                    <select
                      value={assetCurrency}
                      onChange={(e) => setAssetCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="TRY">TRY (₺)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Current Value</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="650000"
                      value={assetValue}
                      onChange={(e) => setAssetValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Value (Optional)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="1200000"
                      value={assetTarget}
                      onChange={(e) => setAssetTarget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Monthly Contribution (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="25000"
                    value={assetContribution}
                    onChange={(e) => setAssetContribution(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAssetModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors cursor-pointer shadow-md"
                  >
                    {editingAssetId ? 'Update Asset' : 'Save Asset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
