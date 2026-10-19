'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Sparkles, 
  Film, 
  Send, 
  Eye, 
  EyeOff, 
  Plus, 
  Pin, 
  Flame, 
  CheckCircle2, 
  Circle,
  ArrowRight,
  TrendingUp,
  Wallet,
  MessageCircle,
  CalendarDays,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Loader2,
  Pencil,
  PiggyBank,
  HelpCircle
} from 'lucide-react';
import { RelationshipTimeline } from '@/components/RelationshipTimeline';
import { PhotoMemoryWidget } from '@/components/PhotoMemoryWidget';
import { useCurrentUser } from '@/components/UserContext';
import { useConfirm } from '@/components/ConfirmModal';
import { USERS, CoupleUser } from '@/types';
import { 
  fetchFinanceData, 
  calculateTotalMonthlyInterestTRY, 
  convertCurrency, 
  DEFAULT_KKTC_RATES 
} from '@/lib/finance-service';
import confetti from 'canvas-confetti';
import { playHarp, playVote, playMatch, playSeal, playTaskCheck } from '@/lib/sound-effects';
import { broadcastCoupleNotification } from '@/lib/notifications';

interface NoteEntry {
  author: 'berk' | 'jaquilyn';
  text: string;
  time: string;
  updatedAt: number;
}

interface CoupleNotes {
  berk: NoteEntry | null;
  jaquilyn: NoteEntry | null;
}

interface DailyChoiceItem {
  id: string;
  question: string;
  options: string[];
  votes: {
    berk: string | null;
    jaquilyn: string | null;
  };
  createdBy: 'berk' | 'jaquilyn';
  createdAt: string;
}

interface HomeAgendaTask {
  id: string;
  title: string;
  category: 'grocery' | 'chore' | 'errand' | 'date' | 'reminder';
  assignee: 'berk' | 'jaquilyn' | 'both';
  timeframe: 'today' | 'tomorrow' | 'this_week' | 'upcoming';
  dueDate?: string;
  dueDay?: string;
  dueTime?: string;
  completed: boolean;
  priority: 'normal' | 'urgent';
  createdAt: string;
}

export interface HomePageClientProps {
  initialMemories?: any[];
  initialActivePhoto?: any;
  initialNotes?: CoupleNotes;
  initialChoices?: DailyChoiceItem[];
}

export function HomePageClient({
  initialMemories = [],
  initialActivePhoto = null,
  initialNotes,
  initialChoices = [],
}: HomePageClientProps) {
  const { currentUser, profile } = useCurrentUser();
  const confirm = useConfirm();
  const activeUser = currentUser === 'jaquilyn' ? 'jaquilyn' : 'berk';
  const partnerUser: CoupleUser = activeUser === 'berk' ? 'jaquilyn' : 'berk';
  const partnerName = activeUser === 'berk' ? 'Jaquilyn' : 'Berk';
  const partnerAvatar = activeUser === 'berk' ? '🌸' : '🦁';

  // 1. Monthly Finance Stats
  const [financeCelebration, setFinanceCelebration] = useState<{
    income: number;
    savings: number;
    rate: number;
    hasData: boolean;
  }>({
    income: 0,
    savings: 0,
    rate: 0,
    hasData: false,
  });

  // 2. Daily Blind Question State (clean initial state, zero mock answers)
  const [dailyPromptAnswer, setDailyPromptAnswer] = useState('');
  const [berkAnswerSubmitted, setBerkAnswerSubmitted] = useState<string | null>(null);
  const [jaquilynAnswerSubmitted, setJaquilynAnswerSubmitted] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // 3. Love Notes Widget State (one for Berk, one for Jaquilyn)
  const [notes, setNotes] = useState<CoupleNotes>(() => initialNotes || {
    berk: null,
    jaquilyn: null,
  });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [myNoteInput, setMyNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Partner Note Arrival Popup State
  const [partnerNotePopup, setPartnerNotePopup] = useState<NoteEntry | null>(null);
  const [popupLeaveReply, setPopupLeaveReply] = useState(false);
  const [popupReplyText, setPopupReplyText] = useState('');

  // 4. Daily Choices State
  const [choices, setChoices] = useState<DailyChoiceItem[]>(() => initialChoices || []);
  const [activeChoiceIndex, setActiveChoiceIndex] = useState(0);
  const [showNewChoiceModal, setShowNewChoiceModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [isCreatingChoice, setIsCreatingChoice] = useState(false);

  // 5. Today's Agenda State
  const [allAgendaTasks, setAllAgendaTasks] = useState<HomeAgendaTask[]>([]);

  // Fetch Finance Data
  useEffect(() => {
    fetchFinanceData().then((data) => {
      if (!data || !data.transactions) {
        setFinanceCelebration({
          income: 0,
          savings: 0,
          rate: 0,
          hasData: false,
        });
        return;
      }

      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      const currentMonthTag = `${curYear}-${String(curMonth).padStart(2, '0')}`;

      const currentMonthTransactions = data.transactions.filter((t) => {
        if (!t.date) return false;
        const [y, m] = t.date.split('-');
        return parseInt(y) === curYear && parseInt(m) === curMonth;
      });

      const manualIncome = currentMonthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, 'TRY', DEFAULT_KKTC_RATES), 0);

      // Only count unlogged compound interest to prevent double-counting!
      const unloggedAccounts = (data.compoundAccounts || []).filter((acc) => {
        return !currentMonthTransactions.some(
          (t) =>
            (t.compoundAccountId === acc.id || t.title.includes(acc.name)) &&
            (t.isInterest || t.title.startsWith('Interest Yield:'))
        );
      });

      const passiveInterest = calculateTotalMonthlyInterestTRY(unloggedAccounts, DEFAULT_KKTC_RATES, currentMonthTag);
      const totalIncome = manualIncome + passiveInterest;

      const ourExpense = currentMonthTransactions
        .filter((t) => t.type === 'expense' && t.user !== 'family')
        .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, 'TRY', DEFAULT_KKTC_RATES), 0);

      const netSavings = totalIncome - ourExpense;
      const rate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

      if (totalIncome > 0) {
        setFinanceCelebration({
          income: Math.round(totalIncome),
          savings: Math.round(netSavings),
          rate,
          hasData: true,
        });
      } else {
        setFinanceCelebration({
          income: 0,
          savings: 0,
          rate: 0,
          hasData: false,
        });
      }
    });
  }, []);

  // Fetch Notes & check for new partner note arrival on login/load
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch('/api/notes', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const loadedNotes: CoupleNotes = data.notes || { berk: null, jaquilyn: null };
        setNotes(loadedNotes);

        // Check if partner left a new note
        const partnerNote = loadedNotes[partnerUser];
        if (partnerNote && partnerNote.text) {
          const lastSeenKey = `berlyn_seen_note_ts_${activeUser}`;
          const lastSeenTs = parseInt(localStorage.getItem(lastSeenKey) || '0', 10);

          if (partnerNote.updatedAt > lastSeenTs) {
            // Partner left a new/updated note! Trigger confetti & popup
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.5 },
            });
            setPartnerNotePopup(partnerNote);
          }
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    };

    fetchNotes();
  }, [activeUser, partnerUser]);

  // Fetch Daily Choices
  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const res = await fetch('/api/choices', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.choices)) {
          setChoices(data.choices);
        }
      } catch (err) {
        console.error('Failed to load choices:', err);
      }
    };

    fetchChoices();
  }, []);

  // Handle Close Partner Note Popup
  const handleAcknowledgePartnerNote = () => {
    if (partnerNotePopup) {
      localStorage.setItem(`berlyn_seen_note_ts_${activeUser}`, partnerNotePopup.updatedAt.toString());
    }
    setPartnerNotePopup(null);
    setPopupLeaveReply(false);
    setPopupReplyText('');
  };

  // Handle Save Note (from widget or reply modal)
  const handleSaveNote = async (textToSave: string) => {
    if (!textToSave.trim() || isSavingNote) return;
    setIsSavingNote(true);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: activeUser,
          text: textToSave.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.notes) {
          setNotes(data.notes);
        }
        setShowNoteModal(false);
        setMyNoteInput('');
        handleAcknowledgePartnerNote();
        playHarp();

        broadcastCoupleNotification({
          type: 'note',
          sender: activeUser === 'jaquilyn' ? 'jaquilyn' : 'berk',
          title: activeUser === 'jaquilyn' ? '🌸 Jaquilyn left a Love Note' : '🦁 Berk left a Love Note',
          subtitle: textToSave.trim().slice(0, 60),
          link: '/',
        });

        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Handle Daily Prompt Submit
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyPromptAnswer.trim()) return;

    const willBothHaveSubmitted = 
      (currentUser === 'jaquilyn' && berkAnswerSubmitted) ||
      (currentUser === 'berk' && jaquilynAnswerSubmitted);

    if (currentUser === 'jaquilyn') {
      setJaquilynAnswerSubmitted(dailyPromptAnswer);
    } else {
      setBerkAnswerSubmitted(dailyPromptAnswer);
    }
    setDailyPromptAnswer('');

    if (willBothHaveSubmitted) {
      playMatch();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      playSeal();
    }
  };

  // Handle Vote Daily Choice
  const handleVoteChoice = async (choiceId: string, option: string) => {
    try {
      // Optimistic update
      setChoices((prev) =>
        prev.map((c) => {
          if (c.id !== choiceId) return c;
          const updatedVotes = { ...c.votes, [activeUser]: option };
          return { ...c, votes: updatedVotes };
        })
      );

      const target = choices.find((c) => c.id === choiceId);
      const partnerVoted = target?.votes[partnerUser];
      if (partnerVoted === option) {
        playMatch();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        playVote();
      }

      await fetch('/api/choices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: choiceId,
          user: activeUser,
          option,
        }),
      });
    } catch (err) {
      console.error('Failed to vote on choice:', err);
    }
  };

  // Handle Delete Choice
  const handleDeleteChoice = async (choiceId: string) => {
    const ok = await confirm({
      title: 'Delete Question?',
      message: 'Are you sure you want to delete this prompt question?',
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {
      setChoices((prev) => prev.filter((c) => c.id !== choiceId));
      if (activeChoiceIndex >= choices.length - 1 && activeChoiceIndex > 0) {
        setActiveChoiceIndex(activeChoiceIndex - 1);
      }
      await fetch(`/api/choices?id=${choiceId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete choice:', err);
    }
  };

  // Handle Create Choice
  const handleCreateChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || isCreatingChoice) return;

    const validOptions = newOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (validOptions.length < 2) return;

    setIsCreatingChoice(true);
    try {
      const res = await fetch('/api/choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion.trim(),
          options: validOptions,
          createdBy: activeUser,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChoices((prev) => [data.choice, ...prev]);
        setActiveChoiceIndex(0);
        setShowNewChoiceModal(false);
        setNewQuestion('');
        setNewOptions(['', '']);

        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error('Failed to create choice:', err);
    } finally {
      setIsCreatingChoice(false);
    }
  };

  // Carousel navigation (smoothly loops back to start)
  // Load Agenda tasks & sync with cloud database /api/agenda
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await fetch('/api/agenda', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tasks)) {
            setAllAgendaTasks(data.tasks);
            if (typeof window !== 'undefined') {
              localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(data.tasks));
            }
            return;
          }
        }
      } catch (e) {}

      try {
        const saved = localStorage.getItem('berlyn_agenda_tasks');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAllAgendaTasks(parsed);
            return;
          }
        }
        setAllAgendaTasks([]);
      } catch (e) {
        setAllAgendaTasks([]);
      }
    };

    loadTasks();
    const handleStorageUpdate = () => loadTasks();
    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('agenda_updated', handleStorageUpdate);
    window.addEventListener('focus', loadTasks);
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('agenda_updated', handleStorageUpdate);
      window.removeEventListener('focus', loadTasks);
    };
  }, []);

  // Toggle agenda task completion
  const handleToggleTask = (taskId: string) => {
    setAllAgendaTasks((prev) => {
      const target = prev.find((t) => t.id === taskId);
      const nextCompleted = target ? !target.completed : true;
      if (nextCompleted) {
        playTaskCheck();
      }
      const updated = prev.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t));
      try {
        localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(updated));
        window.dispatchEvent(new Event('agenda_updated'));
      } catch (e) {}

      fetch('/api/agenda', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, completed: nextCompleted }),
      }).catch(() => {});

      return updated;
    });
  };

  // Filter only tasks for today
  const todaysAgendaTasks = useMemo(() => {
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const todayIso = today.toISOString().split('T')[0];

    return allAgendaTasks.filter((t) => {
      if (t.timeframe === 'today') return true;
      if (t.dueDate === todayIso) return true;
      if (t.dueDay && t.dueDay.toLowerCase().includes(dayName.toLowerCase())) return true;
      return false;
    });
  }, [allAgendaTasks]);

  // Carousel navigation (smoothly loops back to start)
  const handleNextChoice = () => {
    if (choices.length <= 1) return;
    setActiveChoiceIndex((prev) => (prev + 1) % choices.length);
  };

  const handlePrevChoice = () => {
    if (choices.length <= 1) return;
    setActiveChoiceIndex((prev) => (prev - 1 + choices.length) % choices.length);
  };

  const bothAnswered = Boolean(berkAnswerSubmitted && jaquilynAnswerSubmitted);
  const currentChoice = choices.length > 0 ? choices[activeChoiceIndex] : null;

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      {/* 1. Live Relationship Timeline (Our Love Journey) */}
      <RelationshipTimeline startDate="2026-03-01T00:00:00" />

      {/* 2. Photo Memory Widget */}
      <PhotoMemoryWidget initialMemories={initialMemories} initialActivePhoto={initialActivePhoto} />

      {/* 3. Notes For Each Other (One for Berk, one for Jaquilyn) */}
      <div className="card-cozy p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5" />
            <span>Notes for Each Other</span>
          </span>
          <button
            onClick={() => {
              setMyNoteInput(notes[activeUser]?.text || '');
              setShowNoteModal(true);
            }}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            {notes[activeUser] ? (
              <>
                <Pencil className="w-3 h-3" />
                <span>Edit My Note</span>
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                <span>Leave a Note</span>
              </>
            )}
          </button>
        </div>

        {/* 2 Equal Slots: Berk & Jaquilyn */}
        <div className="space-y-2.5 pt-0.5">
          {/* Berk Slot */}
          <div className="p-3.5 rounded-2xl border text-xs bg-[#141b2a] border-blue-500/25 text-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1.5 text-[10px]">
              <span className="font-bold flex items-center gap-1 text-blue-300">
                <span>🦁</span>
                <span>Berk</span>
              </span>
              <span className="text-slate-500 font-mono">
                {notes.berk ? notes.berk.time : 'No note yet'}
              </span>
            </div>
            {notes.berk ? (
              <p className="leading-relaxed text-[11px] text-slate-200 whitespace-pre-wrap">
                {notes.berk.text}
              </p>
            ) : (
              <p className="italic text-slate-500 text-[11px]">
                {activeUser === 'berk'
                  ? 'Tap "Leave a Note" above to write a sweet note for Jaquilyn 🌸'
                  : 'Berk hasn\'t left a note yet.'}
              </p>
            )}
          </div>

          {/* Jaquilyn Slot */}
          <div className="p-3.5 rounded-2xl border text-xs bg-[#1c1524] border-rose-500/25 text-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1.5 text-[10px]">
              <span className="font-bold flex items-center gap-1 text-rose-300">
                <span>🌸</span>
                <span>Jaquilyn</span>
              </span>
              <span className="text-slate-500 font-mono">
                {notes.jaquilyn ? notes.jaquilyn.time : 'No note yet'}
              </span>
            </div>
            {notes.jaquilyn ? (
              <p className="leading-relaxed text-[11px] text-slate-200 whitespace-pre-wrap">
                {notes.jaquilyn.text}
              </p>
            ) : (
              <p className="italic text-slate-500 text-[11px]">
                {activeUser === 'jaquilyn'
                  ? 'Tap "Leave a Note" above to write a sweet note for Berk 🦁'
                  : 'Jaquilyn hasn\'t left a note yet.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Daily Choices (Slide / Carousel of polls with up to 5 options) */}
      <div className="card-cozy p-5 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Daily Choice</span>
          </span>

          <div className="flex items-center gap-2">
            {/* Carousel navigation controls if multiple choices exist */}
            {choices.length > 1 && (
              <div className="flex items-center gap-1 bg-[#141b27] px-1.5 py-0.5 rounded-xl border border-white/[0.08]">
                <button
                  onClick={handlePrevChoice}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Previous choice"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 px-1">
                  {activeChoiceIndex + 1}/{choices.length}
                </span>
                <button
                  onClick={handleNextChoice}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                  title="Next choice (loops)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowNewChoiceModal(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Choice</span>
            </button>
          </div>
        </div>

        {/* Active Choice Card */}
        {currentChoice ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 flex-1">
                <h4 className="text-xs font-bold text-white leading-snug">
                  "{currentChoice.question}"
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>Created by</span>
                  <span className={`font-semibold ${currentChoice.createdBy === 'jaquilyn' ? 'text-pink-300' : 'text-blue-300'}`}>
                    {currentChoice.createdBy === 'jaquilyn' ? '🌸 Jaquilyn' : '🦁 Berk'}
                  </span>
                </div>
              </div>

              {/* Delete Choice */}
              <button
                onClick={() => handleDeleteChoice(currentChoice.id)}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Delete choice"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Options list (up to 5 options) */}
            <div className="grid grid-cols-1 gap-2">
              {currentChoice.options.map((opt) => {
                const berkChoice = currentChoice.votes.berk === opt;
                const jaqChoice = currentChoice.votes.jaquilyn === opt;
                const isMatch = berkChoice && jaqChoice;

                return (
                  <button
                    key={opt}
                    onClick={() => handleVoteChoice(currentChoice.id, opt)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isMatch
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/30'
                        : berkChoice || jaqChoice
                        ? 'bg-[#192233] border-white/20 text-white'
                        : 'bg-[#141a26] border-white/[0.06] text-slate-300 hover:bg-[#1a2233]'
                    }`}
                  >
                    <span className="text-xs font-medium">{opt}</span>
                    <div className="flex items-center gap-1 text-[10px]">
                      {berkChoice && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                          🦁 Berk
                        </span>
                      )}
                      {jaqChoice && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                          🌸 Jaq
                        </span>
                      )}
                      {isMatch && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                          Match! 🎉
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination Dots */}
            {choices.length > 1 && (
              <div className="flex items-center justify-center gap-1 pt-1">
                {choices.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveChoiceIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activeChoiceIndex
                        ? 'w-5 bg-rose-500'
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-dashed border-white/[0.1] text-center space-y-2 bg-[#121824]/40">
            <Flame className="w-6 h-6 text-rose-500/40 mx-auto" />
            <p className="text-xs text-slate-400">No active daily choices.</p>
            <button
              onClick={() => setShowNewChoiceModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Daily Choice</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Agenda Widget (Shows today's scheduled tasks) */}
      <div className="card-cozy p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
            <span>Today's Agenda</span>
            <span className="text-[10px] text-slate-400 font-normal font-sans">
              • {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </span>

          <Link
            href="/agenda"
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View Agenda</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {todaysAgendaTasks.length > 0 ? (
          <div className="space-y-2 pt-0.5">
            {todaysAgendaTasks.map((task) => {
              const isCompleted = task.completed;
              return (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-[#101722]/50 border-white/[0.04] text-slate-500 opacity-75'
                      : 'bg-[#141d2b] border-white/[0.08] hover:border-emerald-500/30 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="shrink-0 text-emerald-400 cursor-pointer focus:outline-none"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 hover:text-emerald-400" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-medium truncate ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        {task.dueTime && (
                          <span className="flex items-center gap-0.5 text-amber-300/90 font-mono">
                            ⏰ {task.dueTime}
                          </span>
                        )}
                        <span className="capitalize">
                          {task.assignee === 'both' ? '👫 Together' : task.assignee === 'berk' ? '🦁 Berk' : '🌸 Jaq'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 border ${
                      isCompleted
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {isCompleted ? 'Done' : 'Today'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#121926]/70 border border-white/[0.06] text-center space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Today's agenda is completely clear! ✨</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No tasks scheduled for today, enjoy your day! 🌿
              </p>
            </div>
            <div className="pt-1">
              <Link
                href="/agenda"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-emerald-400 text-xs font-medium transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add New Task</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 6. Finance Widget */}
      <div className="card-cozy p-4 relative overflow-hidden bg-gradient-to-br from-[#121c2d] via-[#152336] to-[#111927] border border-emerald-500/25 shadow-lg">
        {financeCelebration.hasData ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">🎉</span>
                <span className="text-xs font-bold text-emerald-300 tracking-wider uppercase flex items-center gap-1">
                  <span>This Month's Wins</span>
                  <span className="text-slate-400 font-normal">
                    • {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                {financeCelebration.rate}% Saved! 🚀
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400">
                  +₺{financeCelebration.savings.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-200">saved together!</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Total couple earnings reached <strong className="text-white font-mono">₺{financeCelebration.income.toLocaleString()}</strong> this month. Way to go team! 🥂
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salaries + Passive Interest active</span>
              </span>
              <Link
                href="/finance"
                className="text-emerald-300 hover:text-emerald-200 font-semibold flex items-center gap-1 group text-xs"
              >
                <span>Finance Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between py-1 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Shared Financial Sanctuary</p>
                <p className="text-[10px] text-slate-400">No transactions recorded for this month yet</p>
              </div>
            </div>
            <Link
              href="/finance"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Finance Hub</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* 7. Quiz (Daily Question & Blind Answer) */}
      <div className="card-cozy p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Prompt #42</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Memories</span>
        </div>

        <h3 className="text-base font-bold text-white leading-snug">
          "Out of all the moments we've spent together, which one is the most unforgettable and special for you?"
        </h3>

        {/* Blind Answers Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Berk */}
          <div className="p-3 rounded-2xl bg-[#161e2c] border border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-blue-300">🦁 Berk</span>
              {berkAnswerSubmitted ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                  Submitted ✓
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">Waiting...</span>
              )}
            </div>
            <div className="text-xs">
              {berkAnswerSubmitted ? (
                revealed || bothAnswered ? (
                  <p className="italic text-slate-200 text-[11px] leading-relaxed">
                    "{berkAnswerSubmitted}"
                  </p>
                ) : (
                  <p className="text-slate-500 text-[11px] italic">
                    🔒 Answer locked
                  </p>
                )
              ) : (
                <p className="text-slate-600 text-[11px] italic">Not answered yet</p>
              )}
            </div>
          </div>

          {/* Jaquilyn */}
          <div className="p-3 rounded-2xl bg-[#161e2c] border border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-rose-300">🌸 Jaquilyn</span>
              {jaquilynAnswerSubmitted ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                  Submitted ✓
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">Waiting...</span>
              )}
            </div>
            <div className="text-xs">
              {jaquilynAnswerSubmitted ? (
                revealed || bothAnswered ? (
                  <p className="italic text-slate-200 text-[11px] leading-relaxed">
                    "{jaquilynAnswerSubmitted}"
                  </p>
                ) : (
                  <p className="text-slate-500 text-[11px] italic">
                    🔒 Answer locked
                  </p>
                )
              ) : (
                <p className="text-slate-600 text-[11px] italic">Not answered yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Answer Form or Reveal Button */}
        <div className="pt-2 border-t border-white/[0.06]">
          {bothAnswered ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Both of you have answered!
              </span>
              <button
                onClick={() => setRevealed(!revealed)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.08] text-xs text-white font-medium hover:bg-white/[0.12] transition-colors cursor-pointer"
              >
                {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealed ? 'Hide' : 'Reveal Answers'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePromptSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder={`Type your secret answer as ${profile?.name || 'You'}...`}
                value={dailyPromptAnswer}
                onChange={(e) => setDailyPromptAnswer(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Submit</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 8. Quick Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        <Link
          href="/messages"
          className="card-cozy p-3.5 hover:border-rose-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Private Chat</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Realtime messaging with partner</p>
          <div className="flex items-center justify-between text-[10px] text-rose-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Open Chat</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/agenda"
          className="card-cozy p-3.5 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Daily Agenda</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Shared chores, habits & routines</p>
          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>View Tasks</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/bucket-list"
          className="card-cozy p-3.5 hover:border-amber-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Bucket List</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Our sacred couple dreams & habits</p>
          <div className="flex items-center justify-between text-[10px] text-amber-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Explore Dreams</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/media"
          className="card-cozy p-3.5 hover:border-blue-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Watchlist</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Completed & to-watch movies</p>
          <div className="flex items-center justify-between text-[10px] text-blue-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Open List</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/penalty"
          className="card-cozy p-3.5 hover:border-pink-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Penalty Jar</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Romantic dinner fines & fun rules</p>
          <div className="flex items-center justify-between text-[10px] text-pink-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Open Jar</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/quizzes"
          className="card-cozy p-3.5 hover:border-violet-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Quizzes & Questions</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Daily couple question & memory vault</p>
          <div className="flex items-center justify-between text-[10px] text-violet-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Today's Question</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* MODAL 1: Partner Note Arrival Pop-up (Sticky Header) */}
      {partnerNotePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{partnerAvatar}</span>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    {partnerName} left a note to you:
                  </h3>
                  <span className="text-[10px] text-rose-300 font-mono">
                    {partnerNotePopup.time}
                  </span>
                </div>
              </div>
              <button
                onClick={handleAcknowledgePartnerNote}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Partner Note Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 via-[#181a28] to-[#121824] border border-rose-500/25 text-white">
                <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  "{partnerNotePopup.text}"
                </p>
              </div>

              {/* Leave a Note Too form (inline reply) */}
              {popupLeaveReply ? (
                <div className="space-y-3 pt-1 animate-fade-in">
                  <label className="block text-slate-300 text-xs font-semibold">
                    Write your note to {partnerName}:
                  </label>
                  <textarea
                    rows={3}
                    autoFocus
                    placeholder={`Leave a sweet note for ${partnerName}...`}
                    value={popupReplyText}
                    onChange={(e) => setPopupReplyText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPopupLeaveReply(false)}
                      className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!popupReplyText.trim() || isSavingNote}
                      onClick={() => handleSaveNote(popupReplyText)}
                      className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Post Note</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Actions: "Leave a note too" and "Cancel" */
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                  <button
                    onClick={handleAcknowledgePartnerNote}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setPopupLeaveReply(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>Leave a note too</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Write/Edit My Note Modal (Sticky Header) */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pin className="w-4 h-4 text-amber-400" />
                <span>Leave a Note for {partnerName}</span>
              </h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveNote(myNoteInput);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">
                  Your Note (Replaces your existing note)
                </label>
                <textarea
                  rows={4}
                  autoFocus
                  placeholder={`Write something sweet or a warm reminder for ${partnerName}...`}
                  value={myNoteInput}
                  onChange={(e) => setMyNoteInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!myNoteInput.trim() || isSavingNote}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Daily Choice Modal (Sticky Header, up to 5 options) */}
      {showNewChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Create New Daily Choice</span>
              </h3>
              <button
                onClick={() => setShowNewChoiceModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChoice} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  Decision Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What should we have for dinner tonight?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-medium">
                    Options (2 to 5 options)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {newOptions.length}/5
                  </span>
                </div>

                <div className="space-y-2">
                  {newOptions.map((opt, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder={`Option ${index + 1}...`}
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[index] = e.target.value;
                          setNewOptions(updated);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                      />
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewOptions(newOptions.filter((_, i) => i !== index))}
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {newOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setNewOptions([...newOptions, ''])}
                    className="mt-2 text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add another option (max 5)</span>
                  </button>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowNewChoiceModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingChoice}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingChoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Publish Choice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
