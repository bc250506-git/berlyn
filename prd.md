# Project: Berlyn (OurSpace)

**Tech Stack**: Next.js (App Router), Supabase (PostgreSQL, Storage), Vercel, Tailwind CSS.  
**Primary Language**: English  
**Audience**: Berk & Jaquilyn  

---

## 1. Product Overview & Vision
A private, highly personalized digital sanctuary for Berk and Jaquilyn. It serves as a daily life manager, financial tracker, and shared entertainment hub. The UI will be a cozy, dark-themed "comfort zone" avoiding corporate aesthetics, featuring user-selectable accent colors, warm ambient vibes, micro-interactions, and delightful couple touches.

---

## 2. Authentication & User Management
- **Simple .env Auth**: No complex third-party email confirmation loops. Passwords/pins for both users (Berk and Jaquilyn) are configured securely in `.env` (or Supabase auth with pre-seeded credentials).
- **Session Management**: Middleware / secure HTTP-only session cookie identifying which user is logged in.
- **User Identity & State**: Every action (posting a note, adding an expense, answering a quiz, rating a movie) is tagged with the author (`berk` or `jaquilyn`).

---

## 3. Core Features

### 3.1. The Dashboard & Ambient Widgets
- **Relationship Timeline**: A live ticker displaying exact time spent together (Years, Months, Days, Hours, Minutes, Seconds).
- **Dual-Zone Ambient Widget**: Real-time clocks and live weather for **Kyrenia (North Cyprus)** and **Bulacan (Philippines)** side-by-side.
- **Daily Glance**: Quick view of active polls, upcoming dates, latest shared sticky note, and swear jar balance.

### 3.2. Daily Pop-up Polls & Quizzes
- **Decision Polls**: Quick modals for daily choices ("What's for dinner?", "Watch a movie or play a game?").
- **Relationship Prompts & Quizzes**: Database of 100+ thoughtful/fun questions (memories, appreciation, deep questions).
- **Blind Answers**: When a question or quiz appears, answers remain hidden/blurred until both Berk and Jaquilyn have submitted their responses!

### 3.3. Media & Entertainment Engine (Watchlist & Recommendations)
- **Tracker & Rater**: Log movies, TV series, anime, and MCU/franchise progress. Rate them individually (1-10) with personal reviews/tags.
- **Dual Ratings**: See Berk's rating vs Jaquilyn's rating side-by-side, plus a couple compatibility score on media.
- **Mood-Based Recommender**: Select current mood (e.g. cozy, thrill, tear-jerker, nostalgic, mind-bending) -> intelligent algorithm picks the best match from the "Want to Watch" queue based on past ratings & genre affinities.
- **External Integration**: TMDB API integration for rich posters, cast, trailers, and automatic genre data.

### 3.4. Financial & Investment Hub
- **Income & Shared Expenses**: Log monthly salaries, recurring bills, split or shared expenses, and category breakdowns.
- **Investments & Assets**: Track savings, gold/crypto/stocks/funds, currency conversion (TRY, USD, PHP, EUR).
- **Trajectory & Analytics**: Interactive charts showing savings rate, monthly burn rate, and 1-5-10 year long-term wealth projections ("Where will we be in 5 years?").

### 3.5. Smart Travel & Passport Map
- **Interactive World Map**: Visual map highlighting visited countries, dream destinations, and upcoming trips.
- **Visa Matcher Logic**: Cross-references **Turkish (TR)** and **Philippine (PH)** passport visa requirements to easily filter visa-free, e-visa, or visa-on-arrival destinations for both of you together.
- **Trip Planner**: Itineraries, packing checklists, flight details, and country-specific budget trackers.

### 3.6. Shared Agenda & The Bucket List
- **Shared Agenda & Sticky Notes**: Real-time pinboard for daily reminders, grocery runs, cute love notes, and calendar events.
- **The Bucket List**: Shared life milestones & adventures checklist. Completed items require a photo upload (compressed to WebP) with memory captions.

### 3.7. The Penalty / Swear Jar
- **Gamified Penalty Jar**: Fun ledger for forbidden words, funny habits, or inside-joke penalties.
- **Target Rewards**: Accumulated "fines" fund an agreed-upon couple date/reward (e.g., luxury spa day, special dinner, romantic weekend).

---

## 4. Technical Architecture & Data Strategy
- **Framework**: Next.js 14+ (App Router, React Server Components + Client components)
- **Database**: Supabase PostgreSQL with clean relational schema + Row-level triggers
- **Storage**: Supabase Storage buckets for memory photos, avatars, and attachments (with client-side WebP compression)
- **Styling & Aesthetics**: Cozy Dark Luxe theme, Tailwind CSS + custom glassmorphism, warm tones (amber, rose, emerald accents selectable), Lucide icons, Framer Motion animations.
