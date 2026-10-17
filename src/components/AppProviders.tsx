'use client';

import React from 'react';
import { UserProvider } from './UserContext';
import { Navbar } from './Navbar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          <p>
            Berlyn — Built with ❤️ for Berk & Jaquilyn • Kyrenia & Bulacan
          </p>
        </footer>
      </div>
    </UserProvider>
  );
}
