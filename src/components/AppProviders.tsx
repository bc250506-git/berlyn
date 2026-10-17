'use client';

import React from 'react';
import { UserProvider } from './UserContext';
import { Navbar } from './Navbar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="flex flex-col min-h-screen bg-[#0b0f17] text-slate-100 antialiased selection:bg-rose-500 selection:text-white">
        <Navbar />
        {/* Mobile-centric container: max-w-md keeps everything thumb-friendly and organized */}
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 pb-28">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
