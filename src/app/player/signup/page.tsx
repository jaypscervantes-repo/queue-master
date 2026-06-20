'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Gender, Rank, MatchCategory } from '@/types';

const RANKS: { value: Rank; label: string; desc: string }[] = [
  { value: 'A', label: 'A', desc: 'Pro / Tournament' },
  { value: 'B', label: 'B', desc: 'Advanced' },
  { value: 'C', label: 'C', desc: 'Intermediate' },
  { value: 'D', label: 'D', desc: 'Beginner+' },
  { value: 'E', label: 'E', desc: 'Beginner' },
];

const RANK_COLORS: Record<Rank, string> = {
  A: 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  B: 'border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  C: 'border-yellow-400 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  D: 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  E: 'border-gray-300 bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const CATEGORIES: { id: MatchCategory; label: string; icon: string; genders: Gender[] }[] = [
  { id: 'MensDoubles', label: "Men's Doubles", icon: '♂♂', genders: ['Male'] },
  { id: 'WomensDoubles', label: "Women's Doubles", icon: '♀♀', genders: ['Female'] },
  { id: 'MixedDoubles', label: 'Mixed Doubles', icon: '♂♀', genders: ['Male', 'Female'] },
];

export default function PlayerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [rank, setRank] = useState<Rank | ''>('');
  const [categories, setCategories] = useState<MatchCategory[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableCategories = CATEGORIES.filter(c => !gender || c.genders.includes(gender as Gender));

  const toggleCat = (cat: MatchCategory) =>
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const handleSubmit = async () => {
    if (!name.trim()) return setError('Please enter your name');
    if (!username.trim() || !/^[a-z0-9_]{3,20}$/i.test(username)) {
      return setError('Username: 3-20 letters, numbers, or underscores');
    }
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN must be 4-6 digits');
    if (pin !== pinConfirm) return setError('PINs do not match');
    if (!gender) return setError('Select your gender');
    if (!rank) return setError('Select your skill rank');
    if (categories.length === 0) return setError('Select at least one category');

    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          pin,
          gender, rank, preferredCategories: categories,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Signup failed');
      router.push('/player');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800">
      <div className="px-4 pt-8 pb-6 text-center text-white">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur">
          <Activity size={24} />
        </div>
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-brand-100 text-sm mt-1">Sign up to track your stats and join queues</p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-t-3xl px-4 pt-6 pb-8 min-h-[calc(100vh-160px)]">
        <div className="max-w-md mx-auto space-y-5">

          <Section label="Display Name">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. John Smith"
              className="signup-input" />
          </Section>

          <Section label="Username (for login)">
            <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g. johnsmith"
              autoCapitalize="none"
              className="signup-input" />
          </Section>

          <div className="grid grid-cols-2 gap-3">
            <Section label="PIN (4-6 digits)">
              <input type="password" inputMode="numeric" maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="signup-input text-center text-2xl tracking-[0.4em]" />
            </Section>
            <Section label="Confirm PIN">
              <input type="password" inputMode="numeric" maxLength={6}
                value={pinConfirm}
                onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="signup-input text-center text-2xl tracking-[0.4em]" />
            </Section>
          </div>

          <Section label="Gender">
            <div className="grid grid-cols-2 gap-3">
              {(['Male', 'Female'] as Gender[]).map(g => (
                <button key={g} onClick={() => { setGender(g); setCategories([]); }}
                  className={cn(
                    'py-4 rounded-2xl text-sm font-semibold border-2 transition-all',
                    gender === g
                      ? 'border-brand-500 bg-brand-500 text-white shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}>
                  <span className="text-xl block mb-0.5">{g === 'Male' ? '♂' : '♀'}</span>
                  {g}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Skill Level">
            <div className="space-y-2">
              {RANKS.map(r => (
                <button key={r.value} onClick={() => setRank(r.value)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                    rank === r.value ? cn('border-current', RANK_COLORS[r.value])
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800')}>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-base font-black',
                    rank === r.value ? 'bg-current/10' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400')}>
                    {r.label}
                  </div>
                  <div className="flex-1">
                    <p className={cn('font-semibold text-sm',
                      rank === r.value ? 'text-inherit' : 'text-gray-800 dark:text-gray-200')}>Rank {r.label}</p>
                    <p className="text-xs text-gray-400">{r.desc}</p>
                  </div>
                  {rank === r.value && <Check size={16} />}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Preferred Categories">
            <div className="space-y-2">
              {!gender && <p className="text-xs text-gray-400 italic">Pick a gender to see categories</p>}
              {availableCategories.map(cat => (
                <button key={cat.id} onClick={() => toggleCat(cat.id)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                    categories.includes(cat.id)
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800')}>
                  <span className="text-xl">{cat.icon}</span>
                  <span className={cn('font-medium text-sm flex-1',
                    categories.includes(cat.id) ? 'text-brand-700 dark:text-brand-300'
                      : 'text-gray-700 dark:text-gray-300')}>{cat.label}</span>
                  <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    categories.includes(cat.id) ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-600')}>
                    {categories.includes(cat.id) && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-200 disabled:opacity-50">
            {loading ? 'Creating account...' : <>Create Account <ChevronRight size={20} /></>}
          </button>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/player/login" className="text-brand-500 font-semibold">Log in</Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.signup-input) {
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid #e5e7eb;
          background: white;
          color: #111827;
          font-size: 1rem;
        }
        :global(.dark .signup-input) { background: #1f2937; color: #f9fafb; border-color: #374151; }
        :global(.signup-input:focus) { outline: none; border-color: #22c55e; }
      `}</style>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      {children}
    </div>
  );
}
