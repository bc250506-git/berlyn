'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  HelpCircle, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Heart, 
  Search, 
  Calendar, 
  ChevronRight, 
  Bookmark, 
  History,
  PartyPopper,
  Flame,
  Award,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useCurrentUser } from '@/components/UserContext';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';
import { playSeal, playMatch, playFanfare, playPop } from '@/lib/sound-effects';
import { QuizRecord } from '@/app/api/quizzes/route';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Memories': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Deep Love': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  'Future & Home': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  'Fun & Quirky': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Sweet & Spicy': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Hypothetical': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Daily Life & Cozy': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Values & Growth': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
}

export default function QuizzesPage() {
  const { currentUser, profile } = useCurrentUser();
  const [todayQuiz, setTodayQuiz] = useState<QuizRecord | null>(null);
  const [isTodayCompleted, setIsTodayCompleted] = useState<boolean>(false);
  const [history, setHistory] = useState<QuizRecord[]>([]);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalAnswered: 0,
    totalBank: 560,
    bankRemaining: 559,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [answerInput, setAnswerInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [timeUntilMidnight, setTimeUntilMidnight] = useState<string>('');
  const [showConfettiBanner, setShowConfettiBanner] = useState<boolean>(false);

  // Live countdown to midnight (Cyprus time / local)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeUntilMidnight('Unlocking new question...');
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeUntilMidnight(
        `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch quizzes state
  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        const data = await res.json();
        setTodayQuiz(data.todayQuiz);
        setIsTodayCompleted(data.isTodayCompleted);
        setHistory(data.history || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Handle Answer Submit
  const handleAnswerSubmit = async () => {
    if (!answerInput.trim() || isSubmitting || !todayQuiz) return;

    setIsSubmitting(true);
    try {
      const partnerAlreadyAnswered = currentUser === 'berk' 
        ? Boolean(todayQuiz.jaquilyn_answer) 
        : Boolean(todayQuiz.berk_answer);

      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: todayQuiz.id,
          user: currentUser,
          answer: answerInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTodayQuiz(data.quiz);
        setIsTodayCompleted(data.isCompleted);
        setAnswerInput('');

        if (data.isCompleted) {
          playMatch();
          setTimeout(() => playFanfare(), 600);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.5 },
          });
          setShowConfettiBanner(true);
        } else {
          playSeal();
          confetti({
            particleCount: 30,
            spread: 40,
            origin: { y: 0.6 },
          });
        }

        // Refresh full state
        loadQuizzes();
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine user-specific answering state
  const currentUserHasAnswered = currentUser === 'berk' 
    ? Boolean(todayQuiz?.berk_answer) 
    : Boolean(todayQuiz?.jaquilyn_answer);

  const partnerUserHasAnswered = currentUser === 'berk' 
    ? Boolean(todayQuiz?.jaquilyn_answer) 
    : Boolean(todayQuiz?.berk_answer);

  const partnerName = currentUser === 'berk' ? 'Jaquilyn' : 'Berk';
  const partnerAvatar = currentUser === 'berk' ? '🌸' : '🦁';

  // Categories list for filter
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => set.add(h.category));
    return ['All', ...Array.from(set)];
  }, [history]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.berk_answer && item.berk_answer.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.jaquilyn_answer && item.jaquilyn_answer.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [history, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto">
      {/* 1. Header Banner */}
      <div className="card-cozy p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-rose-500/20 bg-gradient-to-r from-[#141b29] via-[#16172a] to-[#141b29]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Daily Couple Quiz & Memory Vault</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                  1 Question / Day
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                A new thought-provoking question unlocks every day. Secret blind answers reveal once both submit!
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#0e1420] border border-white/[0.06] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Completed</span>
              <span className="text-xs font-bold text-white">{stats.totalCompleted} Days</span>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#0e1420] border border-white/[0.06] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Question Bank</span>
              <span className="text-xs font-bold text-white">{stats.totalBank} Unique</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Today's Question Card */}
      {todayQuiz && (
        <div className="card-cozy p-5 sm:p-6 space-y-4 border border-rose-500/30 relative overflow-hidden bg-gradient-to-b from-[#131a29] to-[#0f1422] shadow-2xl">
          {/* Top row: Date & Category & Status */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-slate-300 font-medium text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Today's Question • {formatDateDDMMYYYY(todayQuiz.date || new Date())}</span>
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getCategoryStyle(todayQuiz.category).bg} ${getCategoryStyle(todayQuiz.category).text} ${getCategoryStyle(todayQuiz.category).border}`}>
                {todayQuiz.category}
              </span>
            </div>

            {isTodayCompleted ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Both Answered • Completed 🎉
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Blind Secret Mode
              </span>
            )}
          </div>

          {/* Question Text */}
          <div className="py-2">
            <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              "{todayQuiz.question}"
            </h2>
          </div>

          {/* Answers Display Slots (Lion & Blossom) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Berk's Slot */}
            <div className={`p-4 rounded-2xl border transition-all ${
              todayQuiz.berk_answer 
                ? 'bg-blue-950/20 border-blue-500/30' 
                : 'bg-[#101726]/60 border-white/[0.04]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🦁</span>
                  <span className="text-xs font-bold text-blue-300">Berk's Answer</span>
                </div>
                {todayQuiz.berk_answer ? (
                  <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Submitted
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Waiting...
                  </span>
                )}
              </div>

              {todayQuiz.berk_answer ? (
                // Reveal answer if both have answered OR if current user is Berk viewing his own answer
                (isTodayCompleted || currentUser === 'berk') ? (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-[#0c121e]/80 p-3 rounded-xl border border-blue-500/20">
                    "{todayQuiz.berk_answer}"
                  </p>
                ) : (
                  <div className="bg-[#0c121e]/80 p-3 rounded-xl border border-blue-500/20 flex items-center gap-2 text-slate-400 text-xs">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="italic">Berk has answered! Secret until you submit your answer.</span>
                  </div>
                )
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center">
                  <p className="text-[11px] text-slate-500 italic">Waiting for Berk to submit...</p>
                </div>
              )}
            </div>

            {/* Jaquilyn's Slot */}
            <div className={`p-4 rounded-2xl border transition-all ${
              todayQuiz.jaquilyn_answer 
                ? 'bg-pink-950/20 border-pink-500/30' 
                : 'bg-[#101726]/60 border-white/[0.04]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🌸</span>
                  <span className="text-xs font-bold text-pink-300">Jaquilyn's Answer</span>
                </div>
                {todayQuiz.jaquilyn_answer ? (
                  <span className="text-[10px] text-pink-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Submitted
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Waiting...
                  </span>
                )}
              </div>

              {todayQuiz.jaquilyn_answer ? (
                // Reveal answer if both have answered OR if current user is Jaquilyn viewing her own answer
                (isTodayCompleted || currentUser === 'jaquilyn') ? (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-[#0c121e]/80 p-3 rounded-xl border border-pink-500/20">
                    "{todayQuiz.jaquilyn_answer}"
                  </p>
                ) : (
                  <div className="bg-[#0c121e]/80 p-3 rounded-xl border border-pink-500/20 flex items-center gap-2 text-slate-400 text-xs">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="italic">Jaquilyn has answered! Secret until you submit your answer.</span>
                  </div>
                )
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center">
                  <p className="text-[11px] text-slate-500 italic">Waiting for Jaquilyn to submit...</p>
                </div>
              )}
            </div>
          </div>

          {/* User Input Section or Completed Banner */}
          {!currentUserHasAnswered ? (
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span>{currentUser === 'berk' ? '🦁' : '🌸'}</span>
                  <span>Your Turn, {profile.name}!</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {partnerUserHasAnswered 
                    ? `🔥 ${partnerName} has already answered! Submitting will reveal both answers.` 
                    : `Answers stay sealed until ${partnerName} also replies.`}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  rows={2}
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder={`Write your honest, secret answer here, ${profile.name}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0a0f18] border border-white/[0.08] text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-500 resize-none transition-colors"
                />
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!answerInput.trim() || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Secret Answer'}</span>
                </button>
              </div>
            </div>
          ) : isTodayCompleted ? (
            // Today's Question Fully Completed Notice & Midnight Countdown
            <div className="pt-4 border-t border-emerald-500/20 space-y-3">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#101b24] to-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <PartyPopper className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-bold text-white">
                      Today's Daily Question Completed! 🎉
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Both of you have shared your answers today. It has been sealed into your Memory Vault below!
                  </p>
                </div>

                {/* Countdown Timer */}
                <div className="px-4 py-2 rounded-xl bg-[#0b1019] border border-emerald-500/30 shrink-0">
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    Next Question In
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-300 font-mono mt-0.5">
                    {timeUntilMidnight || 'Calculating...'}
                  </div>
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-400 italic">
                Only 1 question is asked per day so each moment stays special. Come back tomorrow for the next unique prompt!
              </div>
            </div>
          ) : (
            // User submitted, partner hasn't answered yet
            <div className="pt-4 border-t border-white/[0.06] text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Your answer is locked in! Waiting for <strong>{partnerName}</strong> to answer before both answers are revealed.
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Memory Vault & Past Answers Archive */}
      <div className="space-y-4 pt-2">
        {/* Archive Title & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Memory Vault & Answer Archive
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.06] text-slate-300 font-semibold">
              {history.length} Saved
            </span>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past questions or answers..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#111724] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        {allCategories.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-[#121927] text-slate-400 hover:text-white border border-white/[0.04]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Past Questions Cards */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const bothAnswered = Boolean(item.berk_answer && item.jaquilyn_answer);

              return (
                <div 
                  key={item.id} 
                  className="card-cozy p-4 sm:p-5 space-y-3 border border-white/[0.06] hover:border-white/[0.12] transition-all bg-[#111725]/80"
                >
                  {/* Card Header: Date & Category & Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDateDDMMYYYY(item.date || item.answered_at)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getCategoryStyle(item.category).bg} ${getCategoryStyle(item.category).text} ${getCategoryStyle(item.category).border}`}>
                        {item.category}
                      </span>
                    </div>

                    {bothAnswered ? (
                      <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                        Memory Saved
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Partial Answer</span>
                    )}
                  </div>

                  {/* Question */}
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {item.question}
                  </h3>

                  {/* Berk and Jaquilyn Answers Side by Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {/* Berk */}
                    <div className="p-3 rounded-xl bg-[#0c121e] border border-blue-500/20 space-y-1">
                      <div className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                        <span>🦁</span>
                        <span>Berk's Answer</span>
                      </div>
                      {item.berk_answer ? (
                        <p className="text-[11px] sm:text-xs text-slate-200 italic leading-relaxed">
                          "{item.berk_answer}"
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-600 italic">No answer recorded</p>
                      )}
                    </div>

                    {/* Jaquilyn */}
                    <div className="p-3 rounded-xl bg-[#0c121e] border border-pink-500/20 space-y-1">
                      <div className="text-[10px] text-pink-400 font-semibold flex items-center gap-1">
                        <span>🌸</span>
                        <span>Jaquilyn's Answer</span>
                      </div>
                      {item.jaquilyn_answer ? (
                        <p className="text-[11px] sm:text-xs text-slate-200 italic leading-relaxed">
                          "{item.jaquilyn_answer}"
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-600 italic">No answer recorded</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-cozy p-8 text-center space-y-3 border border-white/[0.04]">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Your Memory Vault Starts Today</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once both of you answer today's question, it will be immortalized here forever. Every day adds a new page to your love story!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
