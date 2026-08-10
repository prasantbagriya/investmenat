import { useState, useEffect, useCallback } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const sendNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 100000),
              title: title,
              body: options?.body || '',
              schedule: { at: new Date(Date.now() + 100) },
              smallIcon: 'ic_launcher',
              iconColor: '#4f46e5',
            }
          ]
        });
      } catch (e) {
        console.error('Failed to send native local notification', e);
      }
      return;
    }

    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            icon: '/vite.svg',
            badge: '/vite.svg',
            ...options
          });
        } else {
          const notification = new Notification(title, {
            icon: '/vite.svg',
            badge: '/vite.svg',
            ...options
          });
          notification.onclick = function() {
            window.focus();
            this.close();
          };
        }
      } catch (e) {
        console.error('Failed to send web notification', e);
      }
    }
  }, []);

  useEffect(() => {
    const initPermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await LocalNotifications.checkPermissions();
          if (status.display === 'granted') {
            setPermission('granted');
          } else if (status.display === 'denied') {
            setPermission('denied');
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        if ('Notification' in window) {
          setPermission(Notification.permission);
        }
      }
    };
    initPermissions();

    try {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('[usePushNotifications] Foreground message received:', payload);
        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationOptions = {
          body: payload.notification?.body,
          icon: payload.notification?.image || '/vite.svg',
        };
        
        // Show native browser notification even if app is in foreground
        sendNotification(notificationTitle, notificationOptions);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn('Firebase messaging not fully supported or configured in this environment:', err);
    }
  }, [sendNotification]);

  const requestPermission = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await LocalNotifications.requestPermissions();
        if (status.display === 'granted') {
          setPermission('granted');
          return true;
        } else {
          setPermission('denied');
          return false;
        }
      } catch (e) {
        console.error('Error requesting native notification permission', e);
        return false;
      }
    }

    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  return { permission, requestPermission, sendNotification };
}
