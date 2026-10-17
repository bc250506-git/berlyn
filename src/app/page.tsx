'use client';

import React, { useState } from 'react';
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
  ArrowRight,
  PiggyBank
} from 'lucide-react';
import { DualZoneWidget } from '@/components/DualZoneWidget';
import { RelationshipTimeline } from '@/components/RelationshipTimeline';
import { useCurrentUser } from '@/components/UserContext';
import { USERS, CoupleUser } from '@/types';
import confetti from 'canvas-confetti';

export default function HomePage() {
  const { currentUser, profile, partnerProfile } = useCurrentUser();

  // Daily Blind Question State
  const [dailyPromptAnswer, setDailyPromptAnswer] = useState('');
  const [berkAnswerSubmitted, setBerkAnswerSubmitted] = useState<string | null>(
    'Kyrenia sahilinde yıldızların altında yürüdüğümüz ve gelecekteki evimizi konuştuğumuz o akşam.'
  );
  const [jaquilynAnswerSubmitted, setJaquilynAnswerSubmitted] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Quick Decision Poll State
  const [dinnerPollVotes, setDinnerPollVotes] = useState<Record<CoupleUser, string | null>>({
    berk: 'Ev Yapımı Sıcak Makarna 🍝',
    jaquilyn: null,
  });

  // Love Sticky Notes
  const [stickyNotes, setStickyNotes] = useState([
    {
      id: '1',
      author: 'berk' as CoupleUser,
      text: 'Günaydın birtanem! Bol su içmeyi unutma, akşamki filmimizi sabırsızlıkla bekliyorum. 🌸❤️',
      time: '08:30',
    },
    {
      id: '2',
      author: 'jaquilyn' as CoupleUser,
      text: 'Günün çok güzel geçsin aşkım, seni çok seviyorum! Mahal kita! 🥰🦁',
      time: '11:15',
    },
  ]);
  const [newStickyText, setNewStickyText] = useState('');
  const [showAddSticky, setShowAddSticky] = useState(false);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyPromptAnswer.trim()) return;

    if (currentUser === 'jaquilyn') {
      setJaquilynAnswerSubmitted(dailyPromptAnswer);
    } else {
      setBerkAnswerSubmitted(dailyPromptAnswer);
    }
    setDailyPromptAnswer('');

    if (
      (currentUser === 'jaquilyn' && berkAnswerSubmitted) ||
      (currentUser === 'berk' && jaquilynAnswerSubmitted)
    ) {
      confetti({
        particleCount: 70,
        spread: 60,
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
    if (!newStickyText.trim() || !currentUser) return;

    const newNote = {
      id: Date.now().toString(),
      author: currentUser,
      text: newStickyText,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };
    setStickyNotes([newNote, ...stickyNotes]);
    setNewStickyText('');
    setShowAddSticky(false);
  };

  const bothAnswered = Boolean(berkAnswerSubmitted && jaquilynAnswerSubmitted);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 1. Partner Presence & Dual Zone (Girne ↔ Bulacan) */}
      <DualZoneWidget />

      {/* 2. Canlı İlişki Sayacı (Kalp Atışımız) */}
      <RelationshipTimeline startDate="2026-03-01T00:00:00" />

      {/* 3. Günün Sorusu & Kör Cevap (Günün En Önemli Etkileşimi) */}
      <div className="card-cozy p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bugünün Sorusu #42</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Hatıralar</span>
        </div>

        <h3 className="text-base font-bold text-white leading-snug">
          "Birlikte geçirdiğimiz anlar içinde senin için en unutulmaz, en özel olanı hangisi?"
        </h3>

        {/* Kör Cevap Durumu (İki tarafın kartı) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Berk */}
          <div className="p-3 rounded-2xl bg-[#161e2c] border border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-blue-300">🦁 Berk</span>
              {berkAnswerSubmitted ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">
                  Yazdı ✓
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">Bekleniyor...</span>
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
                    🔒 Cevap kilitli (ikiniz de yazınca açılır)
                  </p>
                )
              ) : (
                <p className="text-slate-600 text-[11px] italic">Henüz cevaplamadı</p>
              )}
            </div>
          </div>

          {/* Jaquilyn */}
          <div className="p-3 rounded-2xl bg-[#161e2c] border border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-rose-300">🌸 Jaquilyn</span>
              {jaquilynAnswerSubmitted ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                  Yazdı ✓
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">Bekleniyor...</span>
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
                    🔒 Cevap kilitli (ikiniz de yazınca açılır)
                  </p>
                )
              ) : (
                <p className="text-slate-600 text-[11px] italic">Henüz cevaplamadı</p>
              )}
            </div>
          </div>
        </div>

        {/* Cevap Formu veya Açma Butonu */}
        <div className="pt-2 border-t border-white/[0.06]">
          {bothAnswered ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                İkiniz de cevapladınız!
              </span>
              <button
                onClick={() => setRevealed(!revealed)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.08] text-xs text-white font-medium hover:bg-white/[0.12] transition-colors"
              >
                {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealed ? 'Gizle' : 'Cevapları Gör'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePromptSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder={`${profile?.name || 'Sen'} olarak gizli cevabını yaz...`}
                value={dailyPromptAnswer}
                onChange={(e) => setDailyPromptAnswer(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Gönder</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 4. Birbirimize Aşk Notları (Buzdolabı Post-it Samimiyeti) */}
      <div className="card-cozy p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
            <Pin className="w-3.5 h-3.5" />
            <span>Birbirimize Notlar</span>
          </span>
          <button
            onClick={() => setShowAddSticky(!showAddSticky)}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Not Bırak</span>
          </button>
        </div>

        {showAddSticky && (
          <form onSubmit={handleAddSticky} className="flex gap-2 pt-1 animate-fade-in">
            <input
              type="text"
              placeholder="Tatlı bir aşk notu veya hatırlatma yaz..."
              value={newStickyText}
              onChange={(e) => setNewStickyText(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Yapıştır
            </button>
          </form>
        )}

        <div className="space-y-2 pt-1">
          {stickyNotes.slice(0, 2).map((note) => {
            const author = USERS[note.author];
            const isBerk = note.author === 'berk';
            return (
              <div
                key={note.id}
                className={`p-3.5 rounded-2xl border text-xs relative ${
                  isBerk
                    ? 'bg-[#141b2a] border-blue-500/20 text-slate-200'
                    : 'bg-[#1c1524] border-rose-500/20 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-[10px]">
                  <span className={`font-semibold flex items-center gap-1 ${isBerk ? 'text-blue-300' : 'text-rose-300'}`}>
                    {author.avatar} {author.name}
                  </span>
                  <span className="text-slate-500 font-mono">{note.time}</span>
                </div>
                <p className="leading-relaxed text-[11px]">{note.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Günlük Karar (Akşam Ne Yapıyoruz?) */}
      <div className="card-cozy p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Günün Kararı</span>
          </span>
          <span className="text-[10px] text-slate-500">Tartışmadan ortak karar</span>
        </div>

        <h4 className="text-xs font-bold text-white">"Bu akşam ne yiyelim?"</h4>

        <div className="grid grid-cols-1 gap-2">
          {[
            'Ev Yapımı Sıcak Makarna 🍝',
            'Taze Sushi Menüsü 🍣',
            'Burger & Patates Kızartması 🍔',
          ].map((option) => {
            const berkChoice = dinnerPollVotes.berk === option;
            const jaqChoice = dinnerPollVotes.jaquilyn === option;
            const isMatch = berkChoice && jaqChoice;

            return (
              <button
                key={option}
                onClick={() => handleVotePoll(option)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isMatch
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : berkChoice || jaqChoice
                    ? 'bg-[#192233] border-white/20 text-white'
                    : 'bg-[#141a26] border-white/[0.06] text-slate-300 hover:bg-[#1a2233]'
                }`}
              >
                <span className="text-xs font-medium">{option}</span>
                <div className="flex items-center gap-1 text-[10px]">
                  {berkChoice && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      🦁 Berk
                    </span>
                  )}
                  {jaqChoice && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      🌸 Jaq
                    </span>
                  )}
                  {isMatch && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                      Ortak Karar! 🎉
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Hızlı Kısayollar (Watchlist & Kumbara Özeti) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Link
          href="/media"
          className="card-cozy p-3.5 hover:border-rose-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Film & Dizi</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Akşam ne izlesek?</p>
          <div className="flex items-center justify-between text-[10px] text-rose-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Listeyi Aç</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          href="/penalty"
          className="card-cozy p-3.5 hover:border-purple-500/30 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-white">Küfür Kumbarası</span>
          </div>
          <p className="text-[10px] text-slate-400 line-clamp-1">Yemek fonumuz</p>
          <div className="flex items-center justify-between text-[10px] text-purple-400 font-medium mt-2 pt-1 border-t border-white/[0.06]">
            <span>Kumbaraya Bak</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
