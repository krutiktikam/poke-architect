import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader2 } from 'lucide-react';

const subscribeOnline = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

const getOnlineSnapshot = () => (typeof navigator !== 'undefined' ? navigator.onLine : true);
const getOnlineServerSnapshot = () => true;

export const ServerStatusNotice: React.FC = () => {
  const isFetching = useIsFetching();
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const [isWakingServer, setIsWakingServer] = useState<boolean>(false);

  useEffect(() => {
    if (isFetching > 0) {
      const timer = setTimeout(() => {
        setIsWakingServer(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        setIsWakingServer(false);
      };
    }
  }, [isFetching]);

  const showWakingNotice = isFetching > 0 && isWakingServer;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline-notice"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-500/90 text-white font-bold text-xs shadow-xl backdrop-blur-md pointer-events-auto border border-amber-400/40"
          >
            <WifiOff size={16} />
            <span>You are currently offline. Showing cached encyclopedia data.</span>
          </motion.div>
        )}

        {isOnline && showWakingNotice && (
          <motion.div
            key="waking-notice"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-indigo-950/90 text-indigo-200 text-xs font-semibold shadow-2xl backdrop-blur-md pointer-events-auto border border-indigo-500/30"
          >
            <Loader2 size={16} className="animate-spin text-indigo-400" />
            <span>Waking the server… (Render free-tier instances may take ~30s to boot)</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerStatusNotice;
