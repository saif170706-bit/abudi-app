import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/client';

/**
 * Notifies the target audience (push, via sendAdminPostNotifications) after
 * creating a new announcement/event/survey/meeting. Mirrors the web app's
 * src/lib/send-post-notifications.ts — same Cloud Function, so posts created
 * from either platform notify the same way. Web calls this after every
 * *new* post (not on edits); the mobile forms should do the same.
 */
export async function sendPostNotifications(payload: {
  targetAudience: string;
  targetGender: string;
  specificRecipients: string[];
  type: 'announcement' | 'event' | 'survey' | 'livestream' | 'livestream_start';
  title: string;
}) {
  const fn = httpsCallable<typeof payload, { success: boolean; count: number }>(functions, 'sendAdminPostNotifications');
  const result = await fn(payload);
  return result.data;
}
