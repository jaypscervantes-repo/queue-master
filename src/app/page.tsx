import Link from 'next/link';
import { User, Calendar } from 'lucide-react';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Subtle neon glow accents */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-neon-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-navy-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md text-center text-white">
        {/* Stylized title — matches the icon */}
        <div className="mb-12">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight leading-none">
            <span className="text-white">QUEUE</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="h-0.5 w-8 bg-neon-500" />
            <span className="text-2xl sm:text-3xl font-bold tracking-[0.3em] text-neon-500">
              MASTER
            </span>
            <span className="h-0.5 w-8 bg-neon-500" />
          </div>
          <p className="text-navy-200 text-sm mt-5">Badminton matchmaking made simple</p>
        </div>

        {/* Portal buttons */}
        <div className="space-y-3">
          <Link
            href="/player"
            className="group flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl text-left transition-all border border-white/10 hover:border-neon-500/40 hover:shadow-lg hover:shadow-neon-500/10"
          >
            <div className="w-11 h-11 bg-neon-500/10 group-hover:bg-neon-500/20 rounded-xl flex items-center justify-center transition-colors">
              <User size={20} className="text-neon-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Player Portal</p>
              <p className="text-xs text-navy-200">Join the queue, view stats, see your matches</p>
            </div>
            <span className="text-navy-300 group-hover:text-neon-400 group-hover:translate-x-0.5 transition-all">›</span>
          </Link>

          <Link
            href="/qmaster"
            className="group flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl text-left transition-all border border-white/10 hover:border-neon-500/40 hover:shadow-lg hover:shadow-neon-500/10"
          >
            <div className="w-11 h-11 bg-neon-500/10 group-hover:bg-neon-500/20 rounded-xl flex items-center justify-center transition-colors">
              <Calendar size={20} className="text-neon-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Q Master Portal</p>
              <p className="text-xs text-navy-200">Create schedules, manage your queue</p>
            </div>
            <span className="text-navy-300 group-hover:text-neon-400 group-hover:translate-x-0.5 transition-all">›</span>
          </Link>
        </div>

        <p className="mt-12 text-xs text-navy-300">
          Badminton · Pickleball · Doubles matchmaking
        </p>
      </div>
    </div>
  );
}
