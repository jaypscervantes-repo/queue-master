'use client';

import { CalendarClock, Settings as SettingsIcon } from 'lucide-react';
import { format, differenceInMinutes, isAfter, isBefore } from 'date-fns';
import type { Settings } from '@/types';

interface SessionInfoProps {
  settings: Settings | null;
  onEdit: () => void;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function SessionInfo({ settings, onEdit }: SessionInfoProps) {
  const now = new Date();
  const start = settings?.sessionStart ? new Date(settings.sessionStart) : null;
  const end = settings?.sessionEnd ? new Date(settings.sessionEnd) : null;

  let status: 'inactive' | 'upcoming' | 'live' | 'ended' = 'inactive';
  let detail = 'No session scheduled';

  if (start && end) {
    if (isBefore(now, start)) {
      status = 'upcoming';
      const mins = differenceInMinutes(start, now);
      detail = mins > 60
        ? `Starts at ${format(start, 'HH:mm')}`
        : `Starts in ${mins} min`;
    } else if (isAfter(now, end)) {
      status = 'ended';
      detail = `Ended at ${format(end, 'HH:mm')}`;
    } else {
      status = 'live';
      const minsLeft = differenceInMinutes(end, now);
      detail = `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m remaining`;
    }
  }

  const colors = {
    inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    upcoming: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    live: 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300',
    ended: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  };

  const dot = {
    inactive: 'bg-gray-400',
    upcoming: 'bg-blue-500',
    live: 'bg-brand-500 animate-pulse',
    ended: 'bg-orange-500',
  };

  return (
    <button
      onClick={onEdit}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all hover:scale-[1.01] ${colors[status]}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot[status]}`} />
        <CalendarClock size={16} className="flex-shrink-0" />
        <div className="text-left min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {status === 'live' && 'Session Live'}
            {status === 'upcoming' && 'Session Upcoming'}
            {status === 'ended' && 'Session Ended'}
            {status === 'inactive' && 'No Active Session'}
          </p>
          <p className="text-xs opacity-80 leading-tight truncate">
            {start && end
              ? `${format(start, sameDay(start, now) ? 'HH:mm' : 'MMM d, HH:mm')} – ${format(end, 'HH:mm')} · ${detail}`
              : detail}
          </p>
        </div>
      </div>
      <SettingsIcon size={15} className="opacity-60 flex-shrink-0" />
    </button>
  );
}
