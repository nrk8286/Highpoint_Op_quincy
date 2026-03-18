import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Hello world example HTTP Cloud Function
 */
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info('Hello logs!', { structuredData: true });
  response.send('Hello from Firebase Cloud Functions!');
});

/**
 * Custom claims helper - sets user roles
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('authentication-required', 'Must be authenticated to set user roles');
  }

  const { uid, role } = data;

  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    return { message: `User role set to ${role}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to set user role');
  }
});

/**
 * On user creation, set default role
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.auth().setCustomUserClaims(user.uid, { role: 'user' });
    functions.logger.info(`User ${user.uid} created with default role`);
  } catch (error) {
    functions.logger.error(`Error creating user ${user.uid}:`, error);
  }
});
