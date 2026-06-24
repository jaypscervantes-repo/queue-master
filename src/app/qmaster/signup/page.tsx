'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, UserPlus } from 'lucide-react';

export default function QMasterSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!username.trim()) { setError('Pick a username'); return; }
    if (!pin || pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (pin !== pin2) { setError('PINs do not match'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/qmaster/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), username: username.trim(), pin, email: email.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Signup failed');
      router.push('/qmaster');
    } catch (e: any) {
      setError(e.message ?? 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800">
      <div className="px-4 pt-8 pb-6 text-center text-white">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur">
          <Shield size={24} />
        </div>
        <h1 className="text-2xl font-bold">Become a Q Master</h1>
        <p className="text-blue-100 text-sm mt-1">Organize sessions and manage queues</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-t-3xl px-4 pt-6 pb-8 min-h-[calc(100vh-180px)]">
        <div className="max-w-md mx-auto space-y-4">
          <Field label="Your Name" value={name} onChange={setName} placeholder="e.g. Jane Smith" />
          <Field label="Username" value={username} onChange={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="e.g. jane_qm" hint="Letters, numbers, underscore. 3-20 chars." />
          <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">PIN (4-6 digits)</label>
            <input
              type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-4 py-3 text-2xl tracking-[0.5em] text-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirm PIN</label>
            <input
              type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              placeholder="••••"
              className="w-full px-4 py-3 text-2xl tracking-[0.5em] text-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleSignup} disabled={loading}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <UserPlus size={18} /> {loading ? 'Creating account...' : 'Create Q Master Account'}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
            Already have an account? <Link href="/qmaster/login" className="text-blue-500 hover:text-blue-600 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
