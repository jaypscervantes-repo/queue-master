'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, LogIn } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search?.get('next') || '/player';

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !pin) { setError('Enter your username and PIN'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      router.push(nextPath);
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Username
        </label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="your_username"
          className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          PIN
        </label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="current-password"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-3 text-2xl tracking-[0.5em] text-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-200 dark:shadow-brand-900/30 disabled:opacity-50"
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <>
            <LogIn size={18} /> Log In
          </>
        )}
      </button>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Don't have an account?{' '}
        <Link href="/player/signup" className="text-brand-500 hover:text-brand-600 font-semibold">
          Sign up
        </Link>
      </div>
    </div>
  );
}

function LoginFormFallback() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl">
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
      </div>
    </div>
  );
}

export default function PlayerLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur">
            <Activity size={28} />
          </div>
          <h1 className="text-2xl font-bold">Queue Master</h1>
          <p className="text-brand-100 text-sm mt-1">Player Login</p>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-white/60 mt-4">
          No account? Ask your Q Master for help.
        </p>
      </div>
    </div>
  );
}
