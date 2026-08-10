import { useEffect } from 'react';
import { flushFallbacksToCloud } from '../utils/fallbackManager';
import { User } from 'firebase/auth';

export function useFallbackSync(user: User | null) {

  useEffect(() => {
    if (!user || user.uid.startsWith('guest_offline_')) return;

    // Run once on load
    flushFallbacksToCloud(user);

    // Run when network comes online
    const handleOnline = () => flushFallbacksToCloud(user);
    window.addEventListener('online', handleOnline);

    // Also run an interval every 30 seconds just in case
    const intervalId = setInterval(() => {
      flushFallbacksToCloud(user);
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, [user]);
}
