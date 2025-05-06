import { db } from '../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

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
    // Check if user exists
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      // Create new user
      const [newUser] = await db.insert(users)
        .values({
          id: userId,
          email,
          name: name || null,
          createdAt: new Date()
        })
        .returning();
      
      return newUser;
    } else {
      // Update existing user if needed
      if (existingUser.email !== email || existingUser.name !== name) {
        const [updatedUser] = await db.update(users)
          .set({
            email,
            name: name || null,
            createdAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();
        
        return updatedUser;
      }
      
      return existingUser;
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    throw error;
  }
} 