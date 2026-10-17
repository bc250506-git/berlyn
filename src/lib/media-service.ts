import { createClient } from './supabase/client';
import { MediaItem, MediaType, WatchStatus, MediaMood, CoupleUser } from '@/types';

import COMPLETED_MOVIES from './completed_movies.json';

export const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  // All completed movies & series from completed_movies.json (Untouched & preserved)
  ...(COMPLETED_MOVIES as MediaItem[]),
];

export async function fetchMediaItems(): Promise<MediaItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('berlyn_media_items');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length >= 50) {
            return parsed;
          }
        }
        localStorage.setItem('berlyn_media_items', JSON.stringify(INITIAL_MEDIA_ITEMS));
      }
      return INITIAL_MEDIA_ITEMS;
    }

    return data as MediaItem[];
  } catch {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('berlyn_media_items');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return parsed;
        }
      }
      localStorage.setItem('berlyn_media_items', JSON.stringify(INITIAL_MEDIA_ITEMS));
    }
    return INITIAL_MEDIA_ITEMS;
  }
}

export async function saveMediaItem(item: Partial<MediaItem>): Promise<MediaItem> {
  const newItem: MediaItem = {
    id: item.id || `m-${Date.now()}`,
    title: item.title || 'Untitled',
    type: item.type || 'movie',
    status: item.status || 'want_to_watch',
    poster_url: item.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    genres: item.genres || ['Drama'],
    moods: item.moods || ['cozy'],
    berk_rating: item.berk_rating ?? null,
    jaquilyn_rating: item.jaquilyn_rating ?? null,
    berk_review: item.berk_review ?? null,
    jaquilyn_review: item.jaquilyn_review ?? null,
    added_by: item.added_by || 'berk',
    year: item.year || new Date().getFullYear(),
    total_episodes: item.total_episodes,
    current_episode: item.current_episode || 0,
    imdb_rating: item.imdb_rating,
    imdb_id: item.imdb_id,
    plot: item.plot,
    created_at: item.created_at || new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    await supabase.from('media_items').upsert(newItem);
  } catch {
    // Continue with local storage fallback
  }

  // Update local storage
  try {
    const local = localStorage.getItem('berlyn_media_items');
    const items: MediaItem[] = local ? JSON.parse(local) : INITIAL_MEDIA_ITEMS;
    const existingIndex = items.findIndex((i) => i.id === newItem.id);
    if (existingIndex >= 0) {
      items[existingIndex] = newItem;
    } else {
      items.unshift(newItem);
    }
    localStorage.setItem('berlyn_media_items', JSON.stringify(items));
  } catch {
    // Ignore storage errors
  }

  return newItem;
}

export async function deleteMediaItem(id: string): Promise<MediaItem[]> {
  try {
    const supabase = createClient();
    await supabase.from('media_items').delete().eq('id', id);
  } catch {
    // ignore
  }

  try {
    const local = localStorage.getItem('berlyn_media_items');
    const items: MediaItem[] = local ? JSON.parse(local) : INITIAL_MEDIA_ITEMS;
    const filtered = items.filter((i) => i.id !== id);
    localStorage.setItem('berlyn_media_items', JSON.stringify(filtered));
    return filtered;
  } catch {
    return [];
  }
}

