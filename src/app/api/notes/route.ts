import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const NOTES_FILE = path.join(process.cwd(), 'src', 'lib', 'notes.json');

export interface NoteEntry {
  author: 'berk' | 'jaquilyn';
  text: string;
  time: string;
  updatedAt: number;
}

export interface CoupleNotesState {
  berk: NoteEntry | null;
  jaquilyn: NoteEntry | null;
}

const DEFAULT_NOTES: CoupleNotesState = {
  berk: null,
  jaquilyn: null,
};

function getNotesFromFile(): CoupleNotesState {
  try {
    if (!fs.existsSync(NOTES_FILE)) return DEFAULT_NOTES;
    const data = fs.readFileSync(NOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return DEFAULT_NOTES;
  }
}

function saveNotesToFile(notes: CoupleNotesState) {
  try {
    const dir = path.dirname(NOTES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save notes:', err);
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET: fetch couple notes
export async function GET() {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('couple_notes').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        const state: CoupleNotesState = { berk: null, jaquilyn: null };
        data.forEach((row: any) => {
          if (row.author === 'berk' || row.author === 'jaquilyn') {
            state[row.author as 'berk' | 'jaquilyn'] = {
              author: row.author,
              text: row.text,
              time: row.time,
              updatedAt: new Date(row.updated_at || row.created_at).getTime(),
            };
          }
        });
        return NextResponse.json({ notes: state });
      }
    }
    return NextResponse.json({ notes: getNotesFromFile() });
  } catch (error: any) {
    return NextResponse.json({ notes: getNotesFromFile() });
  }
}

// POST: create or update a user's note
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { author, text } = body;

    if (!author || !text || !text.trim()) {
      return NextResponse.json({ error: 'Author and text are required' }, { status: 400 });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const updatedAt = now.getTime();

    const current = getNotesFromFile();
    const noteEntry = {
      author: author as 'berk' | 'jaquilyn',
      text: text.trim(),
      time: timeStr,
      updatedAt,
    };

    current[author as 'berk' | 'jaquilyn'] = noteEntry;
    saveNotesToFile(current);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('couple_notes').upsert({
          author,
          text: text.trim(),
          time: timeStr,
          updated_at: now.toISOString(),
        }, { onConflict: 'author' });
      } catch (err) {
        // fallback
      }
    }

    return NextResponse.json({ success: true, notes: current, note: noteEntry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
