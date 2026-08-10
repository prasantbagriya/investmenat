import { useEffect } from 'react';

declare global {
  interface Window {
    SMSReceive?: any;
  }
}

export function useSmsListener(onSmsReceived: (text: string) => void) {
  useEffect(() => {
    // Check if plugin is available
    if (!window.SMSReceive) return;

    // Start watching for SMS - Wrap in try/catch because if SMS permission is missing,
    // the plugin can throw a SecurityException and force close the entire Android app.
    try {
      window.SMSReceive.startWatch(
        () => {
          console.log('SMS Watch started');
        },
        (err: any) => {
          console.warn('SMS Watch start failed', err);
        }
      );
    } catch (e) {
      console.warn('SMS plugin startWatch crashed (missing permissions?):', e);
    }

    const handleSmsArrival = (e: any) => {
      const sms = e.data;
      if (sms && sms.body) {
        console.log('Received SMS:', sms.body);
        onSmsReceived(sms.body);
      }
    };

    document.addEventListener('onSMSArrive', handleSmsArrival);

    return () => {
      document.removeEventListener('onSMSArrive', handleSmsArrival);
      if (window.SMSReceive) {
        try {
          window.SMSReceive.stopWatch(
            () => console.log('SMS Watch stopped'),
            () => console.warn('SMS Watch stop failed')
          );
        } catch (e) {
          console.warn('SMS plugin stopWatch crashed:', e);
        }
      }
    };
  }, [onSmsReceived]);
}
