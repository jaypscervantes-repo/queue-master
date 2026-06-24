'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewSchedulePage() {
  const router = useRouter();
  const now = new Date();
  const defaultStart = new Date(now); defaultStart.setHours(now.getHours() + 1, 0, 0, 0);
  const defaultEnd = new Date(defaultStart); defaultEnd.setHours(defaultStart.getHours() + 2);

  const [name, setName] = useState('');
  const [courtName, setCourtName] = useState('');
  const [courtContact, setCourtContact] = useState('');
  const [startTime, setStartTime] = useState(toLocalInputValue(defaultStart));
  const [endTime, setEndTime] = useState(toLocalInputValue(defaultEnd));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateDialog, setDuplicateDialog] = useState<{ message: string } | null>(null);

  const submit = async (confirmDuplicate = false) => {
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/qmaster/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          courtName: courtName.trim(),
          courtContact: courtContact.trim(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          confirmDuplicate,
        }),
      });
      const data = await res.json();

      if (data.duplicate) {
        setDuplicateDialog({ message: data.message });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Could not create schedule');

      router.push('/qmaster');
    } catch (e: any) {
      setError(e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 px-4 pt-6 pb-8 text-white">
        <Link href="/qmaster" className="inline-flex items-center gap-2 text-blue-100 text-sm mb-3 hover:text-white">
          <ArrowLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Calendar size={22} />
          <h1 className="text-xl font-bold">New Schedule</h1>
        </div>
        <p className="text-blue-100 text-sm mt-1">Reserve your court first, then add it here.</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <Field label="Schedule Name (optional)" value={name} onChange={setName} placeholder="e.g. Friday Night Doubles" />
        <Field label="Court Name *" value={courtName} onChange={setCourtName} placeholder="e.g. Sunrise Sports Center Court 2" />
        <Field label="Court Contact *" value={courtContact} onChange={setCourtContact} placeholder="Phone or email" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Start *</label>
            <input
              type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">End *</label>
            <input
              type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={() => submit(false)} disabled={loading}
          className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Schedule'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          ⚠ You must secure your court reservation before posting this schedule.
        </p>
      </div>

      {/* Duplicate warning popup */}
      <Dialog
        open={!!duplicateDialog}
        onClose={() => setDuplicateDialog(null)}
        title="Court Conflict"
        size="sm"
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-orange-500" />
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {duplicateDialog?.message}
          </p>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setDuplicateDialog(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => { setDuplicateDialog(null); submit(true); }}>
              Create anyway
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
