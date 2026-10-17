'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CoupleUser, USERS, UserProfile } from '@/types';
import { LoginScreen } from './LoginScreen';

interface UserContextType {
  currentUser: CoupleUser;
  profile: UserProfile;
  partnerProfile: UserProfile;
  isAuthenticated: boolean;
  login: (password: string, user?: CoupleUser) => Promise<boolean>;
  logout: () => Promise<void>;
  switchUser: (user: CoupleUser) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CoupleUser>('berk');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check saved session in cookie or localStorage
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && (data.user === 'berk' || data.user === 'jaquilyn')) {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
        } else {
          const isAuthed = localStorage.getItem('berlyn_authenticated') === 'true';
          const saved = localStorage.getItem('berlyn_active_user') as CoupleUser;
          if (isAuthed && (saved === 'berk' || saved === 'jaquilyn')) {
            setCurrentUser(saved);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      })
      .catch(() => {
        const isAuthed = localStorage.getItem('berlyn_authenticated') === 'true';
        const saved = localStorage.getItem('berlyn_active_user') as CoupleUser;
        if (isAuthed && (saved === 'berk' || saved === 'jaquilyn')) {
          setCurrentUser(saved);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
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
        setIsAuthenticated(true);
        localStorage.setItem('berlyn_active_user', data.user);
        localStorage.setItem('berlyn_authenticated', 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Global heartbeat: updates user presence across the site
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const sendHeartbeat = () => {
      try {
        fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: currentUser }),
          keepalive: true,
        }).catch(() => {});
      } catch (e) {
        // ignore
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  const switchUser = (user: CoupleUser) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('berlyn_active_user', user);
    }
  };

  const logout = async () => {
    try {
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentUser, offline: true }),
        keepalive: true,
      }).catch(() => {});
      await fetch('/api/auth/me', { method: 'POST' });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    localStorage.removeItem('berlyn_active_user');
    localStorage.removeItem('berlyn_authenticated');
  };

  const profile = USERS[currentUser] || USERS.berk;
  const partnerProfile = currentUser === 'berk' ? USERS.jaquilyn : USERS.berk;

  return (
    <UserContext.Provider
      value={{
        currentUser,
        profile,
        partnerProfile,
        isAuthenticated: !!isAuthenticated,
        login,
        logout,
        switchUser,
      }}
    >
      {isAuthenticated === false ? (
        <LoginScreen />
      ) : isAuthenticated === null ? (
        <div className="fixed inset-0 bg-[#0a0e17] flex items-center justify-center">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg animate-pulse">
            <span className="text-white text-lg">❤️</span>
          </div>
        </div>
      ) : (
        children
      )}
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
