'use client';

import React, { useState } from 'react';
import { Heart, Lock, Eye, EyeOff, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from './UserContext';
import { CoupleUser } from '@/types';
import confetti from 'canvas-confetti';

export function LoginScreen() {
  const { login } = useCurrentUser();
  const [selectedUser, setSelectedUser] = useState<CoupleUser>('berk');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const success = await login(password.trim(), selectedUser);
    setIsLoading(false);

    if (success) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      setErrorMsg('Incorrect password. Please try again 💕');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0e17] overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="card-cozy p-6 sm:p-7 bg-[#121824]/90 backdrop-blur-xl border border-white/[0.1] shadow-2xl rounded-3xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5">
                <span>Berlyn</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Private home for Berk & Jaquilyn
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-2">
                Who is entering tonight?
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Berk Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser('berk');
                    setErrorMsg('');
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedUser === 'berk'
                      ? 'bg-blue-500/15 border-blue-500 shadow-md ring-1 ring-blue-500/40 text-white'
                      : 'bg-[#161f2e] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.2]'
                  }`}
                >
                  <span className="text-2xl">🦁</span>
                  <span className="text-xs font-bold">Berk</span>
                  <span className="text-[10px] text-blue-300/80 font-medium">Husband</span>
                </button>

                {/* Jaquilyn Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser('jaquilyn');
                    setErrorMsg('');
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedUser === 'jaquilyn'
                      ? 'bg-rose-500/15 border-rose-500 shadow-md ring-1 ring-rose-500/40 text-white'
                      : 'bg-[#161f2e] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.2]'
                  }`}
                >
                  <span className="text-2xl">🌸</span>
                  <span className="text-xs font-bold">Jaquilyn</span>
                  <span className="text-[10px] text-rose-300/80 font-medium">Wife</span>
                </button>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={`Enter password for ${selectedUser === 'berk' ? 'Berk' : 'Jaquilyn'}...`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#161f2e] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && (
                <p className="text-[11px] text-rose-400 font-medium pt-1 animate-fade-in">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking our home...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unlock Our Home ❤️</span>
                </>
              )}
            </button>
          </form>

          {/* Security badge footer */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Secured via individual .env passwords</span>
          </div>
        </div>
      </div>
    </div>
  );
}
