import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { convertImageToWebP } from '@/lib/image-converter';
import { createClient } from '@supabase/supabase-js';

const MESSAGES_FILE = path.join(process.cwd(), 'src', 'lib', 'messages.json');
const CHAT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'chat');

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

function getMessagesFromFile(): any[] {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) return [];
    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveMessagesToFile(messages: any[]) {
  try {
    const dir = path.dirname(MESSAGES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (err) {
    // Ignore in serverless
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  try {
    return createClient(url, key);
  } catch (err) {
    console.error('Failed to create Supabase client for chat photos:', err);
    return null;
  }
}

// POST: upload permanent chat photo with HEIC -> WebP conversion
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sender = (formData.get('sender') as string) || 'berk';
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Convert HEIC/JPG/PNG to WebP with auto-rotation (iPhone EXIF support)
    const webpBuffer = await convertImageToWebP(inputBuffer, file.name || '', 1600);

    const fileName = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    let photoUrl = '';

    // Try Supabase Storage first
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memories')
          .upload(`chat/${fileName}`, webpBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('memories')
            .getPublicUrl(`chat/${fileName}`);
          if (publicUrlData?.publicUrl) {
            photoUrl = publicUrlData.publicUrl;
          }
        }
      } catch (err) {
        // Storage upload failed or bucket doesn't exist
      }
    }

    // Serverless safe data URL fallback (guarantees zero read-only filesystem ENOENT crashes on Vercel)
    if (!photoUrl) {
      photoUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    }

    // Local disk backup (skip on Vercel)
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (!isServerless && !photoUrl.startsWith('data:')) {
      try {
        if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
          fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(CHAT_UPLOAD_DIR, fileName), webpBuffer);
      } catch (fsErr) {
        // Skip local write
      }
    }

    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage = {
      id: `msg-${now}-${Math.random().toString(36).substring(2, 7)}`,
      sender: sender === 'jaquilyn' ? 'jaquilyn' : 'berk',
      text: caption.trim() || '📷 Photo',
      photo_url: photoUrl,
      is_ephemeral_photo: false,
      expires_at: null,
      is_expired: false,
      timestamp: timeStr,
      created_at: now,
      isLoveNote: caption.includes('❤️') || caption.includes('💖'),
    };

    try {
      const messages = getMessagesFromFile();
      messages.push(newMessage);
      saveMessagesToFile(messages);
    } catch {}

    // Save to Supabase table if available
    if (supabase) {
      try {
        await supabase.from('messages').insert([{
          id: newMessage.id,
          sender: newMessage.sender,
          text: newMessage.text,
          photo_url: newMessage.photo_url,
          is_ephemeral_photo: false,
          expires_at: null,
          is_expired: false,
          timestamp: newMessage.timestamp,
          created_at: newMessage.created_at,
          is_love_note: newMessage.isLoveNote,
        }]);
      } catch (err) {
        console.warn('Failed to insert message into Supabase:', err);
      }
    }

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to upload chat photo:', error);
    return NextResponse.json({ error: error.message || 'Photo upload failed' }, { status: 500 });
  }
}
