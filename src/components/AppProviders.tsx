'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from './UserContext';
import { ConfirmProvider } from './ConfirmModal';
import { NotificationProvider } from './NotificationProvider';
import { Navbar } from './Navbar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === '/messages';

  // Master Hard Reset: Purge all legacy mock data from browser localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const PURGE_KEY = 'berlyn_hard_reset_executed_v6_clean';
    if (localStorage.getItem(PURGE_KEY) !== 'done') {
      const keysToPurge = [
        'berlyn_finance_tx',
        'berlyn_compound_accounts',
        'berlyn_finance_assets',
        'berlyn_finance_recurring',
        'berlyn_agenda_tasks',
        'berlyn_penalty_entries',
        'berlyn_penalty_goal',
        'berlyn_daily_choices',
        'berlyn_notes',
        'berlyn_messages',
        'berlyn_quizzes',
        'berlyn_bucket_list'
      ];

      keysToPurge.forEach((k) => localStorage.removeItem(k));

      // Reset to empty clean arrays
      localStorage.setItem('berlyn_finance_tx', '[]');
      localStorage.setItem('berlyn_compound_accounts', '[]');
      localStorage.setItem('berlyn_finance_assets', '[]');
      localStorage.setItem('berlyn_finance_recurring', '[]');
      localStorage.setItem('berlyn_agenda_tasks', '[]');
      localStorage.setItem('berlyn_penalty_entries', '[]');

      localStorage.setItem(PURGE_KEY, 'done');

      // Trigger cross-component sync
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('agenda_updated'));
    }
  }, []);

  return (
    <UserProvider>
      <ConfirmProvider>
        <NotificationProvider>
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
        </NotificationProvider>
      </ConfirmProvider>
    </UserProvider>
  );
}
