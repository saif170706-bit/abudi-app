import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeSnXOHLekELX6RqKM44Dyap04_m9eEf0",
  authDomain: "studio-3085722089-f47ec.firebaseapp.com",
  projectId: "studio-3085722089-f47ec",
  storageBucket: "studio-3085722089-f47ec.appspot.com",
  messagingSenderId: "844928643527",
  appId: "1:844928643527:web:d995c68a8435184282a9e2"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
