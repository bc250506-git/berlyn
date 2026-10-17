-- ==============================================================================
-- BERLYN SANCTUARY — MASTER COMPLETE DATABASE SCHEMA
-- Tek ve eksiksiz Supabase SQL Scripti
-- Supabase Dashboard -> SQL Editor içerisine yapıştırıp RUN diyerek çalıştırabilirsiniz:
-- https://supabase.com/dashboard/project/chwvmpmitbyugyiqtrvd/sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. COUPLE NOTES (Ana Sayfa Not Alanı — Berk & Jaquilyn İçin 1'er Not)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.couple_notes (
  author TEXT PRIMARY KEY, -- 'berk' veya 'jaquilyn'
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.couple_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.couple_notes;
CREATE POLICY "Anon couple access" ON public.couple_notes FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. DAILY CHOICES (Ana Sayfa Günlük Seçim & Anket Kartları)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_choices (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb, -- En fazla 5 seçenek
  votes JSONB NOT NULL DEFAULT '{"berk": null, "jaquilyn": null}'::jsonb,
  created_by TEXT NOT NULL, -- 'berk' veya 'jaquilyn'
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.daily_choices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.daily_choices;
CREATE POLICY "Anon couple access" ON public.daily_choices FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. COUPLE MEMORY PHOTOS (Ana Sayfa Love Journey Altı Fotoğraf Albümü)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by TEXT NOT NULL DEFAULT 'berk',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.memories;
CREATE POLICY "Anon couple access" ON public.memories FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. REALTIME CHAT MESSAGES & 12-SAATLİK SÜRELİ FOTOĞRAFLAR
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL, -- 'berk' veya 'jaquilyn'
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at BIGINT,
  is_love_note BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  edited_at BIGINT,
  photo_url TEXT,
  is_ephemeral_photo BOOLEAN DEFAULT false,
  expires_at BIGINT,
  is_expired BOOLEAN DEFAULT false
);

-- Tablo zaten varsa yeni sütunları otomatik ekleme garantisi
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_ephemeral_photo BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS expires_at BIGINT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.messages;
CREATE POLICY "Anon couple access" ON public.messages FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ==============================================================================
-- 6. PARTNER PRESENCE & STATUS (Online, In-Chat, Seen, Typing Durumu)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.partner_presence (
  user_id TEXT PRIMARY KEY, -- 'berk' veya 'jaquilyn'
  is_online BOOLEAN DEFAULT false,
  is_in_chat BOOLEAN DEFAULT false,
  is_typing BOOLEAN DEFAULT false,
  last_seen_message_id TEXT,
  last_seen_message_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.partner_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.partner_presence;
CREATE POLICY "Anon couple access" ON public.partner_presence FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.partner_presence (user_id, is_online, is_in_chat, is_typing)
VALUES 
  ('berk', false, false, false),
  ('jaquilyn', false, false, false)
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- 7. SACRED COUPLE BUCKET LIST & HABIT ROUTINES (20 Kutsal Hayal & Rutin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bucket_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'trips', 'outdoors', 'habits', 'home', 'learning', 'special'
  completed BOOLEAN DEFAULT false,
  completed_at DATE,
  notes TEXT,
  photo_url TEXT,
  schedule_days TEXT[],
  schedule_time TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.bucket_items;
CREATE POLICY "Anon couple access" ON public.bucket_items FOR ALL USING (true) WITH CHECK (true);

-- 20 Kutsal Hayal & Rutinin Supabase Başlangıç Tohumu (Varsa üzerine yazmaz)
INSERT INTO public.bucket_items (id, title, category, completed, notes, schedule_days, schedule_time) VALUES
  ('b-trips-1', 'Karpaz Camping Trip After Jaqui''s Work, Staying Until Sunday', 'trips', false, 'Weekend camping escape under the Karpaz stars, untouched beaches and wild donkeys.', null, null),
  ('b-trips-2', 'Lapta Date', 'trips', false, 'Strolling the scenic coastal walkway and having a romantic seaside dinner.', null, null),
  ('b-trips-3', 'Famagusta Date', 'trips', false, 'Exploring medieval walled city ruins, Varosha views, and cozy dessert spots.', null, null),
  ('b-trips-4', 'Sunset Drive With No Destination', 'trips', false, 'Golden hour lights, windows rolled down, couple playlist on loud, driving wherever the highway goes.', null, null),
  ('b-trips-5', 'Harbour Boat Tour Date', 'trips', false, 'Sailing along the turquoise Mediterranean coastline from Kyrenia ancient harbour.', null, null),
  ('b-outdoors-1', 'Mountain Hike Day (Mountain Sex)', 'outdoors', false, 'Scenic panoramic mountain peak trail hike with intimate wild adventure.', null, null),
  ('b-outdoors-2', 'Water Activity (Parasailing, Banana Boat)', 'outdoors', false, 'Adrenaline on the waves, soaring above the sea on parasails and laughing on banana boats.', null, null),
  ('b-outdoors-3', 'Sunday Breakfast', 'outdoors', false, 'Lazy sunny couple feast with fresh pastries, cheeses, jams, eggs, and hot tea.', null, null),
  ('b-habits-1', 'Gym at least twice a week', 'habits', false, 'Staying disciplined, fit, and boosting our energy together twice every week.', ARRAY['Tuesday', 'Thursday'], '18:00'),
  ('b-habits-2', 'Picnics every weekend', 'habits', false, 'Picnic blanket, homemade bites, fruit platter, reading and cuddles under the trees.', ARRAY['Sunday'], '11:00'),
  ('b-habits-3', 'Badminton Once a week', 'habits', false, 'Weekly fun cardio rally, playful rivalry, and shared laughs on the court.', ARRAY['Wednesday'], '19:00'),
  ('b-home-1', 'Co-op Game Nights At Home', 'home', false, 'Two controllers, cozy blankets, gamer snacks, and beating co-op adventures as a duo.', null, null),
  ('b-home-2', 'Clay Date', 'home', false, 'Air-dry clay sculpting, molding cute couple trinket dishes, and painting our creations.', null, null),
  ('b-home-3', 'Colouring Date', 'home', false, 'Mindful coloring books, dual-tip brush markers, warm tea and acoustic music.', null, null),
  ('b-home-4', 'X Day At Home', 'home', false, 'Uninterrupted all-day cozy cuddle session, silky sheets, pure romance, and zero phones.', null, null),
  ('b-home-5', 'House Cleaning Every Saturday Afternoon', 'home', false, 'Weekly shared cleaning ritual to make our love nest sparkling clean and fresh-scented.', ARRAY['Saturday'], '14:00'),
  ('b-learning-1', 'Turkish Lesson To Jaqui', 'learning', false, 'Teaching cute phrases, daily expressions, vocabulary flashcards, and sweet accents.', null, null),
  ('b-learning-2', 'Cooking Lessons To Berk', 'learning', false, 'Jaquilyn showing Berk cooking secret recipes, spice blends, and kitchen confidence.', null, null),
  ('b-special-1', 'New Years (Steak Day)', 'special', false, 'Sizzling prime steaks, gourmet compound butter, fine red wine, and celebration.', null, null),
  ('b-special-2', 'Halloween (Scream Costume And Rave)', 'special', false, 'Matching iconic Ghostface / Scream robes, neon glow, and raving the night away.', null, null)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. SHARED AGENDA & ROUTINES (Paylaşılan Ajanda ve Görevler)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agenda_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'grocery', 'chore', 'errand', 'date', 'reminder'
  assignee TEXT NOT NULL DEFAULT 'both', -- 'berk', 'jaquilyn', 'both'
  timeframe TEXT NOT NULL DEFAULT 'today', -- 'today', 'tomorrow', 'this_week', 'upcoming'
  due_date TEXT,
  due_day TEXT,
  due_time TEXT,
  completed BOOLEAN DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'urgent'
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agenda_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.agenda_tasks;
CREATE POLICY "Anon couple access" ON public.agenda_tasks FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. MEDIA & WATCHLIST (Diziler, Filmler & Ortak Değerlendirmeler)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'movie', -- 'movie' veya 'series'
  status TEXT NOT NULL DEFAULT 'want_to_watch', -- 'want_to_watch', 'watching', 'completed'
  poster_url TEXT,
  genres TEXT[] DEFAULT '{}',
  moods TEXT[] DEFAULT '{}',
  berk_rating NUMERIC(3, 1),
  jaquilyn_rating NUMERIC(3, 1),
  berk_review TEXT,
  jaquilyn_review TEXT,
  added_by TEXT DEFAULT 'berk',
  year INT,
  total_episodes INT,
  current_episode INT DEFAULT 0,
  imdb_rating NUMERIC(3, 1),
  imdb_id TEXT,
  plot TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.media_items;
CREATE POLICY "Anon couple access" ON public.media_items FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 10. FINANCE TRANSACTIONS, BILLS, ASSETS & COMPOUND INTEREST
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'income', 'expense', 'investment'
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY', -- 'TRY', 'USD', 'GBP'
  category TEXT NOT NULL,
  user_tag TEXT NOT NULL DEFAULT 'shared', -- 'berk', 'jaquilyn', 'shared', 'family'
  date DATE DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT false,
  is_interest BOOLEAN DEFAULT false,
  compound_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.finance_transactions;
CREATE POLICY "Anon couple access" ON public.finance_transactions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.finance_recurring (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  category TEXT NOT NULL,
  due_day INT DEFAULT 1,
  payer TEXT NOT NULL DEFAULT 'shared',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_recurring ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.finance_recurring;
CREATE POLICY "Anon couple access" ON public.finance_recurring FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.finance_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'gold', 'cash_savings', 'stocks', 'real_estate'
  current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  target_value NUMERIC(12, 2),
  monthly_contribution NUMERIC(12, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.finance_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.finance_assets;
CREATE POLICY "Anon couple access" ON public.finance_assets FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.compound_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  principal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  annual_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  withholding_tax NUMERIC(5, 2) NOT NULL DEFAULT 0,
  start_date DATE DEFAULT CURRENT_DATE,
  maturity_months INT DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.compound_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.compound_accounts;
CREATE POLICY "Anon couple access" ON public.compound_accounts FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 11. SWEAR & PENALTY JAR (Küfür & Ceza Kavanozu)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.penalty_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- 'berk' veya 'jaquilyn'
  reason TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.penalty_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.penalty_entries;
CREATE POLICY "Anon couple access" ON public.penalty_entries FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. DAILY QUIZZES & BLIND ANSWERS (Günlük Çift Quizleri)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_prompts (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Memories',
  berk_answer TEXT,
  jaquilyn_answer TEXT,
  answered_at TIMESTAMPTZ
);
ALTER TABLE public.quiz_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon couple access" ON public.quiz_prompts;
CREATE POLICY "Anon couple access" ON public.quiz_prompts FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.quiz_prompts (id, question, category) VALUES
  ('q-1', 'Out of all the moments we have spent together, which one is the most unforgettable and special for you?', 'Memories'),
  ('q-2', 'In our future shared home, where do you want to spend the most time together?', 'Future'),
  ('q-3', 'What is something you appreciated or that made you smile about me today?', 'Deep Love')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 13. SUPABASE STORAGE BUCKET FOR MEMORIES & CHAT PHOTOS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage izinleri (SELECT, INSERT, DELETE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Memories Bucket' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public Access for Memories Bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'memories');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow Uploads for Memories Bucket' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow Uploads for Memories Bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'memories');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow Deletes for Memories Bucket' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow Deletes for Memories Bucket"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'memories');
  END IF;
END $$;

-- ==============================================================================
-- 14. REALTIME YAYINI (Canlı Senkronizasyon)
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_notes;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_choices;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
  EXCEPTION WHEN duplicate_object THEN END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_presence;
  EXCEPTION WHEN duplicate_object THEN END;
END $$;

-- ==============================================================================
-- TAMAMLANDI: TÜM TABLOLAR, SÜTUNLAR, RLS İZİNLERİ VE STORAGE HAZIR
-- ==============================================================================
