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

  return (
    <div className="card-cozy p-5 relative overflow-hidden">
      {/* Subtle warm corner accent */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium tracking-wide text-rose-400/90 uppercase flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span>Aşk Zamanı • {formattedDate}'den beri</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          {elapsed.months} ay {elapsed.days} gün
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-1.5">
            <span className="text-love-gradient text-4xl font-black font-mono">
              {elapsed.totalDays}
            </span>
            <span className="text-slate-300 text-lg font-bold">Gündür Birlikteyiz</span>
          </div>
        </div>

        {/* Live second ticker */}
        <div className="bg-[#182030] border border-white/[0.06] rounded-xl px-2.5 py-1.5 text-right">
          <div className="font-mono text-xs font-bold text-white tracking-widest">
            {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}:
            <span className="text-rose-400">{String(elapsed.seconds).padStart(2, '0')}</span>
          </div>
          <div className="text-[9px] text-slate-400 uppercase font-medium mt-0.5">
            Saat : Dk : Sn
          </div>
        </div>
      </div>
    </div>
  );
}
