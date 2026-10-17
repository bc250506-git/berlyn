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
  UserCheck,
  X,
  Menu,
  ChevronRight
} from 'lucide-react';
import { useCurrentUser } from './UserContext';
import { USERS, CoupleUser } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, profile, switchUser } = useCurrentUser();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedSwitchUser, setSelectedSwitchUser] = useState<CoupleUser | null>(null);

  // Bottom primary tabs
  const mainTabs = [
    { href: '/', label: 'Evimiz', icon: Home },
    { href: '/media', label: 'Film & Dizi', icon: Film },
    { href: '/quizzes', label: 'Quiz & Soru', icon: HelpCircle },
    { href: '/finance', label: 'Finans', icon: Wallet },
  ];

  // Secondary tabs inside "More"
  const secondaryTabs = [
    { href: '/travel', label: 'TR & PH Vize & Geziler', icon: Compass, desc: 'Ortak vizesiz ülkeler ve tatil rotaları' },
    { href: '/agenda', label: 'Ajanda & Bucket List', icon: CheckSquare, desc: 'Hayat hedefleri ve hatıra fotoğrafları' },
    { href: '/penalty', label: 'Ceza & Küfür Kumbarası', icon: PiggyBank, desc: 'Biriken fon ve akşam yemeği ödülü' },
  ];

  const handleSwitchSubmit = async () => {
    if (!selectedSwitchUser) return;
    await switchUser(selectedSwitchUser, pinInput);
    setShowSwitchModal(false);
    setPinInput('');
  };

  return (
    <>
      {/* 1. Top Minimal Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/95 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-sm">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">Berlyn</span>
              <span className="text-[10px] text-rose-400/90 font-medium ml-1.5">• Bizim Evimiz</span>
            </div>
          </Link>

          {/* Profile Switcher & More Trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedSwitchUser(currentUser === 'berk' ? 'jaquilyn' : 'berk');
                setShowSwitchModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#161e2c] border border-white/[0.08] hover:border-white/20 transition-all text-xs cursor-pointer"
            >
              <span className="text-sm">{profile?.avatar || '❤️'}</span>
              <span className="font-medium text-slate-200 text-xs">{profile?.name || 'Giriş'}</span>
            </button>

            <button
              onClick={() => setShowMoreMenu(true)}
              className="p-1.5 rounded-xl bg-[#161e2c] border border-white/[0.08] text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Menü"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
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

          {/* More trigger tab */}
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

      {/* 3. More Menu Drawer (Bottom Sheet) */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
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
          </div>
        </div>
      )}

      {/* 4. Switch User Modal (Tactile & Clean) */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121824] border-t sm:border border-white/[0.1] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-rose-400" />
                Kim Kullanıyor?
              </h3>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Yaptığın yorumlar, notlar ve quiz cevapları kendi adınla kaydedilir.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['berk', 'jaquilyn'] as CoupleUser[]).map((u) => {
                const isSelected = selectedSwitchUser === u;
                const usr = USERS[u];
                return (
                  <button
                    key={u}
                    onClick={() => setSelectedSwitchUser(u)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/15 text-white'
                        : 'border-white/[0.08] bg-[#161e2c] text-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{usr.avatar}</div>
                    <div className="font-semibold text-xs">{usr.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{usr.city}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSwitchSubmit}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              {selectedSwitchUser ? USERS[selectedSwitchUser].name : 'Devam Et'} Olarak Geç
            </button>
          </div>
        </div>
      )}
    </>
  );
}
