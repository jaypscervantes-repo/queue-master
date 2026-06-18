import { Users, MapPin, Swords, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DashboardStats } from '@/types';

interface StatsCardsProps {
  stats: DashboardStats;
  onActiveCourtsClick?: () => void;
  onPlayingNowClick?: () => void;
}

export function StatsCards({ stats, onActiveCourtsClick, onPlayingNowClick }: StatsCardsProps) {
  const cards = [
    {
      key: 'queued',
      label: 'Players Queued',
      value: stats.totalQueued,
      icon: Users,
      color: 'text-brand-500',
      bg: 'bg-brand-50 dark:bg-brand-900/20',
      onClick: undefined,
    },
    {
      key: 'courts',
      label: 'Active Courts',
      value: stats.activeCourts,
      icon: MapPin,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      onClick: onActiveCourtsClick,
    },
    {
      key: 'playing',
      label: 'Playing Now',
      value: stats.playingNow,
      icon: Swords,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      onClick: onPlayingNowClick,
    },
    {
      key: 'wait',
      label: 'Avg Wait Time',
      value: `${stats.avgWaitMinutes}m`,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      onClick: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, value, icon: Icon, color, bg, onClick }) => {
        const clickable = !!onClick;
        const content = (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                {label}
                {clickable && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">›</span>
                )}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={22} className={color} />
            </div>
          </div>
        );

        return clickable ? (
          <button
            key={key}
            onClick={onClick}
            className="text-left w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-md transition-all"
          >
            {content}
          </button>
        ) : (
          <Card key={key} className="p-5">{content}</Card>
        );
      })}
    </div>
  );
}
