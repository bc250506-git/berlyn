'use client';

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Plus, 
  DollarSign, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Target, 
  Calendar,
  Layers,
  X,
  Coins,
  ShieldCheck
} from 'lucide-react';
import { FinanceItem, InvestmentAsset, Currency, CoupleUser } from '@/types';
import { 
  fetchFinanceData, 
  saveTransaction, 
  convertCurrency, 
  CURRENCY_SYMBOLS,
  INITIAL_TRANSACTIONS,
  INITIAL_ASSETS
} from '@/lib/finance-service';
import { useCurrentUser } from '@/components/UserContext';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';

export default function FinancePage() {
  const { currentUser, profile } = useCurrentUser();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [transactions, setTransactions] = useState<FinanceItem[]>(INITIAL_TRANSACTIONS);
  const [assets, setAssets] = useState<InvestmentAsset[]>(INITIAL_ASSETS);
  const [activeTab, setActiveTab] = useState<'overview' | 'simulation' | 'transactions'>('overview');

  // New Transaction Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCurrency, setTxCurrency] = useState<Currency>('USD');
  const [txType, setTxType] = useState<'income' | 'expense' | 'investment'>('expense');
  const [txCategory, setTxCategory] = useState('Market & Yemek');
  const [txUser, setTxUser] = useState<CoupleUser | 'shared'>('shared');

  // Simulation Parameters
  const [simMonthlyContribution, setSimMonthlyContribution] = useState<number>(1200); // USD
  const [simAnnualReturn, setSimAnnualReturn] = useState<number>(10); // 10%

  useEffect(() => {
    fetchFinanceData().then((data) => {
      if (data.transactions) setTransactions(data.transactions);
      if (data.assets) setAssets(data.assets);
    });
  }, []);

  const symbol = CURRENCY_SYMBOLS[selectedCurrency];

  // Calculate Net Worth in selected currency
  const totalNetWorthUSD = assets.reduce((sum, a) => {
    return sum + convertCurrency(a.current_value, a.currency, 'USD');
  }, 0);
  const totalNetWorth = convertCurrency(totalNetWorthUSD, 'USD', selectedCurrency);

  // Monthly Income & Expenses in selected currency
  const monthlyIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency), 0);

  const monthlyExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, selectedCurrency), 0);

  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0;

  // 5-Year Compound Growth Calculation
  const calculateProjection = (years: number) => {
    const r = simAnnualReturn / 100; // Annual return rate
    const n = 12; // Compounded monthly
    const P = totalNetWorthUSD; // Starting Net Worth
    const PMT = simMonthlyContribution; // Monthly contribution in USD

    // Compound interest formula with monthly additions
    const compoundStarting = P * Math.pow(1 + r / n, n * years);
    const compoundContributions = PMT * ((Math.pow(1 + r / n, n * years) - 1) / (r / n));

    const totalUSD = compoundStarting + compoundContributions;
    return convertCurrency(totalUSD, 'USD', selectedCurrency);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
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
    setShowAddModal(false);
    setTxTitle('');
    setTxAmount('');

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* 1. Currency Toggle & Top Card */}
      <div className="card-cozy p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold uppercase tracking-wide">
            <Wallet className="w-3.5 h-3.5" />
            <span>Ortak Finans & Gelecek</span>
          </div>

          {/* Currency Selector */}
          <div className="flex items-center gap-1 bg-[#161e2c] p-1 rounded-xl border border-white/[0.08]">
            {(['USD', 'TRY', 'PHP', 'EUR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  selectedCurrency === c
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Net Worth Big Number */}
        <div>
          <span className="text-[11px] text-slate-400 font-medium">Toplam Ortak Varlığımız</span>
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono mt-0.5">
            {symbol}
            {Math.round(totalNetWorth).toLocaleString()}
          </div>
        </div>

        {/* Mini Income/Expense Bar */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mb-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>Aylık Gelir</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              +{symbol}
              {Math.round(monthlyIncome).toLocaleString()}
            </div>
          </div>

          <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold mb-0.5">
              <ArrowDownRight className="w-3 h-3" />
              <span>Aylık Gider</span>
            </div>
            <div className="font-mono font-bold text-white text-xs">
              -{symbol}
              {Math.round(monthlyExpense).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Savings Rate Indicator */}
        <div className="flex items-center justify-between text-[11px] bg-[#141b28] px-3 py-2 rounded-xl border border-white/[0.06]">
          <span className="text-slate-300 font-medium">Tasarruf Oranımız:</span>
          <span className="text-emerald-400 font-mono font-bold">%{savingsRate} (Harika Seviye 🚀)</span>
        </div>
      </div>

      {/* 2. Sub Tabs: Overview, 5-Year Simulation, Transactions */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Varlık Dağılımı' },
          { id: 'simulation', label: '5 Yıllık Projeksiyon' },
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

      {/* 3. Tab Contents */}

      {/* TAB 1: OVERVIEW (ASSETS) */}
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
              const val = convertCurrency(asset.current_value, asset.currency, selectedCurrency);
              const target = asset.target_value
                ? convertCurrency(asset.target_value, asset.currency, selectedCurrency)
                : null;
              const percent = target ? Math.min(100, Math.round((val / target) * 100)) : 100;

              return (
                <div key={asset.id} className="card-cozy p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{asset.name}</h4>
                      <span className="text-[10px] text-slate-400 capitalize">{asset.category.replace('_', ' ')}</span>
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

      {/* TAB 2: 5-YEAR WEALTH SIMULATION */}
      {activeTab === 'simulation' && (
        <div className="card-cozy p-5 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>5 Yıl Sonra Nerede Olacağız?</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Düzenli birikim ve bileşik getiri ile 1 ila 5 yıl sonraki ortak servetimiz
            </p>
          </div>

          {/* Interactive Parameters */}
          <div className="space-y-3 bg-[#161e2c] p-3.5 rounded-2xl border border-white/[0.04]">
            {/* Monthly Contribution Slider */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span>Aylık Ortak Tasarruf:</span>
                <span className="font-mono text-sm font-bold text-rose-400">
                  {symbol}{Math.round(convertCurrency(simMonthlyContribution, 'USD', selectedCurrency)).toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="300"
                max="5000"
                step="100"
                value={simMonthlyContribution}
                onChange={(e) => setSimMonthlyContribution(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Expected Annual Return selector */}
            <div>
              <div className="text-[11px] text-slate-300 mb-1.5">Yıllık Ortalama Getiri Beklentisi:</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Düşük (%6)', val: 6 },
                  { label: 'Dengeli (%10)', val: 10 },
                  { label: 'Büyüme (%14)', val: 14 },
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

          {/* Year Projections Milestone Cards */}
          <div className="space-y-2 pt-1">
            {[
              { year: 1, title: '1. Yıl Sonu', badge: '🛡️ Acil Durum & İlk Büyük Birikim' },
              { year: 2, title: '2. Yıl Sonu', badge: '✈️ Büyük Tatil & Yatırım Hızı' },
              { year: 3, title: '3. Yıl Sonu', badge: '🏠 Ortak Gayrimenkul / Yatırım Gücü' },
              { year: 5, title: '5. Yıl Sonu', badge: '👑 Finansal Bağımsızlık Temeli' },
            ].map((milestone) => {
              const projectedAmount = calculateProjection(milestone.year);
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
                      {symbol}{Math.round(projectedAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-white">Son Gelir & Giderler</span>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Ekle</span>
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

      {/* Quick Add Action Floating Bar at the bottom */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/20 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Yeni Gelir / Gider / Yatırım Ekle</span>
      </button>

      {/* Add Transaction Bottom Sheet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white">Yeni Finans İşlemi Ekle</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-3 text-xs">
              {/* Type Selector */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">İşlem Türü</label>
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

              {/* Title */}
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

              {/* Amount & Currency */}
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
                    <option value="USD">USD ($)</option>
                    <option value="TRY">TRY (₺)</option>
                    <option value="PHP">PHP (₱)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Category & User */}
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
