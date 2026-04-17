
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserData, UserRole } from '@/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export async function getUserData(uid: string): Promise<UserData | null> {
    if (!uid) return null;

    const collectionsToSearch: UserRole[] = ['admins', 'teachers', 'students'];
    for (const collectionName of collectionsToSearch) {
        const docRef = doc(db, collectionName, uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: uid, ...docSnap.data() } as UserData;
            }
        } catch (e) {
            console.error(`Error checking collection ${collectionName}:`, e);
        }
    }
    
    return null;
}

export async function isUserPreAuthorized(email: string): Promise<{ authorized: boolean; }> {
  if (!email) return { authorized: false };
  const lcEmail = email.toLowerCase();
  const placeholderRef = doc(db, 'placeholders', lcEmail);
  const placeholderSnap = await getDoc(placeholderRef);
  return { authorized: placeholderSnap.exists() };
}

export async function updateUserEmail({ uid, newEmail, role }: { uid: string; newEmail: string; role: UserRole; }) {
    const app = getApp();
    const functions = getFunctions(app, 'us-central1');
    const updateUserEmailFn = httpsCallable(functions, 'updateUserEmail');
    const result = await updateUserEmailFn({ uid, newEmail, role });
    return result.data;
}

export async function deleteUser(uid: string): Promise<{ success: boolean; message: string; }> {
    const app = getApp();
    const functions = getFunctions(app, 'us-central1');
    const deleteUserFn = httpsCallable(functions, 'deleteUser');
    const result = await deleteUserFn({ uid });
    return result.data as { success: boolean; message: string; };
}

export async function requestAccountDeletion(reason?: string) {
    const app = getApp();
    const functions = getFunctions(app, 'us-central1');
    const requestDeletionFn = httpsCallable(functions, 'requestAccountDeletion');
    const result = await requestDeletionFn({ reason });
    return result.data;
}

export async function restoreAccount(uid: string, role: string) {
    const app = getApp();
    const functions = getFunctions(app, 'us-central1');
    const restoreAccountFn = httpsCallable(functions, 'restoreAccount');
    const result = await restoreAccountFn({ uid, role });
    return result.data;
}
