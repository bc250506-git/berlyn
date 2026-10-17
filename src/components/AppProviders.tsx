'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from './UserContext';
import { Navbar } from './Navbar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === '/messages';

  return (
    <UserProvider>
      <div className={`flex flex-col bg-[#0b0f17] text-slate-100 antialiased selection:bg-rose-500 selection:text-white ${
        isChat ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}>
        <Navbar />
        {/* Mobile-centric container: full screen vertical height on chat, padded on other pages */}
        <main 
          style={isChat ? { paddingBottom: 'calc(65px + env(safe-area-inset-bottom, 0px))' } : undefined}
          className={
            isChat 
              ? "flex-1 w-full max-w-md mx-auto flex flex-col min-h-0 overflow-hidden" 
              : "flex-1 w-full max-w-md mx-auto px-4 py-4 pb-28"
          }
        >
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
