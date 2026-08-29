import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/client';

/** Self-service account deletion request — locks the account immediately, admin processes it within ~30 days. */
export async function requestAccountDeletion(reason?: string) {
  const fn = httpsCallable(functions, 'requestAccountDeletion');
  const result = await fn({ reason });
  return result.data;
}
