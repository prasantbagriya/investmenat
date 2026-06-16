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

    // Start watching for SMS
    window.SMSReceive.startWatch(
      () => {
        console.log('SMS Watch started');
      },
      (err: any) => {
        console.warn('SMS Watch start failed', err);
      }
    );

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
        window.SMSReceive.stopWatch(
          () => console.log('SMS Watch stopped'),
          () => console.warn('SMS Watch stop failed')
        );
      }
    };
  }, [onSmsReceived]);
}
