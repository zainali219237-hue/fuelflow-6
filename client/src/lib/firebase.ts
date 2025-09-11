// Firebase integration - from firebase_barebones_javascript blueprint
import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, User as FirebaseUser } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Sign In function
export function signInWithGoogle() {
  signInWithRedirect(auth, googleProvider);
}

// Handle redirect result after Google sign-in
export async function handleGoogleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // This gives you a Google Access Token. You can use it to access Google APIs.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      // The signed-in user info.
      const user = result.user;
      return { user, token };
    }
    return null;
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
}

// Convert Firebase user to application user format
export function convertFirebaseUser(firebaseUser: FirebaseUser) {
  return {
    id: firebaseUser.uid,
    username: firebaseUser.email || '',
    fullName: firebaseUser.displayName || firebaseUser.email || '',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || null,
    role: 'cashier' as const, // Default role for Google sign-in users
    isGoogleAuth: true,
  };
}