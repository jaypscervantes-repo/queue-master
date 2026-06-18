'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarClock } from 'lucide-react';
import type { Settings } from '@/types';
import { format } from 'date-fns';

interface SessionSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: Settings | null;
  onSaved: (s: Settings) => void;
}

// Converts an ISO date to the local "YYYY-MM-DDTHH:mm" string a datetime-local input wants
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionSettingsModal({ open, onClose, settings, onSaved }: SessionSettingsModalProps) {
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [avgMatchDuration, setAvgMatchDuration] = useState(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings && open) {
      setSessionStart(toLocalInputValue(settings.sessionStart));
      setSessionEnd(toLocalInputValue(settings.sessionEnd));
      setAvgMatchDuration(settings.avgMatchDuration);
      setError('');
    }
  }, [settings, open]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionStart: sessionStart ? new Date(sessionStart).toISOString() : null,
          sessionEnd: sessionEnd ? new Date(sessionEnd).toISOString() : null,
          avgMatchDuration: Number(avgMatchDuration),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      onSaved(data);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setQuickSession = (hours: number) => {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setSessionStart(toLocalInputValue(start.toISOString()));
    setSessionEnd(toLocalInputValue(end.toISOString()));
  };

  return (
    <Dialog open={open} onClose={onClose} title="Session Schedule" size="md">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl">
          <CalendarClock className="text-brand-500 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-brand-700 dark:text-brand-300">
            Set when your badminton session runs. The dashboard will show the current session and
            estimate when each queued player will play.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Session Start
            </label>
            <input
              type="datetime-local"
              value={sessionStart}
              onChange={e => setSessionStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Session End
            </label>
            <input
              type="datetime-local"
              value={sessionEnd}
              onChange={e => setSessionEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick presets:</p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setQuickSession(2)}>+ 2 hrs from now</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickSession(3)}>+ 3 hrs from now</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickSession(4)}>+ 4 hrs from now</Button>
          </div>
        </div>

        <Input
          type="number"
          min={5}
          max={60}
          label="Average match duration (minutes)"
          value={avgMatchDuration}
          onChange={e => setAvgMatchDuration(parseInt(e.target.value) || 15)}
        />
        <p className="-mt-3 text-xs text-gray-400 dark:text-gray-500">
          Used to estimate when each queued player will start playing.
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => { setSessionStart(''); setSessionEnd(''); }}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Clear session times
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Schedule</Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
