import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";
import {
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
}

let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let anonAuthReady: Promise<void> | null = null;

export function getDb(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
  return firestoreInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

/** Inicia sesión anónima en segundo plano; no requiere ninguna pantalla de login. */
export function ensureAnonymousAuth(): Promise<void> {
  if (anonAuthReady) return anonAuthReady;

  const auth = getFirebaseAuth();
  anonAuthReady = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve();
        }
      },
      reject,
    );
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(reject);
    }
  });
  return anonAuthReady;
}
