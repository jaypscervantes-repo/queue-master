'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [signupSecret, setSignupSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const url = mode === 'login' ? '/api/admin/auth/login' : '/api/admin/auth/signup';
      const payload = mode === 'login'
        ? { username: username.trim(), pin }
        : { name: name.trim(), username: username.trim(), pin, signupSecret: signupSecret || undefined };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `${mode} failed`);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message ?? 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 text-white">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur border border-white/10">
            <Shield size={28} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-gray-400 text-sm mt-1">System Administrator</p>
        </div>

        <div className="bg-gray-800 rounded-3xl p-6 shadow-2xl space-y-4 border border-gray-700">
          <div className="flex gap-2 mb-2">
            {(['login', 'signup'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700 text-gray-300'
                }`}>
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <input
              type="text" placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900 text-white focus:outline-none focus:border-yellow-500"
            />
          )}

          <input
            type="text" placeholder="Username" autoComplete="username" value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900 text-white focus:outline-none focus:border-yellow-500"
          />
          <input
            type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-4 py-3 text-2xl tracking-[0.5em] text-center rounded-xl border-2 border-gray-700 bg-gray-900 text-white focus:outline-none focus:border-yellow-500"
          />

          {mode === 'signup' && (
            <div>
              <input
                type="password" placeholder="Signup Secret (required if not first admin)"
                value={signupSecret}
                onChange={e => setSignupSecret(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900 text-white focus:outline-none focus:border-yellow-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set <code className="text-yellow-400">ADMIN_SIGNUP_SECRET</code> env var on the server. Leave blank only when creating the first admin.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={submit} disabled={loading}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <LogIn size={18} /> {loading ? '...' : (mode === 'login' ? 'Log In' : 'Create Admin')}
          </button>
        </div>
      </div>
    </div>
  );
}
