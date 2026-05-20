import { cn } from '@/lib/utils';
import { ListOrdered, LayoutGrid, History, Users, BarChart2 } from 'lucide-react';

export type Tab = 'queue' | 'courts' | 'history' | 'players' | 'analytics';

interface NavTabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'queue', label: 'Queue', icon: ListOrdered },
  { id: 'courts', label: 'Courts', icon: LayoutGrid },
  { id: 'history', label: 'History', icon: History },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
];

export function NavTabs({ active, onChange }: NavTabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
            active === id
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}
