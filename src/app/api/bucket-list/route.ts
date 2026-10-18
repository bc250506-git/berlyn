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

// GET: fetch all shared bucket list items & habits from Supabase
export async function GET() {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('bucket_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const formatted = data.map((b: any) => ({
          id: b.id,
          title: b.title,
          category: b.category,
          completed: Boolean(b.completed),
          completed_at: b.completed_at || undefined,
          notes: b.notes || undefined,
          photo_url: b.photo_url || undefined,
          schedule_days: b.schedule_days || undefined,
          schedule_time: b.schedule_time || undefined,
          created_at: b.created_at ? b.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        }));
        return NextResponse.json({ items: formatted });
      }
    }
    return NextResponse.json({ items: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
  }
}

// POST: create or update a bucket list item
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, category, completed, completed_at, notes, photo_url, schedule_days, schedule_time } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const itemId = id || `b-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id: itemId,
      title: title.trim(),
      category: category || 'trips',
      completed: Boolean(completed),
      completed_at: completed_at || (completed ? new Date().toISOString().slice(0, 10) : null),
      notes: notes?.trim() || null,
      photo_url: photo_url || null,
      schedule_days: Array.isArray(schedule_days) ? schedule_days : null,
      schedule_time: schedule_time || null,
    };

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('bucket_items').upsert(record);
      if (error) {
        console.error('Supabase bucket item upsert error:', error);
      }
    }

    const formatted = {
      id: record.id,
      title: record.title,
      category: record.category,
      completed: record.completed,
      completed_at: record.completed_at || undefined,
      notes: record.notes || undefined,
      photo_url: record.photo_url || undefined,
      schedule_days: record.schedule_days || undefined,
      schedule_time: record.schedule_time || undefined,
      created_at: new Date().toISOString().slice(0, 10),
    };

    return NextResponse.json({ success: true, item: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: toggle complete or update note
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, completed, completed_at, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const updatePayload: any = {};
    if (completed !== undefined) {
      updatePayload.completed = Boolean(completed);
      updatePayload.completed_at = completed ? (completed_at || new Date().toISOString().slice(0, 10)) : null;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('bucket_items').update(updatePayload).eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, id, ...updatePayload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete bucket item
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('bucket_items').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
