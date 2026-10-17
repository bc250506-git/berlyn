import { createClient } from './supabase/client';
import { MediaItem, MediaType, WatchStatus, MediaMood, CoupleUser } from '@/types';

export const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'm-1',
    title: 'About Time',
    type: 'movie',
    status: 'completed',
    year: 2013,
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    genres: ['Romance', 'Drama', 'Fantasy'],
    moods: ['cozy', 'romantic', 'emotional'],
    berk_rating: 9.5,
    jaquilyn_rating: 10,
    berk_review: 'One of the most touching movies about loving every single day as if it were your last.',
    jaquilyn_review: 'I cried so much, it is our ultimate cozy movie forever! ❤️',
    added_by: 'berk',
    created_at: '2026-03-10T14:00:00Z',
  },
  {
    id: 'm-2',
    title: 'Interstellar',
    type: 'movie',
    status: 'completed',
    year: 2014,
    poster_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    moods: ['mind_bending', 'emotional', 'nostalgic'],
    berk_rating: 10,
    jaquilyn_rating: 9.0,
    berk_review: 'A masterpiece of physics, love transcending dimensions, and Zimmer soundtrack.',
    jaquilyn_review: 'The ending made my heart ache in the most beautiful way.',
    added_by: 'berk',
    created_at: '2026-04-02T19:30:00Z',
  },
  {
    id: 'm-3',
    title: 'Spirited Away (Studio Ghibli)',
    type: 'anime',
    status: 'completed',
    year: 2001,
    poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
    genres: ['Animation', 'Fantasy', 'Family'],
    moods: ['cozy', 'nostalgic'],
    berk_rating: 9.0,
    jaquilyn_rating: 9.5,
    berk_review: 'Magical atmosphere and delicious-looking animated food.',
    jaquilyn_review: 'Haku and Chihiro forever! Warmest vibes ever.',
    added_by: 'jaquilyn',
    created_at: '2026-05-15T21:00:00Z',
  },
  {
    id: 'm-4',
    title: 'Loki (Season 1 & 2)',
    type: 'series',
    status: 'watching',
    year: 2021,
    total_episodes: 12,
    current_episode: 8,
    poster_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    genres: ['Action', 'Sci-Fi', 'Fantasy'],
    moods: ['mind_bending', 'action'],
    berk_rating: 9.2,
    jaquilyn_rating: 8.8,
    berk_review: 'Best MCU show hands down, the TVA aesthetics and score are insane.',
    jaquilyn_review: 'Tom Hiddleston is amazing, loving the time travel chaos!',
    added_by: 'berk',
    created_at: '2026-06-20T18:00:00Z',
  },
  {
    id: 'm-5',
    title: 'Before Sunrise',
    type: 'movie',
    status: 'want_to_watch',
    year: 1995,
    poster_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
    genres: ['Romance', 'Drama'],
    moods: ['romantic', 'cozy', 'nostalgic'],
    added_by: 'jaquilyn',
    created_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'm-6',
    title: 'Severance (Season 2)',
    type: 'series',
    status: 'want_to_watch',
    year: 2025,
    total_episodes: 10,
    current_episode: 0,
    poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    genres: ['Mystery', 'Sci-Fi', 'Thriller'],
    moods: ['thriller', 'mind_bending'],
    added_by: 'berk',
    created_at: '2026-07-12T16:00:00Z',
  },
  {
    id: 'm-7',
    title: 'Your Name (Kimi no Na wa)',
    type: 'anime',
    status: 'want_to_watch',
    year: 2016,
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    genres: ['Animation', 'Romance', 'Drama'],
    moods: ['emotional', 'romantic', 'cozy'],
    added_by: 'jaquilyn',
    created_at: '2026-08-05T10:30:00Z',
  },
];

export async function fetchMediaItems(): Promise<MediaItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Return local cache or seeded items
      const local = localStorage.getItem('berlyn_media_items');
      return local ? JSON.parse(local) : INITIAL_MEDIA_ITEMS;
    }

    return data as MediaItem[];
  } catch {
    const local = localStorage.getItem('berlyn_media_items');
    return local ? JSON.parse(local) : INITIAL_MEDIA_ITEMS;
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
