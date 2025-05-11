import { db } from '../db';
import { requirements, classifications, documentMatches} from '../../../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { FilteringRequirements } from '../../types/filtering';
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert database requirement to FilteringRequirements
function toFilteringRequirement(dbReq: any): FilteringRequirements {
  if (!dbReq) {
    throw new Error('Invalid requirement data: dbReq is undefined or null');
  }

  return {
    id: dbReq.id?.toString() || '',
    userId: dbReq.userId?.toString() || '',
    name: dbReq.name || '',
    description: dbReq.description || '',
    categoryId: parseInt(dbReq.category || '0'),
    color: dbReq.color || '#3B82F6',
    threshold: dbReq.matchThreshold || 0,
    requirements: dbReq.requirements || [],
    createdAt: dbReq.createdAt || new Date(),
    matchThreshold: dbReq.matchThreshold || 0,
    category: dbReq.category || 'normal'
  };
}

export async function getRequirements(userId: string): Promise<FilteringRequirements[]> {
  try {
    const dbRequirements = await db.select().from(requirements).where(eq(requirements.userId, userId));
    return dbRequirements.map(toFilteringRequirement);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return [];
  }
}

export async function createRequirement(
  userId: string,
  requirement: Omit<FilteringRequirements, "id" | "createdAt" | "userId">
): Promise<FilteringRequirements> {
  try {
    const newRequirement = {
      id: uuidv4(),
      userId,
      name: requirement.name,
      description: requirement.description,
      category: requirement.category,
      color: requirement.color,
      matchThreshold: requirement.matchThreshold,
      requirements: requirement.requirements || [],
      createdAt: new Date()
    };

    const [created] = await db.insert(requirements)
      .values(newRequirement)
      .returning();

    return toFilteringRequirement(created);
  } catch (error) {
    console.error('Error creating requirement:', error);
    throw error;
  }
}

export async function updateRequirement(id: string, requirement: Partial<FilteringRequirements>): Promise<FilteringRequirements> {
  try {
    const updateData = {
      ...requirement,
      requirements: requirement.requirements || []
    };

    const [updated] = await db.update(requirements)
      .set(updateData)
      .where(eq(requirements.id, id))
      .returning();

    return toFilteringRequirement(updated);
  } catch (error) {
    console.error('Error updating requirement:', error);
    throw error;
  }
}

export async function deleteRequirement(userId: string, requirementId: string): Promise<void> {
  try {
    // 1. Delete all classifications associated with this requirement  
    const classificationRows = await db
      .select({ id: classifications.id })
      .from(classifications)
      .where(
        and(
          eq(classifications.requirementId, requirementId),
          eq(classifications.userId, userId)
        )
      );

    const classificationIds = classificationRows.map(row => row.id);

    if (classificationIds.length > 0) {
      // 2. Delete all document_matches for these classifications
      await db.delete(documentMatches)
        .where(inArray(documentMatches.classificationId, classificationIds));
    }

    // 3. Delete all classifications associated with this requirement
    await db.delete(classifications)
      .where(
        and(
          eq(classifications.requirementId, requirementId),
          eq(classifications.userId, userId)
        )
      );

       // 4. Delete the requirement
    await db.delete(requirements)
    .where(
      and(
        eq(requirements.id, requirementId),
        eq(requirements.userId, userId)
      )
    );
      
  } catch (error) {
    console.error('Error deleting requirement:', error);
    throw error;
  }
} 