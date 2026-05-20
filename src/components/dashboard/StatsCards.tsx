import { Users, MapPin, Swords, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { DashboardStats } from '@/types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Players Queued',
      value: stats.totalQueued,
      icon: Users,
      color: 'text-brand-500',
      bg: 'bg-brand-50 dark:bg-brand-900/20',
    },
    {
      label: 'Active Courts',
      value: stats.activeCourts,
      icon: MapPin,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Playing Now',
      value: stats.playingNow,
      icon: Swords,
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Avg Wait Time',
      value: `${stats.avgWaitMinutes}m`,
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={22} className={color} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
