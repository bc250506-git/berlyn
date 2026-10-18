import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { HomePageClient } from '@/components/HomePageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

async function getInitialData() {
  let memories: any[] = [];
  let notes: any = { berk: null, jaquilyn: null };
  let choices: any[] = [];

  // 1. Fetch live memories from Supabase (all 126+ photos)
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false });
      if (Array.isArray(data) && data.length > 0) {
        memories = data;
      }
    }
  } catch (e) {
    console.error('Failed to fetch memories from Supabase for SSR:', e);
  }

  // Fallback to local memories.json if needed
  if (memories.length === 0) {
    try {
      const memPath = path.join(process.cwd(), 'src', 'lib', 'memories.json');
      if (fs.existsSync(memPath)) {
        memories = JSON.parse(fs.readFileSync(memPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to read memories.json for SSR:', e);
    }
  }

  // 2. Fetch live notes
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.from('couple_notes').select('*');
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((row: any) => {
          if (row.author === 'berk' || row.author === 'jaquilyn') {
            notes[row.author] = {
              author: row.author,
              text: row.text,
              time: row.time,
              updatedAt: new Date(row.updated_at || row.created_at).getTime(),
            };
          }
        });
      }
    }
  } catch (e) {}

  if (!notes.berk && !notes.jaquilyn) {
    try {
      const notesPath = path.join(process.cwd(), 'src', 'lib', 'notes.json');
      if (fs.existsSync(notesPath)) {
        notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
      }
    } catch (e) {}
  }

  // 3. Fetch live choices
  try {
    const choicesPath = path.join(process.cwd(), 'src', 'lib', 'daily_choices.json');
    if (fs.existsSync(choicesPath)) {
      choices = JSON.parse(fs.readFileSync(choicesPath, 'utf8'));
    }
  } catch (e) {}

  return { memories, notes, choices };
}

export default async function Page() {
  const { memories, notes, choices } = await getInitialData();
  const initialActivePhoto = Array.isArray(memories) && memories.length > 0
    ? memories[Math.floor(Math.random() * memories.length)]
    : null;

  return (
    <HomePageClient
      initialMemories={memories}
      initialActivePhoto={initialActivePhoto}
      initialNotes={notes}
      initialChoices={choices}
    />
  );
}
