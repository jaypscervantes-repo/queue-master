'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, LogIn } from 'lucide-react';

export default function QMasterLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !pin) { setError('Enter your username and PIN'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/qmaster/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      router.push('/qmaster');
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-bold">Q Master</h1>
          <p className="text-blue-100 text-sm mt-1">Organizer Login</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Username</label>
            <input
              type="text" autoComplete="username" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your_username"
              className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">PIN</label>
            <input
              type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="current-password"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 text-2xl tracking-[0.5em] text-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
          >
            <LogIn size={18} /> {loading ? 'Logging in...' : 'Log In'}
          </button>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            New organizer?{' '}
            <Link href="/qmaster/signup" className="text-blue-500 hover:text-blue-600 font-semibold">
              Sign up
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-white/60 mt-4">
          Looking for the <Link href="/player/login" className="underline">Player portal</Link>?
        </p>
      </div>
    </div>
  );
}
