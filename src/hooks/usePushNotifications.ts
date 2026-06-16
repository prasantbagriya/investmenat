import { useState, useEffect, useCallback } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app } from '../firebase';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const sendNotification = useCallback(async (title: string, options?: NotificationOptions) => {
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
        console.error('Failed to send notification', e);
      }
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

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
