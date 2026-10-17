'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CoupleUser, USERS, UserProfile } from '@/types';
import { Lock, Heart } from 'lucide-react';

interface UserContextType {
  currentUser: CoupleUser | null;
  profile: UserProfile | null;
  partnerProfile: UserProfile | null;
  login: (password: string, user?: CoupleUser) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CoupleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Login form state inside gate
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<CoupleUser | ''>('');
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && (data.user === 'berk' || data.user === 'jaquilyn')) {
          setCurrentUser(data.user);
        } else {
          const saved = localStorage.getItem('berlyn_active_user') as CoupleUser;
          if (saved === 'berk' || saved === 'jaquilyn') {
            setCurrentUser(saved);
          }
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('berlyn_active_user') as CoupleUser;
        if (saved === 'berk' || saved === 'jaquilyn') {
          setCurrentUser(saved);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (password: string, user?: CoupleUser): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, user }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('berlyn_active_user', data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
    } catch {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem('berlyn_active_user');
  };

  const handleGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setSubmitting(true);
    setLoginError('');

    const ok = await login(passwordInput, selectedUser || undefined);
    setSubmitting(false);

    if (!ok) {
      setLoginError('Şifre hatalı. Lütfen tekrar deneyin.');
    }
  };

  const profile = currentUser ? USERS[currentUser] : null;
  const partnerProfile = currentUser
    ? currentUser === 'berk'
      ? USERS.jaquilyn
      : USERS.berk
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center">
        <Heart className="w-6 h-6 text-rose-500 fill-rose-500 animate-pulse" />
      </div>
    );
  }

  // If not logged in, show dedicated intimate login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center px-4">
        <div className="w-full max-w-sm card-cozy p-6 space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Heart className="w-6 h-6 fill-rose-500" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Berlyn</h1>
            <p className="text-xs text-slate-400 mt-1">
              Özel dijital yuvamıza hoş geldin. Devam etmek için şifreni gir.
            </p>
          </div>

          <form onSubmit={handleGateLogin} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Kimsin?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser('berk')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    selectedUser === 'berk'
                      ? 'bg-rose-500/20 border-rose-500 text-white'
                      : 'bg-[#161e2c] border-white/[0.08] text-slate-400'
                  }`}
                >
                  🦁 Berk
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUser('jaquilyn')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    selectedUser === 'jaquilyn'
                      ? 'bg-rose-500/20 border-rose-500 text-white'
                      : 'bg-[#161e2c] border-white/[0.08] text-slate-400'
                  }`}
                >
                  🌸 Jaquilyn
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Şifren</label>
              <input
                type="password"
                required
                placeholder="Şifreni gir..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1420] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {loginError && (
              <p className="text-[11px] text-rose-400 font-medium">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Giriş yapılıyor...' : 'Yuvamıza Giriş Yap ❤️'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{
        currentUser,
        profile,
        partnerProfile,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
}
