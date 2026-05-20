'use client';

import { useState } from 'react';
import { Activity, Check, ChevronRight } from 'lucide-react';
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

type Step = 'form' | 'success';

export default function JoinPage() {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [rank, setRank] = useState<Rank | ''>('');
  const [categories, setCategories] = useState<MatchCategory[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [queuePos, setQueuePos] = useState<number | null>(null);

  const availableCategories = CATEGORIES.filter(
    c => !gender || c.genders.includes(gender as Gender)
  );

  const toggleCat = (cat: MatchCategory) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!gender) { setError('Please select your gender'); return; }
    if (!rank) { setError('Please select your skill rank'); return; }
    if (categories.length === 0) { setError('Please select at least one category'); return; }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          gender,
          rank,
          preferredCategories: categories,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to join queue');

      setQueuePos(data.position);
      setStep('success');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-brand-500" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">You're In!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Welcome, <strong>{name}</strong>! You've joined the queue.
          </p>
          {queuePos !== null && (
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-4 mb-6">
              <p className="text-4xl font-bold text-brand-500 mb-1">#{queuePos}</p>
              <p className="text-sm text-brand-600 dark:text-brand-400">Queue Position</p>
            </div>
          )}
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Wait for the admin to call your name when a court is ready.
            You'll be matched based on your rank and preferences.
          </p>
          <button
            onClick={() => {
              setStep('form');
              setName('');
              setGender('');
              setRank('');
              setCategories([]);
              setQueuePos(null);
            }}
            className="mt-6 text-sm text-brand-500 hover:text-brand-600 font-medium"
          >
            Register another player →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800">
      {/* Header */}
      <div className="px-4 pt-8 pb-6 text-center text-white">
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur">
          <Activity size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold">Join the Queue</h1>
        <p className="text-brand-100 text-sm mt-1">Fill in your details to get matched</p>
      </div>

      {/* Form card */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-t-3xl px-4 pt-6 pb-8 min-h-[calc(100vh-160px)]">
        <div className="max-w-md mx-auto space-y-6">

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full px-4 py-3.5 text-base rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Male', 'Female'] as Gender[]).map(g => (
                <button
                  key={g}
                  onClick={() => {
                    setGender(g);
                    setCategories([]);
                  }}
                  className={cn(
                    'py-4 rounded-2xl text-sm font-semibold border-2 transition-all',
                    gender === g
                      ? 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-200 dark:shadow-brand-900/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  <span className="text-xl block mb-0.5">{g === 'Male' ? '♂' : '♀'}</span>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Rank */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Skill Level
            </label>
            <div className="space-y-2">
              {RANKS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRank(r.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left',
                    rank === r.value
                      ? cn('border-current', RANK_COLORS[r.value])
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0',
                    rank === r.value ? 'bg-current/10' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}>
                    {r.label}
                  </div>
                  <div>
                    <p className={cn(
                      'font-semibold text-sm',
                      rank === r.value ? 'text-inherit' : 'text-gray-800 dark:text-gray-200'
                    )}>
                      Rank {r.label}
                    </p>
                    <p className="text-xs text-gray-400">{r.desc}</p>
                  </div>
                  {rank === r.value && <Check size={18} className="ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Preferred Categories
            </label>
            <div className="space-y-2">
              {availableCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCat(cat.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left',
                    categories.includes(cat.id)
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  )}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className={cn(
                    'font-medium text-sm flex-1',
                    categories.includes(cat.id)
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-gray-700 dark:text-gray-300'
                  )}>
                    {cat.label}
                  </span>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    categories.includes(cat.id)
                      ? 'border-brand-500 bg-brand-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}>
                    {categories.includes(cat.id) && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-200 dark:shadow-brand-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                Join Queue <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
