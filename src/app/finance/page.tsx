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
  HelpCircle
} from 'lucide-react';
import { FinanceItem, InvestmentAsset, CompoundInterestAccount, Currency, CoupleUser } from '@/types';
import { 
  fetchFinanceData, 
  saveTransaction, 
  deleteTransaction,
  saveCompoundAccount,
  deleteCompoundAccount,
  convertCurrency, 
  calculate12MonthTrajectory,
  calculateTotalMonthlyInterestTRY,
  CURRENCY_SYMBOLS,
  DEFAULT_KKTC_RATES,
  INITIAL_TRANSACTIONS,
  INITIAL_ASSETS,
  INITIAL_COMPOUND_ACCOUNTS
} from '@/lib/finance-service';
import { useCurrentUser } from '@/components/UserContext';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';

interface KKTCBankRateInfo {
  rates: Record<Currency, number>;
}

export default function FinancePage() {
  const { currentUser } = useCurrentUser();

  // Currency selection: Default is TRY
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('TRY');

  // Background KKTC MB live rates (Silent auto-fetch)
  const [liveRates, setLiveRates] = useState<Record<Currency, number>>(DEFAULT_KKTC_RATES);

  // Data states
  const [transactions, setTransactions] = useState<FinanceItem[]>(INITIAL_TRANSACTIONS);
  const [assets, setAssets] = useState<InvestmentAsset[]>(INITIAL_ASSETS);
  const [compoundAccounts, setCompoundAccounts] = useState<CompoundInterestAccount[]>(INITIAL_COMPOUND_ACCOUNTS);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>(INITIAL_COMPOUND_ACCOUNTS[0]?.id || 'c-1');

  // Tabs: compound | overview | simulation | transactions
  const [activeTab, setActiveTab] = useState<'compound' | 'overview' | 'simulation' | 'transactions'>('compound');

  // Transaction Modal State (Add or Edit)
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<Currency>('TRY');
  const [txType, setTxType] = useState<'income' | 'expense' | 'investment'>('expense');
  const [txCategory, setTxCategory] = useState('Market & Yemek');
  const [txUser, setTxUser] = useState<CoupleUser | 'shared'>('shared');

  // Compound Account Modal State (Add or Edit)
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [editingCompoundId, setEditingCompoundId] = useState<string | null>(null);
  const [cpName, setCpName] = useState('');
  const [cpPrincipal, setCpPrincipal] = useState('350000');
  const [cpCurrency, setCpCurrency] = useState<Currency>('TRY');
  const [cpRate, setCpRate] = useState('48');
  const [cpTax, setCpTax] = useState('10');
  const [cpNote, setCpNote] = useState('Aylık faiz anaparaya eklenerek katlanıyor');

  // Realistic Simulation parameters (in TRY)
  const [simMonthlyTRY, setSimMonthlyTRY] = useState<number>(35000); // 35,000 TRY/month
  const [simAnnualReturn, setSimAnnualReturn] = useState<number>(25); // 25% net annual compound yield

  // Auto-fetch KKTC rates in background silently
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

    fetchFinanceData().then((data) => {
      if (data.transactions) setTransactions(data.transactions);
      if (data.assets) setAssets(data.assets);
      if (data.compoundAccounts && data.compoundAccounts.length > 0) {
        setCompoundAccounts(data.compoundAccounts);
      }
    });

    return () => clearInterval(interval);
  }, []);

  const symbol = CURRENCY_SYMBOLS[selectedCurrency];

  // Total Monthly Compound Interest calculated from active accounts (in TRY then converted)
  const totalMonthlyInterestTRY = calculateTotalMonthlyInterestTRY(compoundAccounts, liveRates);
  const totalMonthlyInterestSelected = convertCurrency(totalMonthlyInterestTRY, 'TRY', selectedCurrency, liveRates);

  // Total Net Worth
  const totalNetWorthTRY = assets.reduce((sum, a) => {
    return sum + convertCurrency(a.current_value, a.currency, 'TRY', liveRates);
  }, 0);
  const totalNetWorth = convertCurrency(totalNetWorthTRY, 'TRY', selectedCurrency, liveRates);

  // Monthly Income (Manual Transactions + Automatic Interest Income)
  const manualMonthlyIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const totalMonthlyIncome = manualMonthlyIncome + totalMonthlyInterestSelected;

  // Monthly Expense
  const totalMonthlyExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  // Monthly Investments
  const totalMonthlyInvestments = transactions
    .filter((t) => t.type === 'investment')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const monthlySavings = totalMonthlyIncome - totalMonthlyExpense;
  const savingsRate = totalMonthlyIncome > 0 ? Math.round((monthlySavings / totalMonthlyIncome) * 100) : 0;

  // Realistic 5-Year Calculation Breakdown:
  // 1. Principal saved directly from pocket: P + (PMT * 12 * years)
  // 2. Compounded return on initial P and regular additions
  const calculateRealistic5Year = (years: number) => {
    const r = simAnnualReturn / 100;
    const n = 12;
    const P = totalNetWorthTRY;
    const PMT = simMonthlyTRY;

    // Direct out-of-pocket savings
    const pocketPrincipal = P + (PMT * 12 * years);

    // Compound interest on starting principal + monthly payments
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

  // Handle Save Transaction (Add or Edit)
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || !txAmount) return;

    const item: Partial<FinanceItem> = {
      id: editingTxId || undefined,
      title: txTitle,
      amount: parseFloat(txAmount),
      currency: txCurrency,
      type: txType,
      category: txCategory,
      user: txUser,
      date: new Date().toISOString().split('T')[0],
      recurring: false,
    };

    const saved = await saveTransaction(item);
    if (editingTxId) {
      setTransactions(transactions.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      setTransactions([saved, ...transactions]);
    }

    setShowTxModal(false);
    setEditingTxId(null);
    setTxTitle('');
    setTxAmount('');
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
    setShowTxModal(true);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm('Bu işlemi silmek istediğinden emin misin?')) {
      const updated = deleteTransaction(id);
      setTransactions(updated);
    }
  };

  // Handle Save Compound Account (Add or Edit)
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
      startDate: new Date().toISOString().split('T')[0],
      withholdingTax: parseFloat(cpTax) || 0,
      note: cpNote,
    };

    const updated = saveCompoundAccount(account);
    setCompoundAccounts(updated);
    setSelectedCompoundId(account.id);
    setShowCompoundModal(false);
    setEditingCompoundId(null);
    setCpName('');
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  const handleEditCompound = (acc: CompoundInterestAccount) => {
    setEditingCompoundId(acc.id);
    setCpName(acc.name);
    setCpPrincipal(acc.principal.toString());
    setCpCurrency(acc.currency);
    setCpRate(acc.annualRate.toString());
    setCpTax(acc.withholdingTax.toString());
    setCpNote(acc.note || '');
    setShowCompoundModal(true);
  };

  const handleDeleteCompound = (id: string) => {
    if (confirm('Bu faiz hesabını silmek istediğinden emin misin?')) {
      const updated = deleteCompoundAccount(id);
      setCompoundAccounts(updated);
      if (updated.length > 0) {
        setSelectedCompoundId(updated[0].id);
      }
    }
  };

  // Split transactions for clean separate presentation
  const incomeList = transactions.filter((t) => t.type === 'income');
  const expenseList = transactions.filter((t) => t.type === 'expense');
  const investmentList = transactions.filter((t) => t.type === 'investment');

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* 1. Main Overview Card (Default: TRY, Currency Toggle: TRY, USD, GBP) */}
      <div className="card-cozy p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-rose-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            <span>Ortak Finansal Yuva</span>
          </span>

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
        <div>
          <span className="text-[11px] text-slate-400 font-medium">Toplam Ortak Varlığımız</span>
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono mt-0.5">
            {symbol}{Math.round(totalNetWorth).toLocaleString()}
          </div>
        </div>

        {/* Monthly Incomes & Expenses (Includes auto-calculated interest income!) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mb-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>Aylık Toplam Gelir</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              +{symbol}{Math.round(totalMonthlyIncome).toLocaleString()}
            </div>
          </div>

          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold mb-0.5">
              <ArrowDownRight className="w-3 h-3" />
              <span>Aylık Toplam Gider</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              -{symbol}{Math.round(totalMonthlyExpense).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Indicator 1: Ortak Tasarruf Oranımız */}
        <div className="flex items-center justify-between text-[11px] bg-[#141b28] px-3 py-2 rounded-xl border border-white/[0.06]">
          <span className="text-slate-300 font-medium">Ortak Tasarruf Oranımız:</span>
          <span className="text-emerald-400 font-mono font-bold">
            %{savingsRate} (Tasarruf: {symbol}{Math.round(monthlySavings).toLocaleString()})
          </span>
        </div>

        {/* Indicator 2: Aylık Yatırım & Faiz Gelirimiz (Same design requested) */}
        <div className="flex items-center justify-between text-[11px] bg-[#141b28] px-3 py-2 rounded-xl border border-white/[0.06]">
          <span className="text-slate-300 font-medium">Aylık Yatırım & Faiz Gelirimiz:</span>
          <span className="text-amber-400 font-mono font-bold">
            +{symbol}{Math.round(totalMonthlyInterestSelected).toLocaleString()} / ay (Pasif Nakit Akışı)
          </span>
        </div>
      </div>

      {/* 2. Sub Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'compound', label: '📈 Faiz Getirisi (Bileşik)' },
          { id: 'transactions', label: 'Gelir & Giderler' },
          { id: 'overview', label: 'Varlık Dağılımı' },
          { id: 'simulation', label: '5 Yıl Gelecek' },
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
      {/* TAB 1: FAİZ GETİRİSİ (BİLEŞİK FAİZ & TRAJECTORY GRAFİĞİ) */}
      {/* ======================================================== */}
      {activeTab === 'compound' && (
        <div className="space-y-3">
          {/* Header & Account Pills */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bileşik Faiz Getirisi Motoru</span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Faiz her ay anaparanın üzerine eklenerek katlanır (Bileşik Kartopu)
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCompoundId(null);
                  setCpName('');
                  setCpPrincipal('350000');
                  setCpRate('48');
                  setCpTax('10');
                  setShowCompoundModal(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Hesap Ekle</span>
              </button>
            </div>

            {/* Account Selector Pills */}
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
                  {acc.name} (%{acc.annualRate} {acc.currency})
                </button>
              ))}
            </div>
          </div>

          {activeCompoundAccount && trajectory && (
            <div className="card-cozy p-5 space-y-4">
              {/* Account Card Header with Edit/Delete */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{activeCompoundAccount.name}</span>
                    <button
                      onClick={() => handleEditCompound(activeCompoundAccount)}
                      className="text-slate-400 hover:text-amber-400"
                      title="Hesabı Düzenle"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {compoundAccounts.length > 1 && (
                      <button
                        onClick={() => handleDeleteCompound(activeCompoundAccount.id)}
                        className="text-slate-400 hover:text-rose-400"
                        title="Hesabı Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                    Anapara: {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {activeCompoundAccount.principal.toLocaleString()} • Yıllık %{activeCompoundAccount.annualRate} • Net Stopaj: %{activeCompoundAccount.withholdingTax}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">1 Yıl Sonu Bakiye</span>
                  <div className="font-mono text-lg font-extrabold text-emerald-400">
                    {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.finalBalance).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-300/80 font-mono font-semibold">
                    Net Kar: +{CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.totalInterestEarned).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Passive Income Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Aylık Ortalama Pasif Getiri</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    +{CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.monthlyAveragePassiveIncome).toLocaleString()} / ay
                  </span>
                </div>
                <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Efektif Yıllık Bileşik Getiri</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    %{trajectory.effectiveAnnualYield.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 1-Year Monthly Trajectory Chart (Fixed Heights & Clear Render) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>1 Yıllık Bileşik Büyüme Trajectory Grafiği</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">12 Ay</span>
                </div>

                {/* Explicit Height Bar Graph */}
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
                          {/* Tooltip */}
                          <div className="hidden group-hover:block absolute bottom-full mb-1.5 p-1.5 bg-[#090d16] border border-white/20 rounded-lg text-[9px] font-mono whitespace-nowrap z-30 text-white shadow-xl pointer-events-none">
                            <div className="font-bold">{pt.month}. Ay</div>
                            <div className="text-emerald-400">+{Math.round(pt.monthlyInterest).toLocaleString()} faiz</div>
                            <div>{Math.round(pt.endingBalance).toLocaleString()} bakiye</div>
                          </div>

                          {/* Bar with explicit px height */}
                          <div
                            className="w-full max-w-[18px] bg-gradient-to-t from-amber-600 via-amber-500 to-rose-500 rounded-t-md transition-all group-hover:brightness-125"
                            style={{ height: `${heightPx}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Month Numbers Row */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-white/[0.06]">
                    {trajectory.points.map((pt) => (
                      <span key={pt.month} className="flex-1 text-center">
                        {pt.month}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trajectory Breakdown Summary */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <span className="font-bold text-slate-300">Aylık Bileşik İlerleme Dökümü</span>
                <div className="space-y-1">
                  {[trajectory.points[0], trajectory.points[2], trajectory.points[5], trajectory.points[11]].map(
                    (pt) => (
                      <div
                        key={pt.month}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#161e2c] border border-white/[0.04]"
                      >
                        <span className="font-semibold text-slate-300">{pt.month}. Ay Sonu</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-white">
                            {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                            {Math.round(pt.endingBalance).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-mono block">
                            (+{Math.round(pt.monthlyInterest).toLocaleString()} net faiz)
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GELİR & GİDERLER (AYRI BAŞLIKLAR & OTOMATİK FAİZ)  */}
      {/* ======================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white">Gelir, Gider & Yatırım Dökümü</span>
            <button
              onClick={() => {
                setEditingTxId(null);
                setTxTitle('');
                setTxAmount('');
                setShowTxModal(true);
              }}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni İşlem</span>
            </button>
          </div>

          {/* Section 1: GELİRLER */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" />
                <span>Aylık Gelirlerimiz</span>
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                +{symbol}{Math.round(totalMonthlyIncome).toLocaleString()}
              </span>
            </div>

            {/* Automatic Compound Interest Income Row */}
            {totalMonthlyInterestSelected > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aylık Vadeli Faiz Getirisi</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80">
                    Faiz hesaplarından otomatik hesaplanan pasif getiri
                  </span>
                </div>
                <div className="font-mono font-bold text-amber-300 text-xs">
                  +{symbol}{Math.round(totalMonthlyInterestSelected).toLocaleString()}
                </div>
              </div>
            )}

            {/* Income items */}
            <div className="space-y-1.5">
              {incomeList.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-[#161e2c] border border-white/[0.04] flex items-center justify-between text-xs group"
                >
                  <div>
                    <div className="font-bold text-white text-xs">{t.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {t.user === 'berk' ? '🦁 Berk' : t.user === 'jaquilyn' ? '🌸 Jaq' : '🤝 Ortak'} • {t.category} • {formatDateDDMMYYYY(t.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      +{CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleEditTx(t)}
                      className="text-slate-500 hover:text-white p-1"
                      title="Düzenle"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTx(t.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: GİDERLER */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4" />
                <span>Aylık Giderlerimiz</span>
              </span>
              <span className="font-mono text-xs font-bold text-rose-400">
                -{symbol}{Math.round(totalMonthlyExpense).toLocaleString()}
              </span>
            </div>

            <div className="space-y-1.5">
              {expenseList.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl bg-[#161e2c] border border-white/[0.04] flex items-center justify-between text-xs group"
                >
                  <div>
                    <div className="font-bold text-white text-xs">{t.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {t.user === 'berk' ? '🦁 Berk' : t.user === 'jaquilyn' ? '🌸 Jaq' : '🤝 Ortak'} • {t.category} • {formatDateDDMMYYYY(t.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-rose-400 text-xs">
                      -{CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleEditTx(t)}
                      className="text-slate-500 hover:text-white p-1"
                      title="Düzenle"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTx(t.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: YATIRIMLAR */}
          <div className="card-cozy p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>Yatırımlarımız & Birikim Aktarımları</span>
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
                    <div className="text-[10px] text-slate-400">
                      {t.user === 'berk' ? '🦁 Berk' : t.user === 'jaquilyn' ? '🌸 Jaq' : '🤝 Ortak'} • {t.category} • {formatDateDDMMYYYY(t.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleEditTx(t)}
                      className="text-slate-500 hover:text-white p-1"
                      title="Düzenle"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteTx(t.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: VARLIK DAĞILIMI (PORTFÖY)                         */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              <span>Varlık Dağılımı & Portföyümüz</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{assets.length} Kalem</span>
          </div>

          <div className="space-y-2.5">
            {assets.map((asset) => {
              const val = convertCurrency(asset.current_value, asset.currency, selectedCurrency, liveRates);
              const target = asset.target_value
                ? convertCurrency(asset.target_value, asset.currency, selectedCurrency, liveRates)
                : null;
              const percent = target ? Math.min(100, Math.round((val / target) * 100)) : 100;

              return (
                <div key={asset.id} className="card-cozy p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{asset.name}</h4>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {asset.category.replace('_', ' ')} • Orijinal: {CURRENCY_SYMBOLS[asset.currency]}
                        {asset.current_value.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-white">
                        {symbol}{Math.round(val).toLocaleString()}
                      </div>
                      {target && (
                        <div className="text-[9px] text-slate-500 font-mono">
                          Hedef: {symbol}{Math.round(target).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {target && (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>Hedefe İlerleme</span>
                        <span className="font-mono text-amber-400 font-semibold">%{percent}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: 5 YILLIK PROJEKSİYON (ŞEFFAF VE GERÇEKÇİ HESAP)  */}
      {/* ======================================================== */}
      {activeTab === 'simulation' && (
        <div className="card-cozy p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5 Yıllık Gelecek & Servet Projeksiyonu</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Şeffaf matematiksel model: Cebimizden çıkan birikim ve bileşik getiri katkısı
            </p>
          </div>

          {/* Mathematical Explanation Alert Box */}
          <div className="p-3 rounded-2xl bg-[#161e2c] border border-white/[0.06] text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>Bu Rakamlar Neye Göre Hesaplanıyor?</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[10px]">
              <strong>1. Cebimizden Çıkan Tasarruf:</strong> Mevcut anapara + (Aylık Tasarruf × 12 Ay × Yıl). Bu tutar sıfır riskli, kendi emeğimizle biriken paradır.
              <br />
              <strong>2. Bileşik Yatırım Getirisi:</strong> Her ay düzenli biriken paranın ve anaparanın seçtiğin yıllık getiri oranıyla (%{simAnnualReturn}) faiz ve fonlarda katlanarak ürettiği kârdır.
            </p>
          </div>

          {/* Interactive Parameters */}
          <div className="space-y-3 bg-[#161e2c] p-3.5 rounded-2xl border border-white/[0.04]">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>Aylık Ortak Tasarruf:</span>
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
              <div className="text-[11px] text-slate-300 mb-1.5">Yıllık Ortalama Net Getiri Oranı:</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Temkinli (%15)', val: 15 },
                  { label: 'Dengeli (%25)', val: 25 },
                  { label: 'Yüksek (%35)', val: 35 },
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

          {/* Realistic Breakdown Milestones */}
          <div className="space-y-2.5 pt-1">
            {[
              { year: 1, title: '1. Yıl Sonu', badge: '🛡️ Güçlü Acil Fon & Başlangıç' },
              { year: 2, title: '2. Yıl Sonu', badge: '✈️ Büyük Tatil & Yatırım İvmesi' },
              { year: 3, title: '3. Yıl Sonu', badge: '🏠 Ortak Gayrimenkul / Ev Peşinatı' },
              { year: 5, title: '5. Yıl Sonu', badge: '👑 Finansal Özgürlük Temeli' },
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

                  {/* Explicit breakdown between pocket savings and interest profit */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-1.5 border-t border-white/[0.04]">
                    <div>
                      <span className="text-slate-500 block">Kendi Biriktirdiğimiz:</span>
                      <span className="font-mono text-slate-300 font-semibold">
                        {symbol}{Math.round(res.pocketPrincipal).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Bileşik Getiri Kârı:</span>
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
      {/* MODAL 1: FAİZ HESABI EKLE / DÜZENLE                     */}
      {/* ======================================================== */}
      {showCompoundModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-400" />
                <span>{editingCompoundId ? 'Faiz Hesabını Düzenle' : 'Yeni Bileşik Faiz Hesabı Ekle'}</span>
              </h3>
              <button
                onClick={() => {
                  setShowCompoundModal(false);
                  setEditingCompoundId(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompound} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hesap Adı / Banka</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Akbank Vadeli TRY, Sterlin Fonu..."
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Anapara</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Para Birimi</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Yıllık Faiz Oranı (%)</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Stopaj Kesintisi (%)</label>
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

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Açıklama / Not</label>
                <input
                  type="text"
                  placeholder="Faiz her ay anaparaya ekleniyor..."
                  value={cpNote}
                  onChange={(e) => setCpNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs transition-colors mt-2 cursor-pointer"
              >
                {editingCompoundId ? 'Değişiklikleri Güncelle' : 'Hesabı Kaydet & Trajectory’yi Göster'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GELİR / GİDER EKLE VEYA DÜZENLE                 */}
      {/* ======================================================== */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white">
                {editingTxId ? 'İşlemi Düzenle' : 'Yeni Finans İşlemi Ekle'}
              </h3>
              <button
                onClick={() => {
                  setShowTxModal(false);
                  setEditingTxId(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tür</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'expense', label: 'Gider' },
                    { id: 'income', label: 'Gelir' },
                    { id: 'investment', label: 'Yatırım' },
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
                <label className="block text-[11px] text-slate-400 mb-1">Açıklama</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Market alışverişi, Kira, Fon alımı..."
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tutar</label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Para Birimi</label>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Kategori</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Market & Yemek">Market & Yemek</option>
                    <option value="Ev & Yaşam">Ev & Yaşam / Kira</option>
                    <option value="Maaş">Maaş / Gelir</option>
                    <option value="Yatırım">Yatırım & Altın</option>
                    <option value="Eğlence">Eğlence & Tarih Gecesi</option>
                    <option value="Faturalar">Faturalar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Kimin Adına?</label>
                  <select
                    value={txUser}
                    onChange={(e) => setTxUser(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="shared">🤝 Ortak</option>
                    <option value="berk">🦁 Berk</option>
                    <option value="jaquilyn">🌸 Jaquilyn</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors mt-2 cursor-pointer"
              >
                {editingTxId ? 'Değişiklikleri Güncelle' : 'Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
