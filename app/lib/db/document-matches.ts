import { db } from '../db';
import { documentMatches } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function createDocumentMatch(data: {
  documentId: string;
  classificationId: string;
  matchPercentage: number;
  confidence: number;
  matchedRequirements: string[];
  rawMatchReason: string;
  isMatched: boolean;
}) {
  const [match] = await db.insert(documentMatches)
    .values({
      ...data,
      id: uuidv4()
    })
    .returning();
  return match;
}

export async function updateDocumentMatch(matchId: string, data: {
  matchPercentage?: number;
  confidence?: number;
  matchedRequirements?: string[];
  rawMatchReason?: string;
  isMatched?: boolean;
}) {
  const [updatedMatch] = await db.update(documentMatches)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(documentMatches.id, matchId))
    .returning();
  return updatedMatch;
}

export async function getDocumentMatch(documentId: string, classificationId: string) {
  const [match] = await db.select()
    .from(documentMatches)
    .where(and(
      eq(documentMatches.documentId, documentId),
      eq(documentMatches.classificationId, classificationId)
    ));
  return match;
} 