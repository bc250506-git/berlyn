import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const QUIZZES_FILE = path.join(process.cwd(), 'src', 'lib', 'quizzes.json');
const QUIZ_BANK_FILE = path.join(process.cwd(), 'src', 'lib', 'quiz-bank.json');

export interface QuizRecord {
  id: string; // e.g. "daily-2026-10-17"
  date: string; // "2026-10-17"
  question: string;
  category: string;
  berk_answer: string | null;
  jaquilyn_answer: string | null;
  answered_at: string | null;
}

export interface BankQuestion {
  id: string;
  number: number;
  category: string;
  question: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getQuizBank(): BankQuestion[] {
  try {
    if (fs.existsSync(QUIZ_BANK_FILE)) {
      const data = fs.readFileSync(QUIZ_BANK_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading quiz bank:', err);
  }
  return [];
}

function getQuizzesFromFile(): QuizRecord[] {
  try {
    if (fs.existsSync(QUIZZES_FILE)) {
      const data = fs.readFileSync(QUIZZES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading quizzes file:', err);
  }
  return [];
}

function saveQuizzesToFile(quizzes: QuizRecord[]) {
  try {
    const dir = path.dirname(QUIZZES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(QUIZZES_FILE, JSON.stringify(quizzes, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save quizzes to file:', err);
  }
}

// Get current date string in Asia/Nicosia (Kyrenia time)
export function getTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Nicosia' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

async function fetchAllQuizzes(): Promise<QuizRecord[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('quiz_prompts')
        .select('*');

      if (!error && Array.isArray(data)) {
        const mapped: QuizRecord[] = data.map((row: any) => {
          // Extract date from id if id is daily-YYYY-MM-DD
          let dateStr = '';
          if (row.id.startsWith('daily-')) {
            dateStr = row.id.replace('daily-', '');
          } else if (row.answered_at) {
            dateStr = row.answered_at.split('T')[0];
          } else {
            dateStr = getTodayDateString();
          }

          return {
            id: row.id,
            date: dateStr,
            question: row.question,
            category: row.category || 'Deep Love',
            berk_answer: row.berk_answer || null,
            jaquilyn_answer: row.jaquilyn_answer || null,
            answered_at: row.answered_at || null,
          };
        });

        // Sync with local file
        saveQuizzesToFile(mapped);
        return mapped;
      }
    } catch (err) {
      console.error('Supabase fetch quizzes error:', err);
    }
  }

  return getQuizzesFromFile();
}

async function saveQuizRecord(record: QuizRecord): Promise<void> {
  // 1. Save to local JSON
  const all = getQuizzesFromFile();
  const idx = all.findIndex((q) => q.id === record.id);
  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }
  saveQuizzesToFile(all);

  // 2. Save to Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('quiz_prompts').upsert({
        id: record.id,
        question: record.question,
        category: record.category,
        berk_answer: record.berk_answer,
        jaquilyn_answer: record.jaquilyn_answer,
        answered_at: record.answered_at,
      });
    } catch (err) {
      console.error('Supabase upsert quiz error:', err);
    }
  }
}

// GET: fetch today's question, completion status, and history of past answers
export async function GET() {
  try {
    const todayDate = getTodayDateString();
    const todayId = `daily-${todayDate}`;

    const bank = getQuizBank();
    const allRecords = await fetchAllQuizzes();

    // Check if a question has already been assigned for today
    let todayQuiz = allRecords.find((q) => q.id === todayId || q.date === todayDate);

    if (!todayQuiz) {
      // Pick the next unasked question from the 560-question bank
      const usedQuestions = new Set(
        allRecords.map((r) => r.question.trim().toLowerCase())
      );

      const nextAvailable = bank.find(
        (bq) => !usedQuestions.has(bq.question.trim().toLowerCase())
      ) || bank[0];

      todayQuiz = {
        id: todayId,
        date: todayDate,
        question: nextAvailable.question,
        category: nextAvailable.category,
        berk_answer: null,
        jaquilyn_answer: null,
        answered_at: null,
      };

      await saveQuizRecord(todayQuiz);
      allRecords.push(todayQuiz);
    }

    const isTodayCompleted = Boolean(todayQuiz.berk_answer && todayQuiz.jaquilyn_answer);

    // History: all questions with at least one answer or past completed dates, sorted descending by date
    const history = allRecords
      .filter((q) => {
        // Exclude today's quiz if not completed yet, or include if both answered
        if (q.id === todayQuiz?.id && !isTodayCompleted) return false;
        // Keep in history if either partner answered or if completed
        return Boolean(q.berk_answer || q.jaquilyn_answer);
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    // Calculate total stats
    const totalCompleted = allRecords.filter((q) => q.berk_answer && q.jaquilyn_answer).length;
    const totalAnswered = allRecords.filter((q) => q.berk_answer || q.jaquilyn_answer).length;
    const bankRemaining = bank.length - allRecords.length;

    return NextResponse.json({
      todayQuiz,
      isTodayCompleted,
      history,
      stats: {
        totalCompleted,
        totalAnswered,
        totalBank: bank.length,
        bankRemaining: Math.max(0, bankRemaining),
      },
      currentDate: todayDate,
    });
  } catch (error: any) {
    console.error('GET /api/quizzes error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: submit an answer for today's quiz or a specific quiz
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quizId, user, answer } = body;

    if (!user || (user !== 'berk' && user !== 'jaquilyn')) {
      return NextResponse.json({ error: 'Valid user (berk or jaquilyn) required' }, { status: 400 });
    }

    if (!answer || !answer.trim()) {
      return NextResponse.json({ error: 'Answer cannot be empty' }, { status: 400 });
    }

    const todayDate = getTodayDateString();
    const targetId = quizId || `daily-${todayDate}`;

    const allRecords = await fetchAllQuizzes();
    let record = allRecords.find((q) => q.id === targetId);

    if (!record) {
      // Find from bank or create
      const bank = getQuizBank();
      const nextQ = bank[0] || {
        question: 'What is your single favorite memory of us together?',
        category: 'Memories',
      };

      record = {
        id: targetId,
        date: todayDate,
        question: nextQ.question,
        category: nextQ.category,
        berk_answer: null,
        jaquilyn_answer: null,
        answered_at: null,
      };
    }

    // Update the user's answer
    if (user === 'berk') {
      record.berk_answer = answer.trim();
    } else {
      record.jaquilyn_answer = answer.trim();
    }

    // Check if both have answered now
    const bothAnswered = Boolean(record.berk_answer && record.jaquilyn_answer);
    if (bothAnswered && !record.answered_at) {
      record.answered_at = new Date().toISOString();
    }

    await saveQuizRecord(record);

    return NextResponse.json({
      success: true,
      quiz: record,
      isCompleted: bothAnswered,
      message: bothAnswered
        ? 'Both answers submitted! Question completed for today.'
        : 'Your secret answer was submitted!',
    });
  } catch (error: any) {
    console.error('POST /api/quizzes error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
