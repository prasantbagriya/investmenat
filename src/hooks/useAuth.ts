import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingMigrationData, setPendingMigrationData] = useState<any | null>(null);

  useEffect(() => {
    const isOffline = localStorage.getItem('isOfflineMode') === 'true';
    if (isOffline) {
      const guestId = localStorage.getItem('guest_user_id') || ('guest_offline_' + Math.random().toString(36).substring(2, 11));
      localStorage.setItem('guest_user_id', guestId);
      setUser({
        uid: guestId,
        email: 'guest@investmant.local',
        displayName: 'Guest Account',
        isAnonymous: true,
        emailVerified: false,
        photoURL: ''
      } as any);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        // Evaluate if there is offline guest data that we should ask the user to migrate/link
        const guestId = localStorage.getItem('guest_user_id');
        if (guestId) {
          const guestTxs = JSON.parse(localStorage.getItem(`tx_${guestId}`) || '[]');
          const guestPay = JSON.parse(localStorage.getItem(`pay_${guestId}`) || '[]');
          const guestGoals = JSON.parse(localStorage.getItem(`goals_${guestId}`) || '[]');
          const guestLimits = JSON.parse(localStorage.getItem(`limits_${guestId}`) || '[]');
          const guestHoldings = JSON.parse(localStorage.getItem(`holdings_${guestId}`) || '[]');
          const guestRealized = JSON.parse(localStorage.getItem(`realized_trades_${guestId}`) || '[]');
          const guestSips = JSON.parse(localStorage.getItem(`sips_${guestId}`) || '[]');
          const guestFds = JSON.parse(localStorage.getItem(`fds_${guestId}`) || '[]');
          const guestWatch = JSON.parse(localStorage.getItem(`watchlist_${guestId}`) || '[]');
          const guestSettings = JSON.parse(localStorage.getItem(`settings_${guestId}`) || 'null');

          const hasData = guestTxs.length || guestPay.length || guestGoals.length || guestLimits.length || 
                          guestHoldings.length || guestRealized.length || guestSips.length || guestFds.length || 
                          guestWatch.length;

          if (hasData) {
            setPendingMigrationData({
              uid: usr.uid,
              guestId,
              data: {
                transactions: guestTxs,
                pendingPayments: guestPay,
                savingsGoals: guestGoals,
                budgetLimits: guestLimits,
                holdings: guestHoldings,
                realizedTrades: guestRealized,
                sips: guestSips,
                fds: guestFds,
                watchlist: guestWatch,
                userSettings: guestSettings
              }
            });
          } else {
            localStorage.removeItem('isOfflineMode');
            localStorage.removeItem('guest_user_id');
          }
        }
      }
      setUser(usr);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, setUser, authLoading, setAuthLoading, pendingMigrationData, setPendingMigrationData };
}
