'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';

interface TimeElapsed {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

export function RelationshipTimeline({
  startDate = process.env.NEXT_PUBLIC_RELATIONSHIP_START || '2026-03-01T00:00:00',
}: {
  startDate?: string;
}) {
  const [elapsed, setElapsed] = useState<TimeElapsed>({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalDays: 0,
  });

  useEffect(() => {
    const start = new Date(startDate).getTime();

    const calculate = () => {
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);

      const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const startDateObj = new Date(start);
      const nowDateObj = new Date();

      let years = nowDateObj.getFullYear() - startDateObj.getFullYear();
      let months = nowDateObj.getMonth() - startDateObj.getMonth();
      let days = nowDateObj.getDate() - startDateObj.getDate();

      if (days < 0) {
        months -= 1;
        const prevMonth = new Date(nowDateObj.getFullYear(), nowDateObj.getMonth(), 0);
        days += prevMonth.getDate();
      }

      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const hours = (nowDateObj.getHours() - startDateObj.getHours() + 24) % 24;
      const minutes = (nowDateObj.getMinutes() - startDateObj.getMinutes() + 60) % 60;
      const seconds = (nowDateObj.getSeconds() - startDateObj.getSeconds() + 60) % 60;

      setElapsed({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours,
        minutes,
        seconds,
        totalDays,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  const formattedDate = formatDateDDMMYYYY(startDate);
  const totalWeeks = Math.floor(elapsed.totalDays / 7);
  const totalHours = elapsed.totalDays * 24 + elapsed.hours;

  return (
    <div className="card-cozy p-5 relative overflow-hidden bg-gradient-to-br from-[#131926] via-[#161d2d] to-[#121722] border border-rose-500/20">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>Our Love Journey • Since {formattedDate}</span>
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        {/* Main Days Counter */}
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
            <span className="text-love-gradient text-4xl sm:text-5xl font-black font-mono">
              {elapsed.totalDays}
            </span>
            <span className="text-slate-200 text-lg font-bold">Days Together</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Every single moment with you is precious</p>
        </div>

        {/* Multiple scales of our time together (Replacing the live digital clock) */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-1 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 font-mono text-[11px] font-bold">
              ~{totalWeeks} weeks
            </span>
            <span className="px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 font-mono text-[11px] font-bold">
              {(elapsed.totalDays / 30.44).toFixed(1)} months
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            ~{totalHours.toLocaleString()} hours of happiness ✨
          </span>
        </div>
      </div>
    </div>
  );
}

