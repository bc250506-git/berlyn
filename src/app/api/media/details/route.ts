import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imdbID = searchParams.get('imdbID') || searchParams.get('id') || '';
    const title = searchParams.get('title') || searchParams.get('t') || '';

    if (!imdbID && !title) {
      return NextResponse.json({ error: 'Missing title or imdbID' }, { status: 400 });
    }

    const apiKey = process.env.OMDB_API_KEY || 'trilogy';
    const param = imdbID ? `i=${encodeURIComponent(imdbID)}` : `t=${encodeURIComponent(title)}`;
    const res = await fetch(`https://www.omdbapi.com/?${param}&plot=short&apikey=${apiKey}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from movie database' }, { status: 502 });
    }

    const data = await res.json();

    if (data.Response === 'False') {
      return NextResponse.json({ error: data.Error || 'Movie not found' }, { status: 404 });
    }

    const genres = data.Genre && data.Genre !== 'N/A'
      ? data.Genre.split(',').map((g: string) => g.trim())
      : ['Drama'];

    const type = data.Type === 'series' || data.Type === 'episode' ? 'series' : 'movie';
    const year = parseInt(data.Year) || (data.Year ? parseInt(data.Year.slice(0, 4)) : 2026);

    return NextResponse.json({
      title: data.Title,
      year: isNaN(year) ? 2026 : year,
      type,
      genres,
      poster_url: data.Poster && data.Poster !== 'N/A' ? data.Poster : '',
      imdb_rating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null,
      imdb_id: data.imdbID,
      plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : '',
      director: data.Director && data.Director !== 'N/A' ? data.Director : '',
      actors: data.Actors && data.Actors !== 'N/A' ? data.Actors : '',
      runtime: data.Runtime,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
