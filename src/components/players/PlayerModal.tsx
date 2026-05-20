'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Player, Gender, Rank, MatchCategory } from '@/types';

interface PlayerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    gender: Gender;
    rank: Rank;
    preferredCategories: MatchCategory[];
  }) => Promise<void>;
  initial?: Player | null;
  title?: string;
}

const RANKS: Rank[] = ['A', 'B', 'C', 'D', 'E'];
const RANK_LABELS: Record<Rank, string> = {
  A: 'A — Pro',
  B: 'B — Advanced',
  C: 'C — Intermediate',
  D: 'D — Beginner+',
  E: 'E — Beginner',
};
const CATEGORIES: { id: MatchCategory; label: string; genders: Gender[] }[] = [
  { id: 'MensDoubles', label: "Men's Doubles", genders: ['Male'] },
  { id: 'WomensDoubles', label: "Women's Doubles", genders: ['Female'] },
  { id: 'MixedDoubles', label: 'Mixed Doubles', genders: ['Male', 'Female'] },
];

export function PlayerModal({ open, onClose, onSubmit, initial, title = 'Register Player' }: PlayerModalProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [rank, setRank] = useState<Rank | ''>('');
  const [categories, setCategories] = useState<MatchCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setGender(initial.gender);
      setRank(initial.rank);
      setCategories(Array.isArray(initial.preferredCategories) ? initial.preferredCategories : []);
    } else {
      setName('');
      setGender('');
      setRank('');
      setCategories([]);
    }
    setError('');
  }, [initial, open]);

  const toggleCategory = (cat: MatchCategory) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Filter categories based on selected gender, and prune any selected
  // categories that are no longer valid when gender changes
  const availableCategories = CATEGORIES.filter(
    c => !gender || c.genders.includes(gender as Gender)
  );

  useEffect(() => {
    if (!gender) return;
    setCategories(prev =>
      prev.filter(c => availableCategories.some(ac => ac.id === c))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!gender) { setError('Gender is required'); return; }
    if (!rank) { setError('Rank is required'); return; }
    if (categories.length === 0) { setError('Select at least one category'); return; }

    setLoading(true);
    setError('');
    try {
      await onSubmit({ name: name.trim(), gender, rank, preferredCategories: categories });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <Input
          label="Full Name"
          placeholder="e.g. John Smith"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        {/* Gender */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Male', 'Female'] as Gender[]).map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={cn(
                  'py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                  gender === g
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                )}
              >
                {g === 'Male' ? '♂ Male' : '♀ Female'}
              </button>
            ))}
          </div>
        </div>

        {/* Rank */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Skill Rank
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {RANKS.map(r => (
              <button
                key={r}
                onClick={() => setRank(r)}
                className={cn(
                  'py-2 rounded-lg text-sm font-bold border-2 transition-all',
                  rank === r
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-brand-300'
                )}
                title={RANK_LABELS[r]}
              >
                {r}
              </button>
            ))}
          </div>
          {rank && (
            <p className="text-xs text-gray-400 mt-1">{RANK_LABELS[rank]}</p>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Preferred Categories
          </label>
          <div className="space-y-2">
            {!gender && (
              <p className="text-xs text-gray-400 italic">Select a gender to see available categories</p>
            )}
            {availableCategories.map(({ id, label }) => (
              <label
                key={id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                  categories.includes(id)
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(id)}
                  onChange={() => toggleCategory(id)}
                  className="accent-brand-500"
                />
                <span className={cn(
                  'text-sm font-medium',
                  categories.includes(id)
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {initial ? 'Save Changes' : 'Register & Join Queue'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
