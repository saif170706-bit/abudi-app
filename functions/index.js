const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * MOBILE APP PUSH: Expo push tokens live in a separate `expoPushTokens`
 * subcollection (sibling of `fcmTokens`) — see mobile/src/lib/push-notifications.ts.
 * They're kept apart because an Expo token ("ExponentPushToken[...]") is not
 * a valid FCM registration token, so mixing them into `fcmTokens` would make
 * every fcmTokens-based send loop below fail on it and mistake it for a dead
 * FCM token, deleting a token that was never actually invalid.
 *
 * Sends via Expo's push HTTP API (https://exp.host/--/api/v2/push/send) —
 * Expo relays to real FCM/APNs on the client's behalf, so no native
 * google-services.json / GoogleService-Info.plist config is required here.
 */
async function sendExpoPush({ to, title, body, data }) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, title, body, data, sound: "default", priority: "high" }),
  });
  return res.json();
}

/**
 * Reads `{col}/{uid}/expoPushTokens` and enqueues one `notificationRequests`
 * doc per token (marked with `expoPushToken` instead of `fcmToken`) into the
 * given batch — mirrors the existing fcmTokens enqueue pattern used
 * throughout this file so notifyOnNotificationRequest can fan both out from
 * one trigger. Call this right after the matching fcmTokens loop at each
 * send site; it's purely additive and never touches fcmTokens.
 */
async function enqueueExpoPushRequests(batch, col, uid, title, body, dataPayload) {
  const tokenSnap = await db.collection(col).doc(uid).collection("expoPushTokens").get();
  let count = 0;
  tokenSnap.forEach((tDoc) => {
    const reqRef = db.collection("notificationRequests").doc();
    batch.set(reqRef, {
      toUid: uid,
      expoPushToken: tDoc.id,
      title,
      body,
      data: dataPayload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    count++;
  });
  return count;
}

let serverClient = null;
function getStreamClient() {
  if (serverClient) return serverClient;
  const { StreamChat } = require("stream-chat");
  const streamApiKey = process.env.STREAM_API_KEY || "y6fwhwm7qv3y";
  const streamSecret = process.env.STREAM_SECRET_KEY;
  try {
    serverClient = StreamChat.getInstance(streamApiKey, streamSecret || 'placeholder');
    return serverClient;
  } catch (e) {
    console.error("[StreamChat] Failed to initialize client:", e.message);
    return null;
  }
}

/**
 * STREAM WEBHOOK: The most robust way to handle push notifications.
 * Listens for new messages directly from Stream's servers.
 */
exports.streamWebhook = onRequest({
  cors: false,          // Server-to-server only — no browser origin needed
  rawBody: true,        // Required for signature verification
}, async (req, res) => {
  // ── Signature Verification ─────────────────────────────────────────
  // Reject any request that doesn't come from Stream's servers.
    const streamSecret = process.env.STREAM_SECRET_KEY;
    if (streamSecret) {
        const signature = req.headers['x-signature'] || '';
        const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
        try {
            const client = getStreamClient();
            if (!client) throw new Error("Stream client unavailable");
            const isValid = client.verifyWebhook(rawBody, signature);
            if (!isValid) {
                console.warn('[StreamWebhook] REJECTED: Invalid signature. Possible spoofed request.');
                return res.status(401).send('Invalid webhook signature');
            }
        } catch (verifyErr) {
            console.error('[StreamWebhook] Signature verification error:', verifyErr.message);
            return res.status(401).send('Signature verification failed');
        }
    }

  const event = req.body;
  console.log('[StreamWebhook] Received event:', event?.type, 'Channel:', event?.channel?.id);

  if (!event || event.type !== 'message.new') {
    console.log('[StreamWebhook] Skipping non-message event');
    return res.status(200).send('Event ignored');
  }

  const message = event.message;
  const channel = event.channel;
  const members = event.members || (channel ? channel.members : null);
  const sender = event.user || (message ? message.user : null);

  if (!message || !channel || !members || !sender) {
    console.error('[StreamWebhook] Missing required data in event. Keys:', Object.keys(event));
    return res.status(200).send('Missing data');
  }

  const channelCid = `${channel.type}:${channel.id}`;
  const recipients = members
    .map(m => m.user_id)
    .filter(id => id !== sender.id);

  console.log('[StreamWebhook] Message from:', sender.name, 'CID:', channelCid, 'Recipients:', recipients);

  if (recipients.length === 0) {
    console.log('[StreamWebhook] No recipients to notify');
    return res.status(200).send('No recipients');
  }

  const batch = db.batch();
  let count = 0;

  const isGroup = members.length > 2;
  const rawTitle = isGroup && channel.name ? `${sender.name} (${channel.name})` : sender.name;

  await Promise.all(recipients.map(async (uid) => {
    let userLang = 'da';
    try {
      const collections = ['students', 'teachers', 'admins'];
      for (const col of collections) {
        const userDoc = await db.collection(col).doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userLang = userData.language || 'da';

          // Presence Check: Skip if user is actively looking at THIS chat
          if (userData.currentChatId === channelCid) {
            try {
              // Ask Stream: "Are they actually connected right now?"
              const { users } = await serverClient.queryUsers({ id: { $in: [uid] } });
              const streamUser = users[0];

              const isTrulyOnline = streamUser && streamUser.online;
              if (isTrulyOnline) {
                console.log(`[StreamWebhook] SKIP: User ${uid} is actively online in ${channelCid}`);
                return;
              } else {
                console.log(`[StreamWebhook] OVERRULE: User ${uid} is offline. Delivering despite currentChatId.`);
              }
            } catch (queryErr) {
              console.error(`[StreamWebhook] Presence check failed for ${uid}:`, queryErr.message);
              // If check fails, default to sending the notification (safety first)
            }
          }
        }
        break;
      }
    } catch (e) {
      console.error(`[StreamWebhook] Error fetching user ${uid}:`, e);
    }

    const isGroup = members.length > 2 || (channel.name && channel.name !== '');

    const localizedMessageWord = {
      'ar': 'رسالة',
      'so': 'Fariin',
      'en': 'Message',
      'da': 'Besked'
    }[userLang] || 'Besked';

    // Group logic: Title = Group Name, Body = Name: Text
    // DM logic: Title = Besked - Name, Body = Text
    const finalTitle = isGroup ? (channel.name || 'Gruppe') : `${localizedMessageWord} - ${sender.name}`;
    const finalBody = isGroup ? `${sender.name}: ${message.text || 'Ny fil'}` : (message.text || 'Ny fil modtaget');

    const attachment = message.attachments && message.attachments[0];
    const imageUri = attachment?.image_url || attachment?.thumb_url;

    for (const col of ['students', 'teachers', 'admins']) {
      const tokensColRef = db.collection(col).doc(uid).collection('fcmTokens');
      const tokenSnap = await tokensColRef.get();
      const expoTokensColRef = db.collection(col).doc(uid).collection('expoPushTokens');
      const expoTokenSnap = await expoTokensColRef.get();

      if (tokenSnap.empty && expoTokenSnap.empty) continue;

      if (!expoTokenSnap.empty) {
        console.log(`[StreamWebhook] Sending Expo push to ${expoTokenSnap.size} mobile device(s) for ${uid}`);
        const expoChatData = {
          type: 'chatMessage',
          link: `/?view=chat&cid=${channelCid}&source=push`,
          tag: message.id,
          cid: channelCid,
          'stream.channel_type': channel.type,
          'stream.channel_id': channel.id,
          'stream.message_id': message.id
        };
        await Promise.all(expoTokenSnap.docs.map(async (tDoc) => {
          const expoToken = tDoc.id;
          try {
            const result = await sendExpoPush({ to: expoToken, title: finalTitle, body: finalBody, data: expoChatData });
            const ticket = result?.data;
            if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
              await expoTokensColRef.doc(expoToken).delete().catch(() => null);
            } else {
              count++;
            }
          } catch (err) {
            console.error(`[StreamWebhook] Expo push FAIL:`, err.message);
          }
        }));
      }

      if (!tokenSnap.empty) {
        const allTokens = tokenSnap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          lastUpdated: d.data().lastUpdated?.toDate() || new Date(0)
        }));

        const twentyDaysAgo = new Date();
        twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

        const uaGroups = {};
        allTokens.forEach(t => {
          const ua = t.ua || 'unknown';
          if (!uaGroups[ua]) uaGroups[ua] = [];
          uaGroups[ua].push(t);
        });

        const activeTokens = [];
        const toDeleteIds = [];

        Object.keys(uaGroups).forEach(ua => {
          const group = uaGroups[ua];
          group.sort((a, b) => b.lastUpdated - a.lastUpdated);
          const freshest = group[0];
          if (freshest.lastUpdated >= twentyDaysAgo) {
            activeTokens.push(freshest);
          } else {
            toDeleteIds.push(freshest.id);
          }
          for (let i = 1; i < group.length; i++) {
            toDeleteIds.push(group[i].id);
          }
        });

        if (toDeleteIds.length > 0) {
          console.log(`[StreamWebhook] Purging ${toDeleteIds.length} obsolete tokens for ${uid}`);
          await Promise.all(toDeleteIds.map(id => tokensColRef.doc(id).delete().catch(() => null)));
        }

        console.log(`[StreamWebhook] Sending to ${activeTokens.length} valid devices for ${uid}`);

        await Promise.all(activeTokens.map(async (tInfo) => {
          const fcmToken = tInfo.id;
          const deviceName = tInfo.ua ? (tInfo.ua.includes('iPhone') ? 'iPhone' : tInfo.ua.includes('Android') ? 'Android' : 'Desktop') : 'Unknown';

          const pushMessage = {
            token: fcmToken,
            data: {
              type: 'chatMessage',
              title: finalTitle,
              body: finalBody,
              link: `/?view=chat&cid=${channelCid}&source=push`,
              tag: message.id,
              cid: channelCid,
              image: imageUri || '',
              'stream.channel_type': channel.type,
              'stream.channel_id': channel.id,
              'stream.message_id': message.id
            },
            android: {
              priority: 'high',
              collapseKey: message.id
            },
            webpush: {
              headers: {
                Topic: message.id,
                Urgency: 'high',
                TTL: '0'
              },
              fcmOptions: {
                link: `/?view=chat&cid=${channelCid}&source=push`
              }
            }
          };

          try {
            await messaging.send(pushMessage);
            console.log(`[StreamWebhook] SUCCESS: Delivered to ${deviceName} (...${fcmToken.slice(-5)})`);
            count++;
          } catch (err) {
            console.error(`[StreamWebhook] FAIL (${deviceName}):`, err.message);
            if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token') {
              await tokensColRef.doc(fcmToken).delete().catch(() => null);
            }
          }
        }));
      }
      break;
    }
  }));

  console.log(`[StreamWebhook] Total delivered: ${count}`);
  res.status(200).send(`Delivered ${count} notifications`);
});

/**
 * NEW: Listens for documents created in 'chatNotificationRequests'.
 * (Maintained for legacy/client-triggered support)
 */
exports.sendChatPushOnRequest = onDocumentCreated("chatNotificationRequests/{messageId}", async (event) => {
  const data = event.data.data();
  const { sender, recipients, channelCid, messageText, title } = data;
  const channelType = data['stream.channel_type'];
  const channelId = data['stream.channel_id'];
  const messageId = data['stream.message_id'];

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return;
  }

  const batch = db.batch();
  let count = 0;

  const fetchTokensAndBatch = async (uid) => {
    const collections = ['students', 'teachers', 'admins'];
    for (const col of collections) {
      try {
        const tokenSnap = await db.collection(col).doc(uid).collection('fcmTokens').get();
        const chatData = {
          type: 'chatMessage',
          link: `/?view=chat&cid=${channelCid}&source=push`,
          tag: channelCid,
          cid: channelCid,
          'stream.channel_type': channelType,
          'stream.channel_id': channelId,
          'stream.message_id': messageId
        };
        const expoCount = await enqueueExpoPushRequests(batch, col, uid, title || 'Ny besked', messageText || 'Du har en ny besked.', chatData);
        count += expoCount;
        if (!tokenSnap.empty) {
          tokenSnap.forEach(tDoc => {
            const reqRef = db.collection('notificationRequests').doc();
            batch.set(reqRef, {
              toUid: uid,
              fcmToken: tDoc.id,
              title: title || 'Ny besked',
              body: messageText || 'Du har en ny besked.',
              data: chatData,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
          });
          return;
        }
        if (expoCount > 0) return;
      } catch (e) { }
    }
  };

  await Promise.all(recipients.map(uid => fetchTokensAndBatch(uid)));

  if (count > 0) {
    await batch.commit();
  }
});


/**
 * WORKER: Listens for new notification requests and sends the actual push.
 */
exports.notifyOnNotificationRequest = onDocumentCreated("notificationRequests/{id}", async (event) => {
  const data = event.data.data();
  if (!data || (!data.fcmToken && !data.expoPushToken)) {
    console.log('[NotifyWorker] Skipping: No token found in request.');
    return;
  }

  // Mobile app (Expo) push — separate delivery path, see sendExpoPush above.
  if (data.expoPushToken) {
    console.log(`[NotifyWorker] Sending Expo push to UID: ${data.toUid} using token: ${data.expoPushToken.substring(0, 18)}...`);
    try {
      const result = await sendExpoPush({
        to: data.expoPushToken,
        title: data.title,
        body: data.body,
        data: data.data || {},
      });
      const ticket = result?.data;
      console.log('[NotifyWorker] Expo push ticket:', JSON.stringify(ticket));
      if (ticket?.status === 'error' && (ticket.details?.error === 'DeviceNotRegistered')) {
        console.log(`[NotifyWorker] Removing stale Expo token for user ${data.toUid}`);
        const collections = ['students', 'teachers', 'admins'];
        for (const col of collections) {
          await db.doc(`${col}/${data.toUid}/expoPushTokens/${data.expoPushToken}`).delete().catch(() => null);
        }
      }
    } catch (error) {
      console.error('[NotifyWorker] Expo push delivery FAILED:', error.message);
    } finally {
      await event.data.ref.delete().catch(() => null);
    }
    return;
  }

  console.log(`[NotifyWorker] Sending push to UID: ${data.toUid} using token: ${data.fcmToken.substring(0, 10)}...`);

  const iconUrl = 'https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png';
  const link = data.data?.link || '/';

  const message = {
    token: data.fcmToken,
    notification: {
      title: data.title,
      body: data.body,
    },
    data: data.data || {},
    webpush: {
      notification: {
        icon: iconUrl,
        badge: iconUrl,
        image: data.data?.image || undefined, // Support banner image in browsers
        click_action: link,
        tag: data.data?.tag || 'general-notification'
      },
      fcm_options: { link }
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('[NotifyWorker] Actual FCM Send Success:', response);
  } catch (error) {
    console.error("[NotifyWorker] FCM Delivery FAILED:", error.message);
    if (data.toUid && (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token')) {
      console.log(`[NotifyWorker] Removing stale token for user ${data.toUid}`);
      const collections = ['students', 'teachers', 'admins'];
      for (const col of collections) {
        await db.doc(`${col}/${data.toUid}/fcmTokens/${data.fcmToken}`).delete().catch(() => null);
      }
    }
  } finally {
    // ── Always clean up the request doc after processing ──────────────
    // Prevents indefinite accumulation in the notificationRequests collection.
    await event.data.ref.delete().catch(() => null);
  }
});


/**
 * Admin: Sends localized notifications for global posts.
 * Uses the "Safe Fix" principle: All tracking variables are internal to the function.
 */
exports.sendAdminPostNotifications = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Admin only.');

  const adminDoc = await db.collection('admins').doc(request.auth.uid).get();
  if (!adminDoc.exists) throw new HttpsError('permission-denied', 'Unauthorized.');

  const { targetAudience, targetGender, specificRecipients, type, title: postTitle } = request.data;

  const uniqueUids = new Set();
  const link = `/?view=announcements&source=push`;

  const translations = {
    announcement: { da: "har sendt dig en meddelelse", en: "sent you an announcement", ar: "أرسل لك رسالة جديدة" },
    event: { da: "har inviteret dig til en begivenhed", en: "invited you to an event", ar: "تمت دعوتك إلى فعالية" },
    survey: { da: "mangler dit svar på en undersøgelse", en: "is waiting for your survey response", ar: "بانتظار ردك على الاستبيان" },
    livestream: { da: "har inviteret dig til et møde", en: "invited you to a meeting", ar: "تمت دعوتك إلى اجتماع" },
    livestream_start: { da: "Mødet er startet - deltag nu", en: "The meeting has started - join now", ar: "بدأ الاجتماع - انضم الآن" }
  };

  const localizedTitles = {
    da: "Notifikation",
    en: "Notification",
    ar: "إشعار"
  };

  try {
    // 1. Resolve Recipient UIDs based on fresh targeting
    if (targetAudience === 'specific' && Array.isArray(specificRecipients)) {
      specificRecipients.forEach(id => uniqueUids.add(id));
    } else {
      const collections = [];
      if (targetAudience === 'all') collections.push('students', 'teachers', 'admins');
      else if (targetAudience === 'students') collections.push('students');
      else if (targetAudience === 'teachers') collections.push('teachers');
      else if (targetAudience === 'man' || targetAudience === 'woman') collections.push('students', 'teachers', 'admins');

      for (const colName of collections) {
        let q = db.collection(colName);

        if (targetAudience === 'man') q = q.where('gender', '==', 'man');
        else if (targetAudience === 'woman') q = q.where('gender', '==', 'woman');

        if (targetGender && targetGender !== 'all') {
          q = q.where('gender', '==', targetGender);
        }

        const snap = await q.get();
        snap.forEach(doc => uniqueUids.add(doc.id));
      }
    }

    const uids = Array.from(uniqueUids);
    const batch = db.batch();
    let count = 0;

    await Promise.all(uids.map(async (uid) => {
      let userData = null;
      for (const colName of ['students', 'teachers', 'admins']) {
        const d = await db.collection(colName).doc(uid).get();
        if (d.exists) {
          userData = d.data();
          break;
        }
      }

      if (!userData) return;

      const lang = userData.language || 'da';
      const localizedBody = translations[type]?.[lang] || translations.announcement[lang];
      const localizedTitle = localizedTitles[lang] || localizedTitles.da;

      const adminPostData = { type: 'adminPost', link, tag: 'global-post', source: 'push' };
      for (const colName of ['students', 'teachers', 'admins']) {
        const tokenSnap = await db.collection(colName).doc(uid).collection('fcmTokens').get();
        tokenSnap.forEach(tDoc => {
          const reqRef = db.collection('notificationRequests').doc();
          batch.set(reqRef, {
            toUid: uid,
            fcmToken: tDoc.id,
            title: localizedTitle,
            body: localizedBody,
            data: adminPostData,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          count++;
        });
        count += await enqueueExpoPushRequests(batch, colName, uid, localizedTitle, localizedBody, adminPostData);
      }
    }));

    if (count > 0) {
      await batch.commit();
    }

    return { success: true, count };
  } catch (error) {
    console.error('sendAdminPostNotifications error:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Teacher: Localized call notifications.
 */
exports.sendTeacherCall = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const { studentId, type, teacherName, room, callId } = request.data;

  try {
    const studentRef = db.collection('students').doc(studentId);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists) return { success: false, message: 'Student not found' };

    const studentData = studentDoc.data();
    const lang = studentData.language || 'da';

    const translations = {
      title: {
        da: "Det er din tur!",
        en: "It's your turn!",
        ar: "لقد حان دورك!"
      },
      physical: {
        da: `${teacherName} venter på dig i lokale ${room}.`,
        en: `${teacherName} is waiting for you in room ${room}.`,
        ar: `${teacherName} ينتظرك في الغرفة ${room}.`
      },
      virtual: {
        da: `${teacherName} ringer dig op nu. Vær klar...`,
        en: `${teacherName} is calling you now. Be ready...`,
        ar: `${teacherName} يتصل بك الآن. كن مستعداً...`
      }
    };

    const messageTitle = translations.title[lang] || translations.title.da;
    const messageBody = type === 'physical'
      ? (translations.physical[lang] || translations.physical.da)
      : (translations.virtual[lang] || translations.virtual.da);

    const link = type === 'virtual' ? `/audio/${callId}` : `/?view=homework-reading&source=push`;
    const tokensSnapshot = await studentRef.collection('fcmTokens').get();
    const callData = { type: 'teacherCall', link, tag: 'teacher-call', source: 'push' };

    const batch = db.batch();
    tokensSnapshot.forEach(tDoc => {
      const reqRef = db.collection('notificationRequests').doc();
      batch.set(reqRef, {
        toUid: studentId,
        fcmToken: tDoc.id,
        title: messageTitle,
        body: messageBody,
        data: callData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    const expoCount = await enqueueExpoPushRequests(batch, 'students', studentId, messageTitle, messageBody, callData);

    if (tokensSnapshot.empty && expoCount === 0) return { success: false, message: 'No tokens' };

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('sendTeacherCall error:', error);
    throw new HttpsError('internal', 'Call failed.');
  }
});

/**
 * CUSTOM CLAIMS: Automatically set Firebase Auth custom claims when a user
 * document is created in any of the three user collections.
 * 
 * This means useUserProfile() can read the role from the JWT token (0 reads)
 * instead of querying all three collections on every login (~3 reads).
 * 
 * At 500 users logging in once/day: saves ~1,500 reads/day automatically.
 */
async function setRoleClaim(uid, role) {
  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`[CustomClaims] Set role="${role}" for uid=${uid}`);
  } catch (err) {
    console.error(`[CustomClaims] Failed to set role for ${uid}:`, err.message);
  }
}

exports.onStudentCreated = onDocumentCreated('students/{uid}', async (event) => {
  await setRoleClaim(event.params.uid, 'student');
});

exports.onTeacherCreated = onDocumentCreated('teachers/{uid}', async (event) => {
  await setRoleClaim(event.params.uid, 'teacher');
});

exports.onAdminCreated = onDocumentCreated('admins/{uid}', async (event) => {
  await setRoleClaim(event.params.uid, 'admin');
});

exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
  const { uid, email } = user;
  for (const col of ['students', 'teachers', 'admins']) {
    const docRef = db.collection(col).doc(uid);
    const d = await docRef.get();
    if (d.exists) {
      await docRef.delete();
      break;
    }
  }
  if (email) {
    await db.collection('placeholders').doc(email.toLowerCase()).delete().catch(() => null);
  }
});

/**
 * ADMIN: Delete a user from Firebase Auth and all Firestore collections.
 * Called by AdminMembers.tsx when an admin clicks the delete button.
 */
exports.deleteUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  // Verify caller is admin
  const callerDoc = await db.collection('admins').doc(request.auth.uid).get();
  if (!callerDoc.exists) throw new HttpsError('permission-denied', 'Admin only.');

  const { uid } = request.data;
  if (!uid) throw new HttpsError('invalid-argument', 'uid is required.');

  try {
    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);
    // Firestore cleanup is handled by onUserDelete trigger above
    console.log(`[deleteUser] Deleted user ${uid} by admin ${request.auth.uid}`);
    return { success: true, message: 'User deleted.' };
  } catch (err) {
    console.error('[deleteUser] Error:', err.message);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * ADMIN: Update a user's email in Firebase Auth and their Firestore document.
 * Called by AdminMembers.tsx when an admin edits a user's email.
 */
exports.updateUserEmail = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const callerDoc = await db.collection('admins').doc(request.auth.uid).get();
  if (!callerDoc.exists) throw new HttpsError('permission-denied', 'Admin only.');

  const { uid, newEmail, role } = request.data;
  if (!uid || !newEmail || !role) throw new HttpsError('invalid-argument', 'uid, newEmail, and role are required.');

  try {
    // Update in Firebase Auth
    await admin.auth().updateUser(uid, { email: newEmail.toLowerCase() });

    // Update in Firestore
    const collection = `${role}s`; // 'students', 'teachers', 'admins'
    await db.collection(collection).doc(uid).update({ email: newEmail.toLowerCase() });

    console.log(`[updateUserEmail] Updated email for ${uid} to ${newEmail} by admin ${request.auth.uid}`);
    return { success: true };
  } catch (err) {
    console.error('[updateUserEmail] Error:', err.message);
    throw new HttpsError('internal', err.message);
  }
});

/**
 * ADMIN: Restore a previously deleted account's Firestore document.
 * Called by AdminMembers.tsx restoreAccount flow.
 */
exports.restoreAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const callerDoc = await db.collection('admins').doc(request.auth.uid).get();
  if (!callerDoc.exists) throw new HttpsError('permission-denied', 'Admin only.');

  const { uid, role } = request.data;
  if (!uid || !role) throw new HttpsError('invalid-argument', 'uid and role are required.');

  try {
    const userRecord = await admin.auth().getUser(uid);
    const collection = `${role}s`;
    const docRef = db.collection(collection).doc(uid);
    const existing = await docRef.get();

    if (!existing.exists) {
      await docRef.set({
        uid,
        email: userRecord.email || '',
        displayName: userRecord.displayName || '',
        photoURL: userRecord.photoURL || '',
        role,
        restoredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Re-apply role custom claim
    await admin.auth().setCustomUserClaims(uid, { role });

    console.log(`[restoreAccount] Restored ${uid} as ${role} by admin ${request.auth.uid}`);
    return { success: true };
  } catch (err) {
    console.error('[restoreAccount] Error:', err.message);
    throw new HttpsError('internal', err.message);
  }
});

exports.updateEventRegistrationCount = onDocumentCreated("events/{eventId}/registrations/{registrationId}", async (event) => {
  const eventId = event.params.eventId;
  const eventRef = db.collection('events').doc(eventId);
  try {
    await db.runTransaction(async (transaction) => {
      const registrationsSnapshot = await transaction.get(eventRef.collection('registrations'));
      const count = registrationsSnapshot.size;
      transaction.update(eventRef, { registrationCount: count });
    });
  } catch (error) {
    console.error('Error updating registration count:', error);
  }
});


/**
 * TASK 4: Atomic Queue Join with server-side geolocation validation.
 * 
 * Replaces the client-side updateDoc call to eliminate:
 * 1. Race conditions (two students getting same position)
 * 2. Geolocation bypass (client-side only check)
 * 
 * Called from: src/app/student/homework-reading/page.tsx
 */

const DESIGNATED_LOCATIONS = [
  { lat: 55.777020517702425, lon: 12.522056199450153, radius: 100 },
  { lat: 55.71671948579918, lon: 12.435200438173235, radius: 150 },
  { lat: 55.716644, lon: 12.435022, radius: 150 },
];

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * UNIVERSAL QUEUE JOIN:
 * All students join the same global pool (based on GENDER and TYPE).
 * If they choose a specific teacher, it's stored as a preference hint.
 */
exports.joinQueue = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { teacherId, type, lat, lon, displayName, photoURL, fcmToken, phoneNumber } = request.data;
  const uid = request.auth.uid;

  if (type !== 'physical' && type !== 'virtual') {
    throw new HttpsError('invalid-argument', 'type must be physical or virtual.');
  }

  // ── Geolocation check for physical ────────────────
  if (type === 'physical') {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new HttpsError('invalid-argument', 'Koordinater er påkrævet for fysisk kø.');
    }
    const isNearby = DESIGNATED_LOCATIONS.some(
      loc => getDistanceInMeters(lat, lon, loc.lat, loc.lon) <= loc.radius
    );
    if (!isNearby) {
      throw new HttpsError('permission-denied', 'Du er for langt væk fra skolen.');
    }
  }

  // 1. Get Student Gender and ID
  const studentDoc = await db.collection('students').doc(uid).get();
  if (!studentDoc.exists) throw new HttpsError('not-found', 'Elev ikke fundet.');
  const sData = studentDoc.data();
  const gender = sData.gender === 'woman' ? 'woman' : 'man';
  const studentNumber = sData.studentNumber || '-';

  const globalRef = db.collection('globalQueues').doc(type);
  const teacherRef = teacherId ? db.collection('teachers').doc(teacherId) : null;

  try {
    const result = await db.runTransaction(async (t) => {
      const gSnap = await t.get(globalRef);
      const tSnap = teacherRef ? await t.get(teacherRef) : null;
      
      const genderKey = `${gender}StudentsById`;
      const gData = gSnap.data() || {};
      const globalStudents = gData[genderKey] || {};

      // ── UNIVERSAL TICKET SYSTEM ────────────────
      // Every join increments the global counter, ensuring all students (dedicated/universal)
      // have a unique, consistent ticket number for the TV and calling systems.
      const nextTicket = (gData.lastTicketNumber || 0) + 1;

      // ── Hybrid Routing Decision ────────────────
      const isTeacherFiltered = tSnap?.exists && (tSnap.data().filteredStudents?.length > 0);
      const shouldUseDedicated = teacherId && isTeacherFiltered;

      if (shouldUseDedicated) {
        // 1. ADD TO DEDICATED QUEUE (queues/{teacherId})
        const qRef = db.collection('queues').doc(teacherId);
        const qSnap = await t.get(qRef);
        const qData = qSnap.exists ? qSnap.data() : {};
        const qStudents = qData.studentsById || {};
        
        if (qStudents[uid]) throw new HttpsError('already-exists', 'Du er allerede i denne lærers kø.');

        const studentEntry = {
          id: uid,
          name: displayName || sData.displayName || 'Elev',
          studentNumber: studentNumber,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          type,
          photoURL: photoURL || sData.photoURL || null,
          gender,
          source: 'dedicated',
          teacherName: tSnap.data().displayName || '...',
          ticketNumber: nextTicket // Assign the ticket number even here
        };

        t.set(qRef, { 
          studentsById: { ...qStudents, [uid]: studentEntry },
          lastUpdate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // IMPORTANT: Still update the global ticket counter
        t.set(globalRef, { lastTicketNumber: nextTicket }, { merge: true });

        // Clear any old redirection notifications when joining fresh (Dedicated)
        t.update(db.collection('students').doc(uid), { redirectNotification: admin.firestore.FieldValue.delete() });

        return { success: true, source: 'dedicated', teacherName: studentEntry.teacherName, ticketNumber: nextTicket };
      } else {
        // 2. ADD TO UNIVERSAL QUEUE (globalQueues)
        if (globalStudents[uid]) throw new HttpsError('already-exists', 'Du er allerede i køen.');

        const studentEntry = {
          id: uid,
          name: displayName || sData.displayName || 'Elev',
          studentNumber: studentNumber,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          type,
          photoURL: photoURL || sData.photoURL || null,
          fcmToken: fcmToken || null,
          phoneNumber: phoneNumber || null,
          gender,
          ticketNumber: nextTicket,
          preferredTeacherId: teacherId || null,
          preferredTeacherName: tSnap?.exists ? (tSnap.data().displayName || '...') : null,
          source: 'universal'
        };

        if (!gSnap.exists) {
          t.set(globalRef, { [genderKey]: { [uid]: studentEntry }, lastTicketNumber: nextTicket });
        } else {
          t.update(globalRef, { 
            [`${genderKey}.${uid}`]: studentEntry,
            lastTicketNumber: nextTicket
          });
        }

        // Clear any old redirection notifications when joining fresh
        t.update(db.collection('students').doc(uid), { redirectNotification: admin.firestore.FieldValue.delete() });

        return { success: true, ticketNumber: nextTicket, type, source: 'universal' };
      }
    });
    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('joinQueue failed:', error);
    throw new HttpsError('internal', 'Fejl ved tilmelding.');
  }
});

// Alias for client compatibility
exports.joinGlobalQueue = exports.joinQueue;

/**
 * Redirects all of this teacher's students (dedicated queue + global preferred)
 * into the universal pool so any available teacher can call them.
 */
exports.sendStudentsToOthers = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const teacherUid = request.auth.uid;
  
  const teacherDoc = await db.collection('teachers').doc(teacherUid).get();
  if (!teacherDoc.exists) throw new HttpsError('not-found', 'Lærer ikke fundet.');
  const tName = teacherDoc.data().displayName || '...';

  try {
    const tNow = admin.firestore.Timestamp.now();

    await db.runTransaction(async (t) => {
      // 1. ALL READS FIRST
      const gRefs = {
        physical: db.collection('globalQueues').doc('physical'),
        virtual: db.collection('globalQueues').doc('virtual')
      };
      const qRef = db.collection('queues').doc(teacherUid);

      const [gSnapPhys, gSnapVirt, qSnap] = await Promise.all([
        t.get(gRefs.physical),
        t.get(gRefs.virtual),
        t.get(qRef)
      ]);

      const gSnaps = { physical: gSnapPhys, virtual: gSnapVirt };
      const qData = qSnap.exists ? qSnap.data() : { studentsById: {} };
      const dedicatedStudentsById = qData.studentsById || {};

      // Container for all updates for this transaction
      const updates = {
        physical: {},
        virtual: {}
      };
      const studentDocUpdates = new Set(); // Track which student docs we've already queued for update

      // Step A: Process Global Queues (Migrate 'preferred' students to 'universal')
      for (const type of ['physical', 'virtual']) {
        const snap = gSnaps[type];
        if (snap.exists) {
          const data = snap.data();
          ['manStudentsById', 'womanStudentsById'].forEach(genderKey => {
            const map = data[genderKey] || {};
            Object.entries(map).forEach(([sid, entry]) => {
              // Safety check: ensure entry exists and has preferredTeacherId
              if (entry && entry.preferredTeacherId === teacherUid) {
                updates[type][`${genderKey}.${sid}`] = {
                  ...entry,
                  preferredTeacherId: null,
                  preferredTeacherName: null,
                  redirectNotification: { teacherName: tName, timestamp: tNow }
                };
                
                if (!studentDocUpdates.has(sid)) {
                  t.set(db.collection('students').doc(sid), {
                    redirectNotification: { teacherName: tName, timestamp: tNow }
                  }, { merge: true });
                  studentDocUpdates.add(sid);
                }
              }
            });
          });
        }
      }

      // Step B: Handle Dedicated Queue (Move students to Global Pool)
      // These students get a NEW ticket number in the global pool
      for (const type of ['physical', 'virtual']) {
        let lastTicket = gSnaps[type].exists ? (gSnaps[type].data().lastTicketNumber || 0) : 0;
        
        // Find dedicated students of THIS type
        const studentsToMove = Object.entries(dedicatedStudentsById)
          .filter(([_, entry]) => {
            const studentType = entry.type === 'virtual' ? 'virtual' : 'physical';
            return studentType === type;
          });

        if (studentsToMove.length > 0) {
          studentsToMove.forEach(([sid, entry]) => {
            if (!entry) return;
            const genderKey = entry.gender === 'woman' ? 'womanStudentsById' : 'manStudentsById';
            
            // If the student already has a ticket number (from the new unified join logic), keep it.
            // Otherwise, assign a new one.
            const studentTicket = entry.ticketNumber || (lastTicket + 1);
            if (!entry.ticketNumber) lastTicket += 1;

            updates[type][`${genderKey}.${sid}`] = {
              ...entry,
              preferredTeacherId: null,
              preferredTeacherName: null,
              source: 'universal',
              ticketNumber: studentTicket,
              redirectNotification: { teacherName: tName, timestamp: tNow }
            };

            if (!studentDocUpdates.has(sid)) {
              t.set(db.collection('students').doc(sid), {
                redirectNotification: { teacherName: tName, timestamp: tNow }
              }, { merge: true });
              studentDocUpdates.add(sid);
            }
          });
          
          // Update the global ticket counter
          updates[type]['lastTicketNumber'] = lastTicket;
        }
      }

      // 3. APPLY UPDATES
      // CRITICAL: t.update() is required here — dot-notation keys like "manStudentsById.uid"
      // are interpreted as NESTED field paths only by update(), NOT by set()+merge.
      // Using set()+merge would write a literal field named "manStudentsById.uid" at the
      // top level, making students completely invisible to the teacher's queue listeners.
      for (const type of ['physical', 'virtual']) {
        if (Object.keys(updates[type]).length > 0) {
          if (gSnaps[type].exists) {
            // Document exists — use update() so dots are treated as nested paths
            t.update(gRefs[type], updates[type]);
          } else {
            // Document doesn't exist yet — build a proper nested object for set()
            // (rare: can only happen if the global queue was never initialised)
            const nested = {};
            for (const [key, value] of Object.entries(updates[type])) {
              const parts = key.split('.');
              let obj = nested;
              for (let i = 0; i < parts.length - 1; i++) {
                if (!obj[parts[i]]) obj[parts[i]] = {};
                obj = obj[parts[i]];
              }
              obj[parts[parts.length - 1]] = value;
            }
            t.set(gRefs[type], nested, { merge: true });
          }
        }
      }

      if (qSnap.exists) {
        t.delete(qRef);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('sendStudentsToOthers failed:', error);
    throw new HttpsError('internal', 'Fejl ved viderestilling: ' + error.message);
  }
});

/**
 * Allows a student to update their preferred teacher while already in queue.
 */
exports.updateQueuePreference = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { teacherId, type } = request.data;
    const uid = request.auth.uid;
    if (!type) throw new HttpsError('invalid-argument', 'Type is required.');

    const tSnap = teacherId ? await db.collection('teachers').doc(teacherId).get() : null;
    const tName = tSnap?.exists ? tSnap.data().displayName : null;

    try {
        await db.runTransaction(async (t) => {
            const studentRef = db.collection('students').doc(uid);
            const sSnap = await t.get(studentRef);
            if (!sSnap.exists) throw new HttpsError('not-found', 'Student not found.');
            const sData = sSnap.data();
            const gender = sData.gender === 'woman' ? 'woman' : 'man';

            const gRef = db.collection('globalQueues').doc(type);
            const gSnap = await t.get(gRef);
            if (!gSnap.exists) throw new HttpsError('not-found', 'Queue not found.');

            const genderKey = `${gender}StudentsById`;
            const map = gSnap.data()[genderKey] || {};
            if (!map[uid]) throw new HttpsError('not-found', 'Not in queue.');

            t.update(gRef, {
                [`${genderKey}.${uid}.preferredTeacherId`]: teacherId || null,
                [`${genderKey}.${uid}.preferredTeacherName`]: tName
            });

            // Clear the notification if it was there
            t.update(studentRef, { redirectNotification: admin.firestore.FieldValue.delete() });
        });
        return { success: true };
    } catch (error) {
        console.error('updateQueuePreference failed:', error);
        throw new HttpsError('internal', 'Kunne ikke opdatere lærer.');
    }
});

/**
 * NEW: Precise calling logic for teachers.
 * Replaces frontend batching. Atomically picks either the next student 
 * from the teacher's specific queue OR the global queue (whichever is older).
 */
exports.callQueueStudent = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const teacherUid = request.auth.uid;

  const teacherDoc = await db.collection('teachers').doc(teacherUid).get();
  if (!teacherDoc.exists) throw new HttpsError('not-found', 'Lærer ikke fundet.');
  const tData = teacherDoc.data();
  const gender = tData.gender === 'woman' ? 'woman' : 'man';

  const { callType } = request.data;
  if (!callType) throw new HttpsError('invalid-argument', 'callType is required.');

  const globalRef = db.collection('globalQueues').doc(callType);

  try {
    const result = await db.runTransaction(async (t) => {
      // 1. Check Dedicated Queue FIRST (Highest Priority)
      const qRef = db.collection('queues').doc(teacherUid);
      const qSnap = await t.get(qRef);
      const qData = qSnap.exists ? qSnap.data() : {};
      const dStudents = Object.values(qData.studentsById || {}).sort((a, b) => 
        (a.joinedAt?.toMillis() || 0) - (b.joinedAt?.toMillis() || 0)
      );

      if (dStudents.length > 0) {
        const nextStudent = dStudents[0];
        // Remove from dedicated queue
        t.update(qRef, { [`studentsById.${nextStudent.id}`]: admin.firestore.FieldValue.delete() });
        
        const teacherUpdate = {
          currentlyCalling: {
            studentId: nextStudent.id,
            studentName: nextStudent.name,
            studentType: callType,
            calledAt: admin.firestore.FieldValue.serverTimestamp(),
            announcementId: String(Date.now())
          }
        };
        t.update(db.collection('teachers').doc(teacherUid), teacherUpdate);
        t.update(db.collection('students').doc(nextStudent.id), {
          calledBy: { teacherId: teacherUid, calledAt: admin.firestore.FieldValue.serverTimestamp(), type: callType },
          redirectNotification: admin.firestore.FieldValue.delete()
        });
        return { success: true, student: nextStudent };
      }

      // 2. Check Global Pool SECOND
      const gSnap = await t.get(globalRef);
      if (!gSnap.exists) throw new HttpsError('not-found', 'Kø er tom.');

      const globalKey = `${gender}StudentsById`;
      const studentsMap = gSnap.data()[globalKey] || {};
      const studentsList = Object.entries(studentsMap)
        .map(([id, s]) => ({ id, ...s }))
        .filter(s => !s.preferredTeacherId || s.preferredTeacherId === teacherUid)
        .sort((a, b) => {
          const aTime = a.joinedAt?.toMillis?.() || 0;
          const bTime = b.joinedAt?.toMillis?.() || 0;
          return aTime - bTime;
        });

      if (studentsList.length === 0) throw new HttpsError('not-found', 'Køen er tom.');

      const nextStudent = studentsList[0];

      // Remove from global pool
      t.update(globalRef, { [`${globalKey}.${nextStudent.id}`]: admin.firestore.FieldValue.delete() });

      const ticketToUse = nextStudent.ticketNumber;

      // Update Teacher
      const teacherUpdates = {
        currentlyCalling: {
          studentId: nextStudent.id,
          studentName: nextStudent.name,
          studentType: callType,
          calledAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(ticketToUse ? { ticketNumber: ticketToUse, announcementId: String(Date.now()) } : {})
        }
      };
      if (ticketToUse) {
        teacherUpdates.lastCalledTicket = {
          ticketNumber: ticketToUse,
          queueLetter: tData.queueLetter || 'A',
          studentNumber: nextStudent.studentNumber || null
        };
      }
      t.update(db.collection('teachers').doc(teacherUid), teacherUpdates);

      // Update Student
      t.update(db.collection('students').doc(nextStudent.id), {
        calledBy: {
          teacherId: teacherUid,
          calledAt: admin.firestore.FieldValue.serverTimestamp(),
          type: callType
        },
        redirectNotification: admin.firestore.FieldValue.delete()
      });

      return { success: true, student: { ...nextStudent, ticketNumber: ticketToUse } };
    });
    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('callQueueStudent error:', error);
    throw new HttpsError('internal', 'Kunne ikke kalde elev.');
  }
});

exports.leaveQueue = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const { type } = request.data;
  const uid = request.auth.uid;

  try {
    await db.runTransaction(async (t) => {
      const actualType = type || 'physical'; 
      const globalRef = db.collection('globalQueues').doc(actualType);
      const gSnap = await t.get(globalRef);
      
      const studentDoc = await t.get(db.collection('students').doc(uid));
      const gender = studentDoc.data()?.gender === 'woman' ? 'woman' : 'man';
      const genderKey = `${gender}StudentsById`;

      if (gSnap.exists && gSnap.data()[genderKey]?.[uid]) {
        t.update(globalRef, { [`${genderKey}.${uid}`]: admin.firestore.FieldValue.delete() });
      }
      
      // Clear redirection notification when leaving
      t.update(db.collection('students').doc(uid), { redirectNotification: admin.firestore.FieldValue.delete() });
    });

    return { success: true };
  } catch (error) {
    console.error('leaveQueue failed:', error);
    throw new HttpsError('internal', 'Kunne ikke forlade køen.');
  }
});


/**
 * LEADERBOARD: Client-callable sync function.
 * Students cannot write /leaderboard directly (rules block it).
 * This function validates auth then writes with admin SDK.
 */
exports.syncLeaderboard = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');

  const uid = request.auth.uid;
  const { hide, displayName, photoURL, plan, frequency, monthlyScore, allTimeScore, streakPoints } = request.data;

  const leaderboardRef = db.collection('leaderboard').doc(uid);

  if (hide) {
    await leaderboardRef.delete().catch(() => null);
    return { success: true };
  }

  await leaderboardRef.set({
    id: uid,
    displayName: displayName || 'Elev',
    photoURL: photoURL || null,
    plan: plan || '3',
    frequency: frequency || 3,
    monthlyScore: typeof monthlyScore === 'number' ? monthlyScore : 0,
    allTimeScore: typeof allTimeScore === 'number' ? allTimeScore : 0,
    streakPoints: typeof streakPoints === 'number' ? streakPoints : 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true };
});

/**
 * LEADERBOARD: Monthly reset — runs on the 1st of every month at 00:00 UTC.
 * Resets monthlyScore to 0 for all leaderboard entries.
 */
exports.resetMonthlyScores = onSchedule("0 0 1 * *", async () => {
  const snapshot = await db.collection('leaderboard').get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.update(doc.ref, { monthlyScore: 0 });
  });

  await batch.commit();
  console.log(`Reset monthlyScore for ${snapshot.size} leaderboard entries.`);
});

/**
 * CLEANUP: Hourly sweep for stale activeCalls documents.
 * If a call session is > 2 hours old, it is certainly over and should be deleted.
 */
exports.cleanupStaleCalls = onSchedule("0 * * * *", async () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const staleSnap = await db.collection('activeCalls')
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(twoHoursAgo))
    .limit(100)
    .get();

  if (staleSnap.empty) return;

  const batch = db.batch();
  staleSnap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`[CleanupStaleCalls] Deleted ${staleSnap.size} stale call documents.`);
});

/**
 * CLEANUP: Daily sweep for orphaned notificationRequests (failsafe).
 * The notifyOnNotificationRequest trigger should delete docs after processing,
 * but this catches any that slipped through due to errors.
 */
exports.cleanupOrphanNotifications = onSchedule("0 3 * * *", async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snap = await db.collection('notificationRequests')
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(oneDayAgo))
    .limit(200)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`[CleanupOrphanNotifications] Deleted ${snap.size} orphaned notification docs.`);
});

/**
 * CLEANUP: Monthly purge of old absenceNotes (> 12 months).
 * Keeps student sub-collections lean and reduces scan cost in absence reports.
 */
exports.purgeOldAbsenceNotes = onSchedule({
  schedule: "0 2 1 * *",
  timeZone: "Europe/Copenhagen"
}, async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoff = admin.firestore.Timestamp.fromDate(oneYearAgo);

  const studentsSnap = await db.collection('students').select().get(); // .select() = no field data, cheaper!
  let totalDeleted = 0;

  for (const studentDoc of studentsSnap.docs) {
    const oldNotes = await studentDoc.ref.collection('absenceNotes')
      .where('endDate', '<', cutoff)
      .limit(50)
      .get();

    if (!oldNotes.empty) {
      const batch = db.batch();
      oldNotes.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      totalDeleted += oldNotes.size;
    }
  }

  console.log(`[PurgeOldAbsenceNotes] Deleted ${totalDeleted} absence notes older than 12 months.`);
});

/**
 * PUSH NOTIFICATIONS: Scheduled reminders for student groups.
 */

// Helper to send notifications to a specific group of students with localization
async function sendGroupNotification(filterFn, times, link = '/?view=homework-reading&source=push') {
  const studentSnap = await db.collection('students').get();
  const batch = db.batch();
  let count = 0;

  const translations = {
    da: { title: "Markaz Påmindelse", body: (t) => `Husk at komme i markaz i dag! Vi har åbent kl. ${t}.` },
    en: { title: "Markaz Reminder", body: (t) => `Remember to come to markaz today! The opening time is ${t}.` },
    ar: { title: "تذكير المركز", body: (t) => `تذكر المجيء إلى المركز اليوم! ساعات العمل هي ${t}.` },
    so: { title: "Xusuusin Markaz", body: (t) => `Xusuuso inaad timaado markaz maanta! Saacadaha furan waa ${t}.` }
  };

  for (const studentDoc of studentSnap.docs) {
    const student = studentDoc.data();
    if (filterFn(student)) {
      const lang = student.language || 'da';
      const t = translations[lang] || translations.da;
      const title = t.title;
      const body = t.body(times);

      const reminderData = { type: 'reminder', link, tag: 'markaz-reminder' };
      const tokenSnap = await studentDoc.ref.collection('fcmTokens').get();
      tokenSnap.forEach(tDoc => {
        const reqRef = db.collection('notificationRequests').doc();
        batch.set(reqRef, {
          toUid: studentDoc.id,
          fcmToken: tDoc.id,
          title,
          body,
          data: reminderData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      });
      count += await enqueueExpoPushRequests(batch, 'students', studentDoc.id, title, body, reminderData);
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Scheduled notifications: Sent ${count} reminders.`);
  }
}

// 1. Men (3y & 5y) and Men (1.5y) - Friday, Saturday, Sunday at 15:00
exports.sendMenWeekendReminders = onSchedule({
  schedule: "0 15 * * 5,6,0",
  timeZone: "Europe/Copenhagen"
}, async () => {
  // Opening time 16-20
  await sendGroupNotification(
    (s) => s.gender === 'man' && (['1.5', '3', '5'].includes(String(s.courseDuration))),
    "16 - 20"
  );
});

// 2. Men (1.5y) - Wednesday and Thursday at 18:00
exports.sendMenWeekdayReminders = onSchedule({
  schedule: "0 18 * * 3,4",
  timeZone: "Europe/Copenhagen"
}, async () => {
  // Opening time 19-20
  await sendGroupNotification(
    (s) => s.gender === 'man' && String(s.courseDuration) === '1.5',
    "19 - 20"
  );
});

// 3. Women - Saturday at 11:00
exports.sendWomenSaturdayReminders = onSchedule({
  schedule: "0 11 * * 6",
  timeZone: "Europe/Copenhagen"
}, async () => {
  // Opening time 12-15
  await sendGroupNotification(
    (s) => s.gender === 'woman',
    "12 - 15"
  );
});

// 4. Women - Wednesday and Thursday at 15:00
exports.sendWomenWeekdayReminders = onSchedule({
  schedule: "0 15 * * 3,4",
  timeZone: "Europe/Copenhagen"
}, async () => {
  // Opening time 16-19
  await sendGroupNotification(
    (s) => s.gender === 'woman',
    "16 - 19"
  );
});

/**
 * ABSENCE REMINDER: Runs every Monday at 09:00.
 * Checks for students who had no activity (assignments) last week 
 * and did not submit an absence note.
 */
exports.sendAbsenceReminders = onSchedule({
  schedule: "0 9 * * 1",
  timeZone: "Europe/Copenhagen"
}, async () => {
  const today = new Date();
  // Go back to last Monday 00:00:00
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - 7);
  lastMonday.setHours(0, 0, 0, 0);

  // Sunday 23:59:59
  const lastSunday = new Date(today);
  lastSunday.setHours(0, 0, 0, 0);

  const studentsSnap = await db.collection('students').get();
  const batch = db.batch();
  let sentCount = 0;

  for (const studentDoc of studentsSnap.docs) {
    const uid = studentDoc.id;

    // 1. Check for any assignments that were GRADED in the last week (Monday to Sunday)
    const assignmentsSnap = await studentDoc.ref.collection('assignments')
      .where('gradedAt', '>=', admin.firestore.Timestamp.fromDate(lastMonday))
      .where('gradedAt', '<', admin.firestore.Timestamp.fromDate(lastSunday))
      .limit(1)
      .get();

    if (!assignmentsSnap.empty) continue;

    // 2. Check for absence notes covering that week
    const absenceSnap = await studentDoc.ref.collection('absenceNotes')
      .where('endDate', '>=', admin.firestore.Timestamp.fromDate(lastMonday))
      .get();

    const hasNote = absenceSnap.docs.some(doc => {
      const data = doc.data();
      const start = data.startDate.toDate();
      return start < lastSunday; // Note overlaps if it starts before Sunday ended and ends after Monday started
    });

    if (hasNote) continue;

    // 3. Send notification (localized)
    const tokensSnap = await studentDoc.ref.collection('fcmTokens').get();
    const expoTokensSnap = await studentDoc.ref.collection('expoPushTokens').get();
    if (tokensSnap.empty && expoTokensSnap.empty) continue;

    const lang = studentDoc.data().language || 'da';
    const absenceTranslations = {
      da: {
        title: "Manglende fremmøde",
        body: "Assalamu alaikum, vi kan se du ikke har mødt i markaz denne uge, angiv venligst grunden her."
      },
      en: {
        title: "Missing Attendance",
        body: "Assalamu alaikum, we noticed you haven't been to markaz this week. Please provide a reason here."
      },
      ar: {
        title: "تذكير بالغياب",
        body: "السلام عليكم، لاحظنا عدم حضورك للمركز هذا الأسبوع، يرجى تقديم السبب هنا."
      },
      so: {
        title: "Xusuusin Maqnaanshaha",
        body: "Assalamu alaikum, waxaan ogaannay inaanad imaan markazka toddobaadkan. Fadlan halkan ku sheeg sababta."
      }
    };

    const t = absenceTranslations[lang] || absenceTranslations.da;
    const absenceData = { type: 'absence_reminder', link: '/?view=profile&open=absence', tag: 'absence-reminder' };

    tokensSnap.forEach(tDoc => {
      const reqRef = db.collection('notificationRequests').doc();
      batch.set(reqRef, {
        toUid: uid,
        fcmToken: tDoc.id,
        title: t.title,
        body: t.body,
        data: absenceData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      sentCount++;
    });
    expoTokensSnap.forEach(tDoc => {
      const reqRef = db.collection('notificationRequests').doc();
      batch.set(reqRef, {
        toUid: uid,
        expoPushToken: tDoc.id,
        title: t.title,
        body: t.body,
        data: absenceData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      sentCount++;
    });
  }

  if (sentCount > 0) {
    await batch.commit();
    console.log(`Sent ${sentCount} absence reminders.`);
  }
});

/**
 * CLEANUP: Hourly sweep for stale callInvites documents.
 * Call invitations are transient; if they aren't accepted/declined within 10 minutes,
 * they should be purged to keep the collection lean.
 */
exports.cleanupStaleCallInvites = onSchedule("0 * * * *", async () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const staleSnap = await db.collection('callInvites')
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(tenMinutesAgo))
    .limit(200)
    .get();

  if (staleSnap.empty) return;

  const batch = db.batch();
  staleSnap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`[CleanupStaleCallInvites] Deleted ${staleSnap.size} stale invite documents.`);
});

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD AUTO-SYNC
// Triggers whenever a student assignment is written (created or updated).
// Replaces the expensive client-side calculation that fetched all assignments
// during grading. Now the server does all of this work automatically.
// ─────────────────────────────────────────────────────────────────────────────


// Simplified server-side clone of calculateLeaderboardScore from student-logic.ts
function calculateServerLeaderboardScore(assignments, plan, timeframe) {
  const GRADE_VALUES = { 'Perfekt': 100, 'Meget godt': 85, 'Godt': 70, 'Ikke læst': 0 };
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = assignments.filter(a => {
    if (timeframe === 'all') return true;
    if (!a.gradeHifz || a.gradeHifz === 'Ikke læst') return false;
    const d = a.gradedAt ? (a.gradedAt.toDate ? a.gradedAt.toDate() : new Date(a.gradedAt))
      : (a.assignedAt ? (a.assignedAt.toDate ? a.assignedAt.toDate() : new Date(a.assignedAt)) : null);
    return d && d >= startOfMonth;
  });

  if (filtered.length === 0) return 0;
  const graded = filtered.filter(a => a.gradeHifz && a.gradeHifz !== 'Ikke læst');
  if (graded.length === 0) return 0;

  // 1. Quality (50%)
  const grades = graded.map(a => GRADE_VALUES[a.gradeHifz] || 0);
  const qualityScore = grades.reduce((s, g) => s + g, 0) / grades.length;

  // 2. Attendance (40%) — weekly grouping
  const weekMap = {};
  graded.forEach(a => {
    const d = a.gradedAt ? (a.gradedAt.toDate ? a.gradedAt.toDate() : new Date(a.gradedAt))
      : (a.assignedAt.toDate ? a.assignedAt.toDate() : new Date(a.assignedAt));
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((d - oneJan) / 86400000);
    const weekNum = Math.ceil((d.getDay() + 1 + dayOfYear) / 7);
    const key = `${d.getFullYear()}-${weekNum}`;
    weekMap[key] = (weekMap[key] || 0) + 1;
  });

  let attendancePts = 0;
  const weeks = Object.keys(weekMap);
  weeks.forEach(w => {
    const s = weekMap[w];
    if (s === 1) attendancePts += 1;
    else if (s === 2) attendancePts += 1.75;
    else attendancePts += 2;
  });
  const expectedWeeks = timeframe === 'month' ? 4 : weeks.length;
  const attendanceScore = expectedWeeks > 0 ? Math.min(100, (attendancePts / (expectedWeeks * 2)) * 100) : 0;

  // 3. Plan Discipline (10%)
  const targetPPW = plan === '1.5' ? 7.8 : plan === '3' ? 3.9 : 2.3;
  const expectedPages = expectedWeeks * targetPPW;
  const pagesGraded = graded.length * 1.5; // Approximate: ~1.5 pages per session
  const disciplineScore = expectedPages > 0 ? Math.min(100, (pagesGraded / expectedPages) * 100) : 0;

  return Math.round((qualityScore * 0.5) + (attendanceScore * 0.4) + (disciplineScore * 0.1));
}

// Server-side streak calculation
function calculateServerStreakPoints(assignments) {
  const graded = assignments.filter(a =>
    a.gradeHifz && a.gradeHifz !== 'Ikke læst' && (a.gradedAt || a.assignedAt)
  );
  if (graded.length === 0) return 0;

  const weeks = {};
  graded.forEach(a => {
    const d = a.gradedAt ? (a.gradedAt.toDate ? a.gradedAt.toDate() : new Date(a.gradedAt))
      : (a.assignedAt.toDate ? a.assignedAt.toDate() : new Date(a.assignedAt));
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((d - oneJan) / 86400000);
    const weekNum = Math.ceil((d.getDay() + 1 + dayOfYear) / 7);
    const key = `${d.getFullYear()}-${weekNum}`;
    weeks[key] = (weeks[key] || 0) + 1;
  });

  const sortedWeeks = Object.keys(weeks).sort();
  const today = new Date();
  const oneJan = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today - oneJan) / 86400000);
  const currentWeek = `${today.getFullYear()}-${Math.ceil((today.getDay() + 1 + dayOfYear) / 7)}`;

  let pts = 0;
  let tempDate = new Date(parseInt(sortedWeeks[0].split('-')[0]), 0, 1);
  tempDate.setDate(tempDate.getDate() + (parseInt(sortedWeeks[0].split('-')[1]) - 1) * 7);

  while (true) {
    const ty = tempDate.getFullYear();
    const tJan = new Date(ty, 0, 1);
    const tDay = Math.floor((tempDate - tJan) / 86400000);
    const tW = Math.ceil((tempDate.getDay() + 1 + tDay) / 7);
    const key = `${ty}-${tW}`;
    const sessions = weeks[key] || 0;

    if (sessions > 0) {
      pts += sessions === 1 ? 1 : sessions === 2 ? 1.75 : 2;
    } else {
      pts = 0; // Reset on missed week
    }

    if (key === currentWeek) break;
    tempDate.setDate(tempDate.getDate() + 7);
    if (tempDate > new Date(Date.now() + 7 * 86400000)) break;
  }

  return parseFloat(pts.toFixed(2));
}

/**
 * AUTO LEADERBOARD SYNC
 * Runs on the server whenever a student's assignment is created or updated.
 * This completely replaces the client-side leaderboard fetch-and-calc in
 * QueueAssignmentManager.tsx, saving ~50+ reads per grading session.
 */
exports.onAssignmentWrite = onDocumentWritten(
  "students/{studentId}/assignments/{assignmentId}",
  async (event) => {
    const studentId = event.params.studentId;

    // Only run if the assignment was graded (has a grade)
    const afterData = event.data?.after?.data();
    if (!afterData || !afterData.gradeHifz) {
      console.log(`[LeaderboardSync] Skipping ungraded assignment for ${studentId}`);
      return;
    }

    console.log(`[LeaderboardSync] Recalculating leaderboard for student ${studentId}`);

    try {
      // 1. Fetch student profile (1 read)
      const studentRef = db.collection('students').doc(studentId);
      const studentDoc = await studentRef.get();
      if (!studentDoc.exists) {
        console.warn(`[LeaderboardSync] Student ${studentId} not found`);
        return;
      }
      const studentData = studentDoc.data();

      if (studentData.hideFromLeaderboard) {
        await db.collection('leaderboard').doc(studentId).delete().catch(() => null);
        console.log(`[LeaderboardSync] Deleted leaderboard entry for hidden student ${studentId}`);
        return;
      }

      // 2. Fetch all assignments for this student (N reads, but on server = no client cost)
      const allAssignmentsSnap = await studentRef.collection('assignments').get();
      const allAssignments = allAssignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Calculate scores server-side (zero client reads)
      const plan = studentData.hifzPlan || '3';
      const frequency = studentData.sessionsPerWeek || 3;
      const monthlyScore = calculateServerLeaderboardScore(allAssignments, plan, 'month');
      const allTimeScore = calculateServerLeaderboardScore(allAssignments, plan, 'all');
      const streakPoints = calculateServerStreakPoints(allAssignments);

      // 4. Write to leaderboard (1 write)
      await db.collection('leaderboard').doc(studentId).set({
        id: studentId,
        displayName: studentData.displayName || 'Elev',
        photoURL: studentData.photoURL || null,
        plan,
        frequency,
        monthlyScore,
        allTimeScore,
        streakPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log(`[LeaderboardSync] Done. Monthly: ${monthlyScore}, All-time: ${allTimeScore}, Streak: ${streakPoints}`);
    } catch (err) {
      console.error(`[LeaderboardSync] Error for student ${studentId}:`, err);
    }
  }
);
