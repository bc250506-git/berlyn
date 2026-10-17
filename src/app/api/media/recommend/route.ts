import { NextResponse } from 'next/server';
import DISCOVERY_CATALOG from '@/lib/discovery-catalog.json';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      preferredType = 'all', // 'movie' | 'series' | 'all'
      selectedGenre = 'all', 
      targetGenres = [],
      moodLabel = '',
      completedItems = [],
      watchedTitles = [],
      queueItems = [],
      excludeTitles = [],
    } = body;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Build strict sets of ALL completed titles and IMDb IDs
    const completedSet = new Set<string>();
    const completedImdbSet = new Set<string>();

    completedItems.forEach((c: any) => {
      if (c.title) completedSet.add(normalize(c.title));
      if (c.imdb_id) completedImdbSet.add(c.imdb_id.toLowerCase().trim());
    });

    watchedTitles.forEach((t: string) => {
      if (t) completedSet.add(normalize(t));
    });

    // Build exclusion set (already recommended titles to avoid repeats)
    const excludeSet = new Set<string>();
    if (Array.isArray(excludeTitles)) {
      excludeTitles.forEach((t: string) => {
        if (t) excludeSet.add(normalize(t));
      });
    }

    // 2. Active target genres for this selected mood
    const activeTargetGenres: string[] = (targetGenres && targetGenres.length > 0)
      ? targetGenres
      : (selectedGenre && selectedGenre !== 'all' ? [selectedGenre] : []);

    // 3. Filter completed titles specifically to the chosen category/mood!
    const categoryCompleted = completedItems.filter((c: any) => {
      if (!c.genres || !Array.isArray(c.genres)) return false;
      return c.genres.some((g: string) =>
        activeTargetGenres.some((tg: string) => tg.toLowerCase() === g.toLowerCase())
      );
    });

    // 4. Calculate couple's rating statistics ONLY in this selected category
    const categoryRated = categoryCompleted.map((c: any) => {
      const b = c.berk_rating || 0;
      const j = c.jaquilyn_rating || 0;
      const count = (b > 0 ? 1 : 0) + (j > 0 ? 1 : 0);
      const avg = count > 0 ? (b + j) / count : 0;
      return {
        ...c,
        coupleAvg: avg,
      };
    }).filter((c: any) => c.coupleAvg > 0);

    // Sort from highest to lowest couple rating in this category
    categoryRated.sort((a: any, b: any) => b.coupleAvg - a.coupleAvg);

    const categoryAvgScore = categoryRated.length > 0
      ? categoryRated.reduce((sum: number, c: any) => sum + c.coupleAvg, 0) / categoryRated.length
      : 8.0;

    const topFavoritesInCategory = categoryRated.slice(0, 3);

    // 5. Gather Candidate Pool (STRICTLY EXCLUDING ANY COMPLETED OR EXCLUDED TITLE)
    const candidates: any[] = [];

    // From Queue (want to watch / watching, NOT completed, NOT excluded)
    queueItems.forEach((q: any) => {
      const normTitle = normalize(q.title || '');
      const imdbId = (q.imdb_id || '').toLowerCase().trim();
      const isAlreadyCompleted = completedSet.has(normTitle) || 
        (imdbId && completedImdbSet.has(imdbId)) || 
        q.status === 'completed';
      const isExcluded = excludeSet.has(normTitle);

      if (!isAlreadyCompleted && !isExcluded) {
        candidates.push({
          ...q,
          isFromQueue: true,
        });
      }
    });

    // From Discovery Catalog (NOT completed, NOT excluded)
    DISCOVERY_CATALOG.forEach((d: any) => {
      const normTitle = normalize(d.title);
      if (!completedSet.has(normTitle) && !excludeSet.has(normTitle)) {
        candidates.push({
          id: `disc-${normTitle}`,
          ...d,
          isFromQueue: false,
        });
      }
    });

    // 6. Filter Candidates by Type (movie vs series vs any)
    let filtered = candidates;
    if (preferredType === 'movie') {
      filtered = filtered.filter(c => c.type === 'movie' || c.type === 'anime');
    } else if (preferredType === 'series') {
      filtered = filtered.filter(c => c.type === 'series');
    }

    // 7. Filter Candidates by Target Category Genres
    if (activeTargetGenres.length > 0) {
      const matchGenre = filtered.filter(c => 
        c.genres?.some((g: string) => 
          activeTargetGenres.some((tg: string) => tg.toLowerCase() === g.toLowerCase())
        )
      );
      if (matchGenre.length >= 3) {
        filtered = matchGenre;
      }
    }

    // 8. Score Candidates based on similarity to couple's top favorites in this category
    const scored = filtered.map(item => {
      let score = 75; // baseline

      // Bonus for subgenre overlap with the couple's top-rated completed movies in this category
      let favoriteMatchBonus = 0;
      let matchedFavoriteName = '';
      let matchedFavoriteAvg = 0;

      if (topFavoritesInCategory.length > 0) {
        for (const fav of topFavoritesInCategory) {
          const sharedGenres = item.genres?.filter((g: string) => fav.genres?.includes(g)) || [];
          if (sharedGenres.length > 0) {
            const currentBonus = sharedGenres.length * 4 + (fav.coupleAvg >= 8.5 ? 5 : 2);
            if (currentBonus > favoriteMatchBonus) {
              favoriteMatchBonus = currentBonus;
              matchedFavoriteName = fav.title;
              matchedFavoriteAvg = fav.coupleAvg;
            }
          }
        }
      }

      score += favoriteMatchBonus;

      // Bonus for matching category target genres directly
      const directGenreMatches = item.genres?.filter((g: string) => 
        activeTargetGenres.some((tg: string) => tg.toLowerCase() === g.toLowerCase())
      ).length || 0;
      score += directGenreMatches * 5;

      // High IMDb score bonus
      const imdbNum = parseFloat(String(item.imdb_rating || '7.5'));
      if (imdbNum >= 8.5) score += 6;
      else if (imdbNum >= 8.0) score += 4;

      // Queue priority bonus
      if (item.isFromQueue) score += 3;

      const finalMatchScore = Math.min(99, Math.max(82, Math.round(score)));

      let reason = '';
      if (matchedFavoriteName) {
        reason = `Matches your high ${matchedFavoriteAvg.toFixed(1)}/10 rating for ${matchedFavoriteName} in ${moodLabel || 'this category'}!`;
      } else if (categoryRated.length > 0) {
        reason = `Tailored to your couple average of ${categoryAvgScore.toFixed(1)}/10 in ${moodLabel || 'this category'}.`;
      } else {
        reason = `Top-rated ${item.type} masterpiece (⭐ ${item.imdb_rating || '8.2'} IMDb).`;
      }

      return {
        item,
        matchScore: finalMatchScore,
        reason,
      };
    });

    // 9. Sort by Match Score descending and take TOP 5
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const top5 = scored.slice(0, 5);

    return NextResponse.json({ 
      recommendations: top5,
      hasMore: scored.length > 5,
      remainingCount: Math.max(0, scored.length - 5),
      categoryStats: {
        categoryName: moodLabel || 'Selected Category',
        completedCount: categoryRated.length,
        coupleAvg: categoryRated.length > 0 ? categoryAvgScore.toFixed(1) : null,
        topFavorites: topFavoritesInCategory.map((t: any) => ({
          title: t.title,
          coupleAvg: t.coupleAvg.toFixed(1),
        })),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ recommendations: [], error: error.message }, { status: 500 });
  }
}
