import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    const apiKey = process.env.OMDB_API_KEY || 'trilogy';
    const res = await fetch(
      `https://www.omdbapi.com/?s=${encodeURIComponent(query.trim())}&apikey=${apiKey}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();

    if (data.Response === 'False' || !data.Search) {
      return NextResponse.json({ results: [] });
    }

    const results = data.Search.map((item: any) => ({
      title: item.Title,
      year: item.Year,
      imdbID: item.imdbID,
      type: item.Type === 'series' ? 'series' : item.Type === 'episode' ? 'series' : 'movie',
      poster: item.Poster && item.Poster !== 'N/A' ? item.Poster : '',
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
