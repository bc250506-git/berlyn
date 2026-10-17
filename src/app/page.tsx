import fs from 'fs';
import path from 'path';
import { HomePageClient } from '@/components/HomePageClient';

// Opt out of instant-navigation static prerender validation for dynamic couples feed
export const instant = false;

function getInitialData() {
  let memories: any[] = [];
  let notes: any = { berk: null, jaquilyn: null };
  let choices: any[] = [];

  try {
    const memPath = path.join(process.cwd(), 'src', 'lib', 'memories.json');
    if (fs.existsSync(memPath)) {
      memories = JSON.parse(fs.readFileSync(memPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read memories.json for SSR:', e);
  }

  try {
    const notesPath = path.join(process.cwd(), 'src', 'lib', 'notes.json');
    if (fs.existsSync(notesPath)) {
      notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read notes.json for SSR:', e);
  }

  try {
    const choicesPath = path.join(process.cwd(), 'src', 'lib', 'daily_choices.json');
    if (fs.existsSync(choicesPath)) {
      choices = JSON.parse(fs.readFileSync(choicesPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read daily_choices.json for SSR:', e);
  }

  return { memories, notes, choices };
}

export default function Page() {
  const { memories, notes, choices } = getInitialData();

  return (
    <HomePageClient
      initialMemories={memories}
      initialNotes={notes}
      initialChoices={choices}
    />
  );
}
