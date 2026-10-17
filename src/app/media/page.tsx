'use client';

import React, { useEffect, useState } from 'react';
import { 
  Film, 
  Tv, 
  Sparkles, 
  Plus, 
  Star, 
  Heart, 
  CheckCircle2, 
  Clock, 
  Play, 
  Filter, 
  Flame, 
  Compass, 
  X, 
  Shuffle, 
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { MediaItem, MediaType, WatchStatus, MediaMood, CoupleUser } from '@/types';
import { fetchMediaItems, saveMediaItem, INITIAL_MEDIA_ITEMS } from '@/lib/media-service';
import { useCurrentUser } from '@/components/UserContext';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';

const MOODS_LIST: { id: MediaMood; label: string; icon: string; desc: string }[] = [
  { id: 'cozy', label: 'Cozy & Comfort', icon: '☕', desc: 'Warm blankets, rainy night vibes, soothing story' },
  { id: 'romantic', label: 'Deep Romance', icon: '🌹', desc: 'Heart-fluttering love stories and deep connections' },
  { id: 'emotional', label: 'Tear-Jerker', icon: '🥺', desc: 'Grab the tissues, heartwarming emotional rollercoaster' },
  { id: 'thriller', label: 'Edge-of-Seat Thriller', icon: '🔪', desc: 'Suspense, plot twists, gripping tension' },
  { id: 'mind_bending', label: 'Mind-Bending Sci-Fi', icon: '🌌', desc: 'Time travel, parallel realities, deep philosophy' },
  { id: 'comedy', label: 'Pure Laughs', icon: '😂', desc: 'Lighthearted, hilarious comedy to lift your spirits' },
  { id: 'nostalgic', label: 'Nostalgic Classics', icon: '📻', desc: 'Timeless favorites from past eras that feel like home' },
  { id: 'action', label: 'Action & MCU', icon: '💥', desc: 'Superhero epics, high-octane blockbusters' },
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
  const [newGenres, setNewGenres] = useState('Romance, Drama');
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

  // Filtered list
  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Recommender algorithm
  const handleGenerateRecommendation = () => {
    // 1. Prioritize want_to_watch items matching selected mood
    const candidates = items.filter(
      (item) => item.status === 'want_to_watch' && item.moods.includes(selectedMood)
    );

    let pick: MediaItem | null = null;
    if (candidates.length > 0) {
      pick = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Fallback: any want_to_watch or completed favorite
      const anyQueue = items.filter((item) => item.status === 'want_to_watch');
      pick = anyQueue.length > 0 ? anyQueue[0] : items[0];
    }

    setRecommendedPick(pick);
    confetti({
      particleCount: 70,
      spread: 60,
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
    // Reset
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
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold mb-3">
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>Shared Entertainment Sanctuary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Our Watchlist & Couple Ratings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            Rate our movies together, track MCU & anime episode progress, and let our smart mood engine recommend what to watch without scrolling forever.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setShowRecommender(true);
              setRecommendedPick(null);
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Tonight's Mood Recommender</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-[#111726] border border-white/10 hover:border-white/20 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            <span>Add Movie / Series</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#111726] border border-white/10 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Items', count: items.length },
            { id: 'want_to_watch', label: 'Want to Watch', count: items.filter(i => i.status === 'want_to_watch').length },
            { id: 'watching', label: 'Watching', count: items.filter(i => i.status === 'watching').length },
            { id: 'completed', label: 'Completed', count: items.filter(i => i.status === 'completed').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-slate-300 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Type Filter & Search Input */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#111726] border border-white/10">
            {(['all', 'movie', 'series', 'anime'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                  typeFilter === t
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-[#111726] border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 w-44 sm:w-56"
          />
        </div>
      </div>

      {/* 3. Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item) => {
          const hasDualRating = item.berk_rating && item.jaquilyn_rating;
          const coupleScore = hasDualRating
            ? ((item.berk_rating! + item.jaquilyn_rating!) / 2).toFixed(1)
            : item.berk_rating || item.jaquilyn_rating || null;

          return (
            <div
              key={item.id}
              className="group glass-panel rounded-3xl overflow-hidden border border-white/10 hover:border-rose-500/30 transition-all flex flex-col justify-between"
            >
              {/* Poster & Overlay */}
              <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-slate-900">
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-transparent to-black/40" />

                {/* Type & Year Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold uppercase tracking-wider text-slate-200">
                    {item.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
                    {item.year}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium tracking-wide capitalize backdrop-blur-md ${
                      item.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : item.status === 'watching'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Bottom title on poster */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-base font-bold text-white drop-shadow-md line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.moods.map((m) => (
                      <span
                        key={m}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200 font-medium capitalize"
                      >
                        #{m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                {/* Series Progress (If applicable) */}
                {item.type !== 'movie' && item.total_episodes && (
                  <div className="space-y-1.5 bg-[#0a0f1c] p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium">Progress</span>
                      <span className="font-mono text-[11px] text-amber-400">
                        Ep {item.current_episode || 0} / {item.total_episodes}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all"
                        style={{
                          width: `${((item.current_episode || 0) / item.total_episodes) * 100}%`,
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleProgressEpisode(item)}
                      className="w-full mt-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-rose-400" />
                      <span>+1 Watched Episode</span>
                    </button>
                  </div>
                )}

                {/* Dual Ratings Section */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Berk Rating */}
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 flex flex-col justify-between">
                    <div className="text-[10px] text-blue-300 font-semibold flex items-center gap-1">
                      <span>🦁 Berk</span>
                    </div>
                    <div className="font-mono text-sm font-bold mt-0.5">
                      {item.berk_rating ? `${item.berk_rating} / 10` : 'Not rated'}
                    </div>
                  </div>

                  {/* Jaquilyn Rating */}
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 flex flex-col justify-between">
                    <div className="text-[10px] text-rose-300 font-semibold flex items-center gap-1">
                      <span>🌸 Jaquilyn</span>
                    </div>
                    <div className="font-mono text-sm font-bold mt-0.5">
                      {item.jaquilyn_rating ? `${item.jaquilyn_rating} / 10` : 'Not rated'}
                    </div>
                  </div>
                </div>

                {/* Couple Match Score */}
                {coupleScore && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-purple-500/15 to-amber-500/15 border border-rose-500/20 text-xs">
                    <span className="flex items-center gap-1 text-slate-300 font-medium">
                      <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500" />
                      Couple Score:
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {coupleScore} / 10
                    </span>
                  </div>
                )}

                {/* Reviews snippet */}
                {(item.berk_review || item.jaquilyn_review) && (
                  <div className="space-y-1 text-[11px] text-slate-300 bg-white/5 p-2 rounded-xl italic">
                    {item.berk_review && (
                      <p className="line-clamp-1">
                        <strong className="text-blue-300 not-italic">🦁 Berk: </strong>
                        "{item.berk_review}"
                      </p>
                    )}
                    {item.jaquilyn_review && (
                      <p className="line-clamp-1">
                        <strong className="text-rose-300 not-italic">🌸 Jaq: </strong>
                        "{item.jaquilyn_review}"
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px]">
                    Added: {formatDateDDMMYYYY(item.created_at)}
                  </span>
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
                    className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Rate / Review</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mood Recommender Modal */}
      {showRecommender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#111726] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setShowRecommender(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center max-w-md mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Couple Mood Decision Engine</span>
              </div>
              <h3 className="text-2xl font-bold text-white">What vibe are we craving tonight?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select your vibe and let our algorithm surprise both of you with the ideal movie from our watchlist.
              </p>
            </div>

            {/* Moods selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
              {MOODS_LIST.map((m) => {
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(m.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                        : 'bg-[#0b101c] border-white/10 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-1">{m.icon}</div>
                    <div className="text-xs font-bold">{m.label}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleGenerateRecommendation}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-sm shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Shuffle className="w-4 h-4" />
              <span>Surprise Us & Pick Tonight’s Movie!</span>
            </button>

            {/* Pick Result */}
            {recommendedPick && (
              <div className="mt-6 p-5 rounded-3xl bg-gradient-to-r from-rose-500/10 via-[#0e1524] to-amber-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-center gap-5 animate-scale-up">
                <img
                  src={recommendedPick.poster_url}
                  alt={recommendedPick.title}
                  className="w-24 h-32 rounded-2xl object-cover shadow-lg border border-white/10"
                />
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
                    🎉 Tonight's Perfect Match Pick:
                  </div>
                  <h4 className="text-xl font-extrabold text-white">
                    {recommendedPick.title} ({recommendedPick.year})
                  </h4>
                  <p className="text-xs text-slate-300">
                    Genres: {recommendedPick.genres.join(', ')} • Mood: #{selectedMood}
                  </p>
                  <p className="text-xs text-amber-300 italic">
                    "Matches our cozy vibe perfectly. Popcorn ready, lights dimmed!"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#111726] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-400" />
              Add Movie / TV Series / Anime
            </h3>

            <form onSubmit={handleSaveNewItem} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. La La Land, Succession, Attack on Titan..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Media Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MediaType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="movie">Movie</option>
                    <option value="series">TV Series</option>
                    <option value="anime">Anime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as WatchStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="want_to_watch">Want to Watch</option>
                    <option value="watching">Currently Watching</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Release Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500"
                  >
                  </input>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Episodes (if series)</label>
                  <input
                    type="number"
                    value={newEpisodes}
                    onChange={(e) => setNewEpisodes(Number(e.target.value))}
                    disabled={newType === 'movie'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500 disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Poster Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://... or leave empty for auto poster"
                  value={newPosterUrl}
                  onChange={(e) => setNewPosterUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Genres (comma separated)</label>
                <input
                  type="text"
                  value={newGenres}
                  onChange={(e) => setNewGenres(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all cursor-pointer shadow-lg shadow-rose-500/20"
              >
                Save to Sanctuary Watchlist
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rate & Review Modal */}
      {rateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#111726] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setRateItem(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              Rate & Review "{rateItem.title}"
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Saving as: <span className="font-semibold text-rose-300">{profile?.name || 'User'}</span>
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span>Your Score:</span>
                  <span className="font-mono text-lg font-bold text-amber-400">{ratingVal} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={ratingVal}
                  onChange={(e) => setRatingVal(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Your Personal Thoughts & Memories</label>
                <textarea
                  rows={3}
                  placeholder="What did you love? How did it make you feel? Inside memories from watching it..."
                  value={reviewVal}
                  onChange={(e) => setReviewVal(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#090d16] border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                onClick={handleSaveRating}
                className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
              >
                Save My Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
