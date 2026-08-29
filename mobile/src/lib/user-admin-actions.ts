import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/client';

/** Restores a soft-deleted (pendingDeletion) account. */
export async function restoreAccount(uid: string, role: string) {
  const fn = httpsCallable(functions, 'restoreAccount');
  return fn({ uid, role });
}

/** Permanently deletes a user's account (Firestore doc + Firebase Auth user). */
export async function deleteUser(uid: string) {
  const fn = httpsCallable(functions, 'deleteUser');
  return fn({ uid });
}
