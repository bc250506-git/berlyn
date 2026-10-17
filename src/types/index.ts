export type CoupleUser = 'berk' | 'jaquilyn';

export interface UserProfile {
  id: CoupleUser;
  name: string;
  avatar: string;
  location: string;
  city: string;
  timezone: string;
  country: string;
  accentColor: string;
}

export const USERS: Record<CoupleUser, UserProfile> = {
  berk: {
    id: 'berk',
    name: 'Berk',
    avatar: '🦁',
    location: 'Kyrenia',
    city: 'Kyrenia',
    timezone: 'Asia/Nicosia',
    country: 'TR / NC',
    accentColor: '#3b82f6',
  },
  jaquilyn: {
    id: 'jaquilyn',
    name: 'Jaquilyn',
    avatar: '🌸',
    location: 'Bulacan',
    city: 'Bulacan',
    timezone: 'Asia/Manila',
    country: 'PH',
    accentColor: '#ec4899',
  },
};

// Daily Polls & Quizzes
export interface QuizPrompt {
  id: string;
  question: string;
  category: 'memories' | 'deep' | 'fun' | 'future' | 'spicy';
  berk_answer?: string | null;
  jaquilyn_answer?: string | null;
  created_at: string;
  answered_at?: string | null;
}

export interface DecisionPoll {
  id: string;
  title: string;
  created_by: CoupleUser;
  options: { id: string; text: string; votes: CoupleUser[] }[];
  status: 'active' | 'resolved';
  created_at: string;
}

// Media & Entertainment
export type MediaType = 'movie' | 'series' | 'anime';
export type WatchStatus = 'want_to_watch' | 'watching' | 'completed' | 'dropped';
export type MediaMood = 'cozy' | 'thriller' | 'nostalgic' | 'emotional' | 'mind_bending' | 'comedy' | 'action' | 'romantic';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: WatchStatus;
  poster_url?: string;
  genres: string[];
  moods: MediaMood[];
  berk_rating?: number | null;
  jaquilyn_rating?: number | null;
  berk_review?: string | null;
  jaquilyn_review?: string | null;
  added_by: CoupleUser;
  year?: number;
  total_episodes?: number;
  current_episode?: number;
  created_at: string;
}

// Finance Hub (Currencies: TRY default, USD, GBP)
export type TransactionType = 'income' | 'expense' | 'investment';
export type Currency = 'TRY' | 'USD' | 'GBP';

export interface FinanceItem {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  currency: Currency;
  category: string;
  user: CoupleUser | 'shared';
  date: string;
  recurring?: boolean;
}

export interface InvestmentAsset {
  id: string;
  name: string;
  category: 'gold' | 'stocks' | 'crypto' | 'cash_savings' | 'real_estate';
  current_value: number;
  currency: Currency;
  target_value?: number;
  monthly_contribution?: number;
}

// Compound Interest / Faiz Getirisi Account
export interface CompoundInterestAccount {
  id: string;
  name: string;
  principal: number; // Anapara
  currency: Currency; // TRY, USD, GBP
  annualRate: number; // Yıllık faiz oranı (%)
  compoundingFrequency: 'monthly' | 'daily' | '32_days'; // Bileşik sıklığı
  startDate: string; // YYYY-MM-DD
  withholdingTax: number; // Stopaj oranı (örn: %10 veya %0)
  note?: string;
}

// Travel & Visa
export type VisaStatus = 'visa_free' | 'e_visa' | 'visa_on_arrival' | 'visa_required';

export interface Destination {
  id: string;
  country: string;
  country_code: string;
  city?: string;
  status: 'visited' | 'bucketlist' | 'planning';
  target_date?: string;
  budget_estimate?: number;
  currency?: Currency;
  tr_visa: VisaStatus;
  ph_visa: VisaStatus;
  both_can_visit_easily: boolean;
  notes?: string;
  photos?: string[];
}

// Agenda & Bucket List
export interface StickyNote {
  id: string;
  content: string;
  color: 'yellow' | 'rose' | 'lavender' | 'mint' | 'amber';
  author: CoupleUser;
  pinned: boolean;
  created_at: string;
}

export interface BucketItem {
  id: string;
  title: string;
  category: 'travel' | 'experience' | 'home' | 'date_night' | 'life_milestone';
  completed: boolean;
  completed_at?: string | null;
  photo_url?: string | null;
  memory_note?: string | null;
  created_by: CoupleUser;
  created_at: string;
}

// Swear & Penalty Jar
export interface PenaltyEntry {
  id: string;
  perpetrator: CoupleUser;
  reason: string;
  amount: number;
  currency: Currency;
  created_at: string;
}
