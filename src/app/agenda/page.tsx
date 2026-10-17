'use client';

import React, { useState } from 'react';
import { CheckSquare, Camera, Sparkles, Heart, Plus } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';

const SAMPLE_BUCKET_LIST = [
  { id: '1', title: 'Kyrenia Kalesinde gün batımında kahve içmek', completed: true, date: '10.03.2026', photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
  { id: '2', title: 'Baler / Siargao adasında birlikte sörf denemek', completed: false, date: null, photo: null },
  { id: '3', title: 'Tokyo sokaklarında ramen yemek ve anime dükkanlarını gezmek', completed: false, date: null, photo: null },
  { id: '4', title: 'İlk ortak evimizin anahtarını teslim almak', completed: false, date: null, photo: null },
];

export default function AgendaPage() {
  const [items, setItems] = useState(SAMPLE_BUCKET_LIST);

  return (
    <div className="space-y-4 animate-fade-in pb-16">
      <div className="card-cozy p-4 space-y-1">
        <h1 className="text-base font-bold text-white flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-rose-400" />
          <span>Ortak Bucket List & Yaşam Hedeflerimiz</span>
        </h1>
        <p className="text-[11px] text-slate-400">
          Hayatta birlikte gerçekleştirmek istediğimiz hayaller ve tamamlananların anı fotoğrafları
        </p>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="card-cozy p-3.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => {
                  setItems(items.map((i) => (i.id === item.id ? { ...i, completed: !i.completed } : i)));
                }}
                className="mt-0.5 accent-rose-500 rounded cursor-pointer"
              />
              <div className="flex-1">
                <span className={`text-xs font-semibold ${item.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {item.title}
                </span>
                {item.date && (
                  <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                    Tamamlandı: {item.date}
                  </span>
                )}
              </div>
            </div>

            {item.photo && (
              <img
                src={item.photo}
                alt={item.title}
                className="w-full h-32 rounded-xl object-cover border border-white/[0.08]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
