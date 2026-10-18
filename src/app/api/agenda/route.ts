import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET: fetch all agenda tasks for the couple
export async function GET() {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('agenda_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const formatted = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          assignee: t.assignee || 'both',
          timeframe: t.timeframe || 'today',
          dueDate: t.due_date,
          dueDay: t.due_day,
          dueTime: t.due_time,
          completed: Boolean(t.completed),
          priority: t.priority || 'normal',
          createdAt: t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        }));
        return NextResponse.json({ tasks: formatted });
      }
    }
    return NextResponse.json({ tasks: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 });
  }
}

// POST: create or update an agenda task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, category, assignee, timeframe, dueDate, dueDay, dueTime, completed, priority } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const taskId = id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const taskRecord = {
      id: taskId,
      title: title.trim(),
      category: category || 'grocery',
      assignee: assignee || 'both',
      timeframe: timeframe || 'today',
      due_date: dueDate || null,
      due_day: dueDay || null,
      due_time: dueTime || null,
      completed: Boolean(completed),
      priority: priority || 'normal',
    };

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('agenda_tasks').upsert(taskRecord);
      if (error) {
        console.error('Supabase agenda task upsert error:', error);
      }
    }

    const formatted = {
      id: taskRecord.id,
      title: taskRecord.title,
      category: taskRecord.category,
      assignee: taskRecord.assignee,
      timeframe: taskRecord.timeframe,
      dueDate: taskRecord.due_date,
      dueDay: taskRecord.due_day,
      dueTime: taskRecord.due_time,
      completed: taskRecord.completed,
      priority: taskRecord.priority,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    return NextResponse.json({ success: true, task: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: toggle task completion or quick-edit
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, completed } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from('agenda_tasks')
        .update({ completed: Boolean(completed) })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, id, completed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: remove a task
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('agenda_tasks').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
