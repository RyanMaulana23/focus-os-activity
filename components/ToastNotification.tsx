'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { usePlaylistStore, Toast } from '@/lib/stores/playlistStore';

export function ToastNotification() {
  const { toasts, removeToast } = usePlaylistStore();

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getColorClass = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-950/40 text-emerald-100 shadow-emerald-950/50';
      case 'error':
        return 'border-rose-500/30 bg-rose-950/40 text-rose-100 shadow-rose-950/50';
      case 'info':
      default:
        return 'border-blue-500/30 bg-blue-950/40 text-blue-100 shadow-blue-950/50';
    }
  };

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-55 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all ${getColorClass(
              toast.type
            )}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-1 text-xs sm:text-sm font-medium leading-5">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
