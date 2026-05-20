'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Trophy, Clock, Activity } from 'lucide-react';

interface AnalyticsData {
  matchesByDay: { date: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  rankDistribution: { rank: string; count: number }[];
  topPlayers: { name: string; wins: number; gamesPlayed: number }[];
  avgMatchDuration: number;
  totalMatches: number;
  totalPlayers: number;
}

const PIE_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6'];
const RANK_COLORS_CHART = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#6b7280'];

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-400 text-center py-12">Failed to load analytics</p>;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Activity size={20} className="text-brand-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalMatches}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Matches (30d)</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock size={20} className="text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.avgMatchDuration}m</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Duration</p>
        </Card>
        <Card className="p-4 text-center">
          <Trophy size={20} className="text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalPlayers}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Players</p>
        </Card>
      </div>

      {/* Matches per day */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white">Matches per Day (Last 14 Days)</h3>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.matchesByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb', fontSize: 12 }}
                cursor={{ fill: 'rgba(34,197,94,0.1)' }}
              />
              <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Matches" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white">Match Categories</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="count"
                  nameKey="category"
                  paddingAngle={3}
                >
                  {data.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Rank distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white">Player Rank Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.rankDistribution} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="rank" tick={{ fontSize: 12, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, color: '#f9fafb', fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Players">
                  {data.rankDistribution.map((_, i) => (
                    <Cell key={i} fill={RANK_COLORS_CHART[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Top players */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white">Top Players by Wins</h3>
        </CardHeader>
        <CardBody className="px-0 py-0">
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {data.topPlayers.slice(0, 8).map((p, i) => (
              <div key={p.name} className="flex items-center gap-4 px-6 py-3">
                <span className="w-6 text-sm font-bold text-gray-400">{i + 1}</span>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">{p.name}</span>
                <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    <span className="font-semibold text-yellow-500">{p.wins}</span> wins
                  </span>
                  <span className="hidden sm:inline">{p.gamesPlayed} games</span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
