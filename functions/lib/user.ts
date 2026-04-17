
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserData, UserRole } from '@/types';

// This function now queries a collection group, which respects security rules
// without throwing permission-denied errors that cause the red screen.
export async function getUserData(uid: string): Promise<UserData | null> {
    if (!uid) return null;

    const collectionsToSearch: UserRole[] = ['admins', 'teachers', 'students'];
    for (const collectionName of collectionsToSearch) {
        const docRef = doc(db, collectionName, uid);
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as UserData;
            }
        } catch (e) {
            console.error(`Error checking collection ${collectionName}:`, e);
        }
    }
    
    return null;
}


// This function checks for the placeholder created by an admin
export async function isUserPreAuthorized(email: string): Promise<{ authorized: boolean; }> {
  if (!email) return { authorized: false };
  const lcEmail = email.toLowerCase();
  
  // This check is now allowed by the new security rules for unauthenticated users.
  const placeholderRef = doc(db, 'placeholders', lcEmail);
  const placeholderSnap = await getDoc(placeholderRef);

  return { authorized: placeholderSnap.exists() };
}

// The createUserDocument function is no longer needed on the client,
// as this logic is now handled by the Firebase Cloud Function.

    