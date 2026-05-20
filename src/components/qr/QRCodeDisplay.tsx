'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Dialog } from '@/components/ui/dialog';
import { Smartphone } from 'lucide-react';

interface QRCodeDisplayProps {
  open: boolean;
  onClose: () => void;
}

export function QRCodeDisplay({ open, onClose }: QRCodeDisplayProps) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrl(`${window.location.origin}/join`);
    }
  }, []);

  return (
    <Dialog open={open} onClose={onClose} title="Player Join QR Code" size="sm">
      <div className="flex flex-col items-center gap-6 py-2">
        <div className="bg-white p-4 rounded-2xl shadow-inner">
          {url && <QRCode value={url} size={200} />}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 mb-1">
            <Smartphone size={16} />
            <span className="font-semibold text-sm">Scan to Join Queue</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 break-all">{url}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 w-full text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p className="font-medium text-gray-700 dark:text-gray-300">How it works:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Player scans QR code with their phone</li>
            <li>Fills in name, gender, rank, categories</li>
            <li>Automatically joins the queue</li>
          </ol>
        </div>
      </div>
    </Dialog>
  );
}
