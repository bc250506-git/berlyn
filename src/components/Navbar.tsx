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
  LayoutDashboard,
  UserCheck,
  ChevronDown,
  X
} from 'lucide-react';
import { useCurrentUser } from './UserContext';
import { DualZoneWidget } from './DualZoneWidget';
import { USERS, CoupleUser } from '@/types';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, profile, partnerProfile, switchUser } = useCurrentUser();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [selectedSwitchUser, setSelectedSwitchUser] = useState<CoupleUser | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const navLinks = [
    { href: '/', label: 'Sanctuary', icon: LayoutDashboard },
    { href: '/media', label: 'Watchlist', icon: Film },
    { href: '/quizzes', label: 'Quizzes & Polls', icon: HelpCircle },
    { href: '/finance', label: 'Finance Hub', icon: Wallet },
    { href: '/travel', label: 'Travel & Visas', icon: Compass },
    { href: '/agenda', label: 'Bucket & Agenda', icon: CheckSquare },
    { href: '/penalty', label: 'Penalty Jar', icon: PiggyBank },
  ];

  const handleSwitchSubmit = async () => {
    if (!selectedSwitchUser) return;
    const ok = await switchUser(selectedSwitchUser, pinInput);
    if (ok) {
      setShowSwitchModal(false);
      setPinInput('');
      setSelectedSwitchUser(null);
      setErrorMsg('');
    } else {
      setErrorMsg('Incorrect PIN / Passphrase');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 bg-[#090d16]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 p-0.5 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-500/20 group-hover:fill-rose-500 transition-colors" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                  Berlyn
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-normal">
                    Our Space
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                  Berk & Jaquilyn Sanctuary
                </p>
              </div>
            </Link>

            {/* Middle: Dual-Zone Widget */}
            <div className="hidden lg:block">
              <DualZoneWidget />
            </div>

            {/* Right: Active User Profile & Switcher */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedSwitchUser(currentUser === 'berk' ? 'jaquilyn' : 'berk');
                  setShowSwitchModal(true);
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#111726] border border-white/10 hover:border-rose-500/40 hover:bg-[#182030] transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center text-lg">
                  {profile?.avatar || '❤️'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-white flex items-center gap-1">
                    {profile?.name || 'Select User'}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {profile?.city || 'Click to switch'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Navigation Links Bar */}
          <nav className="flex items-center space-x-1 sm:space-x-2 py-2 overflow-x-auto scrollbar-none border-t border-white/5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Switch User Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#111726] border border-white/10 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => {
                setShowSwitchModal(false);
                setErrorMsg('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-rose-400" />
              Switch Couple Profile
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Choose who is using the app right now so all reviews, notes, and quiz answers are saved with your name.
            </p>

            {/* Profile Selection */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {(['berk', 'jaquilyn'] as CoupleUser[]).map((u) => {
                const isSelected = selectedSwitchUser === u;
                const usr = USERS[u];
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setSelectedSwitchUser(u);
                      setErrorMsg('');
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 text-white shadow-lg shadow-rose-500/10'
                        : 'border-white/10 bg-[#0c121e] text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <div className="text-3xl mb-2">{usr.avatar}</div>
                    <div className="font-semibold text-sm">{usr.name}</div>
                    <div className="text-[11px] text-slate-400">{usr.location}</div>
                  </button>
                );
              })}
            </div>

            {/* Passphrase / PIN optional input */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                PIN / Passphrase (Optional for Quick Access)
              </label>
              <input
                type="password"
                placeholder={selectedSwitchUser === 'berk' ? 'berk123' : 'jaquilyn123'}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d16] border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors"
              />
              {errorMsg && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">{errorMsg}</p>
              )}
            </div>

            <button
              onClick={handleSwitchSubmit}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-semibold text-sm shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              Continue as {selectedSwitchUser ? USERS[selectedSwitchUser].name : 'User'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
