import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const MESSAGES_FILE = path.join(process.cwd(), 'src', 'lib', 'messages.json');
const CHAT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'chat');

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
    console.error('Failed to save messages:', err);
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST: upload ephemeral photo with HEIC -> WebP conversion
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
    const webpBuffer = await sharp(inputBuffer)
      .rotate()
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const fileName = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.webp`;
    let photoUrl = `/uploads/chat/${fileName}`;

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
        console.warn('Supabase storage upload failed, saving to local folder:', err);
      }
    }

    // Local fallback save
    if (photoUrl.startsWith('/uploads/chat/')) {
      if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
        fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(CHAT_UPLOAD_DIR, fileName), webpBuffer);
    }

    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const expiresAt = now + twelveHoursMs;

    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage = {
      id: `msg-${now}-${Math.random().toString(36).substring(2, 7)}`,
      sender: sender === 'jaquilyn' ? 'jaquilyn' : 'berk',
      text: caption.trim() || '📷 Süreli Fotoğraf',
      photo_url: photoUrl,
      is_ephemeral_photo: true,
      expires_at: expiresAt,
      is_expired: false,
      timestamp: timeStr,
      created_at: now,
      isLoveNote: caption.includes('❤️') || caption.includes('💖'),
    };

    const messages = getMessagesFromFile();
    messages.push(newMessage);
    saveMessagesToFile(messages);

    // Save to Supabase table if available
    if (supabase) {
      try {
        await supabase.from('messages').insert([{
          id: newMessage.id,
          sender: newMessage.sender,
          text: newMessage.text,
          photo_url: newMessage.photo_url,
          is_ephemeral_photo: true,
          expires_at: newMessage.expires_at,
          is_expired: false,
          timestamp: newMessage.timestamp,
          created_at: newMessage.created_at,
          is_love_note: newMessage.isLoveNote,
        }]);
      } catch (err) {}
    }

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to upload chat photo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
