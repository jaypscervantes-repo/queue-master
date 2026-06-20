'use client';

import Link from 'next/link';
import { Moon, Sun, QrCode, Activity, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  dark: boolean;
  onToggleDark: () => void;
  onShowQR: () => void;
}

export function Header({ dark, onToggleDark, onShowQR }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
              Queue Master
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Badminton Matchmaking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/player"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Open the Player Portal"
          >
            <User size={13} /> Player Portal
          </Link>
          <Button variant="outline" size="sm" onClick={onShowQR} className="hidden sm:flex">
            <QrCode size={15} />
            Join QR
          </Button>
          <button
            onClick={onShowQR}
            className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <QrCode size={18} />
          </button>
          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
