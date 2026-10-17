'use client';

import React, { useState, useEffect } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Settings, 
  Check, 
  Sparkles, 
  ScrollText, 
  Coins, 
  AlertCircle 
} from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import confetti from 'canvas-confetti';

export interface PenaltyEntry {
  id: string;
  user: 'berk' | 'jaquilyn';
  reason: string;
  amount: number;
  currency: string;
  date: string;
}

export interface PenaltyGoal {
  targetName: string;
  targetAmount: number;
  rulesDescription: string;
}

const DEFAULT_GOAL: PenaltyGoal = {
  targetName: 'Luxury Romantic Dinner',
  targetAmount: 3000,
  rulesDescription: 'Playful fines and slip-up penalties accumulating to fund our luxury couple date dinner!\n\n• Swearing / Bad words: 50₺\n• Being late > 15 mins: 100₺\n• Forgetting chore: 50₺\n• Grumpy mood without hugs: 30₺',
};

export default function PenaltyPage() {
  // 1. Penalties State
  const [penalties, setPenalties] = useState<PenaltyEntry[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('berlyn_penalty_entries');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // fallback
        }
      }
    }
    return [];
  });

  // 2. Goal & Rules State
  const [goal, setGoal] = useState<PenaltyGoal>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('berlyn_penalty_goal');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.targetName && parsed.targetAmount) return parsed;
        } catch (e) {
          // fallback
        }
      }
    }
    return DEFAULT_GOAL;
  });

  // 3. Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState<PenaltyEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showRulesBox, setShowRulesBox] = useState(false);

  // 4. Add Fine Form State
  const [addReason, setAddReason] = useState('');
  const [addAmount, setAddAmount] = useState('100');
  const [addPerpetrator, setAddPerpetrator] = useState<'berk' | 'jaquilyn'>('berk');
  const [addCurrency, setAddCurrency] = useState('TRY');

  // 5. Edit Fine Form State
  const [editReason, setEditReason] = useState('');
  const [editAmount, setEditAmount] = useState('100');
  const [editPerpetrator, setEditPerpetrator] = useState<'berk' | 'jaquilyn'>('berk');
  const [editCurrency, setEditCurrency] = useState('TRY');

  // 6. Edit Goal Form State
  const [goalNameInput, setGoalNameInput] = useState(goal.targetName);
  const [goalAmountInput, setGoalAmountInput] = useState(goal.targetAmount.toString());
  const [goalRulesInput, setGoalRulesInput] = useState(goal.rulesDescription);

  // Sync with Supabase on mount
  useEffect(() => {
    const fetchSupabasePenalties = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('penalty_entries')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted: PenaltyEntry[] = data.map((d: any) => ({
            id: d.id,
            user: (d.user_id === 'jaquilyn' ? 'jaquilyn' : 'berk') as 'berk' | 'jaquilyn',
            reason: d.reason || '',
            amount: Number(d.amount) || 0,
            currency: d.currency || 'TRY',
            date: d.date || formatDateDDMMYYYY(new Date(d.created_at)),
          }));
          setPenalties(formatted);
          localStorage.setItem('berlyn_penalty_entries', JSON.stringify(formatted));
        }
      } catch (err) {
        console.warn('Failed to fetch penalties from Supabase:', err);
      }
    };

    fetchSupabasePenalties();
  }, []);

  // Save to localStorage whenever penalties change
  const savePenalties = (updated: PenaltyEntry[]) => {
    setPenalties(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_penalty_entries', JSON.stringify(updated));
    }
  };

  // Save goal to localStorage
  const saveGoal = (newGoal: PenaltyGoal) => {
    setGoal(newGoal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_penalty_goal', JSON.stringify(newGoal));
    }
  };

  // Calculations
  const totalPoolTRY = penalties.reduce((sum, p) => {
    if (p.currency === 'TRY') return sum + p.amount;
    if (p.currency === 'USD') return sum + p.amount * 49.4;
    return sum + p.amount;
  }, 0);

  const targetDinnerTRY = goal.targetAmount || 3000;
  const progressPercent = targetDinnerTRY > 0 ? Math.min(100, Math.round((totalPoolTRY / targetDinnerTRY) * 100)) : 0;
  const isGoalReached = totalPoolTRY >= targetDinnerTRY && targetDinnerTRY > 0;

  // Handle Add Fine
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addReason.trim()) return;

    const newP: PenaltyEntry = {
      id: `pen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user: addPerpetrator,
      reason: addReason.trim(),
      amount: Math.abs(Number(addAmount)) || 100,
      currency: addCurrency,
      date: formatDateDDMMYYYY(new Date()),
    };

    const updated = [newP, ...penalties];
    savePenalties(updated);

    // Sync to Supabase
    try {
      const supabase = createClient();
      await supabase.from('penalty_entries').insert([{
        id: newP.id,
        user_id: newP.user,
        reason: newP.reason,
        amount: newP.amount,
        currency: newP.currency,
        date: newP.date,
      }]);
    } catch (err) {
      console.warn('Supabase insert penalty error:', err);
    }

    setAddReason('');
    setAddAmount('100');
    setShowAddModal(false);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  // Handle Open Edit Fine Modal
  const openEditModal = (penalty: PenaltyEntry) => {
    setEditingPenalty(penalty);
    setEditReason(penalty.reason);
    setEditAmount(penalty.amount.toString());
    setEditPerpetrator(penalty.user);
    setEditCurrency(penalty.currency || 'TRY');
  };

  // Handle Save Edit Fine
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPenalty || !editReason.trim()) return;

    const updatedP: PenaltyEntry = {
      ...editingPenalty,
      user: editPerpetrator,
      reason: editReason.trim(),
      amount: Math.abs(Number(editAmount)) || 0,
      currency: editCurrency,
    };

    const updated = penalties.map((p) => (p.id === updatedP.id ? updatedP : p));
    savePenalties(updated);

    // Sync to Supabase
    try {
      const supabase = createClient();
      await supabase.from('penalty_entries').update({
        user_id: updatedP.user,
        reason: updatedP.reason,
        amount: updatedP.amount,
        currency: updatedP.currency,
      }).eq('id', updatedP.id);
    } catch (err) {
      console.warn('Supabase update penalty error:', err);
    }

    setEditingPenalty(null);
  };

  // Handle Delete Fine
  const confirmDelete = async (id: string) => {
    const updated = penalties.filter((p) => p.id !== id);
    savePenalties(updated);

    // Sync to Supabase
    try {
      const supabase = createClient();
      await supabase.from('penalty_entries').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete penalty error:', err);
    }

    setDeletingId(null);
  };

  // Handle Open Goal Modal
  const openGoalModal = () => {
    setGoalNameInput(goal.targetName);
    setGoalAmountInput(goal.targetAmount.toString());
    setGoalRulesInput(goal.rulesDescription);
    setShowGoalModal(true);
  };

  // Handle Save Goal Modal
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: PenaltyGoal = {
      targetName: goalNameInput.trim() || 'Luxury Romantic Dinner',
      targetAmount: Math.abs(Number(goalAmountInput)) || 3000,
      rulesDescription: goalRulesInput.trim() || DEFAULT_GOAL.rulesDescription,
    };

    saveGoal(newGoal);
    setShowGoalModal(false);

    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.5 },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* 1. JAR & TARGET CARD */}
      <div className="card-cozy p-5 space-y-4 text-center relative overflow-hidden">
        {/* Edit Goal Settings Button in Top-Right Corner */}
        <button
          onClick={openGoalModal}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.04] hover:bg-purple-500/20 text-slate-400 hover:text-purple-300 border border-white/[0.08] hover:border-purple-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-medium"
          title="Edit Jar Target, Amount & Rules"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Edit Goal</span>
        </button>

        {/* Piggy Icon */}
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 shadow-inner">
          <PiggyBank className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <span>Penalty & Swear Jar</span>
            {isGoalReached && <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {goal.rulesDescription.split('\n')[0]}
          </p>
        </div>

        {/* View Rules Toggle Button */}
        <button
          onClick={() => setShowRulesBox(!showRulesBox)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
        >
          <ScrollText className="w-3 h-3" />
          <span>{showRulesBox ? 'Hide Penalty Rules' : 'View Penalty Rules 📜'}</span>
        </button>

        {/* Expandable Rules Box */}
        {showRulesBox && (
          <div className="p-3.5 rounded-2xl bg-[#0c111a] border border-purple-500/20 text-left text-xs text-slate-300 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-purple-400 font-semibold text-[11px] uppercase tracking-wider">
              <span>Penalty Rules & Guide</span>
              <button 
                onClick={openGoalModal} 
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Edit
              </button>
            </div>
            <div className="whitespace-pre-line text-slate-300/90 text-xs leading-relaxed font-sans">
              {goal.rulesDescription}
            </div>
          </div>
        )}

        {/* Balance & Progress Display */}
        <div className="bg-[#161e2c] p-4 rounded-2xl border border-white/[0.06] space-y-2.5 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Accumulated Fund:</span>
            <span className="font-mono text-lg font-bold text-amber-400 tracking-tight">
              ₺{totalPoolTRY.toLocaleString()}
            </span>
          </div>

          <div className="w-full h-2.5 bg-white/[0.08] rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isGoalReached
                  ? 'bg-gradient-to-r from-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                  : 'bg-gradient-to-r from-purple-500 to-rose-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
              <span className="text-slate-500">Target:</span>
              <span className="text-white font-medium truncate">{goal.targetName}</span>
            </div>
            <span className="font-mono font-bold text-rose-300 flex-shrink-0">
              {progressPercent}% (₺{targetDinnerTRY.toLocaleString()})
            </span>
          </div>

          {isGoalReached && (
            <div className="pt-2 border-t border-white/[0.06] text-center">
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                🎉 Target Reached! Time for an unforgettable luxury dinner!
              </span>
            </div>
          )}
        </div>

        {/* Add Fine Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fine</span>
        </button>
      </div>

      {/* 2. PENALTIES LEDGER LIST */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-medium">
          <span>Penalty History</span>
          <span>{penalties.length} {penalties.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {penalties.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] text-center text-slate-500 text-xs space-y-1">
            <div className="text-lg">✨</div>
            <div className="font-medium text-slate-400">Jar is empty!</div>
            <div>No penalties logged yet. Keep up the good love behavior!</div>
          </div>
        ) : (
          penalties.map((item) => (
            <div 
              key={item.id} 
              className="card-cozy p-3.5 flex items-center justify-between text-xs group hover:border-purple-500/30 transition-all"
            >
              <div className="space-y-0.5 flex-1 pr-3 truncate">
                <div className="font-semibold text-white truncate text-[13px]">{item.reason}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    {item.user === 'berk' ? '🦁 Berk' : '🌸 Jaquilyn'}
                  </span>
                  <span>•</span>
                  <span>{item.date}</span>
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono font-bold text-rose-400 text-sm">
                  +{item.amount.toLocaleString()} {item.currency}
                </span>

                <div className="flex items-center gap-0.5 pl-1.5 border-l border-white/[0.08]">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Edit fine"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Delete fine"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================================================== */}
      {/* 3. MODAL: LOG NEW FINE (EXACT SAME DESIGN AS REQUESTED) */}
      {/* ============================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleAddSubmit} 
            className="card-cozy bg-[#131b2a] border border-white/10 p-5 space-y-3.5 text-xs w-full max-w-sm rounded-2xl shadow-2xl relative animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Log New Fine</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Perpetrator Selector (🦁 Berk / 🌸 Jaquilyn) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAddPerpetrator('berk')}
                className={`py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  addPerpetrator === 'berk' 
                    ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'bg-[#161e2c] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                🦁 Berk
              </button>
              <button
                type="button"
                onClick={() => setAddPerpetrator('jaquilyn')}
                className={`py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  addPerpetrator === 'jaquilyn' 
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                    : 'bg-[#161e2c] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                🌸 Jaquilyn
              </button>
            </div>

            {/* Reason Input */}
            <input
              type="text"
              required
              placeholder="Reason for fine..."
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              autoFocus
            />

            {/* Fine Amount Input + Currency */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Fine amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 font-mono transition-colors"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  {addCurrency}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[50, 100, 200, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAddAmount(preset.toString())}
                    className="flex-1 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.05] text-[10px] font-mono transition-colors cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop in Jar Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-purple-600/30 pt-2.5"
            >
              Drop in Jar 💰
            </button>
          </form>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 4. MODAL: EDIT EXISTING FINE */}
      {/* ============================================================================== */}
      {editingPenalty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleEditSubmit} 
            className="card-cozy bg-[#131b2a] border border-white/10 p-5 space-y-3.5 text-xs w-full max-w-sm rounded-2xl shadow-2xl relative animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Edit Fine</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPenalty(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Perpetrator Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditPerpetrator('berk')}
                className={`py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  editPerpetrator === 'berk' 
                    ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'bg-[#161e2c] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                🦁 Berk
              </button>
              <button
                type="button"
                onClick={() => setEditPerpetrator('jaquilyn')}
                className={`py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  editPerpetrator === 'jaquilyn' 
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                    : 'bg-[#161e2c] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                🌸 Jaquilyn
              </button>
            </div>

            {/* Reason Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Reason</label>
              <input
                type="text"
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Fine Amount Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Amount ({editCurrency})</label>
              <input
                type="number"
                min="1"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 font-mono transition-colors"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingPenalty(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 5. MODAL: EDIT JAR GOAL, AMOUNT & RULES */}
      {/* ============================================================================== */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <form 
            onSubmit={handleGoalSubmit} 
            className="card-cozy bg-[#131b2a] border border-white/10 p-5 space-y-4 text-xs w-full max-w-sm rounded-2xl shadow-2xl relative animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Edit Jar Goal & Rules</h3>
                <p className="text-[11px] text-slate-400">Customize reward, fund target & penalty rules</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Reward Name */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-medium">Target Reward Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Luxury Romantic Dinner"
                value={goalNameInput}
                onChange={(e) => setGoalNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Target Goal Amount (₺) */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-medium">Target Goal Amount (₺ TRY)</label>
              <input
                type="number"
                min="100"
                step="50"
                required
                placeholder="3000"
                value={goalAmountInput}
                onChange={(e) => setGoalAmountInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 font-mono transition-colors"
              />
            </div>

            {/* Description & Rules Textarea */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-medium">
                Description & Penalty Rules
              </label>
              <textarea
                rows={5}
                required
                placeholder="Write penalty rules and fine amounts here..."
                value={goalRulesInput}
                onChange={(e) => setGoalRulesInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-purple-500 transition-colors leading-relaxed font-sans resize-none"
              />
              <span className="text-[10px] text-slate-500">
                The first line appears on the homepage card subtitle; following lines are specific rules.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-lg shadow-purple-600/30"
              >
                Save Goal & Rules
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 6. MODAL: DELETE CONFIRMATION */}
      {/* ============================================================================== */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="card-cozy bg-[#131b2a] border border-white/10 p-5 space-y-3.5 text-xs w-full max-w-xs rounded-2xl shadow-2xl text-center animate-scale-in">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h4 className="font-bold text-white text-sm">Delete Fine?</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Are you sure you want to delete this penalty log? The accumulated fund will be adjusted.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deletingId)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-600/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
