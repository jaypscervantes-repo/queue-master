import Link from 'next/link';
import { Activity, User, Calendar } from 'lucide-react';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
          <Activity size={32} />
        </div>
        <h1 className="text-3xl font-bold">Queue Master</h1>
        <p className="text-brand-100 mt-1 mb-8">Badminton matchmaking made simple</p>

        <div className="space-y-3">
          <Link
            href="/player"
            className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl text-left transition-colors border border-white/20"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <User size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold">Player Portal</p>
              <p className="text-xs text-brand-100">Join the queue, view stats, see your matches</p>
            </div>
            <span>›</span>
          </Link>

          <Link
            href="/qmaster"
            className="flex items-center gap-3 p-4 bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl text-left transition-colors border border-white/20"
          >
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold">Q Master Portal</p>
              <p className="text-xs text-brand-100">Create schedules, manage your queue</p>
            </div>
            <span>›</span>
          </Link>

        </div>
      </div>
    </div>
  );
}
