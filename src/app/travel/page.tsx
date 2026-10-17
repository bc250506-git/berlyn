'use client';

import React, { useState } from 'react';
import { Compass, CheckCircle2, Plane, Globe, Shield, MapPin } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';

const VISA_FREE_COUNTRIES = [
  { name: 'Japan', code: 'JP', trVisa: 'Visa-Free (90 days)', phVisa: 'e-Visa / Easy', bothStatus: 'Top Pick / Easy 🌸' },
  { name: 'Thailand', code: 'TH', trVisa: 'Visa-Free (60 days)', phVisa: 'Visa-Free (30 days)', bothStatus: 'Both Visa-Free! 🌴' },
  { name: 'South Korea', code: 'KR', trVisa: 'K-ETA (e-Visa)', phVisa: 'e-Visa', bothStatus: 'Easy with e-Visa 🇰🇷' },
  { name: 'Indonesia (Bali)', code: 'ID', trVisa: 'Visa on Arrival (VoA)', phVisa: 'Visa-Free (30 days)', bothStatus: 'Very Easy for Both 🏖️' },
  { name: 'Singapore', code: 'SG', trVisa: 'Visa-Free (30 days)', phVisa: 'Visa-Free (30 days)', bothStatus: 'Both Visa-Free! 🏙️' },
  { name: 'Maldives', code: 'MV', trVisa: 'Free Visa on Arrival (30d)', phVisa: 'Free Visa on Arrival (30d)', bothStatus: 'Both Visa-Free! 🌊' },
  { name: 'Montenegro', code: 'ME', trVisa: 'Visa-Free (90 days)', phVisa: 'Visa Required', bothStatus: 'TR Visa-Free ⛰️' },
  { name: 'Brazil', code: 'BR', trVisa: 'Visa-Free (90 days)', phVisa: 'Visa-Free (90 days)', bothStatus: 'Both Visa-Free! 💃' },
];

export default function TravelPage() {
  const [filter, setFilter] = useState<'all' | 'both_easy'>('both_easy');

  const displayed = filter === 'both_easy'
    ? VISA_FREE_COUNTRIES.filter((c) => c.bothStatus.includes('Visa-Free') || c.bothStatus.includes('Easy'))
    : VISA_FREE_COUNTRIES;

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      <div className="card-cozy p-4 space-y-1">
        <h1 className="text-base font-bold text-white flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-rose-400" />
          <span>TR & PH Dual Passport Visa Matcher</span>
        </h1>
        <p className="text-[11px] text-slate-400">
          Destinations where Turkish (TR) and Philippine (PH) passports can easily travel together
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('both_easy')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === 'both_easy'
              ? 'bg-rose-600 text-white'
              : 'bg-[#121824] border border-white/[0.08] text-slate-400'
          }`}
        >
          Easy / Visa-Free for Both
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-rose-600 text-white'
              : 'bg-[#121824] border border-white/[0.08] text-slate-400'
          }`}
        >
          All Destinations
        </button>
      </div>

      <div className="space-y-2.5">
        {displayed.map((item) => (
          <div key={item.code} className="card-cozy p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-white">{item.name}</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                {item.bothStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/[0.04]">
              <div className="bg-[#161e2c] p-2 rounded-xl">
                <span className="text-[10px] text-blue-300 font-semibold block">🦁 TR Passport</span>
                <span className="text-slate-300">{item.trVisa}</span>
              </div>
              <div className="bg-[#161e2c] p-2 rounded-xl">
                <span className="text-[10px] text-rose-300 font-semibold block">🌸 PH Passport</span>
                <span className="text-slate-300">{item.phVisa}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
