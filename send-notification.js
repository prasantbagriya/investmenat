import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Check if GOOGLE_APPLICATION_CREDENTIALS is set
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
  console.error("Please set it to the path of your Firebase service account key JSON file.");
  process.exit(1);
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: applicationDefault()
});

const db = getFirestore(app);
const messaging = getMessaging(app);

async function sendNotifications(title, body) {
  console.log('Fetching active device tokens from Firestore...');
  
  try {
    const tokensSnapshot = await db.collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('⚠️ No registered devices found in "fcmTokens" collection.');
      return;
    }

    const tokens = [];
    tokensSnapshot.forEach(doc => {
      tokens.push(doc.data().token);
    });

    console.log(`Found ${tokens.length} device(s). Sending notifications...`);

    const message = {
      notification: {
        title: title || 'Test Notification',
        body: body || 'This is a push notification from the backend system.',
        // Optional image URL can be added here
      },
      tokens: tokens, // Multicast message
    };

    const response = await messaging.sendEachForMulticast(message);
    
    console.log(`✅ Successfully sent ${response.successCount} messages.`);
    if (response.failureCount > 0) {
      console.error(`❌ Failed to send ${response.failureCount} messages.`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Token ${tokens[idx]} failed: ${resp.error.message}`);
          // You could optionally delete invalid tokens from Firestore here
        }
      });
    }

  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

// Get arguments from CLI
const args = process.argv.slice(2);
const title = args[0];
const body = args[1];

sendNotifications(title, body);
