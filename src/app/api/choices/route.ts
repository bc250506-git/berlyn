import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const CHOICES_FILE = path.join(process.cwd(), 'src', 'lib', 'daily_choices.json');

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
    console.error('Failed to save choices:', err);
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET: fetch daily choices
export async function GET() {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('daily_choices')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
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

    const choices = getChoicesFromFile();
    choices.unshift(newChoice);
    saveChoicesToFile(choices);

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
      } catch (err) {}
    }

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

    const choices = getChoicesFromFile();
    const target = choices.find((c) => c.id === id);

    if (!target) {
      return NextResponse.json({ error: 'Choice not found' }, { status: 404 });
    }

    const userKey = user === 'jaquilyn' ? 'jaquilyn' : 'berk';
    target.votes[userKey] = option;
    saveChoicesToFile(choices);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('daily_choices').update({ votes: target.votes }).eq('id', id);
      } catch (err) {}
    }

    return NextResponse.json({ success: true, choice: target });
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

    const choices = getChoicesFromFile().filter((c) => c.id !== id);
    saveChoicesToFile(choices);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('daily_choices').delete().eq('id', id);
      } catch (err) {}
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
