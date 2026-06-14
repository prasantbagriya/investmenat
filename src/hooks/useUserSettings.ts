import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { setDoc } from '../firebase-sync';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { UserSettings } from '../types';

export function useUserSettings(user: User | null) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserSettings(null);
      setIsLocked(false);
      return;
    }

    if (user.uid.startsWith('guest_offline_')) {
      const savedSettings: UserSettings = JSON.parse(localStorage.getItem(`settings_${user.uid}`) || 'null') || {
        id: user.uid,
        smartApiAppName: 'Guest Account',
        smartApiRedirectUrl: 'https://guest.online/',
        smartApiPostbackUrl: '-',
        smartApiPrimaryIp: '127.0.0.1',
        smartApiSecondaryIp: '-',
        smartApiKey: 'fy2JiRJ2',
        smartApiClientId: '',
        smartApiTotpSecret: '',
        smartApiIsActive: false
      };
      setUserSettings(savedSettings);
      setIsLocked(!!savedSettings.pin);
      return () => {};
    }

    const unsubscribe = onSnapshot(
      doc(db, 'usersettings', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const sets = snapshot.data() as UserSettings;
          setUserSettings(sets);
          setIsLocked(!!sets.pin);
        } else {
          // Preset default credentials for the user in firestore on initial signup
          const defaultSets: UserSettings = {
            id: user.uid,
            smartApiAppName: 'InvestMant User',
            smartApiRedirectUrl: 'https://investmant.online/',
            smartApiPostbackUrl: '-',
            smartApiPrimaryIp: '127.0.0.1',
            smartApiSecondaryIp: '-',
            smartApiKey: 'fy2JiRJ2',
            smartApiClientId: '',
            smartApiTotpSecret: '',
            smartApiIsActive: false
          };
          setDoc(doc(db, 'usersettings', user.uid), defaultSets)
            .then(() => {
              setUserSettings(defaultSets);
            })
            .catch(err => console.warn('Error auto-seeding user settings:', err));
          setIsLocked(false);
        }
      },
      (error) => console.warn('Could not read user PIN settings:', error)
    );

    return () => unsubscribe();
  }, [user]);

  return { userSettings, isLocked, setIsLocked, setUserSettings };
}
