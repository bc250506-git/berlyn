-- Berlyn (OurSpace) Database Schema
-- Run this script in the Supabase SQL Editor: https://supabase.com/dashboard/project/chwvmpmitbyugyiqtrvd/sql

-- 1. Daily Prompts & Blind Quizzes
CREATE TABLE IF NOT EXISTS quiz_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'memories', -- memories, deep, fun, future, spicy
  berk_answer TEXT,
  jaquilyn_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ
);

-- 2. Daily Decision Polls
CREATE TABLE IF NOT EXISTS decision_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_by TEXT NOT NULL, -- berk or jaquilyn
  options JSONB NOT NULL DEFAULT '[]', -- [{ id, text, votes: ['berk'] }]
  status TEXT NOT NULL DEFAULT 'active', -- active, resolved
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Media & Entertainment Engine (Watchlist & Ratings)
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'movie', -- movie, series, anime
  status TEXT NOT NULL DEFAULT 'want_to_watch', -- want_to_watch, watching, completed, dropped
  poster_url TEXT,
  genres TEXT[] DEFAULT '{}',
  moods TEXT[] DEFAULT '{}', -- cozy, thriller, nostalgic, emotional, mind_bending, comedy, action, romantic
  berk_rating NUMERIC(3, 1), -- 1 to 10
  jaquilyn_rating NUMERIC(3, 1),
  berk_review TEXT,
  jaquilyn_review TEXT,
  added_by TEXT NOT NULL,
  year INT,
  total_episodes INT,
  current_episode INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Financial & Investment Hub
CREATE TABLE IF NOT EXISTS finance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- income, expense, investment
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD', -- TRY, USD, PHP, EUR
  category TEXT NOT NULL,
  user_tag TEXT NOT NULL DEFAULT 'shared', -- berk, jaquilyn, shared
  date DATE DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- gold, stocks, crypto, cash_savings, real_estate
  current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  target_value NUMERIC(12, 2),
  monthly_contribution NUMERIC(12, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Smart Travel & Passport Map
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'bucketlist', -- visited, bucketlist, planning
  target_date DATE,
  budget_estimate NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  tr_visa TEXT NOT NULL DEFAULT 'visa_free', -- visa_free, e_visa, visa_on_arrival, visa_required
  ph_visa TEXT NOT NULL DEFAULT 'visa_free',
  both_can_visit_easily BOOLEAN DEFAULT true,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Shared Agenda & Bucket List
CREATE TABLE IF NOT EXISTS sticky_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow', -- yellow, rose, lavender, mint, amber
  author TEXT NOT NULL, -- berk or jaquilyn
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bucket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'experience', -- travel, experience, home, date_night, life_milestone
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  photo_url TEXT,
  memory_note TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Swear / Penalty Jar
CREATE TABLE IF NOT EXISTS penalty_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perpetrator TEXT NOT NULL, -- berk or jaquilyn
  reason TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Storage bucket for photos (Run in Supabase Storage or via dashboard)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('memories', 'memories', true)
ON CONFLICT (id) DO NOTHING;

-- Seed initial 15 couple prompts
INSERT INTO quiz_prompts (question, category) VALUES
  ('What is your single favorite memory of us together?', 'memories'),
  ('If we could teleport to any place in the world right now for 24 hours, where would we go?', 'future'),
  ('What is one small habit I have that secretly makes you smile?', 'fun'),
  ('What is a movie we watched together that you will never forget?', 'memories'),
  ('What is your dream Sunday morning with me in our future house?', 'future'),
  ('What song always reminds you of me whenever you hear it?', 'memories'),
  ('What was your very first impression of me?', 'deep'),
  ('What meal or dish made by the other person do you crave the most?', 'fun'),
  ('What is one thing we haven''t tried together yet that you really want to do this year?', 'future'),
  ('What is something I did recently that made you feel deeply loved?', 'deep'),
  ('What is our weirdest inside joke?', 'fun'),
  ('If our relationship had a movie title, what would it be?', 'fun'),
  ('What is one quality in me that you admire the most?', 'deep'),
  ('Where do you see us in exactly 3 years?', 'future'),
  ('What is your favorite picture of us together and why?', 'memories')
ON CONFLICT DO NOTHING;
