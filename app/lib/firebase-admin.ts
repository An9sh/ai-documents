'use server';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { adminAuth } from './firebase-admin-config';

// Initialize Firebase Admin only on the server side
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// export async function createUserRecord(firebaseUid: string, email: string) {
//   try {
//     // Create user record
//     const [user] = await db.insert(users)
//       .values({
//         id: firebaseUid,
//         email,
//         name: email.split('@')[0],
//       })
//       .returning();

//     return user;
//   } catch (error) {
//     console.error('Error creating user record:', error);
//     throw error;
//   }
// }

// export async function createUserRecord(firebaseUid: string, email: string) {
//   try {
//     // Create user record
//     const [user] = await db.insert(users)
//       .values({
//         firebaseUid,
//         email,
//         name: email.split('@')[0],
//       })
//       .returning();

//     // Automatically create free subscription with 2 tokens
//     await db.insert(subscriptions)
//       .values({
//         userId: user.id,
//         plan: 'free',
//         status: 'active',
//         searchesRemaining: 2,
//         currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
//         createdAt: new Date()
//       });

//     return user;
//   } catch (error) {
//     console.error('Error creating user record:', error);
//     throw error;
//   }
// }
