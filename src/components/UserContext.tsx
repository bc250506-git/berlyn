'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CoupleUser, USERS, UserProfile } from '@/types';

interface UserContextType {
  currentUser: CoupleUser;
  profile: UserProfile;
  partnerProfile: UserProfile;
  login: (password: string, user?: CoupleUser) => Promise<boolean>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Default to 'berk' so the app renders immediately without any blocking screen
  const [currentUser, setCurrentUser] = useState<CoupleUser>('berk');

  useEffect(() => {
    // Check saved session in cookie or localStorage
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
    setCurrentUser('berk');
    localStorage.removeItem('berlyn_active_user');
  };

  const profile = USERS[currentUser] || USERS.berk;
  const partnerProfile = currentUser === 'berk' ? USERS.jaquilyn : USERS.berk;

  // Children is ALWAYS rendered immediately, eliminating any blocking loading screens
  return (
    <UserContext.Provider
      value={{
        currentUser,
        profile,
        partnerProfile,
        login,
        logout,
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
