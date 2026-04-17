import admin from "firebase-admin";

function getPrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  // Replace the escaped newlines with actual newlines
  return key.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  // Add robust checks for the environment variables
  if (!projectId || !clientEmail || !privateKey) {
    // In a development environment, it's helpful to throw a clear error.
    // In production, you might want to log this without crashing the server.
    if (process.env.NODE_ENV === 'development') {
      console.error("Firebase Admin SDK failed to initialize: Missing environment variables.");
      console.error("Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your .env.local file.");
    }
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        } as admin.ServiceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-3085722089-f47ec.firebasestorage.app",
      });
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error);
    }
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;