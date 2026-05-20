import { cn } from '@/lib/utils';
import { RANK_COLORS, STATUS_COLORS } from '@/lib/constants';
import type { Rank } from '@/types';

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ className, children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>
      {children}
    </span>
  );
}

export function RankBadge({ rank }: { rank: Rank }) {
  return (
    <Badge className={cn('font-bold text-sm px-3 py-1 rounded-full', RANK_COLORS[rank])}>
      {rank}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn('capitalize', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    MensDoubles: "Men's",
    WomensDoubles: "Women's",
    MixedDoubles: 'Mixed',
  };
  const colors: Record<string, string> = {
    MensDoubles: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    WomensDoubles: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    MixedDoubles: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <Badge className={colors[category] ?? 'bg-gray-100 text-gray-600'}>
      {labels[category] ?? category}
    </Badge>
  );
}
