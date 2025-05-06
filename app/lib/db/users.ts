import { db } from '../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && error instanceof Error && error.message.includes('fetch failed')) {
      console.log(`Database operation failed, retrying... (${retries} attempts left)`);
      await delay(RETRY_DELAY);
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

export async function createUser(userId: string, email: string) {
  try {
    const [user] = await db.insert(users)
      .values({
        id: userId,
        email: email,
        createdAt: new Date()
      })
      .returning();

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getUser(userId: string) {
  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function ensureUserExists(
  userId: string,
  email: string,
  name?: string
) {
  try {
    // Check if user exists with retry
    const [existingUser] = await withRetry(() => 
      db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    );

    if (!existingUser) {
      // Create new user with retry
      await withRetry(() =>
        db.insert(users).values({
          id: userId,
          email: email,
          name: name || null,
          createdAt: new Date()
        })
      );
      
      return true;
    } else {
      // Update existing user if needed
      if (email && email !== existingUser.email) {
        await withRetry(() =>
          db.update(users)
            .set({
              email: email,
              name: name || existingUser.name
            })
            .where(eq(users.id, userId))
        );
      }
      return true;
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    // If we can't connect to the database, we should still allow the operation to proceed
    // This prevents blocking document uploads when the database is temporarily unavailable
    return true;
  }
} 