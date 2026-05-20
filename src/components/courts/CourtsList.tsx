'use client';

import { useState } from 'react';
import { Plus, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourtCard } from './CourtCard';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Court } from '@/types';

interface CourtsListProps {
  courts: Court[];
  onEndMatch: (matchId: string, winningTeam: number | null) => void;
  onRunMatchmaking: () => void;
  onAddCourt: (name: string) => void;
  onRemoveCourt: (courtId: string) => void;
  matchmakingLoading: boolean;
}

export function CourtsList({
  courts,
  onEndMatch,
  onRunMatchmaking,
  onAddCourt,
  onRemoveCourt,
  matchmakingLoading,
}: CourtsListProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newCourtName, setNewCourtName] = useState('');
  const [manageOpen, setManageOpen] = useState(false);

  const handleAdd = () => {
    if (!newCourtName.trim()) return;
    onAddCourt(newCourtName.trim());
    setNewCourtName('');
    setAddOpen(false);
  };

  const available = courts.filter(c => c.status === 'Available').length;
  const occupied = courts.filter(c => c.status === 'Occupied').length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-brand-500">{available}</span> available
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-blue-500">{occupied}</span> occupied
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setManageOpen(true)}>
            <Settings size={14} /> Manage Courts
          </Button>
          <Button size="sm" onClick={onRunMatchmaking} loading={matchmakingLoading}>
            <Play size={14} /> Run Matchmaking
          </Button>
        </div>
      </div>

      {/* Court grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {courts.map(court => (
          <CourtCard key={court.id} court={court} onEndMatch={onEndMatch} />
        ))}

        {/* Add court card */}
        <button
          onClick={() => setAddOpen(true)}
          className="h-48 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-all"
        >
          <Plus size={28} />
          <span className="text-sm font-medium">Add Court</span>
        </button>
      </div>

      {/* Add court dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add New Court" size="sm">
        <div className="space-y-4">
          <Input
            label="Court Name"
            placeholder="e.g. Court 4"
            value={newCourtName}
            onChange={e => setNewCourtName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newCourtName.trim()}>Add Court</Button>
          </div>
        </div>
      </Dialog>

      {/* Manage courts dialog */}
      <Dialog open={manageOpen} onClose={() => setManageOpen(false)} title="Manage Courts">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {courts.map(court => (
            <div
              key={court.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
            >
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{court.name}</span>
                <span className="ml-2 text-xs text-gray-400">{court.status}</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onRemoveCourt(court.id);
                  if (courts.length <= 1) setManageOpen(false);
                }}
                disabled={court.status === 'Occupied'}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setManageOpen(false)}>Close</Button>
        </div>
      </Dialog>
    </div>
  );
}
