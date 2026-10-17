'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Heart, 
  Film, 
  HelpCircle, 
  Wallet, 
  Compass, 
  CheckSquare, 
  PiggyBank, 
  Home,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useCurrentUser } from './UserContext';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, profile, logout } = useCurrentUser();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Bottom primary tabs
  const mainTabs = [
    { href: '/', label: 'Evimiz', icon: Home },
    { href: '/media', label: 'Film & Dizi', icon: Film },
    { href: '/quizzes', label: 'Quiz & Soru', icon: HelpCircle },
    { href: '/finance', label: 'Finans', icon: Wallet },
  ];

  // Secondary tabs inside "Diğer"
  const secondaryTabs = [
    { href: '/travel', label: 'TR & PH Vize & Geziler', icon: Compass, desc: 'Ortak vizesiz ülkeler ve tatil rotaları' },
    { href: '/agenda', label: 'Ajanda & Bucket List', icon: CheckSquare, desc: 'Hayat hedefleri ve hatıra fotoğrafları' },
    { href: '/penalty', label: 'Ceza & Küfür Kumbarası', icon: PiggyBank, desc: 'Biriken fon ve akşam yemeği ödülü' },
  ];

  return (
    <>
      {/* 1. Top Minimal Bar - Clean & Distraction-Free */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-md mx-auto px-4 h-13 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-sm">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">Berlyn</span>
              <span className="text-[10px] text-rose-400 font-medium">• Bizim Evimiz</span>
            </div>
          </Link>

          {/* Simple greeting indicator with subtle logout */}
          {profile && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-sm">{profile.avatar}</span>
              <span className="font-medium text-slate-300">{profile.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Mobile-First Bottom Navigation Bar (Fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d121c]/95 backdrop-blur-lg border-t border-white/[0.08] pb-[env(safe-area-inset-bottom,8px)]">
        <div className="max-w-md mx-auto px-3 py-1 flex items-center justify-around">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-rose-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.7]'}`} />
                <span className="text-[10px] tracking-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* "Diğer" tab */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              secondaryTabs.some(t => t.href === pathname)
                ? 'text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5 mb-0.5 stroke-[1.7]" />
            <span className="text-[10px] tracking-tight">Diğer</span>
          </button>
        </div>
      </nav>

      {/* 3. "Diğer" Drawer (Bottom Sheet) */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-rose-400" />
                Diğer Yaşam Alanlarımız
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {secondaryTabs.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#161e2c] border border-white/[0.06] hover:border-rose-500/30 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-rose-300">
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
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
