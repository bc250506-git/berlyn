import { createClient } from '@supabase/supabase-js';

export type NotificationType = 'message' | 'agenda' | 'penalty' | 'note' | 'quiz' | 'bucket';

export interface CoupleNotification {
  id: string;
  type: NotificationType;
  sender: 'berk' | 'jaquilyn';
  title: string;
  subtitle?: string;
  link?: string;
  timestamp: number;
}

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

export const GLOBAL_NOTIFICATIONS_CHANNEL = 'berlyn_couple_global_activity';

let broadcastClient: any = null;
let broadcastChannel: any = null;

function getBroadcastChannel() {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      broadcastClient = createClient(url, key);
      broadcastChannel = broadcastClient.channel(GLOBAL_NOTIFICATIONS_CHANNEL, {
        config: { broadcast: { self: false } },
      });
      broadcastChannel.subscribe();
    } catch (e) {
      console.warn('Failed to initialize broadcast channel:', e);
    }
  }
  return broadcastChannel;
}

/**
 * Broadcast a new activity notification to partner across devices
 */
export function broadcastCoupleNotification(notif: Omit<CoupleNotification, 'id' | 'timestamp'>) {
  const fullNotif: CoupleNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };

  // 1. Dispatch custom event locally
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('berlyn_local_notif', { detail: fullNotif }));
  }

  // 2. Broadcast via Supabase Realtime
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'new_activity',
        payload: fullNotif,
      });
    }
  } catch (err) {
    console.warn('Notification broadcast error:', err);
  }
}
