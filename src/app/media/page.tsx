'use client';

import React, { useEffect, useState } from 'react';
import { 
  Film, 
  Tv, 
  Sparkles, 
  Plus, 
  Star, 
  Heart, 
  Play, 
  X, 
  Shuffle, 
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { MediaItem, MediaType, WatchStatus, MediaMood, CoupleUser } from '@/types';
import { fetchMediaItems, saveMediaItem, INITIAL_MEDIA_ITEMS } from '@/lib/media-service';
import { useCurrentUser } from '@/components/UserContext';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';

const MOODS_LIST: { id: MediaMood; label: string; icon: string }[] = [
  { id: 'cozy', label: 'Huzurlu & Battaniye', icon: '☕' },
  { id: 'romantic', label: 'Aşk & Romantizm', icon: '🌹' },
  { id: 'emotional', label: 'Duygusal / Ağlatan', icon: '🥺' },
  { id: 'thriller', label: 'Gerilim & Gizem', icon: '🔪' },
  { id: 'mind_bending', label: 'Beyin Yakan Bilim Kurgu', icon: '🌌' },
  { id: 'comedy', label: 'Kahkaha & Komedi', icon: '😂' },
  { id: 'nostalgic', label: 'Nostaljik Klasikler', icon: '📻' },
  { id: 'action', label: 'Aksiyon & Marvel', icon: '💥' },
];

export default function MediaPage() {
  const { currentUser, profile } = useCurrentUser();
  const [items, setItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [statusFilter, setStatusFilter] = useState<'all' | WatchStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Recommender Modal
  const [showRecommender, setShowRecommender] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MediaMood>('cozy');
  const [recommendedPick, setRecommendedPick] = useState<MediaItem | null>(null);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<MediaType>('movie');
  const [newStatus, setNewStatus] = useState<WatchStatus>('want_to_watch');
  const [newYear, setNewYear] = useState<number>(2026);
  const [newEpisodes, setNewEpisodes] = useState<number>(1);
  const [newPosterUrl, setNewPosterUrl] = useState('');
  const [newGenres, setNewGenres] = useState('Romantik, Dram');
  const [newSelectedMoods, setNewSelectedMoods] = useState<MediaMood[]>(['cozy']);

  // Rate & Review Modal
  const [rateItem, setRateItem] = useState<MediaItem | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(9);
  const [reviewVal, setReviewVal] = useState<string>('');

  useEffect(() => {
    fetchMediaItems().then((data) => {
      if (data && data.length > 0) setItems(data);
    });
  }, []);

  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleGenerateRecommendation = () => {
    const candidates = items.filter(
      (item) => item.status === 'want_to_watch' && item.moods.includes(selectedMood)
    );

    let pick: MediaItem | null = null;
    if (candidates.length > 0) {
      pick = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      const anyQueue = items.filter((item) => item.status === 'want_to_watch');
      pick = anyQueue.length > 0 ? anyQueue[0] : items[0];
    }

    setRecommendedPick(pick);
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.6 },
    });
  };

  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: Partial<MediaItem> = {
      title: newTitle,
      type: newType,
      status: newStatus,
      year: Number(newYear) || 2026,
      total_episodes: newType !== 'movie' ? Number(newEpisodes) || 12 : undefined,
      current_episode: 0,
      genres: newGenres.split(',').map((g) => g.trim()),
      moods: newSelectedMoods,
      poster_url: newPosterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      added_by: currentUser || 'berk',
    };

    const saved = await saveMediaItem(newItem);
    setItems([saved, ...items]);
    setShowAddModal(false);
    setNewTitle('');
    setNewPosterUrl('');
  };

  const handleSaveRating = async () => {
    if (!rateItem || !currentUser) return;

    const updated: MediaItem = {
      ...rateItem,
      berk_rating: currentUser === 'berk' ? ratingVal : rateItem.berk_rating,
      jaquilyn_rating: currentUser === 'jaquilyn' ? ratingVal : rateItem.jaquilyn_rating,
      berk_review: currentUser === 'berk' ? reviewVal : rateItem.berk_review,
      jaquilyn_review: currentUser === 'jaquilyn' ? reviewVal : rateItem.jaquilyn_review,
    };

    await saveMediaItem(updated);
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    setRateItem(null);
  };

  const handleProgressEpisode = async (item: MediaItem) => {
    const cur = item.current_episode || 0;
    const max = item.total_episodes || 12;
    const nextEp = Math.min(max, cur + 1);
    const updated: MediaItem = {
      ...item,
      current_episode: nextEp,
      status: nextEp === max ? 'completed' : 'watching',
    };
    await saveMediaItem(updated);
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* 1. Mobile Top Card */}
      <div className="card-cozy p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-1.5">
              <Film className="w-4 h-4 text-rose-400" />
              <span>İzlediklerimiz & Öneriler</span>
            </h1>
            <p className="text-[11px] text-slate-400">Ortak film/dizi kütüphanemiz ve puanlarımız</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            aria-label="Yeni Ekle"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Mood Picker CTA */}
        <button
          onClick={() => {
            setShowRecommender(true);
            setRecommendedPick(null);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-[#1a2333] border border-white/[0.08] hover:border-rose-500/30 flex items-center justify-between text-xs text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Bu Akşam Ne İzlesek? (Ruh Hali Önerisi)</span>
          </span>
          <span className="text-[10px] text-rose-400 font-semibold">Öneri Al →</span>
        </button>
      </div>

      {/* 2. Status Filters (Horizontal Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {[
          { id: 'all', label: 'Tümü' },
          { id: 'want_to_watch', label: 'İzlenecek' },
          { id: 'watching', label: 'İzleniyor' },
          { id: 'completed', label: 'İzlendi' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-rose-600 text-white'
                : 'bg-[#121824] border border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Media Items List (Clean Mobile Cards) */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const hasDualRating = item.berk_rating && item.jaquilyn_rating;
          const coupleScore = hasDualRating
            ? ((item.berk_rating! + item.jaquilyn_rating!) / 2).toFixed(1)
            : item.berk_rating || item.jaquilyn_rating || null;

          return (
            <div key={item.id} className="card-cozy p-3.5 flex flex-col gap-3">
              <div className="flex gap-3">
                {/* Poster */}
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-20 h-28 rounded-xl object-cover bg-slate-900 border border-white/[0.08] flex-shrink-0"
                />

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 uppercase font-mono">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.year}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ml-auto font-medium ${
                        item.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'watching'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-white/[0.06] text-slate-400'
                      }`}>
                        {item.status === 'completed' ? 'İzlendi' : item.status === 'watching' ? 'İzleniyor' : 'Sırada'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.genres.join(', ')}</p>
                  </div>

                  {/* Ratings Row */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-300 font-mono">
                        🦁 {item.berk_rating ? `${item.berk_rating}/10` : '-'}
                      </span>
                      <span className="text-[10px] text-rose-300 font-mono">
                        🌸 {item.jaquilyn_rating ? `${item.jaquilyn_rating}/10` : '-'}
                      </span>
                    </div>

                    {coupleScore && (
                      <span className="text-[10px] font-bold text-amber-400 font-mono flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                        {coupleScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Series Progress (If applicable) */}
              {item.type !== 'movie' && item.total_episodes && (
                <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="text-slate-400">Bölüm İlerlemesi</span>
                    <span className="font-mono text-amber-400 font-semibold">
                      {item.current_episode || 0} / {item.total_episodes}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${((item.current_episode || 0) / item.total_episodes) * 100}%`,
                      }}
                    />
                  </div>
                  <button
                    onClick={() => handleProgressEpisode(item)}
                    className="w-full py-1 text-[11px] text-rose-300 font-medium bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>+1 Bölüm İzlendi</span>
                  </button>
                </div>
              )}

              {/* Review snippet */}
              {(item.berk_review || item.jaquilyn_review) && (
                <div className="bg-[#141b26] p-2 rounded-xl text-[10px] text-slate-300 space-y-0.5 italic">
                  {item.berk_review && <p>🦁 Berk: "{item.berk_review}"</p>}
                  {item.jaquilyn_review && <p>🌸 Jaq: "{item.jaquilyn_review}"</p>}
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/[0.04]">
                <span>Eklenme: {formatDateDDMMYYYY(item.created_at)}</span>
                <button
                  onClick={() => {
                    setRateItem(item);
                    setRatingVal(
                      (currentUser === 'berk' ? item.berk_rating : item.jaquilyn_rating) || 9
                    );
                    setReviewVal(
                      (currentUser === 'berk' ? item.berk_review : item.jaquilyn_review) || ''
                    );
                  }}
                  className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                >
                  <Star className="w-3 h-3" />
                  <span>Puan Ver / Yorumla</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommender Bottom Sheet */}
      {showRecommender && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Bu Akşamın Ruh Hali Nedir?
              </h3>
              <button
                onClick={() => setShowRecommender(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {MOODS_LIST.map((m) => {
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/15 text-white'
                        : 'border-white/[0.08] bg-[#161e2c] text-slate-300'
                    }`}
                  >
                    <div className="text-lg">{m.icon}</div>
                    <div className="text-xs font-semibold mt-1">{m.label}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleGenerateRecommendation}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Bize Bir Film Seç! 🍿</span>
            </button>

            {recommendedPick && (
              <div className="mt-4 p-3 rounded-2xl bg-[#161e2c] border border-rose-500/30 flex items-center gap-3">
                <img
                  src={recommendedPick.poster_url}
                  alt={recommendedPick.title}
                  className="w-14 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-rose-400 font-semibold">🎉 Bu Akşamın Seçimi:</span>
                  <h4 className="text-sm font-bold text-white truncate">{recommendedPick.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{recommendedPick.genres.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white">Film veya Dizi Ekle</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">İsim</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: About Time, Loki..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tür</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MediaType)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="movie">Film</option>
                    <option value="series">Dizi</option>
                    <option value="anime">Anime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Durum</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as WatchStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="want_to_watch">İzlenecek</option>
                    <option value="watching">İzleniyor</option>
                    <option value="completed">İzlendi</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors mt-2"
              >
                Listemize Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {rateItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white">Puanla: {rateItem.title}</h3>
              <button
                onClick={() => setRateItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Verdiğin Puan:</span>
                <span className="font-mono text-base font-bold text-amber-400">{ratingVal} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={ratingVal}
                onChange={(e) => setRatingVal(Number(e.target.value))}
                className="w-full accent-rose-500"
              />

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Düşüncelerin / Birlikte İzleme Anısı</label>
                <textarea
                  rows={2}
                  placeholder="Nasıl hissettirdi? Bize dair bir hatırası var mı?"
                  value={reviewVal}
                  onChange={(e) => setReviewVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={handleSaveRating}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
              >
                Puanımı Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
