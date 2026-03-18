// Your web app's Firebase configuration
// IMPORTANT: This is a public configuration and is safe to expose.
// Security is handled by Firestore Security Rules.

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

function validateFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    if (typeof window === 'undefined') {
      // Server-side: log error details
      console.error(
        `Firebase configuration incomplete. Missing environment variables:\n${missingVars.join('\n')}`
      );
    }
    return { isConfigured: false, config, missingVars };
  }

  return { isConfigured: true, config, missingVars: [] };
}

const validation = validateFirebaseConfig();
export const firebaseConfig = validation.config;
export const isFirebaseConfigured = validation.isConfigured;
export const missingFirebaseVars = validation.missingVars;
