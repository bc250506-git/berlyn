'use client';

import React, { useState } from 'react';
import { HelpCircle, Sparkles, Send, CheckCircle2, Eye, EyeOff, Plus, Heart } from 'lucide-react';
import { useCurrentUser } from '@/components/UserContext';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';
import { playSeal, playMatch } from '@/lib/sound-effects';

interface PromptItem {
  id: string;
  category: string;
  question: string;
  berkAnswer: string | null;
  jaqAnswer: string | null;
  answeredDate: string | null;
}

const SAMPLE_PROMPTS: PromptItem[] = [
  {
    id: '1',
    category: 'Memories',
    question: 'Out of all the moments we have spent together, which one is the most unforgettable and special for you?',
    berkAnswer: null,
    jaqAnswer: null,
    answeredDate: null,
  },
  {
    id: '2',
    category: 'Future',
    question: 'In our future shared home, where do you want to spend the most time together?',
    berkAnswer: null,
    jaqAnswer: null,
    answeredDate: null,
  },
  {
    id: '3',
    category: 'Deep Love',
    question: 'What is something you appreciated or that made you smile about me today?',
    berkAnswer: null,
    jaqAnswer: null,
    answeredDate: null,
  },
];

export default function QuizzesPage() {
  const { currentUser, profile } = useCurrentUser();
  const [prompts, setPrompts] = useState<PromptItem[]>(SAMPLE_PROMPTS);
  const [activeAnswerInput, setActiveAnswerInput] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const handleAnswerSubmit = (promptId: string) => {
    const text = activeAnswerInput[promptId];
    if (!text?.trim()) return;

    const targetPrompt = prompts.find((p) => p.id === promptId);
    const partnerAlreadyAnswered = currentUser === 'berk' ? Boolean(targetPrompt?.jaqAnswer) : Boolean(targetPrompt?.berkAnswer);

    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id !== promptId) return p;
        if (currentUser === 'berk') {
          return { ...p, berkAnswer: text };
        } else {
          return { ...p, jaqAnswer: text };
        }
      })
    );

    setActiveAnswerInput((prev) => ({ ...prev, [promptId]: '' }));

    if (partnerAlreadyAnswered) {
      playMatch();
    } else {
      playSeal();
    }

    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      <div className="card-cozy p-4 space-y-1">
        <h1 className="text-base font-bold text-white flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-rose-400" />
          <span>Daily Quizzes & Blind Answers</span>
        </h1>
        <p className="text-[11px] text-slate-400">
          Answers stay secret and locked until both of you submit, then the answers reveal!
        </p>
      </div>

      <div className="space-y-3">
        {prompts.map((p) => {
          const bothAnswered = Boolean(p.berkAnswer && p.jaqAnswer);
          const isRevealed = Boolean(revealedIds[p.id]);

          return (
            <div key={p.id} className="card-cozy p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-semibold uppercase">
                  {p.category}
                </span>
                {bothAnswered ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Both Answered
                  </span>
                ) : (
                  <span className="text-slate-500">Locked 🔒</span>
                )}
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">{p.question}</h3>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-[#161e2c] border border-white/[0.04]">
                  <div className="text-[10px] text-blue-300 font-semibold mb-1">🦁 Berk</div>
                  {p.berkAnswer ? (
                    bothAnswered || isRevealed ? (
                      <p className="text-[11px] text-slate-200 italic">"{p.berkAnswer}"</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">🔒 Submitted (Locked)</p>
                    )
                  ) : (
                    <p className="text-[10px] text-slate-600 italic">Waiting to reply...</p>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-[#161e2c] border border-white/[0.04]">
                  <div className="text-[10px] text-rose-300 font-semibold mb-1">🌸 Jaquilyn</div>
                  {p.jaqAnswer ? (
                    bothAnswered || isRevealed ? (
                      <p className="text-[11px] text-slate-200 italic">"{p.jaqAnswer}"</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">🔒 Submitted (Locked)</p>
                    )
                  ) : (
                    <p className="text-[10px] text-slate-600 italic">Waiting to reply...</p>
                  )}
                </div>
              </div>

              {!bothAnswered ? (
                <div className="pt-2 border-t border-white/[0.04] flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your secret answer here..."
                    value={activeAnswerInput[p.id] || ''}
                    onChange={(e) =>
                      setActiveAnswerInput({ ...activeAnswerInput, [p.id]: e.target.value })
                    }
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                  <button
                    onClick={() => handleAnswerSubmit(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Answers revealed • {p.answeredDate || formatDateDDMMYYYY(new Date())}
                  </span>
                  <button
                    onClick={() =>
                      setRevealedIds((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                    }
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
