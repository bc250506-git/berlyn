import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MESSAGES_FILE = path.join(process.cwd(), 'src', 'lib', 'messages.json');

function getMessagesFromFile(): any[] {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveMessagesToFile(messages: any[]) {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save messages to file:', err);
  }
}

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET: fetch all messages (chat photos are permanent)
export async function GET() {
  try {
    const supabase = getSupabase();
    let messages: any[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          messages = data.map((row: any) => ({
            id: row.id,
            sender: row.sender,
            text: row.text,
            timestamp: row.timestamp,
            created_at: Number(row.created_at) || Date.now(),
            isLoveNote: Boolean(row.is_love_note),
            isEdited: Boolean(row.is_edited),
            editedAt: row.edited_at ? Number(row.edited_at) : null,
            photo_url: row.photo_url,
          }));
        }
      } catch (err) {
        console.warn('Supabase messages query error:', err);
      }
    }

    if (messages.length === 0) {
      messages = getMessagesFromFile();
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ messages: [], error: error.message }, { status: 500 });
  }
}

// POST: send / save a new message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, sender } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: sender === 'jaquilyn' ? 'jaquilyn' : 'berk',
      text: text.trim(),
      timestamp: timeStr,
      created_at: Date.now(),
      isLoveNote: text.includes('❤️') || text.includes('💖') || text.includes('love') || text.includes('kisses')
    };

    const messages = getMessagesFromFile();
    messages.push(newMessage);
    saveMessagesToFile(messages);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('messages').insert([{
          id: newMessage.id,
          sender: newMessage.sender,
          text: newMessage.text,
          timestamp: newMessage.timestamp,
          created_at: newMessage.created_at,
          is_love_note: newMessage.isLoveNote,
          is_edited: false,
          photo_url: null,
          is_ephemeral_photo: false,
          expires_at: null,
          is_expired: false,
        }]);
      } catch (err) {
        console.warn('Supabase message insert fallback:', err);
      }
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: update / edit a message by id
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, text } = body;

    if (!id || !text || !text.trim()) {
      return NextResponse.json({ error: 'Message ID and text are required' }, { status: 400 });
    }

    const messages = getMessagesFromFile();
    const index = messages.findIndex((m: any) => m.id === id);

    const trimmed = text.trim();
    if (index !== -1) {
      messages[index].text = trimmed;
      messages[index].isEdited = true;
      messages[index].editedAt = Date.now();
      messages[index].isLoveNote = trimmed.includes('❤️') || trimmed.includes('💖') || trimmed.includes('love') || trimmed.includes('kisses');
      saveMessagesToFile(messages);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('messages').update({
          text: trimmed,
          is_edited: true,
          edited_at: Date.now(),
          is_love_note: trimmed.includes('❤️') || trimmed.includes('💖') || trimmed.includes('love') || trimmed.includes('kisses'),
        }).eq('id', id);
      } catch (err) {}
    }

    const updatedMsg = index !== -1 ? messages[index] : { id, text: trimmed, isEdited: true };
    return NextResponse.json({ success: true, message: updatedMsg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: delete a message by id
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const messages = getMessagesFromFile();
    const filtered = messages.filter((m: any) => m.id !== id);
    saveMessagesToFile(filtered);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('messages').delete().eq('id', id);
      } catch (err) {}
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

