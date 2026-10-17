'use client';

import React, { useState } from 'react';
import { PiggyBank, Plus, Flame, Award, Heart } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';

const SAMPLE_PENALTIES = [
  { id: '1', user: 'berk', reason: 'Trafikte sinirlenip yasak kelime kullandı 🤬', amount: 150, currency: 'TRY', date: '14.10.2026' },
  { id: '2', user: 'jaquilyn', reason: 'Geç yatıp uykusuz kaldığı için ceza 😴', amount: 200, currency: 'PHP', date: '15.10.2026' },
  { id: '3', user: 'berk', reason: 'Akşam tatlısından fazla kaçırdı 🍩', amount: 100, currency: 'TRY', date: '16.10.2026' },
];

export default function PenaltyPage() {
  const [penalties, setPenalties] = useState(SAMPLE_PENALTIES);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('100');
  const [perpetrator, setPerpetrator] = useState<'berk' | 'jaquilyn'>('berk');
  const [showAdd, setShowAdd] = useState(false);

  // Total accumulated penalty pool (Approximate in TRY for dinner)
  const totalPoolTRY = 1250;
  const targetDinnerTRY = 3000;
  const progressPercent = Math.min(100, Math.round((totalPoolTRY / targetDinnerTRY) * 100));

  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const newP = {
      id: Date.now().toString(),
      user: perpetrator,
      reason,
      amount: Number(amount) || 100,
      currency: perpetrator === 'berk' ? 'TRY' : 'PHP',
      date: formatDateDDMMYYYY(new Date()),
    };

    setPenalties([newP, ...penalties]);
    setReason('');
    setShowAdd(false);

    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* Jar & Target Card */}
      <div className="card-cozy p-5 space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
          <PiggyBank className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-lg font-bold text-white">Ceza & Küfür Kumbarası</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Yasak kelimeler ve küçük şakavari cezalarla biriken lüks akşam yemeği fonumuz!
          </p>
        </div>

        {/* Balance Display */}
        <div className="bg-[#161e2c] p-3.5 rounded-2xl border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Biriken Fon:</span>
            <span className="font-mono text-base font-bold text-amber-400">₺{totalPoolTRY.toLocaleString()}</span>
          </div>

          <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-rose-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Hedef: Romantik Akşam Yemeği</span>
            <span className="font-mono font-bold text-rose-300">%{progressPercent} (₺{targetDinnerTRY})</span>
          </div>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Ceza Ekle</span>
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddPenalty} className="card-cozy p-4 space-y-3 text-xs animate-fade-in">
          <h3 className="font-bold text-white">Yeni Ceza Kaydet</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPerpetrator('berk')}
              className={`py-2 rounded-xl border text-xs font-medium ${perpetrator === 'berk' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-[#161e2c] border-white/[0.08] text-slate-400'}`}
            >
              🦁 Berk
            </button>
            <button
              type="button"
              onClick={() => setPerpetrator('jaquilyn')}
              className={`py-2 rounded-xl border text-xs font-medium ${perpetrator === 'jaquilyn' ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-[#161e2c] border-white/[0.08] text-slate-400'}`}
            >
              🌸 Jaquilyn
            </button>
          </div>

          <input
            type="text"
            required
            placeholder="Ceza sebebi..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500"
          />

          <input
            type="number"
            placeholder="Ceza tutarı"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
          />

          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
          >
            Kumbaraya At 💰
          </button>
        </form>
      )}

      {/* Penalties Ledger */}
      <div className="space-y-2">
        {penalties.map((item) => (
          <div key={item.id} className="card-cozy p-3.5 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-white">{item.reason}</div>
              <span className="text-[10px] text-slate-500">
                {item.user === 'berk' ? '🦁 Berk' : '🌸 Jaquilyn'} • {item.date}
              </span>
            </div>
            <span className="font-mono font-bold text-rose-400">
              +{item.amount} {item.currency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
