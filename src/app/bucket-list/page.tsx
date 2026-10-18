'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Camera, 
  Trash2, 
  X,
  Compass,
  Heart,
  Plane,
  Home,
  Star,
  Repeat,
  BookOpen,
  Clock,
  Check,
  CalendarDays,
  Pencil
} from 'lucide-react';
import { BucketCategory, BucketItem } from '@/types';
import { useConfirm } from '@/components/ConfirmModal';
import confetti from 'canvas-confetti';
import { playSparkle, playTap } from '@/lib/sound-effects';

export const CATEGORY_CONFIG: Record<BucketCategory, {
  label: string;
  emoji: string;
  icon: any;
  color: string;
  badgeBg: string;
  description: string;
}> = {
  trips: {
    label: 'Trips & Day Dates',
    emoji: '✈️',
    icon: Plane,
    color: 'text-sky-400 border-sky-500/20 bg-sky-500/10',
    badgeBg: 'bg-sky-500/20 text-sky-300',
    description: 'Road trips, island getaways & romantic day dates'
  },
  outdoors: {
    label: 'Outdoors & Activity',
    emoji: '🌲',
    icon: Compass,
    color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    description: 'Nature hikes, water sports & sunny couple feasts'
  },
  habits: {
    label: 'Habits',
    emoji: '🔁',
    icon: Repeat,
    color: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
    badgeBg: 'bg-purple-500/20 text-purple-300',
    description: 'Disciplines & weekly routines automatically synced to Agenda'
  },
  home: {
    label: 'Home & Cozy',
    emoji: '🏡',
    icon: Home,
    color: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    description: 'Living room dates, gaming, creative crafts & all-day cuddles'
  },
  learning: {
    label: 'Learning & Skills',
    emoji: '📚',
    icon: BookOpen,
    color: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
    badgeBg: 'bg-blue-500/20 text-blue-300',
    description: 'Language exchanges, kitchen mastery & sharing talents'
  },
  special: {
    label: 'Special / Themed Days',
    emoji: '🎃',
    icon: Sparkles,
    color: 'text-rose-400 border-rose-500/20 bg-rose-500/10',
    badgeBg: 'bg-rose-500/20 text-rose-300',
    description: 'Holidays, costume raves & milestone anniversary celebrations'
  }
};

const CATEGORY_ORDER: BucketCategory[] = [
  'trips',
  'outdoors',
  'habits',
  'home',
  'learning',
  'special'
];

export const INITIAL_BUCKET_ITEMS: BucketItem[] = [
  // 1. Trips & Day Dates (5 items)
  {
    id: 'b-trips-1',
    title: "Karpaz Camping Trip After Jaqui's Work, Staying Until Sunday",
    category: 'trips',
    completed: false,
    notes: 'Weekend camping escape under the Karpaz stars, untouched beaches and wild donkeys.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-trips-2',
    title: 'Lapta Date',
    category: 'trips',
    completed: false,
    notes: 'Strolling the scenic coastal walkway and having a romantic seaside dinner.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-trips-3',
    title: 'Famagusta Date',
    category: 'trips',
    completed: false,
    notes: 'Exploring medieval walled city ruins, Varosha views, and cozy dessert spots.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-trips-4',
    title: 'Sunset Drive With No Destination',
    category: 'trips',
    completed: false,
    notes: 'Golden hour lights, windows rolled down, couple playlist on loud, driving wherever the highway goes.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-trips-5',
    title: 'Harbour Boat Tour Date',
    category: 'trips',
    completed: false,
    notes: 'Sailing along the turquoise Mediterranean coastline from Kyrenia ancient harbour.',
    created_at: '2026-10-17'
  },

  // 2. Outdoors & Activity (3 items)
  {
    id: 'b-outdoors-1',
    title: 'Mountain Hike Day (Mountain Sex)',
    category: 'outdoors',
    completed: false,
    notes: 'Scenic panoramic mountain peak trail hike with intimate wild adventure.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-outdoors-2',
    title: 'Water Activity (Parasailing, Banana Boat)',
    category: 'outdoors',
    completed: false,
    notes: 'Adrenaline on the waves, soaring above the sea on parasails and laughing on banana boats.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-outdoors-3',
    title: 'Sunday Breakfast',
    category: 'outdoors',
    completed: false,
    notes: 'Lazy sunny couple feast with fresh pastries, cheeses, jams, eggs, and hot tea.',
    created_at: '2026-10-17'
  },

  // 3. Habits (3 items)
  {
    id: 'b-habits-1',
    title: 'Gym at least twice a week',
    category: 'habits',
    completed: false,
    schedule_days: ['Tuesday', 'Thursday'],
    schedule_time: '18:00',
    notes: 'Staying disciplined, fit, and boosting our energy together twice every week.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-habits-2',
    title: 'Picnics every weekend',
    category: 'habits',
    completed: false,
    schedule_days: ['Sunday'],
    schedule_time: '11:00',
    notes: 'Picnic blanket, homemade bites, fruit platter, reading and cuddles under the trees.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-habits-3',
    title: 'Badminton Once a week',
    category: 'habits',
    completed: false,
    schedule_days: ['Wednesday'],
    schedule_time: '19:00',
    notes: 'Weekly fun cardio rally, playful rivalry, and shared laughs on the court.',
    created_at: '2026-10-17'
  },

  // 4. Home & Cozy (5 items)
  {
    id: 'b-home-1',
    title: 'Co-op Game Nights At Home',
    category: 'home',
    completed: false,
    notes: 'Two controllers, cozy blankets, gamer snacks, and beating co-op adventures as a duo.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-home-2',
    title: 'Clay Date',
    category: 'home',
    completed: false,
    notes: 'Air-dry clay sculpting, molding cute couple trinket dishes, and painting our creations.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-home-3',
    title: 'Colouring Date',
    category: 'home',
    completed: false,
    notes: 'Mindful coloring books, dual-tip brush markers, warm tea and acoustic music.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-home-4',
    title: 'X Day At Home',
    category: 'home',
    completed: false,
    notes: 'Uninterrupted all-day cozy cuddle session, silky sheets, pure romance, and zero phones.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-home-5',
    title: 'House Cleaning Every Saturday Afternoon',
    category: 'home',
    completed: false,
    schedule_days: ['Saturday'],
    schedule_time: '14:00',
    notes: 'Weekly shared cleaning ritual to make our love nest sparkling clean and fresh-scented.',
    created_at: '2026-10-17'
  },

  // 5. Learning & Skills (2 items)
  {
    id: 'b-learning-1',
    title: 'Turkish Lesson To Jaqui',
    category: 'learning',
    completed: false,
    notes: 'Teaching cute phrases, daily expressions, vocabulary flashcards, and sweet accents.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-learning-2',
    title: 'Cooking Lessons To Berk',
    category: 'learning',
    completed: false,
    notes: 'Jaquilyn showing Berk cooking secret recipes, spice blends, and kitchen confidence.',
    created_at: '2026-10-17'
  },

  // 6. Special / Themed Days (2 items)
  {
    id: 'b-special-1',
    title: 'New Years (Steak Day)',
    category: 'special',
    completed: false,
    notes: 'Sizzling prime steaks, gourmet compound butter, fine red wine, and celebration.',
    created_at: '2026-10-17'
  },
  {
    id: 'b-special-2',
    title: 'Halloween (Scream Costume And Rave)',
    category: 'special',
    completed: false,
    notes: 'Matching iconic Ghostface / Scream robes, neon glow, and raving the night away.',
    created_at: '2026-10-17'
  }
];

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function BucketListPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<BucketItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('berlyn_bucket_list_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          // fallback
        }
      }
      // Check legacy storage to clear dummy items
      const legacy = localStorage.getItem('berlyn_bucket_list');
      if (legacy) {
        try {
          const parsedLegacy = JSON.parse(legacy);
          const hasDummy = parsedLegacy.some((it: any) => 
            it.title?.includes('Tokyo') || 
            it.title?.includes('Baler') || 
            it.category === 'travel'
          );
          if (!hasDummy && Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            return parsedLegacy;
          }
        } catch (e) {
          // fallback
        }
      }
    }
    return INITIAL_BUCKET_ITEMS;
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<BucketCategory>('trips');
  const [newNotes, setNewNotes] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  
  // Habit scheduling fields
  const [selectedDays, setSelectedDays] = useState<string[]>(['Saturday']);
  const [selectedTime, setSelectedTime] = useState('17:00');

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('berlyn_bucket_list_v2', JSON.stringify(items));
    localStorage.setItem('berlyn_bucket_list', JSON.stringify(items));
  }, [items]);

  // Fetch from Supabase via API route on mount and when tab refocuses
  const loadCloudBucketItems = async () => {
    try {
      const res = await fetch('/api/bucket-list', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          let localSaved: BucketItem[] = [];
          if (typeof window !== 'undefined') {
            const savedStr = localStorage.getItem('berlyn_bucket_list_v2');
            if (savedStr) {
              try { localSaved = JSON.parse(savedStr); } catch {}
            }
          }

          const remoteMap = new Map<string, BucketItem>();
          data.items.forEach((item: BucketItem) => remoteMap.set(item.id, item));

          // Check if local has items or updates that are missing in cloud
          const missingInCloud = localSaved.filter(lt => !remoteMap.has(lt.id));
          if (missingInCloud.length > 0) {
            for (const mi of missingInCloud) {
              fetch('/api/bucket-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mi),
              }).catch(() => {});
            }
          }

          const mergedMap = new Map<string, BucketItem>();
          data.items.forEach((item: BucketItem) => mergedMap.set(item.id, item));
          localSaved.forEach((item: BucketItem) => {
            if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
          });
          const merged = Array.from(mergedMap.values());

          setItems(merged);
          if (typeof window !== 'undefined') {
            localStorage.setItem('berlyn_bucket_list_v2', JSON.stringify(merged));
            localStorage.setItem('berlyn_bucket_list', JSON.stringify(merged));
          }
        }
      }
    } catch (e) {
      // fallback to local
    }
  };

  useEffect(() => {
    loadCloudBucketItems();

    const handleFocus = () => {
      loadCloudBucketItems();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Auto-hide notification
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4500);
    return () => clearTimeout(t);
  }, [notification]);

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setNewTitle('');
    setNewCategory('trips');
    setNewNotes('');
    setNewPhoto('');
    setSelectedDays(['Saturday']);
    setSelectedTime('17:00');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: BucketItem) => {
    setEditingItemId(item.id);
    setNewTitle(item.title);
    setNewCategory(item.category);
    setNewNotes(item.notes || '');
    setNewPhoto(item.photo_url || '');
    setSelectedDays(item.schedule_days && item.schedule_days.length > 0 ? item.schedule_days : ['Saturday']);
    setSelectedTime(item.schedule_time || '17:00');
    setShowAddModal(true);
  };

  const toggleItem = async (id: string) => {
    const target = items.find(item => item.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    if (nextCompleted) {
      playSparkle();
      confetti({
        particleCount: 55,
        spread: 60,
        origin: { y: 0.6 },
      });
    }

    const updated = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString().slice(0, 10) : null
        };
      }
      return item;
    });

    setItems(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_bucket_list_v2', JSON.stringify(updated));
      localStorage.setItem('berlyn_bucket_list', JSON.stringify(updated));
    }

    try {
      await fetch('/api/bucket-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: nextCompleted }),
      });
    } catch (e) {
      // silent
    }
  };

  const deleteItem = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Dream?',
      message: 'Are you sure you want to remove this dream item from your bucket list?',
      confirmText: 'Delete',
    });
    if (ok) {
      const updated = items.filter(item => item.id !== id);
      setItems(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('berlyn_bucket_list_v2', JSON.stringify(updated));
        localStorage.setItem('berlyn_bucket_list', JSON.stringify(updated));
      }

      try {
        await fetch(`/api/bucket-list?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch (e) {
        // silent
      }
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const isHabit = newCategory === 'habits' || selectedDays.length > 0;
    const days = isHabit ? (selectedDays.length > 0 ? selectedDays : ['Saturday']) : undefined;
    const time = isHabit ? (selectedTime || '17:00') : undefined;

    if (editingItemId) {
      // Update existing item
      const itemToSave = {
        id: editingItemId,
        title: newTitle.trim(),
        category: newCategory,
        notes: newNotes.trim() || null,
        photo_url: newPhoto.trim() || null,
        schedule_days: days,
        schedule_time: time,
      };

      const updated = items.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            ...itemToSave,
          };
        }
        return item;
      });

      setItems(updated);
      localStorage.setItem('berlyn_bucket_list_v2', JSON.stringify(updated));
      localStorage.setItem('berlyn_bucket_list', JSON.stringify(updated));

      // Sync to Supabase
      fetch('/api/bucket-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave),
      }).catch(() => {});

      // If Habit, sync to agenda
      if (isHabit && days) {
        try {
          const existingAgendaStr = localStorage.getItem('berlyn_agenda_tasks');
          const existingAgenda = existingAgendaStr ? JSON.parse(existingAgendaStr) : [];
          const existingIdx = existingAgenda.findIndex((t: any) => t.id === `habit-${editingItemId}` || t.title.includes(newTitle.trim()));
          const agendaTask = {
            id: existingIdx >= 0 ? existingAgenda[existingIdx].id : `habit-${editingItemId}`,
            title: `${newTitle.trim()} 🔁`,
            category: 'chore',
            assignee: 'both',
            timeframe: 'this_week',
            dueDay: days.join(', '),
            dueTime: time,
            completed: false,
            priority: 'normal',
            createdAt: new Date().toISOString().slice(0, 10)
          };
          if (existingIdx >= 0) {
            existingAgenda[existingIdx] = agendaTask;
          } else {
            existingAgenda.unshift(agendaTask);
          }
          localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(existingAgenda));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('agenda_updated'));

          // Sync to Supabase agenda API as well
          fetch('/api/agenda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendaTask),
          }).catch(() => {});
        } catch (err) {}
      }

      setNotification(`✨ "${newTitle.trim()}" updated successfully!`);
    } else {
      // Add new item
      const newItem: BucketItem = {
        id: `b-${Date.now()}`,
        title: newTitle.trim(),
        category: newCategory,
        completed: false,
        notes: newNotes.trim() || null,
        photo_url: newPhoto.trim() || null,
        schedule_days: days,
        schedule_time: time,
        created_at: new Date().toISOString().slice(0, 10)
      };

      const updated = [newItem, ...items];
      setItems(updated);
      localStorage.setItem('berlyn_bucket_list_v2', JSON.stringify(updated));
      localStorage.setItem('berlyn_bucket_list', JSON.stringify(updated));

      // Sync to Supabase
      fetch('/api/bucket-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).catch(() => {});

      // If Habit, automatically create task in Shared Agenda!
      if (isHabit && days) {
        try {
          const existingAgendaStr = localStorage.getItem('berlyn_agenda_tasks');
          const existingAgenda = existingAgendaStr ? JSON.parse(existingAgendaStr) : [];
          const newAgendaTask = {
            id: `habit-${Date.now()}`,
            title: `${newTitle.trim()} 🔁`,
            category: 'chore',
            assignee: 'both',
            timeframe: 'this_week',
            dueDay: days.join(', '),
            dueTime: time,
            completed: false,
            priority: 'normal',
            createdAt: new Date().toISOString().slice(0, 10)
          };
          const updatedAgenda = [newAgendaTask, ...existingAgenda];
          localStorage.setItem('berlyn_agenda_tasks', JSON.stringify(updatedAgenda));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('agenda_updated'));

          // Sync to Supabase agenda API
          fetch('/api/agenda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAgendaTask),
          }).catch(() => {});

          setNotification(`✨ "${newTitle.trim()}" added to Bucket List & scheduled in Shared Agenda for ${days.join(', ')} @ ${time}!`);
        } catch (err) {
          console.error('Failed to sync to agenda', err);
          setNotification(`✨ "${newTitle.trim()}" added to Bucket List!`);
        }
      } else {
        setNotification(`✨ "${newTitle.trim()}" added to Bucket List!`);
      }
    }

    playTap();

    // Reset form
    setEditingItemId(null);
    setNewTitle('');
    setNewNotes('');
    setNewPhoto('');
    setSelectedDays(['Saturday']);
    setSelectedTime('17:00');
    setShowAddModal(false);
  };

  const completedCount = items.filter(i => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-in pb-20">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce-short border border-white/20">
          <Check className="w-4 h-4 shrink-0 text-white" />
          <p className="flex-1 leading-snug">{notification}</p>
          <button onClick={() => setNotification(null)} className="p-0.5 hover:text-slate-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Card */}
      <div className="card-cozy p-5 relative overflow-hidden bg-gradient-to-br from-[#131b2c] via-[#101623] to-[#181126] border border-white/[0.08]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-white tracking-tight">Our Couple Bucket List</h1>
            </div>
            <p className="text-xs text-slate-300">
              Our 20 sacred dreams, adventures & shared weekly habits to live together.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{completedCount} of {items.length} Dreams Fulfilled</span>
            </span>
            <span className="font-bold text-rose-400 font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeCategory === 'all'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-[#141b27] text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          All Dreams ({items.length})
        </button>
        <button
          onClick={() => setActiveCategory('completed')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
            activeCategory === 'completed'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-[#141b27] text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          Fulfilled ({completedCount})
        </button>

        {CATEGORY_ORDER.map(catKey => {
          const conf = CATEGORY_CONFIG[catKey];
          const count = items.filter(i => i.category === catKey).length;
          return (
            <button
              key={catKey}
              onClick={() => setActiveCategory(catKey)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === catKey
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-[#141b27] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              <span>{conf.emoji}</span>
              <span>{conf.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Sectioned Content */}
      {activeCategory === 'completed' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fulfilled Dreams ({completedCount})</span>
            </h2>
          </div>
          {items.filter(i => i.completed).length === 0 ? (
            <div className="card-cozy p-8 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No dreams completed yet. Check items off as you live them!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.filter(i => i.completed).map(item => (
                <BucketItemCard 
                  key={item.id} 
                  item={item} 
                  onToggle={() => toggleItem(item.id)} 
                  onEdit={() => handleOpenEditModal(item)}
                  onDelete={() => deleteItem(item.id)} 
                />
              ))}
            </div>
          )}
        </div>
      ) : activeCategory === 'all' ? (
        // Render All Categories with Headings
        <div className="space-y-6">
          {CATEGORY_ORDER.map(catKey => {
            const conf = CATEGORY_CONFIG[catKey];
            const catItems = items.filter(i => i.category === catKey);
            const catDone = catItems.filter(i => i.completed).length;

            return (
              <div key={catKey} className="space-y-2.5">
                {/* Section Header */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{conf.emoji}</span>
                    <div>
                      <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                        <span>{conf.label}</span>
                      </h2>
                      <p className="text-[10px] text-slate-400 leading-none mt-0.5">{conf.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-slate-300 font-mono font-medium">
                      {catDone}/{catItems.length} Done
                    </span>
                  </div>
                </div>

                {/* Items in this category */}
                {catItems.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center text-slate-500 text-xs">
                    No items in this section yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {catItems.map(item => (
                      <BucketItemCard 
                        key={item.id} 
                        item={item} 
                        onToggle={() => toggleItem(item.id)} 
                        onEdit={() => handleOpenEditModal(item)}
                        onDelete={() => deleteItem(item.id)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Specific Category View
        <div className="space-y-3">
          {(() => {
            const currentCat = activeCategory as BucketCategory;
            const conf = CATEGORY_CONFIG[currentCat] || CATEGORY_CONFIG.trips;
            const catItems = items.filter(i => i.category === currentCat);
            const catDone = catItems.filter(i => i.completed).length;

            return (
              <>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-white/[0.04] to-transparent border border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{conf.emoji}</span>
                    <div>
                      <h2 className="text-sm font-bold text-white tracking-tight">{conf.label}</h2>
                      <p className="text-xs text-slate-400">{conf.description}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-300 font-mono font-medium">
                    {catDone}/{catItems.length} Fulfilled
                  </span>
                </div>

                {catItems.length === 0 ? (
                  <div className="card-cozy p-8 text-center space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No items found in this category.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {catItems.map(item => (
                      <BucketItemCard 
                        key={item.id} 
                        item={item} 
                        onToggle={() => toggleItem(item.id)} 
                        onEdit={() => handleOpenEditModal(item)}
                        onDelete={() => deleteItem(item.id)} 
                      />
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 4. Add Dream / Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {editingItemId ? (
                  <>
                    <Pencil className="w-4 h-4 text-amber-400" />
                    Edit Bucket Item or Routine
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    Add Bucket Item or Routine
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">
              <form onSubmit={handleAddItem} className="space-y-3.5 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Item / Routine Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunset Drive or Gym Twice a Week"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Select Section / Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORY_ORDER.map(catKey => {
                      const conf = CATEGORY_CONFIG[catKey];
                      const isSelected = newCategory === catKey;
                      return (
                        <button
                          type="button"
                          key={catKey}
                          onClick={() => setNewCategory(catKey)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-rose-500/15 border-rose-500 text-white shadow-sm'
                              : 'bg-[#141b27] border-white/[0.08] text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="text-base">{conf.emoji}</span>
                          <span className="text-[11px] font-semibold leading-tight">{conf.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Habit Specific Schedule Inputs */}
                {newCategory === 'habits' && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-purple-300 font-bold text-xs flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5" />
                        <span>Habit Routine & Agenda Auto-Scheduling</span>
                      </label>
                      <span className="text-[10px] text-purple-200 bg-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                        Auto-syncs to Agenda
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1.5 text-[11px]">
                        Select Days of the Week:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAYS.map(day => {
                          const isSelected = selectedDays.includes(day);
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => toggleDay(day)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-[#141b27] text-slate-400 hover:text-white border border-white/[0.08]'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1 text-[11px]">Routine Time</label>
                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1 text-[11px]">Assigned In Agenda</label>
                        <div className="w-full px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5">
                          <span>💖 Together (Both)</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      ℹ️ Saving this habit will automatically add it to your <strong>Shared Agenda</strong> under <strong>{selectedDays.join(', ')}</strong> at <strong>{selectedTime || '17:00'}</strong> as a recurring shared task.
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Notes / Details (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Details, special spots, or thoughts..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                {/* Photo URL */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Photo URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newPhoto}
                    onChange={(e) => setNewPhoto(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#161f2e] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Buttons */}
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
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md transition-all cursor-pointer"
                  >
                    {editingItemId ? 'Update Item' : 'Save to Bucket List'}
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

function BucketItemCard({ 
  item, 
  onToggle, 
  onEdit,
  onDelete 
}: { 
  item: BucketItem; 
  onToggle: () => void; 
  onEdit: () => void; 
  onDelete: () => void; 
}) {
  const conf = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.trips;
  const CatIcon = conf.icon;
  const hasSchedule = (item.schedule_days && item.schedule_days.length > 0) || item.schedule_time;

  return (
    <div 
      className={`card-cozy p-3.5 space-y-2.5 transition-all border ${
        item.completed 
          ? 'border-emerald-500/25 bg-[#101c1f]/40' 
          : 'border-white/[0.07] hover:border-white/[0.14]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
            title={item.completed ? 'Mark as active' : 'Mark as fulfilled'}
          >
            {item.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
            ) : (
              <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
            )}
          </button>

          <div className="space-y-1 flex-1">
            {/* Meta Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium ${conf.color}`}>
                <CatIcon className="w-2.5 h-2.5" />
                <span>{conf.label}</span>
              </span>

              {/* Scheduled Routine Badge */}
              {hasSchedule && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-purple-300 font-medium">
                  <Clock className="w-2.5 h-2.5" />
                  <span>
                    {item.schedule_days && item.schedule_days.length > 0 ? item.schedule_days.join(', ') : 'Routine'}
                    {item.schedule_time ? ` • ${item.schedule_time}` : ''}
                  </span>
                </span>
              )}

              {/* Completed Date */}
              {item.completed && item.completed_at && (
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Fulfilled: {item.completed_at}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={`text-xs font-semibold leading-snug ${
              item.completed ? 'line-through text-slate-400' : 'text-white'
            }`}>
              {item.title}
            </h3>

            {/* Notes */}
            {item.notes && (
              <p className="text-[11px] text-slate-300/90 leading-relaxed pt-0.5">
                {item.notes}
              </p>
            )}
          </div>
        </div>

        {/* Actions: Edit & Delete */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
            title="Edit item"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Photo */}
      {item.photo_url && (
        <div className="rounded-xl overflow-hidden border border-white/[0.08] relative group">
          <img 
            src={item.photo_url} 
            alt={item.title}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-white">
            <span className="flex items-center gap-1 text-[11px] font-medium text-white/90">
              <Camera className="w-3 h-3" />
              Memory Photo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
