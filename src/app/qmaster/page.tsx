'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Plus, Calendar, MapPin, Phone, Users, LogOut, Clock,
  Trash2, Repeat,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { format, isAfter, isBefore } from 'date-fns';
import { useSocket } from '@/hooks/useSocket';

interface ScheduleSummary {
  id: string;
  name: string | null;
  courtName: string;
  courtContact: string;
  contactPerson: string;
  startTime: string;
  endTime: string;
  recurrenceGroupId: string | null;
  _count: { queueEntries: number };
}

interface QMasterMe {
  id: string;
  name: string;
  username: string;
}

export default function QMasterDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<QMasterMe | null>(null);
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const meRes = await fetch('/api/qmaster/auth/me');
      if (meRes.status === 401) { router.push('/qmaster/login'); return; }
      if (meRes.ok) setMe(await meRes.json());

      const sRes = await fetch('/api/qmaster/schedules');
      if (sRes.ok) setSchedules(await sRes.json());
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  useSocket({ 'schedule:update': refresh });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/qmaster/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule? Players will be notified.')) return;
    await fetch(`/api/qmaster/schedules/${id}`, { method: 'DELETE' });
    refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-navy-700 border-t-transparent" />
      </div>
    );
  }

  const now = new Date();
  const upcoming = schedules.filter(s => isAfter(new Date(s.endTime), now));
  const past = schedules.filter(s => isBefore(new Date(s.endTime), now));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-700 to-navy-900 px-4 pt-8 pb-16 text-white">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-xs text-navy-200">Q Master</p>
              <p className="font-bold text-base leading-tight">{me?.name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/10" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div>
            <p className="text-3xl font-bold">{upcoming.length}</p>
            <p className="text-xs text-navy-200">Upcoming Schedules</p>
          </div>
          <Link
            href="/qmaster/schedules/new"
            className="flex items-center gap-2 bg-white text-navy-800 font-bold px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-transform"
          >
            <Plus size={16} /> New Schedule
          </Link>
        </div>
      </div>

      {/* Schedule list — overlapping the gradient */}
      <div className="px-4 -mt-10 space-y-3">
        {upcoming.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar size={36} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">No upcoming schedules</p>
            <p className="text-sm text-gray-400 mt-1">Create one to get started</p>
            <Link
              href="/qmaster/schedules/new"
              className="inline-flex items-center gap-2 mt-4 bg-navy-700 text-white font-semibold px-4 py-2.5 rounded-xl"
            >
              <Plus size={14} /> Create Schedule
            </Link>
          </Card>
        ) : (
          upcoming.map(s => <ScheduleCard key={s.id} schedule={s} onDelete={() => handleDelete(s.id)} />)
        )}

        {past.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-4 pb-1 px-1">
              Past Schedules
            </p>
            {past.slice(0, 5).map(s => (
              <ScheduleCard key={s.id} schedule={s} onDelete={() => handleDelete(s.id)} past />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onDelete,
  past = false,
}: {
  schedule: ScheduleSummary;
  onDelete: () => void;
  past?: boolean;
}) {
  const start = new Date(schedule.startTime);
  const end = new Date(schedule.endTime);
  const now = new Date();
  const isLive = isAfter(now, start) && isBefore(now, end);

  return (
    <Link href={`/qmaster/schedules/${schedule.id}`} className={`block ${past ? 'opacity-60' : ''}`}>
    <Card className="p-4 cursor-pointer hover:border-navy-300 dark:hover:border-navy-900 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {schedule.name && (
            <p className="text-xs text-gray-400 mb-0.5">{schedule.name}</p>
          )}
          <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin size={14} className="text-navy-700" />
            {schedule.courtName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-5">
            <span className="flex items-center gap-1">
              <Users size={10} /> {schedule.contactPerson}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={10} /> {schedule.courtContact}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isLive && (
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" /> LIVE
            </span>
          )}
          {schedule.recurrenceGroupId && (
            <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1" title="Part of a recurring series">
              <Repeat size={11} /> Recurring
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Calendar size={13} />
          <span>{format(start, 'MMM d')}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Clock size={13} />
          <span>{format(start, 'HH:mm')} – {format(end, 'HH:mm')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Users size={12} />
          {schedule._count.queueEntries} player{schedule._count.queueEntries !== 1 ? 's' : ''} joined
        </span>
        <div className="flex gap-1">
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
    </Link>
  );
}
