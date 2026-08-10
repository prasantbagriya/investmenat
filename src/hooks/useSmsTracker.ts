import { useEffect } from 'react';
import { Transaction } from '../types';

declare global {
  interface Window {
    SMSReceive?: any;
  }
}

export function useSmsTracker(
  user: any,
  handleAddTransaction: (txData: Omit<Transaction, 'id' | 'userId'>) => Promise<void>
) {
  useEffect(() => {
    if (!user) return;
    
    // Only run on Capacitor Android with cordova-plugin-sms-receive installed
    if (typeof window !== 'undefined' && window.SMSReceive) {
      window.SMSReceive.startWatch(
        () => console.log('SMSReceive plugin started watching'),
        (err: any) => console.warn('SMSReceive plugin failed to start watching', err)
      );

      const onSMSArrive = async (e: any) => {
        try {
          const sms = e.data;
          const message = sms.body.toLowerCase();
          
          // Extremely basic RegEx for common Indian bank SMS formats
          // Example: "Rs. 1,500.00 debited from A/c XX1234 on 12-06-2026"
          const amountRegex = /(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i;
          const match = message.match(amountRegex);
          
          if (match && match[1]) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            const date = new Date().toISOString().split('T')[0];
            
            if (message.includes('debited') || message.includes('spent') || message.includes('deducted')) {
              await handleAddTransaction({
                type: 'expense',
                amount: amount,
                category: 'Auto-SMS',
                date: date,
                notes: `Auto-logged from SMS: ${sms.address}`
              });
            } else if (message.includes('credited') || message.includes('received') || message.includes('added')) {
              await handleAddTransaction({
                type: 'income',
                amount: amount,
                category: 'Auto-SMS',
                date: date,
                notes: `Auto-logged from SMS: ${sms.address}`
              });
            }
          }
        } catch (error) {
          console.error("Error processing incoming SMS", error);
        }
      };

      document.addEventListener('onSMSArrive', onSMSArrive);

      return () => {
        document.removeEventListener('onSMSArrive', onSMSArrive);
        window.SMSReceive.stopWatch(
          () => console.log('SMSReceive plugin stopped watching'),
          (err: any) => console.warn('SMSReceive plugin failed to stop watching', err)
        );
      };
    }
  }, [user, handleAddTransaction]);
}
