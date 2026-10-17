import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRESENCE_FILE = path.join(process.cwd(), 'src', 'lib', 'presence.json');

export interface UserPresenceData {
  last_seen_in_app: number;
  last_seen_in_chat: number;
  is_in_chat: boolean;
  is_typing: boolean;
  typing_updated_at: number;
  last_seen_message_id: string | null;
  last_seen_message_at: number | null;
}

export type PresenceStore = Record<'berk' | 'jaquilyn', UserPresenceData>;

const DEFAULT_PRESENCE: PresenceStore = {
  berk: {
    last_seen_in_app: Date.now(),
    last_seen_in_chat: Date.now(),
    is_in_chat: true,
    is_typing: false,
    typing_updated_at: 0,
    last_seen_message_id: null,
    last_seen_message_at: null
  },
  jaquilyn: {
    last_seen_in_app: 0,
    last_seen_in_chat: 0,
    is_in_chat: false,
    is_typing: false,
    typing_updated_at: 0,
    last_seen_message_id: null,
    last_seen_message_at: null
  }
};

function getPresenceFromFile(): PresenceStore {
  try {
    if (!fs.existsSync(PRESENCE_FILE)) {
      fs.writeFileSync(PRESENCE_FILE, JSON.stringify(DEFAULT_PRESENCE, null, 2), 'utf8');
      return DEFAULT_PRESENCE;
    }
    const data = fs.readFileSync(PRESENCE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return DEFAULT_PRESENCE;
  }
}

function savePresenceToFile(presence: PresenceStore) {
  try {
    fs.writeFileSync(PRESENCE_FILE, JSON.stringify(presence, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save presence file:', err);
  }
}

// Compute active status based on server timestamps
function computeComputedPresence(presence: PresenceStore) {
  const now = Date.now();
  const result: Record<string, any> = {};

  for (const user of ['berk', 'jaquilyn'] as const) {
    const data = presence[user] || DEFAULT_PRESENCE[user];
    
    // Online in system if heartbeat was in the last 35 seconds
    const isOnline = (now - data.last_seen_in_app) < 35000;
    
    // In chat if online, flagged as in chat, and last chat ping was in the last 18 seconds
    const isInChat = isOnline && data.is_in_chat && (now - data.last_seen_in_chat) < 18000;
    
    // Typing if in chat and typing ping was within the last 5 seconds
    const isTyping = isInChat && data.is_typing && (now - data.typing_updated_at) < 5500;

    result[user] = {
      ...data,
      is_online: isOnline,
      is_in_chat: isInChat,
      is_typing: isTyping,
      now
    };
  }

  return result;
}

// GET: fetch presence for both users
export async function GET() {
  try {
    const presence = getPresenceFromFile();
    const computed = computeComputedPresence(presence);
    return NextResponse.json({ presence: computed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST: update presence for a user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user, in_chat, is_typing, last_seen_message_id, offline } = body;

    if (!user || (user !== 'berk' && user !== 'jaquilyn')) {
      return NextResponse.json({ error: 'Valid user is required' }, { status: 400 });
    }

    const presence = getPresenceFromFile();
    const current = presence[user as 'berk' | 'jaquilyn'] || { ...DEFAULT_PRESENCE[user as 'berk' | 'jaquilyn'] };
    const now = Date.now();

    if (offline) {
      current.last_seen_in_app = 0;
      current.is_in_chat = false;
      current.is_typing = false;
    } else {
      current.last_seen_in_app = now;
      
      if (typeof in_chat === 'boolean') {
        current.is_in_chat = in_chat;
        if (in_chat) {
          current.last_seen_in_chat = now;
        }
      }

      if (typeof is_typing === 'boolean') {
        current.is_typing = is_typing;
        if (is_typing) {
          current.typing_updated_at = now;
        }
      }

      if (last_seen_message_id) {
        current.last_seen_message_id = last_seen_message_id;
        current.last_seen_message_at = now;
      }
    }

    presence[user as 'berk' | 'jaquilyn'] = current;
    savePresenceToFile(presence);

    // Sync to Supabase partner_presence table
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('partner_presence').upsert({
          user_id: user,
          is_online: !offline,
          is_in_chat: current.is_in_chat,
          is_typing: current.is_typing,
          last_seen_message_id: current.last_seen_message_id,
          last_seen_message_at: current.last_seen_message_at,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        // non-blocking fallback
      }
    }

    const computed = computeComputedPresence(presence);
    return NextResponse.json({ success: true, presence: computed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
