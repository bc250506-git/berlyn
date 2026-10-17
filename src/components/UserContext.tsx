'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CoupleUser, USERS, UserProfile } from '@/types';

interface UserContextType {
  currentUser: CoupleUser | null;
  profile: UserProfile | null;
  partnerProfile: UserProfile | null;
  switchUser: (user: CoupleUser, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CoupleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session on mount
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && (data.user === 'berk' || data.user === 'jaquilyn')) {
          setCurrentUser(data.user);
        } else {
          // If no active session, check localStorage fallback or default to null
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

  const switchUser = async (user: CoupleUser, password?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, password: password || (user === 'berk' ? 'berk123' : 'jaquilyn123') }),
      });
      if (res.ok) {
        setCurrentUser(user);
        localStorage.setItem('berlyn_active_user', user);
        return true;
      }
      return false;
    } catch {
      // Local fallback
      setCurrentUser(user);
      localStorage.setItem('berlyn_active_user', user);
      return true;
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

  const profile = currentUser ? USERS[currentUser] : null;
  const partnerProfile = currentUser
    ? currentUser === 'berk'
      ? USERS.jaquilyn
      : USERS.berk
    : null;

  return (
    <UserContext.Provider
      value={{
        currentUser,
        profile,
        partnerProfile,
        switchUser,
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
