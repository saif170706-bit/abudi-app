'use client';

import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";

/**
 * Payload for global administrative notifications.
 */
interface PostNotificationPayload {
  targetAudience: string;
  targetGender: string;
  specificRecipients: string[];
  type: 'announcement' | 'event' | 'survey' | 'livestream' | 'livestream_start';
  title: string;
}

/**
 * Client-side helper to trigger localized notifications.
 * Reuses the same logic as send-teacher-call.ts for maximum reliability.
 */
export async function sendPostNotifications(payload: PostNotificationPayload) {
  const app = getApp();
  const functions = getFunctions(app, 'us-central1');
  
  const sendAdminPostNotificationsFn = httpsCallable<PostNotificationPayload, { success: boolean, count: number }>(
    functions, 
    'sendAdminPostNotifications'
  );

  try {
    const result = await sendAdminPostNotificationsFn(payload);
    return result.data;
  } catch (error: any) {
    console.error("Error calling sendAdminPostNotifications function:", error);
    throw new Error(error.message || 'An unknown error occurred while sending the notifications.');
  }
}
