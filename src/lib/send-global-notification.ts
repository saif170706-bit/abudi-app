'use client';

import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

interface GlobalNotificationPayload {
  targetAudience: string;
  targetGender: string;
  specificRecipients: string[];
  type: 'announcement' | 'event' | 'survey' | 'livestream';
  title: string;
}

/**
 * Client-side helper to trigger the localized global notification request flow.
 */
export async function sendGlobalNotification(payload: GlobalNotificationPayload) {
  const app = getApp();
  const functions = getFunctions(app, 'us-central1');
  
  // Call the new request-based function
  const sendAdminPostNotificationsFn = httpsCallable<GlobalNotificationPayload, { success: boolean, requestCount: number }>(
    functions, 
    'sendAdminPostNotifications'
  );

  try {
    const result = await sendAdminPostNotificationsFn(payload);
    console.log("Global Post Request Result:", result.data);
    return result.data;
  } catch (error: any) {
    console.error("Cloud function error:", error);
    throw new Error(error.message || 'Failed to send notifications.');
  }
}
