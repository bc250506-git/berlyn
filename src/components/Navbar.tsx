'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Heart, 
  Film, 
  HelpCircle, 
  Wallet, 
  Compass, 
  CalendarDays, 
  PiggyBank, 
  Home,
  MessageCircle,
  LayoutGrid,
  X,
  ChevronRight,
  LogOut,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useCurrentUser } from './UserContext';
import { isSoundMuted, toggleSoundMuted, playPop } from '@/lib/sound-effects';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, profile, logout } = useCurrentUser();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [muted, setMuted] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Unread messages tracking
  const checkUnreadMessages = useCallback(async () => {
    if (!currentUser) return;
    if (pathname === '/messages') {
      setUnreadCount(0);
      localStorage.setItem(`berlyn_${currentUser}_last_seen_msg_time`, Date.now().toString());
      return;
    }

    try {
      const res = await fetch('/api/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const messages: any[] = Array.isArray(data) ? data : (data.messages || []);

      const lastSeenStr = localStorage.getItem(`berlyn_${currentUser}_last_seen_msg_time`);
      const lastSeenTime = lastSeenStr ? Number(lastSeenStr) : 0;

      const partner = currentUser === 'berk' ? 'jaquilyn' : 'berk';
      const unread = messages.filter((m: any) => {
        const mTime = Number(m.created_at) || 0;
        return m.sender === partner && mTime > lastSeenTime;
      }).length;

      setUnreadCount(unread);
    } catch {
      // silent
    }
  }, [currentUser, pathname]);

  useEffect(() => {
    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 12000);

    const handleLocalNotif = (e: any) => {
      const detail = e.detail;
      if (detail && detail.type === 'message' && pathname !== '/messages') {
        setUnreadCount((prev) => prev + 1);
      }
    };
    window.addEventListener('berlyn_local_notif', handleLocalNotif);
    window.addEventListener('berlyn_msg_read', checkUnreadMessages);

    return () => {
      clearInterval(interval);
      window.removeEventListener('berlyn_local_notif', handleLocalNotif);
      window.removeEventListener('berlyn_msg_read', checkUnreadMessages);
    };
  }, [checkUnreadMessages, pathname]);

  useEffect(() => {
    setMuted(isSoundMuted());
    const handleMuteChange = () => setMuted(isSoundMuted());
    window.addEventListener('sound_mute_changed', handleMuteChange);
    return () => window.removeEventListener('sound_mute_changed', handleMuteChange);
  }, []);

  // Position 1: Messages
  // Position 2: Agenda
  // Position 3: Home (Center, Elevated & Featured)
  // Position 4: Finance
  // Position 5: More Drawer

  // Secondary items inside "More" Drawer
  const secondaryTabs = [
    { 
      href: '/media', 
      label: 'Watchlist (Movies & Series)', 
      icon: Film, 
      desc: 'Shared movie & show watchlist for cozy nights' 
    },
    { 
      href: '/quizzes', 
      label: 'Quizzes & Questions', 
      icon: HelpCircle, 
      desc: 'Fun blind questions & couple compatibility trivia' 
    },
    { 
      href: '/bucket-list', 
      label: 'Lifetime Bucket List', 
      icon: Sparkles, 
      desc: '100 dreams & milestones to achieve before we die' 
    },
    { 
      href: '/penalty', 
      label: 'Penalty & Swear Jar', 
      icon: PiggyBank, 
      desc: 'Fun fine pool for luxury date nights' 
    },
    { 
      href: '/travel', 
      label: 'Travel & Visa Matcher', 
      icon: Compass, 
      desc: 'Dual TR & PH passport visa-free destinations' 
    },
  ];

  const isHome = pathname === '/';
  const isMoreActive = secondaryTabs.some(t => t.href === pathname);

  return (
    <>
      {/* 1. Top Minimal Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-md mx-auto px-4 h-13 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-sm">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">Berlyn</span>
              <span className="text-[10px] text-rose-400 font-medium">• Our Home</span>
            </div>
          </Link>

          {/* Sound Mute Toggle & Active user indicator & Lock / Switch button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = toggleSoundMuted();
                setMuted(next);
                if (!next) playPop();
              }}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                muted 
                  ? 'text-slate-500 bg-white/[0.02] border-white/[0.05] hover:text-slate-300' 
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20 shadow-xs'
              }`}
              title={muted ? 'Sound Effects Muted (Tap to Enable)' : 'Sound Effects Active (Tap to Mute)'}
              aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {profile && (
              <>
                <div className="flex items-center gap-1.5 text-xs bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full">
                  <span className="text-sm">{profile.avatar}</span>
                  <span className="font-semibold text-slate-200">{profile.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Lock session & Switch User"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Mobile-First Bottom Navigation Bar (Fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d121c]/95 backdrop-blur-lg border-t border-white/[0.08] pb-[env(safe-area-inset-bottom,8px)]">
        <div className="max-w-md mx-auto px-2 py-1 flex items-end justify-between">
          
          {/* 1. Messages */}
          <Link
            href="/messages"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer min-w-[58px] ${
              pathname === '/messages'
                ? 'text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MessageCircle className={`w-5 h-5 mb-0.5 ${pathname === '/messages' ? 'stroke-[2.3]' : 'stroke-[1.7]'}`} />
              {unreadCount > 0 && pathname !== '/messages' && (
                <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[17px] h-[17px] rounded-full bg-rose-600 text-white text-[9.5px] font-bold flex items-center justify-center shadow-lg shadow-rose-600/50 animate-pulse border-2 border-[#0d121c] leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Messages</span>
          </Link>

          {/* 2. Agenda */}
          <Link
            href="/agenda"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer min-w-[58px] ${
              pathname === '/agenda'
                ? 'text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarDays className={`w-5 h-5 mb-0.5 ${pathname === '/agenda' ? 'stroke-[2.3]' : 'stroke-[1.7]'}`} />
            <span className="text-[10px] tracking-tight">Agenda</span>
          </Link>

          {/* 3. Center Home Button (Elevated, Larger & Distinct) */}
          <Link
            href="/"
            className="flex flex-col items-center justify-center cursor-pointer -mt-5 px-1 min-w-[68px] group"
          >
            <div
              className={`w-13 h-13 rounded-2xl p-[2px] transition-all duration-300 ring-4 ring-[#0d121c] shadow-lg group-hover:scale-105 active:scale-95 flex items-center justify-center ${
                isHome
                  ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 shadow-rose-500/40'
                  : 'bg-gradient-to-tr from-white/20 via-white/10 to-rose-500/30 group-hover:from-rose-500 group-hover:to-amber-500'
              }`}
            >
              <div
                className={`w-full h-full rounded-[14px] flex items-center justify-center transition-colors ${
                  isHome
                    ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white'
                    : 'bg-[#121824] group-hover:bg-[#161f2e] text-slate-300 group-hover:text-white'
                }`}
              >
                <Home className={`w-6 h-6 ${isHome ? 'stroke-[2.4] text-white' : 'stroke-[1.8]'}`} />
              </div>
            </div>
            <span
              className={`text-[10px] tracking-tight font-bold mt-0.5 transition-colors ${
                isHome ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
              }`}
            >
              Home
            </span>
          </Link>

          {/* 4. Finance */}
          <Link
            href="/finance"
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer min-w-[58px] ${
              pathname === '/finance'
                ? 'text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className={`w-5 h-5 mb-0.5 ${pathname === '/finance' ? 'stroke-[2.3]' : 'stroke-[1.7]'}`} />
            <span className="text-[10px] tracking-tight">Finance</span>
          </Link>

          {/* 5. More */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all cursor-pointer min-w-[58px] ${
              isMoreActive
                ? 'text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className={`w-5 h-5 mb-0.5 ${isMoreActive ? 'stroke-[2.3]' : 'stroke-[1.7]'}`} />
            <span className="text-[10px] tracking-tight">More</span>
          </button>

        </div>
      </nav>

      {/* 3. "More" Drawer (Bottom Sheet) */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between p-5 pb-3.5 border-b border-white/[0.08] bg-[#121824] shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-rose-400" />
                More Spaces
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 pt-3.5 overflow-y-auto flex-1">

            <div className="space-y-2 mb-4">
              {secondaryTabs.map((item) => {
                const Icon = item.icon;
                const isSelected = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left group ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : 'bg-[#161e2c] border-white/[0.06] hover:border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        isSelected 
                          ? 'bg-rose-500 text-white border-rose-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${isSelected ? 'text-rose-300' : 'text-white group-hover:text-rose-300'}`}>
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </Link>
                );
              })}
            </div>

            {/* Logout button */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  logout();
                  setShowMoreMenu(false);
                }}
                className="w-full py-2.5 rounded-xl bg-[#161e2c] hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
