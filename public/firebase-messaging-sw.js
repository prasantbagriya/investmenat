// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  projectId: "investstment",
  appId: "1:1004464827659:web:6499bf9b094606097e860e",
  apiKey: "AIzaSyDjRd6povzISgW0I3wQ0cAW5mE6z4ZYQnQ",
  authDomain: "investstment.firebaseapp.com",
  storageBucket: "investstment.firebasestorage.app",
  messagingSenderId: "1004464827659",
  measurementId: "G-ZLGVHHMKE8"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  const notificationTitle = payload.notification?.title || 'Task Overdue!';
  const notificationOptions = {
    body: payload.notification?.body || 'A task due time has completed.',
    icon: '/assets/logo.png', // Optional asset
    badge: '/assets/badge.png', // Optional asset
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle clicking of background push notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked: ', event.notification.data);
  event.notification.close();

  // Handle URL redirect inside the client environment
  const targetUrl = '/'; // Redirects core route on browser click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
