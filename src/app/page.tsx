'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Sparkles, 
  Film, 
  HelpCircle, 
  Wallet, 
  Compass, 
  CheckSquare, 
  PiggyBank, 
  ArrowRight, 
  Send, 
  Eye, 
  EyeOff, 
  Plus, 
  Pin, 
  Clock,
  Flame,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { RelationshipTimeline } from '@/components/RelationshipTimeline';
import { useCurrentUser } from '@/components/UserContext';
import { USERS, CoupleUser } from '@/types';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const { currentUser, profile, partnerProfile } = useCurrentUser();

  // Daily Prompt Mock State (Backed by Supabase or Instant Local Experience)
  const [dailyPromptAnswer, setDailyPromptAnswer] = useState('');
  const [berkAnswerSubmitted, setBerkAnswerSubmitted] = useState<string | null>(
    'The evening we walked by the sea in Kyrenia under the stars and talked about our future home.'
  );
  const [jaquilynAnswerSubmitted, setJaquilynAnswerSubmitted] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Decision Poll State
  const [dinnerPollVotes, setDinnerPollVotes] = useState<Record<CoupleUser, string | null>>({
    berk: 'Homemade Cozy Pasta',
    jaquilyn: null,
  });

  // Sticky Notes Mock State
  const [stickyNotes, setStickyNotes] = useState([
    {
      id: '1',
      author: 'berk' as CoupleUser,
      text: 'Good morning my love! Don’t forget to hydrate today. Excited for movie night! 🌸❤️',
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-200',
      pinned: true,
      time: '08:30 AM',
    },
    {
      id: '2',
      author: 'jaquilyn' as CoupleUser,
      text: 'Counting down the hours until our call! Mahal kita! 🥰🦁',
      color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-200',
      pinned: true,
      time: '11:15 AM',
    },
  ]);
  const [newStickyNote, setNewStickyNote] = useState('');

  // Handle quiz answer submit
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyPromptAnswer.trim()) return;

    if (currentUser === 'jaquilyn') {
      setJaquilynAnswerSubmitted(dailyPromptAnswer);
    } else {
      setBerkAnswerSubmitted(dailyPromptAnswer);
    }
    setDailyPromptAnswer('');

    // Trigger celebratory confetti if both are now answered
    if (
      (currentUser === 'jaquilyn' && berkAnswerSubmitted) ||
      (currentUser === 'berk' && jaquilynAnswerSubmitted)
    ) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleVotePoll = (option: string) => {
    if (!currentUser) return;
    setDinnerPollVotes((prev) => ({
      ...prev,
      [currentUser]: option,
    }));
  };

  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyNote.trim() || !currentUser) return;

    const newNote = {
      id: Date.now().toString(),
      author: currentUser,
      text: newStickyNote,
      color:
        currentUser === 'berk'
          ? 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-200'
          : 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-200',
      pinned: false,
      time: 'Just now',
    };
    setStickyNotes([newNote, ...stickyNotes]);
    setNewStickyNote('');
  };

  const bothAnswered = Boolean(berkAnswerSubmitted && jaquilynAnswerSubmitted);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* 1. Relationship Live Ticker */}
      <RelationshipTimeline />

      {/* 2. Welcome & Daily Mood Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{profile?.avatar || '🦁'}</div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Welcome home, {profile?.name || 'Berk & Jaquilyn'}!
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                Online & Connected
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {profile?.city} • Partner is in {partnerProfile?.city} ({partnerProfile?.avatar} {partnerProfile?.name})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/media"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors"
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>Pick Tonight’s Movie</span>
          </Link>
          <Link
            href="/quizzes"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium text-rose-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Daily Question</span>
          </Link>
        </div>
      </div>

      {/* 3. Grid: Daily Blind Quiz + Quick Decision Poll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Blind Quiz */}
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between border-rose-500/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                <span>Today's Blind Question #42</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Category: Memories</span>
            </div>

            <h3 className="text-xl font-bold text-white">
              "What is your single favorite memory of us together?"
            </h3>

            {/* Answer Status Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div
                className={`p-3 rounded-2xl border ${
                  berkAnswerSubmitted
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>🦁 Berk</span>
                  {berkAnswerSubmitted ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      Answered ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Waiting...</span>
                  )}
                </div>
                <div className="text-xs">
                  {berkAnswerSubmitted ? (
                    revealed || bothAnswered ? (
                      <p className="italic text-slate-200">"{berkAnswerSubmitted}"</p>
                    ) : (
                      <p className="text-slate-400 blur-sm select-none">
                        Hidden until both answer
                      </p>
                    )
                  ) : (
                    <p className="text-slate-500 italic">Not submitted yet</p>
                  )}
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border ${
                  jaquilynAnswerSubmitted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span>🌸 Jaquilyn</span>
                  {jaquilynAnswerSubmitted ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Answered ✓
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Waiting...</span>
                  )}
                </div>
                <div className="text-xs">
                  {jaquilynAnswerSubmitted ? (
                    revealed || bothAnswered ? (
                      <p className="italic text-slate-200">"{jaquilynAnswerSubmitted}"</p>
                    ) : (
                      <p className="text-slate-400 blur-sm select-none">
                        Hidden until both answer
                      </p>
                    )
                  ) : (
                    <p className="text-slate-500 italic">Not submitted yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form or Reveal Button */}
          <div className="mt-5 pt-4 border-t border-white/10">
            {bothAnswered ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Both answers submitted! Blind lock unlocked.
                </p>
                <button
                  onClick={() => setRevealed(!revealed)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-medium transition-colors"
                >
                  {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{revealed ? 'Hide' : 'Reveal Answers'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handlePromptSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Write your secret answer as ${profile?.name || 'you'}...`}
                  value={dailyPromptAnswer}
                  onChange={(e) => setDailyPromptAnswer(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Quick Decision Poll */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between border-amber-500/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Daily Choice Poll</span>
              </div>
              <span className="text-[11px] text-slate-400">Quick decision without arguing</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-4">
              "What are we having for dinner / date food?"
            </h3>

            <div className="space-y-2.5">
              {[
                'Homemade Cozy Pasta 🍝',
                'Fresh Sushi Combo 🍣',
                'Comfort Burger & Fries 🍔',
                'Cozy Soup & Warm Bread 🍲',
              ].map((option) => {
                const berkChoice = dinnerPollVotes.berk === option;
                const jaqChoice = dinnerPollVotes.jaquilyn === option;
                const isMatch = berkChoice && jaqChoice;

                return (
                  <button
                    key={option}
                    onClick={() => handleVotePoll(option)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isMatch
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : berkChoice || jaqChoice
                        ? 'bg-amber-500/10 border-amber-500/30 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium">{option}</span>
                    <div className="flex items-center gap-1.5">
                      {berkChoice && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                          🦁 Berk
                        </span>
                      )}
                      {jaqChoice && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                          🌸 Jaquilyn
                        </span>
                      )}
                      {isMatch && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-bold">
                          🎉 Match!
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>Click any choice to place your vote</span>
            <Link href="/quizzes" className="text-amber-400 hover:underline">
              Create new poll →
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Feature Hub Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Watchlist & Mood Engine */}
        <Link
          href="/media"
          className="group glass-panel p-5 rounded-3xl hover:border-rose-500/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-110 transition-transform">
              <Film className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Entertainment
            </div>
            <h4 className="text-base font-bold text-white mt-1 group-hover:text-rose-300 transition-colors">
              Watchlist & Mood Recommender
            </h4>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              Log shared movies & series, rate them side-by-side (1-10), and get smart mood-based picks.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Explore Watchlist</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Financial & Wealth Hub */}
        <Link
          href="/finance"
          className="group glass-panel p-5 rounded-3xl hover:border-amber-500/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Finances
            </div>
            <h4 className="text-base font-bold text-white mt-1 group-hover:text-amber-300 transition-colors">
              5-Year Wealth Trajectory
            </h4>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              Shared expenses, gold/crypto/stocks assets, multi-currency conversion, and future projections.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-amber-400 font-medium">
            <span>View Projections</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Smart Travel & Visa Map */}
        <Link
          href="/travel"
          className="group glass-panel p-5 rounded-3xl hover:border-sky-500/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Adventures
            </div>
            <h4 className="text-base font-bold text-white mt-1 group-hover:text-sky-300 transition-colors">
              TR & PH Visa Matcher
            </h4>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              Cross-reference Turkish & Philippine passport requirements for visa-free travel together.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-sky-400 font-medium">
            <span>Find Visa-Free Trips</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Swear / Penalty Jar */}
        <Link
          href="/penalty"
          className="group glass-panel p-5 rounded-3xl hover:border-purple-500/40 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Gamified Fun
            </div>
            <h4 className="text-base font-bold text-white mt-1 group-hover:text-purple-300 transition-colors">
              The Swear & Penalty Jar
            </h4>
            <p className="text-xs text-slate-400 mt-2 line-clamp-2">
              Accumulate penalty fines for forbidden words and fund our luxury anniversary dinner!
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-purple-400 font-medium">
            <span>Check Pot Balance</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 5. Shared Sticky Notes Board (Live Pinboard) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-rose-400" />
              <h3 className="text-lg font-bold text-white">Our Shared Love & Reminder Board</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sweet notes, quick reminders, and grocery memos left for each other
            </p>
          </div>

          <form onSubmit={handleAddSticky} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Leave a sweet note..."
              value={newStickyNote}
              onChange={(e) => setNewStickyNote(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#090d16] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500 hover:text-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post</span>
            </button>
          </form>
        </div>

        {/* Sticky Notes Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stickyNotes.map((note) => {
            const author = USERS[note.author];
            return (
              <div
                key={note.id}
                className={`p-5 rounded-2xl bg-gradient-to-br ${note.color} border shadow-lg relative flex flex-col justify-between min-h-[140px]`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs opacity-80">
                    <span className="font-semibold flex items-center gap-1">
                      {author.avatar} {author.name}
                    </span>
                    <span className="text-[10px] font-mono">{note.time}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{note.text}</p>
                </div>
                {note.pinned && (
                  <div className="flex items-center gap-1 text-[10px] opacity-70 mt-3">
                    <Pin className="w-3 h-3" />
                    <span>Pinned by {author.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
