'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  SlidersHorizontal,
  Pencil,
  Trash2,
  Search,
  Check,
  Loader2,
  ArrowUpDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import { MediaItem, MediaType, WatchStatus, MediaMood, CoupleUser } from '@/types';
import { fetchMediaItems, saveMediaItem, deleteMediaItem, INITIAL_MEDIA_ITEMS } from '@/lib/media-service';
import { useCurrentUser } from '@/components/UserContext';
import { useConfirm } from '@/components/ConfirmModal';
import { formatDateDDMMYYYY } from '@/lib/date';
import confetti from 'canvas-confetti';

const MOOD_OPTIONS = [
  { id: 'cozy', label: 'Cozy & Blanket', emoji: '☕', genres: ['Animation', 'Family', 'Fantasy', 'Comedy'] },
  { id: 'romance', label: 'Love & Romance', emoji: '🌹', genres: ['Romance', 'Drama'] },
  { id: 'emotional', label: 'Emotional & Tear-Jerker', emoji: '🥺', genres: ['Drama', 'Biography'] },
  { id: 'thriller', label: 'Thriller & Mystery', emoji: '🔪', genres: ['Thriller', 'Mystery', 'Crime'] },
  { id: 'scifi', label: 'Mind-Bending Sci-Fi', emoji: '🌌', genres: ['Sci-Fi', 'Mystery'] },
  { id: 'comedy', label: 'Laughter & Comedy', emoji: '😂', genres: ['Comedy'] },
  { id: 'classics', label: 'Nostalgic Classics', emoji: '📻', genres: ['Adventure', 'Drama', 'Fantasy', 'Action'] },
  { id: 'action', label: 'Action & Marvel', emoji: '💥', genres: ['Action', 'Adventure', 'Sci-Fi'] },
];

export default function MediaPage() {
  const { currentUser } = useCurrentUser();
  const confirm = useConfirm();
  const [items, setItems] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [statusFilter, setStatusFilter] = useState<'all' | WatchStatus>('completed');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting & Filtering Options
  const [sortBy, setSortBy] = useState<
    'latest' | 'berk_desc' | 'berk_asc' | 'jaq_desc' | 'jaq_asc' | 'couple_desc' | 'imdb_desc'
  >('latest');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MediaType>('all');

  // Recommender Modal State
  const [showRecommender, setShowRecommender] = useState(false);
  const [recType, setRecType] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedMood, setSelectedMood] = useState<string>('cozy');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<{
    categoryName: string;
    completedCount: number;
    coupleAvg: string | null;
    topFavorites: { title: string; coupleAvg: string }[];
  } | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [seenRecTitles, setSeenRecTitles] = useState<string[]>([]);
  const [isLoadingMoreRecs, setIsLoadingMoreRecs] = useState(false);
  const [hasMoreRecs, setHasMoreRecs] = useState(true);

  // Add Item Modal (Only Title & Status requested by user)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState<WatchStatus>('want_to_watch');
  const [selectedMovieMeta, setSelectedMovieMeta] = useState<{
    year: number;
    type: MediaType;
    genres: string[];
    poster_url: string;
    imdb_rating?: string;
    plot?: string;
  } | null>(null);
  const [newMyRating, setNewMyRating] = useState<number>(9.0);

  // Edit Item Modal (Only Status & User's own Rating)
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editStatus, setEditStatus] = useState<WatchStatus>('completed');
  const [editMyRating, setEditMyRating] = useState<number>(9.0);
  const [editMyReview, setEditMyReview] = useState('');

  // Quick "Mark Completed" / "Give Rating" Modal
  const [ratingPopupItem, setRatingPopupItem] = useState<MediaItem | null>(null);
  const [popupMyRating, setPopupMyRating] = useState<number>(9.0);
  const [popupMyReview, setPopupMyReview] = useState('');

  // IMDb Atlas Search Autocomplete
  const [apiSearchResults, setApiSearchResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  useEffect(() => {
    fetchMediaItems().then((data) => {
      if (data && data.length > 0) setItems(data);
    });
  }, []);

  // Debounced API search when typing in Add modal title
  useEffect(() => {
    if (!showAddModal || !newTitle.trim() || newTitle.trim().length < 2) {
      setApiSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(`/api/media/search?q=${encodeURIComponent(newTitle.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setApiSearchResults(data.results?.slice(0, 5) || []);
        }
      } catch {
        // silent fallback
      } finally {
        setIsSearchingApi(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newTitle, showAddModal]);

  // When user selects a search result from dropdown in Add modal
  const handleSelectApiResult = async (result: any) => {
    setNewTitle(result.title);
    setApiSearchResults([]);

    // Fetch rich details (genres, plot, IMDb rating, high-res poster)
    try {
      const res = await fetch(`/api/media/details?imdbID=${encodeURIComponent(result.imdbID)}`);
      if (res.ok) {
        const details = await res.json();
        setSelectedMovieMeta({
          year: details.year || 2026,
          type: details.type || 'movie',
          genres: details.genres || ['Drama'],
          poster_url: details.poster_url || result.poster || '',
          imdb_rating: details.imdb_rating,
          plot: details.plot,
        });
      }
    } catch {
      setSelectedMovieMeta({
        year: parseInt(result.year) || 2026,
        type: result.type === 'series' ? 'series' : 'movie',
        genres: ['Action'],
        poster_url: result.poster || '',
      });
    }
  };

  // Extract all unique genres for the filter dropdown
  const allAvailableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    items.forEach((item) => {
      item.genres?.forEach((g) => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [items]);

  // Couple's Taste Profile: Average score per genre from completed movies
  const coupleTasteProfile = useMemo(() => {
    const completed = items.filter((i) => i.status === 'completed');
    const genreScores: Record<string, { total: number; count: number }> = {};

    completed.forEach((item) => {
      const bRating = item.berk_rating || 0;
      const jRating = item.jaquilyn_rating || 0;
      const count = (bRating > 0 ? 1 : 0) + (jRating > 0 ? 1 : 0);
      if (count > 0) {
        const avg = (bRating + jRating) / count;
        item.genres?.forEach((g) => {
          if (!genreScores[g]) genreScores[g] = { total: 0, count: 0 };
          genreScores[g].total += avg;
          genreScores[g].count += 1;
        });
      }
    });

    const rankedGenres = Object.entries(genreScores)
      .map(([genre, data]) => ({
        genre,
        avg: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.avg - a.avg);

    return rankedGenres;
  }, [items]);

  // Fetch 5 smart recommendations from backend API based on chosen mood and category couple rating
  const handleFetchRecommendations = async () => {
    setIsLoadingRecs(true);
    setHasSearched(true);
    setSeenRecTitles([]);
    setHasMoreRecs(true);
    try {
      const activeMood = MOOD_OPTIONS.find((m) => m.id === selectedMood);
      const completedList = items.filter((i) => i.status === 'completed');
      const queueList = items.filter((i) => i.status === 'want_to_watch' || i.status === 'watching');

      const res = await fetch('/api/media/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredType: recType,
          targetGenres: activeMood?.genres || [],
          moodLabel: activeMood?.label || '',
          moodId: selectedMood,
          completedItems: completedList,
          queueItems: queueList,
          excludeTitles: [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const recs = data.recommendations || [];
        setRecommendations(recs);
        setSeenRecTitles(recs.map((r: any) => r.item.title));
        setHasMoreRecs(!!data.hasMore);
        setCategoryStats(data.categoryStats || null);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Fetch 5 alternative recommendations excluding all previously shown titles
  const handleFetchMoreRecommendations = async () => {
    setIsLoadingMoreRecs(true);
    try {
      const activeMood = MOOD_OPTIONS.find((m) => m.id === selectedMood);
      const completedList = items.filter((i) => i.status === 'completed');
      const queueList = items.filter((i) => i.status === 'want_to_watch' || i.status === 'watching');

      const res = await fetch('/api/media/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredType: recType,
          targetGenres: activeMood?.genres || [],
          moodLabel: activeMood?.label || '',
          moodId: selectedMood,
          completedItems: completedList,
          queueItems: queueList,
          excludeTitles: seenRecTitles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newRecs = data.recommendations || [];
        if (newRecs.length > 0) {
          setRecommendations(newRecs);
          setSeenRecTitles((prev) => [...prev, ...newRecs.map((r: any) => r.item.title)]);
          setHasMoreRecs(!!data.hasMore);
          confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
        } else {
          setHasMoreRecs(false);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingMoreRecs(false);
    }
  };

  // Open recommendation modal (kept completely clean until button clicked!)
  const handleOpenRecommender = () => {
    setRecommendations([]);
    setCategoryStats(null);
    setHasSearched(false);
    setSeenRecTitles([]);
    setHasMoreRecs(true);
    setShowRecommender(true);
  };

  // Filtered and Sorted Media Items
  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (genreFilter !== 'all' && !item.genres?.some((g) => g.toLowerCase() === genreFilter.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'berk_desc':
          return (b.berk_rating || 0) - (a.berk_rating || 0);
        case 'berk_asc':
          return (a.berk_rating || 999) - (b.berk_rating || 999);
        case 'jaq_desc':
          return (b.jaquilyn_rating || 0) - (a.jaquilyn_rating || 0);
        case 'jaq_asc':
          return (a.jaquilyn_rating || 999) - (b.jaquilyn_rating || 999);
        case 'couple_desc': {
          const scoreA = a.berk_rating && a.jaquilyn_rating ? (a.berk_rating + a.jaquilyn_rating) / 2 : a.berk_rating || a.jaquilyn_rating || 0;
          const scoreB = b.berk_rating && b.jaquilyn_rating ? (b.berk_rating + b.jaquilyn_rating) / 2 : b.berk_rating || b.jaquilyn_rating || 0;
          return scoreB - scoreA;
        }
        case 'imdb_desc': {
          const imdbA = parseFloat(String(a.imdb_rating || '0'));
          const imdbB = parseFloat(String(b.imdb_rating || '0'));
          return imdbB - imdbA;
        }
        case 'latest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [items, statusFilter, typeFilter, genreFilter, searchQuery, sortBy]);

  // Save new media item (Only title & status from user, all metadata auto-filled!)
  const handleSaveNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isCompleted = newStatus === 'completed';
    const isBerk = currentUser === 'berk';

    const newItem: Partial<MediaItem> = {
      title: newTitle.trim(),
      type: selectedMovieMeta?.type || 'movie',
      status: newStatus,
      year: selectedMovieMeta?.year || 2026,
      genres: selectedMovieMeta?.genres || ['Drama'],
      poster_url: selectedMovieMeta?.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      imdb_rating: selectedMovieMeta?.imdb_rating || '7.5',
      plot: selectedMovieMeta?.plot || '',
      added_by: currentUser || 'berk',
      berk_rating: isCompleted && isBerk ? newMyRating : null,
      jaquilyn_rating: isCompleted && !isBerk ? newMyRating : null,
    };

    const saved = await saveMediaItem(newItem);
    setItems([saved, ...items]);
    setShowAddModal(false);
    setNewTitle('');
    setSelectedMovieMeta(null);
    confetti({ particleCount: 35, spread: 45, origin: { y: 0.6 } });
  };

  // Open Edit Modal (User only edits status & their own rating)
  const handleOpenEdit = (item: MediaItem) => {
    setEditingItem(item);
    setEditStatus(item.status);
    const isBerk = currentUser === 'berk';
    setEditMyRating((isBerk ? item.berk_rating : item.jaquilyn_rating) || 9.0);
    setEditMyReview((isBerk ? item.berk_review : item.jaquilyn_review) || '');
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const isCompleted = editStatus === 'completed';
    const isBerk = currentUser === 'berk';

    const updated: MediaItem = {
      ...editingItem,
      status: editStatus,
      berk_rating: isBerk ? (isCompleted ? editMyRating : null) : editingItem.berk_rating,
      jaquilyn_rating: !isBerk ? (isCompleted ? editMyRating : null) : editingItem.jaquilyn_rating,
      berk_review: isBerk ? editMyReview || null : editingItem.berk_review,
      jaquilyn_review: !isBerk ? editMyReview || null : editingItem.jaquilyn_review,
    };

    await saveMediaItem(updated);
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    setEditingItem(null);
    confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
  };

  // Delete Media Item
  const handleDeleteItem = async (id: string) => {
    const ok = await confirm({
      title: 'Delete from Watchlist?',
      message: 'Are you sure you want to delete this title from your list?',
      confirmText: 'Delete',
    });
    if (ok) {
      await deleteMediaItem(id);
      setItems(items.filter((i) => i.id !== id));
    }
  };

  // Open Quick Rating Popup
  const handleOpenCompletePopup = (item: MediaItem) => {
    setRatingPopupItem(item);
    const isBerk = currentUser === 'berk';
    setPopupMyRating((isBerk ? item.berk_rating : item.jaquilyn_rating) || 9.0);
    setPopupMyReview((isBerk ? item.berk_review : item.jaquilyn_review) || '');
  };

  // Quick Already Watched handler from recommendation card
  const handleAlreadyWatchedFromRec = async (recItem: any) => {
    const existing = items.find((i) => i.title.toLowerCase() === recItem.title.toLowerCase());
    let targetItem: MediaItem;

    if (existing) {
      targetItem = existing;
    } else {
      const newItem: Partial<MediaItem> = {
        title: recItem.title,
        type: recItem.type,
        status: 'completed',
        year: recItem.year,
        genres: recItem.genres || ['Drama'],
        poster_url: recItem.poster || recItem.poster_url,
        imdb_rating: recItem.imdb_rating,
        plot: recItem.plot,
        added_by: currentUser || 'berk',
      };
      targetItem = await saveMediaItem(newItem);
      setItems([targetItem, ...items]);
    }

    // Open rating popup on top of recommendations modal (z-[70])
    handleOpenCompletePopup(targetItem);
  };

  // Save Completion with only current user's rating
  const handleSaveCompletionWithRatings = async () => {
    if (!ratingPopupItem) return;

    const isBerk = currentUser === 'berk';
    const updated: MediaItem = {
      ...ratingPopupItem,
      status: 'completed',
      berk_rating: isBerk ? popupMyRating : ratingPopupItem.berk_rating,
      jaquilyn_rating: !isBerk ? popupMyRating : ratingPopupItem.jaquilyn_rating,
      berk_review: isBerk ? popupMyReview || ratingPopupItem.berk_review : ratingPopupItem.berk_review,
      jaquilyn_review: !isBerk ? popupMyReview || ratingPopupItem.jaquilyn_review : ratingPopupItem.jaquilyn_review,
    };

    await saveMediaItem(updated);
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    // Remove from active recommendations list in real time!
    setRecommendations((prev) => prev.filter((r) => r.item.title.toLowerCase() !== updated.title.toLowerCase()));
    setRatingPopupItem(null);
    confetti({ particleCount: 55, spread: 60, origin: { y: 0.6 } });
  };

  // Quick Series Episode Step
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

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const wantToWatchCount = items.filter((i) => i.status === 'want_to_watch').length;
  const watchingCount = items.filter((i) => i.status === 'watching').length;
  const isBerk = currentUser === 'berk';

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* 1. Header Card with Recommender CTA */}
      <div className="card-cozy p-4 space-y-3 bg-gradient-to-br from-[#121826] via-[#0e1420] to-[#1a1329] border border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-1.5">
              <Film className="w-4 h-4 text-rose-400" />
              <span>Watchlist & Shared Universe</span>
            </h1>
            <p className="text-[11px] text-slate-300">
              {completedCount} Watched together • {wantToWatchCount} In queue • {watchingCount} In progress
            </p>
          </div>
          <button
            onClick={() => {
              setNewTitle('');
              setSelectedMovieMeta(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Title</span>
          </button>
        </div>

        {/* 5-Alternative Couple Taste Match CTA */}
        <button
          onClick={handleOpenRecommender}
          className="w-full py-2.5 px-3 rounded-xl bg-[#192233] border border-rose-500/25 hover:border-rose-500/50 flex items-center justify-between text-xs text-white transition-all cursor-pointer shadow-sm group"
        >
          <span className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>What should we watch tonight? (Top 5 Match Alternatives)</span>
          </span>
          <span className="text-[10px] text-rose-400 font-bold group-hover:translate-x-0.5 transition-transform">
            View 5 Picks →
          </span>
        </button>
      </div>

      {/* 2. Status Filters & Search Bar */}
      <div className="space-y-2.5">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {[
            { id: 'completed', label: `Completed (${completedCount})` },
            { id: 'want_to_watch', label: `Want to Watch (${wantToWatchCount})` },
            { id: 'watching', label: `Watching (${watchingCount})` },
            { id: 'all', label: `All (${items.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-[#121824] border border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter & Sorting Controls Toolbar */}
        <div className="card-cozy p-3 space-y-2.5 bg-[#101622] border border-white/[0.06]">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161f2e] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Sort & Filter Dropdowns Grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Sort by */}
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-rose-400" />
                <span>Sort by</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded-xl bg-[#161f2e] border border-white/[0.08] text-white text-[11px] focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="latest">📅 Latest Added</option>
                <option value="berk_desc">🦁 Berk: High to Low</option>
                <option value="berk_asc">🦁 Berk: Low to High</option>
                <option value="jaq_desc">🌸 Jaquilyn: High to Low</option>
                <option value="jaq_asc">🌸 Jaquilyn: Low to High</option>
                <option value="couple_desc">❤️ Couple Score</option>
                <option value="imdb_desc">⭐ IMDb Rating</option>
              </select>
            </div>

            {/* Filter by Genre */}
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-amber-400" />
                <span>Genre</span>
              </label>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-[#161f2e] border border-white/[0.08] text-white text-[11px] focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">All Genres</option>
                {allAvailableGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Type */}
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                <Film className="w-3 h-3 text-sky-400" />
                <span>Type</span>
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded-xl bg-[#161f2e] border border-white/[0.08] text-white text-[11px] focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="movie">Movies</option>
                <option value="series">Series</option>
                <option value="anime">Anime</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Media Items List */}
      <div className="space-y-3">
        {filteredAndSortedItems.length === 0 ? (
          <div className="card-cozy p-8 text-center space-y-2">
            <Film className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No titles match your filter criteria.</p>
          </div>
        ) : (
          filteredAndSortedItems.map((item) => {
            const hasDualRating = item.berk_rating && item.jaquilyn_rating;
            const coupleScore = hasDualRating
              ? ((item.berk_rating! + item.jaquilyn_rating!) / 2).toFixed(1)
              : null;

            const myRating = isBerk ? item.berk_rating : item.jaquilyn_rating;
            const partnerRating = isBerk ? item.jaquilyn_rating : item.berk_rating;
            const partnerName = isBerk ? '🌸 Jaq' : '🦁 Berk';

            return (
              <div key={item.id} className="card-cozy p-3.5 flex flex-col gap-3 group border border-white/[0.06] hover:border-white/[0.12] transition-all">
                <div className="flex gap-3">
                  {/* Poster */}
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-20 h-28 rounded-xl object-cover bg-slate-900 border border-white/[0.08] flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                    }}
                  />

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 uppercase font-mono">
                          {item.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.year}</span>
                        {item.imdb_rating && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold">
                            ⭐ {item.imdb_rating}
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ml-auto font-medium ${
                          item.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : item.status === 'watching'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/[0.06] text-slate-400'
                        }`}>
                          {item.status === 'completed' ? 'Completed' : item.status === 'watching' ? 'Watching' : 'Queued'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">{item.title}</h3>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.genres?.join(', ')}</p>
                    </div>

                    {/* Ratings Row */}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        {/* Current User Rating */}
                        <span className={`text-[10px] font-mono ${myRating ? (isBerk ? 'text-blue-300' : 'text-rose-300') : 'text-slate-500 italic'}`}>
                          {isBerk ? '🦁 You: ' : '🌸 You: '}
                          <strong>{myRating ? `${myRating}/10` : 'Not rated'}</strong>
                        </span>

                        {/* Partner Rating */}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {partnerName}: {partnerRating ? `${partnerRating}/10` : '-'}
                        </span>
                      </div>

                      {coupleScore && (
                        <span className="text-[10px] font-bold text-amber-400 font-mono flex items-center gap-1" title="Couple Average Score">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          <span>{coupleScore}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Plot snippet if available */}
                {item.plot && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic px-0.5">
                    "{item.plot}"
                  </p>
                )}

                {/* Series Progress */}
                {item.type !== 'movie' && item.total_episodes && (
                  <div className="bg-[#161e2c] p-2.5 rounded-xl border border-white/[0.04] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="text-slate-400">Episode Progress</span>
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
                      className="w-full py-1 text-[11px] text-rose-300 font-medium bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>+1 Episode Watched</span>
                    </button>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/[0.04]">
                  {/* Mark Completed Button if in Queue */}
                  {item.status !== 'completed' ? (
                    <button
                      onClick={() => handleOpenCompletePopup(item)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Mark Completed & Rate</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCompletePopup(item)}
                      className="text-amber-400 hover:text-amber-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{myRating ? 'Update My Rating' : 'Give My Rating ⭐'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Edit status or rating"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Top 5 Alternatives Taste-Match Recommender Modal */}
      {showRecommender && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>What is tonight's mood?</span>
              </h3>
              <button
                onClick={() => setShowRecommender(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1 space-y-3.5">

            {/* Type Selection (Any / Movies / Series) */}
            <div className="flex items-center justify-between gap-1.5 p-1 rounded-xl bg-[#161f2e] border border-white/[0.08] mb-3.5">
              {[
                { id: 'all', label: '✨ Any' },
                { id: 'movie', label: '🎬 Movies' },
                { id: 'series', label: '📺 Series' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRecType(t.id as any)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    recType === t.id
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 8 Mood Cards Grid (2 columns, emoji + label) */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {MOOD_OPTIONS.map((m) => {
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMood(m.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500 shadow-sm ring-1 ring-rose-500/40 text-white'
                        : 'bg-[#161f2e] border-white/[0.08] text-slate-300 hover:border-white/[0.2]'
                    }`}
                  >
                    <span className="text-xl leading-none">{m.emoji}</span>
                    <span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Match Button */}
            <button
              onClick={handleFetchRecommendations}
              disabled={isLoadingRecs}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {isLoadingRecs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching for tonight...</span>
                </>
              ) : (
                <>
                  <Shuffle className="w-4 h-4" />
                  <span>Pick a Movie for Us! 🎁</span>
                </>
              )}
            </button>

            {/* Top 5 Ranked Alternatives - ONLY shown after clicking match button! */}
            {hasSearched && (
              <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3 animate-fade-in">
                {/* Category Couple Taste Score Banner */}
                {categoryStats && categoryStats.completedCount > 0 && (
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-950/40 via-[#182030] to-amber-950/30 border border-rose-500/30 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>Our Rating in {categoryStats.categoryName}:</span>
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        ⭐ {categoryStats.coupleAvg} / 10
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Calculated from {categoryStats.completedCount} completed titles you watched together
                      {categoryStats.topFavorites && categoryStats.topFavorites.length > 0
                        ? ` (Favorites: ${categoryStats.topFavorites.slice(0, 2).map((t: any) => t.title).join(', ')})`
                        : ''}.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Top 5 Matches for You</span>
                  </span>
                  <span>Ranked by Taste Match</span>
                </div>

                {recommendations.length === 0 && !isLoadingRecs ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No matching titles found for this filter. Try selecting another mood or type!
                  </p>
                ) : (
                  recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#161f2f] border border-white/[0.06] hover:border-amber-500/40 transition-all flex items-start gap-3"
                    >
                      {/* Rank badge */}
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                        #{idx + 1}
                      </span>

                      {/* Poster */}
                      <img
                        src={rec.item.poster || rec.item.poster_url}
                        alt={rec.item.title}
                        referrerPolicy="no-referrer"
                        className="w-14 h-20 rounded-xl object-cover shrink-0 border border-white/[0.08]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                        }}
                      />

                      {/* Info & Action */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{rec.item.title}</h4>
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            {rec.matchScore}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                          <span>{rec.item.year}</span>
                          <span>•</span>
                          <span>{rec.item.type}</span>
                          {rec.item.imdb_rating && (
                            <>
                              <span>•</span>
                              <span className="text-amber-300 font-bold">⭐ {rec.item.imdb_rating}</span>
                            </>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-400 line-clamp-1">{rec.item.genres?.join(', ')}</p>

                        <p className="text-[10px] text-amber-300/90 italic leading-snug">
                          "{rec.reason}"
                        </p>

                        {/* Action Buttons: Add to Queue & Already Watched */}
                        <div className="pt-1.5 flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={async () => {
                              const existing = items.find((i) => i.title.toLowerCase() === rec.item.title.toLowerCase());
                              if (existing) {
                                const updated: MediaItem = { ...existing, status: 'want_to_watch' };
                                await saveMediaItem(updated);
                                setItems(items.map((i) => (i.id === updated.id ? updated : i)));
                              } else {
                                const newItem: Partial<MediaItem> = {
                                  title: rec.item.title,
                                  type: rec.item.type,
                                  status: 'want_to_watch',
                                  year: rec.item.year,
                                  genres: rec.item.genres || ['Action'],
                                  poster_url: rec.item.poster || rec.item.poster_url,
                                  imdb_rating: rec.item.imdb_rating,
                                  plot: rec.item.plot,
                                  added_by: currentUser || 'berk',
                                };
                                const saved = await saveMediaItem(newItem);
                                setItems([saved, ...items]);
                              }
                              setShowRecommender(false);
                              confetti({ particleCount: 45, spread: 50, origin: { y: 0.6 } });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add to Queue</span>
                          </button>

                          <button
                            onClick={() => handleAlreadyWatchedFromRec(rec.item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Mark as already watched and rate it now"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Already Watched</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Show 5 Different Matches button requested by user */}
                {recommendations.length > 0 && (
                  <div className="pt-2 text-center space-y-1.5 border-t border-white/[0.08] mt-2">
                    <button
                      type="button"
                      disabled={isLoadingMoreRecs}
                      onClick={handleFetchMoreRecommendations}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 hover:from-amber-500/25 hover:via-rose-500/25 hover:to-amber-500/25 border border-amber-500/30 hover:border-amber-500/50 text-amber-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 active:scale-[0.99]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoadingMoreRecs ? 'animate-spin' : ''}`} />
                      <span>{isLoadingMoreRecs ? 'Finding 5 Other Matches...' : 'Show 5 Different Matches 🎲'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      {hasMoreRecs 
                        ? "Don't like these 5? Tap to get 5 fresh alternatives matching your couple taste!"
                        : "You've explored all current curated matches for this mood! Tap above to reload or pick another mood."}
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Modal (ONLY Title & Status as requested!) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-rose-400" />
                Add Movie or Series
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleSaveNewItem} className="space-y-4 text-xs">
              {/* 1. Title Search Input */}
              <div className="relative">
                <label className="block text-[11px] text-slate-400 font-medium mb-1">
                  Title (Search IMDb Atlas)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inception, Arcane, Dune..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white focus:outline-none focus:border-rose-500"
                  />
                  {isSearchingApi && (
                    <Loader2 className="w-4 h-4 text-rose-400 animate-spin absolute right-3 top-3" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {apiSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#192336] border border-white/20 rounded-2xl p-1.5 shadow-2xl z-50 space-y-1">
                    <span className="text-[10px] text-rose-400 px-2 py-0.5 font-bold block">
                      IMDb Matches (Tap to Auto-fill):
                    </span>
                    {apiSearchResults.map((res, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectApiResult(res)}
                        className="w-full p-2 rounded-xl hover:bg-white/[0.08] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                      >
                        {res.poster ? (
                          <img src={res.poster} alt={res.title} referrerPolicy="no-referrer" className="w-7 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-10 rounded bg-slate-800 flex items-center justify-center text-[9px] text-slate-500">No img</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{res.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {res.year} • {res.type}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-filled Preview card if selected from IMDb */}
              {selectedMovieMeta && (
                <div className="p-3 rounded-2xl bg-[#161f2e] border border-white/[0.08] flex items-center gap-3">
                  {selectedMovieMeta.poster_url && (
                    <img
                      src={selectedMovieMeta.poster_url}
                      alt={newTitle}
                      referrerPolicy="no-referrer"
                      className="w-12 h-16 rounded-lg object-cover shrink-0 border border-white/[0.1]"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-xs font-bold text-white truncate">{newTitle}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {selectedMovieMeta.year} • {selectedMovieMeta.type} • ⭐ {selectedMovieMeta.imdb_rating || 'IMDb'}
                    </div>
                    <p className="text-[10px] text-rose-400 truncate">{selectedMovieMeta.genres.join(', ')}</p>
                  </div>
                </div>
              )}

              {/* 2. Status Selection */}
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as WatchStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="want_to_watch">Want to Watch (In Queue)</option>
                  <option value="watching">Watching (In Progress)</option>
                  <option value="completed">Completed (Already Watched)</option>
                </select>
              </div>

              {/* User's own rating slider ONLY if adding as Completed */}
              {newStatus === 'completed' && (
                <div className="p-3 rounded-2xl bg-[#1a2336] border border-rose-500/25 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={isBerk ? 'text-blue-300' : 'text-rose-300'}>
                      {isBerk ? '🦁 Your Rating (Berk)' : '🌸 Your Rating (Jaquilyn)'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">{newMyRating} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={newMyRating}
                    onChange={(e) => setNewMyRating(Number(e.target.value))}
                    className={`w-full cursor-pointer ${isBerk ? 'accent-blue-500' : 'accent-rose-500'}`}
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    {isBerk ? '🌸 Jaquilyn can add her score from her account anytime.' : '🦁 Berk can add his score from his account anytime.'}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  Save Title
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* 6. Quick Rate / Mark Completed Modal (Stacked at z-[70] over recommender modal) */}
      {ratingPopupItem && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">We Watched It! 🎉</h3>
                  <p className="text-[10px] text-slate-400">{ratingPopupItem.title}</p>
                </div>
              </div>
              <button
                onClick={() => setRatingPopupItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {/* Partner score badge info */}
              <div className="p-2.5 rounded-xl bg-[#161f2e] border border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Partner's Score:</span>
                <span className="font-mono font-bold text-slate-300">
                  {isBerk ? (
                    ratingPopupItem.jaquilyn_rating ? `🌸 Jaquilyn: ${ratingPopupItem.jaquilyn_rating}/10` : '🌸 Jaquilyn hasn\'t rated yet'
                  ) : (
                    ratingPopupItem.berk_rating ? `🦁 Berk: ${ratingPopupItem.berk_rating}/10` : '🦁 Berk hasn\'t rated yet'
                  )}
                </span>
              </div>

              {/* ONLY Current User's Rating Slider */}
              <div className="p-3 rounded-2xl bg-[#1a2336] border border-rose-500/25 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className={isBerk ? 'text-blue-300' : 'text-rose-300'}>
                    {isBerk ? '🦁 Your Rating (Berk)' : '🌸 Your Rating (Jaquilyn)'}
                  </span>
                  <span className="font-mono font-bold text-amber-400">{popupMyRating} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={popupMyRating}
                  onChange={(e) => setPopupMyRating(Number(e.target.value))}
                  className={`w-full cursor-pointer ${isBerk ? 'accent-blue-500' : 'accent-rose-500'}`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Your Thoughts / Watching Memory</label>
                <textarea
                  rows={2}
                  placeholder="How did you find it? Favorite scene?"
                  value={popupMyReview}
                  onChange={(e) => setPopupMyReview(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161f2e] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <button
                onClick={handleSaveCompletionWithRatings}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save My Rating & Complete 🎉</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Edit Modal (ONLY Status & Current User's Rating as requested!) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-rose-400" />
                Edit: {editingItem.title}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">

            {/* Read-Only Movie Info Banner */}
            <div className="p-3 rounded-2xl bg-[#161f2e] border border-white/[0.08] flex items-center gap-3 mb-4">
              <img
                src={editingItem.poster_url}
                alt={editingItem.title}
                referrerPolicy="no-referrer"
                className="w-12 h-16 rounded-lg object-cover shrink-0 border border-white/[0.1]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                }}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <h4 className="text-xs font-bold text-white truncate">{editingItem.title}</h4>
                <div className="text-[10px] text-slate-400 font-mono">
                  {editingItem.year} • {editingItem.type} • ⭐ {editingItem.imdb_rating || 'IMDb'}
                </div>
                <p className="text-[10px] text-rose-400 truncate">{editingItem.genres?.join(', ')}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* 1. Status Selection */}
              <div>
                <label className="block text-[11px] text-slate-400 font-medium mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as WatchStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="completed">Completed</option>
                  <option value="watching">Watching</option>
                  <option value="want_to_watch">Want to Watch</option>
                </select>
              </div>

              {/* 2. ONLY Current User's Rating Slider if Completed */}
              {editStatus === 'completed' && (
                <div className="p-3 rounded-2xl bg-[#1a2336] border border-rose-500/25 space-y-2.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={isBerk ? 'text-blue-300' : 'text-rose-300'}>
                      {isBerk ? '🦁 Your Rating (Berk)' : '🌸 Your Rating (Jaquilyn)'}
                    </span>
                    <span className="font-mono font-bold text-amber-400">{editMyRating} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={editMyRating}
                    onChange={(e) => setEditMyRating(Number(e.target.value))}
                    className={`w-full cursor-pointer ${isBerk ? 'accent-blue-500' : 'accent-rose-500'}`}
                  />

                  {/* Partner's status read-only */}
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-white/[0.06] flex items-center justify-between">
                    <span>Partner's Rating:</span>
                    <span className="font-mono text-slate-300">
                      {isBerk
                        ? (editingItem.jaquilyn_rating ? `🌸 Jaquilyn: ${editingItem.jaquilyn_rating}/10` : '🌸 Waiting for Jaquilyn')
                        : (editingItem.berk_rating ? `🦁 Berk: ${editingItem.berk_rating}/10` : '🦁 Waiting for Berk')
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Review input */}
              {editStatus === 'completed' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Your Personal Thoughts / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Notes or memories from this watch..."
                    value={editMyReview}
                    onChange={(e) => setEditMyReview(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#161f2e] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
