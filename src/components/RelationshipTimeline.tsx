'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Sparkles, Calendar, Clock } from 'lucide-react';

interface TimeElapsed {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}

interface RelationshipTimelineProps {
  startDate?: string;
}

export function RelationshipTimeline({
  startDate = process.env.NEXT_PUBLIC_RELATIONSHIP_START || '2023-08-01T00:00:00',
}: RelationshipTimelineProps) {
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

      const hours = nowDateObj.getHours() - startDateObj.getHours();
      const minutes = nowDateObj.getMinutes() - startDateObj.getMinutes();
      const seconds = nowDateObj.getSeconds() - startDateObj.getSeconds();

      const adjustedHours = (hours + 24) % 24;
      const adjustedMinutes = (minutes + 60) % 60;
      const adjustedSeconds = (seconds + 60) % 60;

      setElapsed({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: adjustedHours,
        minutes: adjustedMinutes,
        seconds: adjustedSeconds,
        totalDays,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel-glow p-6 sm:p-8">
      {/* Subtle background ambient lights */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Romantic label & Days counter */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium tracking-wide uppercase mb-3">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
            <span>Our Journey Together</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Together in Love for{' '}
            <span className="text-gradient-rose font-mono">
              {elapsed.totalDays.toLocaleString()}
            </span>{' '}
            Days
          </h2>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2 justify-center md:justify-start">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Every single second counts in our sanctuary</span>
          </p>
        </div>

        {/* Right: Live Ticker Badges */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 w-full md:w-auto">
          {[
            { label: 'Years', val: elapsed.years },
            { label: 'Months', val: elapsed.months },
            { label: 'Days', val: elapsed.days },
            { label: 'Hours', val: String(elapsed.hours).padStart(2, '0') },
            { label: 'Mins', val: String(elapsed.minutes).padStart(2, '0') },
            { label: 'Secs', val: String(elapsed.seconds).padStart(2, '0'), highlight: true },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all ${
                item.highlight
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-lg shadow-rose-500/10'
                  : 'bg-[#111726]/90 border-white/10 text-white'
              }`}
            >
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-wider">
                {item.val}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
