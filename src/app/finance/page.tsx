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
  RefreshCw, 
  BarChart3, 
  Calendar,
  X,
  CheckCircle2
} from 'lucide-react';
import { FinanceItem, InvestmentAsset, CompoundInterestAccount, Currency, CoupleUser } from '@/types';
import { 
  fetchFinanceData, 
  saveTransaction, 
  saveCompoundAccount,
  convertCurrency, 
  calculate12MonthTrajectory,
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
  source: string;
  bankDate: string;
  lastUpdated: string;
  rates: Record<Currency, number>;
}

export default function FinancePage() {
  const { currentUser } = useCurrentUser();

  // Currency selection: Default is TRY
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('TRY');

  // KKTC Merkez Bankası Live Rates
  const [bankInfo, setBankInfo] = useState<KKTCBankRateInfo>({
    source: 'KKTC MB',
    bankDate: '19.10.2026',
    lastUpdated: '17.10.2026 11:34',
    rates: DEFAULT_KKTC_RATES,
  });
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  // Data states
  const [transactions, setTransactions] = useState<FinanceItem[]>(INITIAL_TRANSACTIONS);
  const [assets, setAssets] = useState<InvestmentAsset[]>(INITIAL_ASSETS);
  const [compoundAccounts, setCompoundAccounts] = useState<CompoundInterestAccount[]>(INITIAL_COMPOUND_ACCOUNTS);
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>(INITIAL_COMPOUND_ACCOUNTS[0]?.id || 'c-1');

  // Tabs: overview | compound | simulation | transactions
  const [activeTab, setActiveTab] = useState<'overview' | 'compound' | 'simulation' | 'transactions'>('overview');

  // New Transaction Modal State
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<Currency>('TRY');
  const [txType, setTxType] = useState<'income' | 'expense' | 'investment'>('expense');
  const [txCategory, setTxCategory] = useState('Market & Yemek');
  const [txUser, setTxUser] = useState<CoupleUser | 'shared'>('shared');

  // New Compound Account Modal State
  const [showAddCompoundModal, setShowAddCompoundModal] = useState(false);
  const [cpName, setCpName] = useState('');
  const [cpPrincipal, setCpPrincipal] = useState('200000');
  const [cpCurrency, setCpCurrency] = useState<Currency>('TRY');
  const [cpRate, setCpRate] = useState('48');
  const [cpTax, setCpTax] = useState('10');
  const [cpNote, setCpNote] = useState('Aylık faiz anaparaya eklenerek katlanıyor');

  // Simulation parameters (in TRY by default)
  const [simMonthlyTRY, setSimMonthlyTRY] = useState<number>(35000); // 35,000 TRY/month
  const [simAnnualReturn, setSimAnnualReturn] = useState<number>(30); // 30% balanced TRY yield

  // Fetch KKTC MB live rates
  const loadRates = async () => {
    setIsRefreshingRates(true);
    try {
      const res = await fetch('/api/finance/rates');
      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          setBankInfo(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRefreshingRates(false);
    }
  };

  useEffect(() => {
    loadRates();
    const interval = setInterval(loadRates, 60000); // refresh every minute

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
  const liveRates = bankInfo.rates;

  // Total Net Worth calculated in selected currency
  const totalNetWorthTRY = assets.reduce((sum, a) => {
    return sum + convertCurrency(a.current_value, a.currency, 'TRY', liveRates);
  }, 0);
  const totalNetWorth = convertCurrency(totalNetWorthTRY, 'TRY', selectedCurrency, liveRates);

  // Monthly Income & Expense
  const monthlyIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const monthlyExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency, liveRates), 0);

  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  // 5-Year compound projection in selected currency
  const calculate5YearProjection = (years: number) => {
    const r = simAnnualReturn / 100;
    const n = 12;
    const P = totalNetWorthTRY;
    const PMT = simMonthlyTRY;

    const compoundP = P * Math.pow(1 + r / n, n * years);
    const compoundPMT = PMT * ((Math.pow(1 + r / n, n * years) - 1) / (r / n));
    const totalTRY = compoundP + compoundPMT;

    return convertCurrency(totalTRY, 'TRY', selectedCurrency, liveRates);
  };

  // Selected Compound Account Trajectory
  const activeCompoundAccount =
    compoundAccounts.find((a) => a.id === selectedCompoundId) || compoundAccounts[0];
  const trajectory = activeCompoundAccount
    ? calculate12MonthTrajectory(activeCompoundAccount)
    : null;

  // Add Transaction Handler
  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || !txAmount) return;

    const newTx: Partial<FinanceItem> = {
      title: txTitle,
      amount: parseFloat(txAmount),
      currency: txCurrency,
      type: txType,
      category: txCategory,
      user: txUser,
      date: new Date().toISOString().split('T')[0],
      recurring: false,
    };

    const saved = await saveTransaction(newTx);
    setTransactions([saved, ...transactions]);
    setShowAddTxModal(false);
    setTxTitle('');
    setTxAmount('');

    confetti({ particleCount: 35, spread: 45, origin: { y: 0.6 } });
  };

  // Add Compound Account Handler
  const handleAddCompound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim() || !cpPrincipal || !cpRate) return;

    const newAcc: CompoundInterestAccount = {
      id: `c-${Date.now()}`,
      name: cpName,
      principal: parseFloat(cpPrincipal),
      currency: cpCurrency,
      annualRate: parseFloat(cpRate),
      compoundingFrequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      withholdingTax: parseFloat(cpTax) || 0,
      note: cpNote,
    };

    const updated = saveCompoundAccount(newAcc);
    setCompoundAccounts(updated);
    setSelectedCompoundId(newAcc.id);
    setShowAddCompoundModal(false);
    setCpName('');

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* 1. KKTC Merkez Bankası Live Rate Bar */}
      <div className="bg-[#121824] border border-white/[0.08] rounded-2xl p-3 flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-300">KKTC Merkez Bankası Canlı Kuru</span>
            <span>•</span>
            <span>{bankInfo.lastUpdated}</span>
          </div>
          <div className="flex items-center gap-3 font-mono font-bold text-xs text-white pt-0.5">
            <span>$1 = {bankInfo.rates.USD.toFixed(2)}₺</span>
            <span className="text-slate-600">|</span>
            <span>£1 = {bankInfo.rates.GBP.toFixed(2)}₺</span>
          </div>
        </div>

        <button
          onClick={loadRates}
          disabled={isRefreshingRates}
          className="p-2 rounded-xl bg-[#161e2c] border border-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Kurları Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRates ? 'animate-spin text-rose-400' : ''}`} />
        </button>
      </div>

      {/* 2. Top Net Worth Card & Currency Selector (Default: TRY) */}
      <div className="card-cozy p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-rose-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            <span>Ortak Finansal Yuva</span>
          </span>

          {/* Currency Toggle: TRY (Varsayılan), USD, GBP */}
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

        {/* Net Worth */}
        <div>
          <span className="text-[11px] text-slate-400 font-medium">Toplam Ortak Varlığımız</span>
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono mt-0.5">
            {symbol}{Math.round(totalNetWorth).toLocaleString()}
          </div>
        </div>

        {/* Monthly Income / Expense */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mb-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>Aylık Gelir</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              +{symbol}{Math.round(monthlyIncome).toLocaleString()}
            </div>
          </div>

          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold mb-0.5">
              <ArrowDownRight className="w-3 h-3" />
              <span>Aylık Gider</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              -{symbol}{Math.round(monthlyExpense).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Savings indicator */}
        <div className="flex items-center justify-between text-[11px] bg-[#141b28] px-3 py-2 rounded-xl border border-white/[0.06]">
          <span className="text-slate-300 font-medium">Ortak Tasarruf Oranımız:</span>
          <span className="text-emerald-400 font-mono font-bold">%{savingsRate} (Tasarruf: {symbol}{Math.round(monthlySavings).toLocaleString()})</span>
        </div>
      </div>

      {/* 3. Sub Tabs (Faiz Getirisi, Varlık Dağılımı, 5 Yıllık Projeksiyon, Gelir-Gider) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'compound', label: '📈 Faiz Getirisi (Bileşik)' },
          { id: 'overview', label: 'Varlık Dağılımı' },
          { id: 'simulation', label: '5 Yıl Gelecek' },
          { id: 'transactions', label: 'Gelir & Giderler' },
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
      {/* TAB 1: FAİZ GETİRİSİ (BİLEŞİK FAİZ HESAPLAMA & TRAJECTORY) */}
      {/* ======================================================== */}
      {activeTab === 'compound' && (
        <div className="space-y-3">
          <div className="card-cozy p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bileşik Faiz Getirisi & Katlanma Motoru</span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Faiz her ay anaparanın üzerine eklenerek büyür (Bileşik Kartopu)
                </p>
              </div>
              <button
                onClick={() => setShowAddCompoundModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Hesap Ekle</span>
              </button>
            </div>

            {/* Account Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2">
              {compoundAccounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setSelectedCompoundId(acc.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
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
              {/* Account Summary Stats */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Başlangıç Anaparası</span>
                  <div className="font-mono text-lg font-bold text-white">
                    {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {activeCompoundAccount.principal.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium">
                    Yıllık %{activeCompoundAccount.annualRate} • Net Stopaj: %{activeCompoundAccount.withholdingTax}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">1 Yıl Sonu Toplam Bakiye</span>
                  <div className="font-mono text-xl font-extrabold text-emerald-400">
                    {CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.finalBalance).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-300/80 font-mono font-semibold">
                    Net Kar: +{CURRENCY_SYMBOLS[activeCompoundAccount.currency]}
                    {Math.round(trajectory.totalInterestEarned).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Monthly Passive Income Badge */}
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

              {/* Visual 1-Year Monthly Trajectory Chart (Bars) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>1 Yıllık Bileşik Büyüme Trajectory Grafiği</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">12 Ay</span>
                </div>

                {/* Bar Graph Simulation */}
                <div className="h-28 flex items-end justify-between gap-1 bg-[#141b28] p-3 rounded-2xl border border-white/[0.06]">
                  {trajectory.points.map((pt) => {
                    const maxBal = trajectory.finalBalance;
                    const minBal = activeCompoundAccount.principal * 0.9;
                    const heightPercent = Math.max(
                      15,
                      Math.round(((pt.endingBalance - minBal) / (maxBal - minBal)) * 100)
                    );

                    return (
                      <div key={pt.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip on hover/touch */}
                        <div className="hidden group-hover:block absolute bottom-full mb-1.5 p-1.5 bg-[#090d16] border border-white/20 rounded-lg text-[9px] font-mono whitespace-nowrap z-20 text-white shadow-xl">
                          <div>Ay {pt.month}</div>
                          <div className="text-emerald-400">+{Math.round(pt.monthlyInterest)} faiz</div>
                          <div>{Math.round(pt.endingBalance)} top</div>
                        </div>

                        {/* Bar */}
                        <div
                          className="w-full bg-gradient-to-t from-amber-500 to-rose-500 rounded-t-md transition-all group-hover:brightness-125"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="text-[9px] text-slate-500 font-mono">{pt.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trajectory Table / Breakdown */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-slate-300">Aylık Bileşik Döküm (İlk 6 Ay & Yıl Sonu)</span>
                <div className="space-y-1.5 text-[11px]">
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
                            (Bu ay +{Math.round(pt.monthlyInterest).toLocaleString()})
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
      {/* TAB 2: VARLIK DAĞILIMI (PORTFÖY)                         */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              <span>Yatırımlar & Portföyümüz</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{assets.length} Varlık Kalemi</span>
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
      {/* TAB 3: 5 YILLIK PROJEKSİYON                              */}
      {/* ======================================================== */}
      {activeTab === 'simulation' && (
        <div className="card-cozy p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5 Yıl Sonra Nerede Olacağız?</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Aylık düzenli tasarruf ve bileşik büyüme ile 5 yıllık ortak servet projeksiyonu
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
                max="150000"
                step="2500"
                value={simMonthlyTRY}
                onChange={(e) => setSimMonthlyTRY(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="text-[11px] text-slate-300 mb-1.5">Yıllık Ortalama Getiri Oranı:</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Koruma (%20)', val: 20 },
                  { label: 'Dengeli (%30)', val: 30 },
                  { label: 'Bileşik (%45)', val: 45 },
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

          {/* Milestones */}
          <div className="space-y-2 pt-1">
            {[
              { year: 1, title: '1. Yıl Sonu', badge: '🛡️ Güçlü Acil Fon & Yatırım İvmesi' },
              { year: 2, title: '2. Yıl Sonu', badge: '✈️ Büyük Tatil & Güçlü Portföy' },
              { year: 3, title: '3. Yıl Sonu', badge: '🏠 Ortak Gayrimenkul / Ev Peşinatı' },
              { year: 5, title: '5. Yıl Sonu', badge: '👑 Finansal Özgürlük & Rahat Yaşam' },
            ].map((milestone) => {
              const amount = calculate5YearProjection(milestone.year);
              return (
                <div
                  key={milestone.year}
                  className="p-3.5 rounded-2xl bg-[#141b28] border border-white/[0.06] flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold">{milestone.title}</span>
                    <div className="text-[10px] text-amber-300/90 font-medium mt-0.5">
                      {milestone.badge}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-extrabold text-white">
                      {symbol}{Math.round(amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: GELİR & GİDERLER                                  */}
      {/* ======================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white">Gelir & Gider Kayıtları</span>
            <button
              onClick={() => setShowAddTxModal(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni İşlem</span>
            </button>
          </div>

          <div className="space-y-2">
            {transactions.map((t) => {
              const isIncome = t.type === 'income';
              const isInvest = t.type === 'investment';
              const userLabel =
                t.user === 'berk' ? '🦁 Berk' : t.user === 'jaquilyn' ? '🌸 Jaq' : '🤝 Ortak';

              return (
                <div
                  key={t.id}
                  className="card-cozy p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white text-xs">{t.title}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>{userLabel}</span>
                      <span>•</span>
                      <span>{t.category}</span>
                      <span>•</span>
                      <span>{formatDateDDMMYYYY(t.date)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-mono font-bold text-xs ${
                        isIncome
                          ? 'text-emerald-400'
                          : isInvest
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{CURRENCY_SYMBOLS[t.currency]}{t.amount.toLocaleString()}
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono capitalize">
                      {t.type === 'investment' ? 'Yatırım' : t.type === 'income' ? 'Gelir' : 'Gider'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action CTA Button at bottom */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => setShowAddCompoundModal(true)}
          className="py-2.5 rounded-2xl bg-[#161e2c] border border-amber-500/30 hover:border-amber-500 text-amber-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Percent className="w-3.5 h-3.5" />
          <span>+ Faiz Hesabı</span>
        </button>

        <button
          onClick={() => setShowAddTxModal(true)}
          className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Gelir / Gider</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FAİZ HESABI EKLE (COMPOUND ACCOUNT MODAL)      */}
      {/* ======================================================== */}
      {showAddCompoundModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-400" />
                <span>Yeni Bileşik Faiz Hesabı Ekle</span>
              </h3>
              <button
                onClick={() => setShowAddCompoundModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCompound} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hesap Adı / Banka</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Akbank Vadeli TRY, Sterlin Mevduatı..."
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
                    placeholder="250000"
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
                <label className="block text-[11px] text-slate-400 mb-1">Not / Açıklama</label>
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
                Hesabı Kaydet & Trajectory'yi Göster
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GELİR / GİDER EKLE                             */}
      {/* ======================================================== */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white">Yeni Finans İşlemi Ekle</h3>
              <button
                onClick={() => setShowAddTxModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTx} className="space-y-3 text-xs">
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
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
