import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
// The `firebase/auth` umbrella subpath does not expose a "react-native"
// export condition in this SDK version, so getReactNativePersistence would
// be undefined via that import — the underlying @firebase/auth package
// does, and resolves correctly to its AsyncStorage-backed RN build at
// runtime. Its exports map still lists a platform-agnostic "types" entry
// ahead of the "react-native" one though, so TS resolves the wrong .d.ts
// and doesn't see this export — it exists at runtime (rn/index.rn.d.ts).
// @ts-expect-error — see comment above
import { getReactNativePersistence, initializeAuth, getAuth, type Auth } from '@firebase/auth';

// RN has no window/IndexedDB, so auth/firestore need RN-specific setup
// instead of the web SDK's default browser persistence.
function initializeFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function initializeFirebaseAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if already called (e.g. Fast Refresh) — reuse existing instance.
    return getAuth(app);
  }
}

export const firebaseApp = initializeFirebaseApp();
export const auth = initializeFirebaseAuth(firebaseApp);
export const firestore: Firestore = getFirestore(firebaseApp);
export const storage: FirebaseStorage = getStorage(firebaseApp);
