import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CHOICES_FILE = path.join(process.cwd(), 'src', 'lib', 'daily_choices.json');

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

export interface DailyChoiceItem {
  id: string;
  question: string;
  options: string[];
  votes: {
    berk: string | null;
    jaquilyn: string | null;
  };
  createdBy: 'berk' | 'jaquilyn';
  createdAt: string;
}

function getChoicesFromFile(): DailyChoiceItem[] {
  try {
    if (!fs.existsSync(CHOICES_FILE)) return [];
    const data = fs.readFileSync(CHOICES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveChoicesToFile(choices: DailyChoiceItem[]) {
  try {
    const dir = path.dirname(CHOICES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CHOICES_FILE, JSON.stringify(choices, null, 2), 'utf8');
  } catch (err) {
    // ignore
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET: fetch daily choices from cloud database
export async function GET() {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('daily_choices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const formatted = data.map((row: any) => ({
          id: row.id,
          question: row.question,
          options: row.options || [],
          votes: row.votes || { berk: null, jaquilyn: null },
          createdBy: row.created_by,
          createdAt: row.created_at,
        }));
        return NextResponse.json({ choices: formatted });
      }
    }
    return NextResponse.json({ choices: getChoicesFromFile() });
  } catch (error: any) {
    return NextResponse.json({ choices: getChoicesFromFile() });
  }
}

// POST: create a new daily choice (up to 5 options)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { question, options, createdBy } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 });
    }

    const cleanOptions = options
      .map((o: any) => String(o).trim())
      .filter((o: string) => o.length > 0)
      .slice(0, 5); // maximum 5 options as requested

    if (cleanOptions.length < 2) {
      return NextResponse.json({ error: 'At least 2 non-empty options are required' }, { status: 400 });
    }

    const newChoice: DailyChoiceItem = {
      id: `choice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: question.trim(),
      options: cleanOptions,
      votes: {
        berk: null,
        jaquilyn: null,
      },
      createdBy: createdBy === 'jaquilyn' ? 'jaquilyn' : 'berk',
      createdAt: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('daily_choices').insert([{
          id: newChoice.id,
          question: newChoice.question,
          options: newChoice.options,
          votes: newChoice.votes,
          created_by: newChoice.createdBy,
          created_at: newChoice.createdAt,
        }]);
      } catch (err) {
        console.error('Supabase choice insert error:', err);
      }
    }

    const choices = getChoicesFromFile();
    choices.unshift(newChoice);
    saveChoicesToFile(choices);

    return NextResponse.json({ success: true, choice: newChoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: vote on a choice
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, user, option } = body;

    if (!id || !user || !option) {
      return NextResponse.json({ error: 'id, user, and option are required' }, { status: 400 });
    }

    const userKey = user === 'jaquilyn' ? 'jaquilyn' : 'berk';
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data } = await supabase.from('daily_choices').select('*').eq('id', id).single();
        if (data) {
          const currentVotes = data.votes || { berk: null, jaquilyn: null };
          currentVotes[userKey] = option;
          await supabase.from('daily_choices').update({ votes: currentVotes }).eq('id', id);

          const updatedChoice = {
            id: data.id,
            question: data.question,
            options: data.options,
            votes: currentVotes,
            createdBy: data.created_by,
            createdAt: data.created_at,
          };
          return NextResponse.json({ success: true, choice: updatedChoice });
        }
      } catch (err) {
        console.error('Supabase choice vote error:', err);
      }
    }

    // Local file fallback
    const choices = getChoicesFromFile();
    const target = choices.find((c) => c.id === id);

    if (target) {
      target.votes[userKey] = option;
      saveChoicesToFile(choices);
      return NextResponse.json({ success: true, choice: target });
    }

    return NextResponse.json({ error: 'Choice not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete a choice
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Choice ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('daily_choices').delete().eq('id', id);
      } catch (err) {}
    }

    const choices = getChoicesFromFile().filter((c) => c.id !== id);
    saveChoicesToFile(choices);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
