import { db } from '../../lib/db';
import { categories } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { Category } from '../../types/filtering';

export async function getCategories(userId: string): Promise<Category[]> {
  try {
    const dbCategories = await db.select().from(categories).where(eq(categories.userId, userId));
    return dbCategories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function createCategory(userId: string, category: Omit<Category, 'userId' | 'createdAt'>): Promise<Category> {
  try {
    const [newCategory] = await db.insert(categories)
      .values({
        ...category,
        userId,
        createdAt: new Date()
      })
      .returning();

    return newCategory;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

export async function updateCategory(userId: string, categoryId: string, category: Partial<Category>): Promise<Category> {
  try {
    const [updatedCategory] = await db.update(categories)
      .set({
        ...category,
        userId // Ensure we keep the original user
      })
      .where(eq(categories.id, categoryId))
      .returning();

    return updatedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  try {
    await db.delete(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        )
      );
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
} 