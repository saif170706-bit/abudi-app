// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// This config will be automatically replaced with your project's config by the hosting service
const firebaseConfig = {
  apiKey: "AIzaSyAeSnXOHLekELX6RqKM44Dyap04_m9eEf0",
  authDomain: "studio-3085722089-f47ec.firebaseapp.com",
  projectId: "studio-3085722089-f47ec",
  storageBucket: "studio-3085722089-f47ec.appspot.com",
  messagingSenderId: "844928643527",
  appId: "1:844928643527:web:d995c68a8435184282a9e2"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // If the message contains a notification block, FCM will show it automatically
  // in the background. We only show a manual one if it's a data-only message.
  if (payload.notification) return;

  const notificationTitle = payload.data?.title || 'Ny besked';
  const notificationOptions = {
    body: payload.data?.body || 'Du har fået en ny besked.',
    icon: 'https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png',
    badge: 'https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png',
    image: payload.data?.image || undefined,
    tag: payload.data?.tag || undefined, // CRITICAL: Forces OS to collapse duplicates
    renotify: !!payload.data?.tag, // Vibrate for each new message even if collapsed
    data: {
        ...payload.data
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const data = event.notification.data || {};
    let link = data.link || '/';

    // Build the deep link dynamically if it's from Stream Chat
    const channelId = data['stream.channel_id'] || data.channel_id;
    const channelType = data['stream.channel_type'] || data.channel_type;
    
    if (channelId && channelType) {
        link = `/?view=chat&cid=${channelType}:${channelId}&source=push`;
    }

    event.waitUntil(clients.openWindow(link));
});
