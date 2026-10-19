'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentUser } from './UserContext';
import { 
  CoupleNotification, 
  GLOBAL_NOTIFICATIONS_CHANNEL 
} from '@/lib/notifications';
import { playNotificationChime } from '@/lib/sound-effects';
import { createClient } from '@supabase/supabase-js';
import { 
  MessageCircle, 
  Calendar, 
  PiggyBank, 
  StickyNote, 
  Sparkles, 
  Heart,
  X 
} from 'lucide-react';

interface NotificationContextType {
  activeNotifications: CoupleNotification[];
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  activeNotifications: [],
  dismissNotification: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const DEFAULT_SUPABASE_URL = 'https://chwvmpmitbyugyiqtrvd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3ZtcG1pdGJ5dWd5aXF0cnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDg3NjksImV4cCI6MjEwNzc4NDc2OX0.TPD1w8q-koj61A1iI_AT30mKWgUjjokX6wTLPhCIBvA';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<CoupleNotification[]>([]);
  const { currentUser } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleIncomingNotification = useCallback((notif: CoupleNotification) => {
    // 1. Ignore actions initiated by oneself
    if (notif.sender === currentUser) return;

    // 2. If it's a chat message and user is actively on /messages, don't show top banner
    if (notif.type === 'message' && pathname === '/messages') return;

    // 3. Play auditory couple chime
    playNotificationChime();

    // 4. Add to active toasts (limit max 2 simultaneously)
    setNotifications((prev) => [notif, ...prev.slice(0, 1)]);

    // 5. Auto dismiss after 5.5 seconds
    setTimeout(() => {
      dismissNotification(notif.id);
    }, 5500);
  }, [currentUser, pathname, dismissNotification]);

  // Subscribe to Supabase Realtime Activity Channel
  useEffect(() => {
    let channel: any = null;
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
      const supabase = createClient(url, key);

      channel = supabase.channel(GLOBAL_NOTIFICATIONS_CHANNEL, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'new_activity' }, ({ payload }: { payload: CoupleNotification }) => {
          if (payload) {
            handleIncomingNotification(payload);
          }
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime notifications connection error:', err);
    }

    // Also listen to local window events
    const handleLocalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CoupleNotification>;
      if (customEvent.detail) {
        handleIncomingNotification(customEvent.detail);
      }
    };
    window.addEventListener('berlyn_local_notif', handleLocalEvent);

    return () => {
      if (channel) {
        try {
          channel.unsubscribe();
        } catch {}
      }
      window.removeEventListener('berlyn_local_notif', handleLocalEvent);
    };
  }, [handleIncomingNotification]);

  const getIcon = (type: CoupleNotification['type']) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-4 h-4 text-rose-400" />;
      case 'agenda':
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case 'penalty':
        return <PiggyBank className="w-4 h-4 text-amber-400" />;
      case 'note':
        return <StickyNote className="w-4 h-4 text-yellow-300" />;
      case 'quiz':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'bucket':
        return <Heart className="w-4 h-4 text-pink-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-rose-400" />;
    }
  };

  const getBadgeColor = (type: CoupleNotification['type']) => {
    switch (type) {
      case 'message':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
      case 'agenda':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
      case 'penalty':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
      case 'note':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
      case 'quiz':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
      case 'bucket':
        return 'border-pink-500/30 bg-pink-500/10 text-pink-300';
      default:
        return 'border-white/20 bg-white/10 text-white';
    }
  };

  return (
    <NotificationContext.Provider value={{ activeNotifications: notifications, dismissNotification }}>
      {children}

      {/* Floating Notification Toast Container (Top Centered) */}
      <div className="fixed top-3 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-3 space-y-2">
        {notifications.map((notif) => {
          const isJaq = notif.sender === 'jaquilyn';
          const senderName = isJaq ? 'Jaquilyn' : 'Berk';
          const senderAvatar = isJaq ? '🌸' : '🦁';

          return (
            <div
              key={notif.id}
              onClick={() => {
                if (notif.link) {
                  router.push(notif.link);
                  dismissNotification(notif.id);
                }
              }}
              className="pointer-events-auto w-full max-w-sm rounded-2xl bg-[#141b28]/95 backdrop-blur-xl border border-white/[0.14] p-3 shadow-2xl shadow-black/80 flex items-start gap-3 cursor-pointer hover:border-white/25 transition-all animate-bounce-subtle"
            >
              {/* Type Icon Badge */}
              <div className={`p-2 rounded-xl border shrink-0 ${getBadgeColor(notif.type)}`}>
                {getIcon(notif.type)}
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                  <span>{senderAvatar}</span>
                  <span>{senderName}</span>
                  <span className="text-slate-400 font-normal">• Just now</span>
                </div>
                <p className="text-xs font-medium text-slate-100 truncate mt-0.5">
                  {notif.title}
                </p>
                {notif.subtitle && (
                  <p className="text-[11px] text-slate-400 truncate">
                    {notif.subtitle}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotification(notif.id);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.1] transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}
