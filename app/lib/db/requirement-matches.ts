import { db } from '../db';
import { documentMatches, classifications } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export type DocumentMatch = typeof documentMatches.$inferSelect;
// export type NewDocumentMatch = typeof documentMatches.$inferInsert;

export async function createDocumentMatch(match: DocumentMatch) {
  return await db.insert(documentMatches).values(match).returning();
}

export async function createDocumentMatches(matches: DocumentMatch[]) {
  if (matches.length === 0) return [];
  return await db.insert(documentMatches).values(matches).returning();
}

export async function getDocumentMatchesForDocument(documentId: string) {
  return await db.select().from(documentMatches)
    .where(eq(documentMatches.documentId, documentId))
    .innerJoin(classifications, eq(documentMatches.classificationId, classifications.id));
}

export function prepareDocumentMatch(
  documentId: string,
  classificationId: string,
  requirementId: string,
  requirementText: string,
  matchDetails: {
    vectorScore: number;
    aiScore: number;
    finalScore: number;
    isMatch: boolean;
    confidence: 'high' | 'medium' | 'low';
    matchReason: string;
    matchedContent: string[];
  }
): DocumentMatch {

  const matchData = {
    vectorScore: matchDetails.vectorScore,
    aiScore: matchDetails.aiScore,
    finalScore: matchDetails.finalScore,
    confidence: matchDetails.confidence,
    matchReason: matchDetails.matchReason
  };
    
  return {
    id: crypto.randomUUID(),
    documentId,
    classificationId,
    requirementId,
    matchPercentage: Math.round(matchDetails.finalScore),
    confidence: matchDetails.confidence === 'high' ? 100 : 
               matchDetails.confidence === 'medium' ? 75 : 50,
    matchedRequirements: [
      ...matchDetails.matchedContent,
      JSON.stringify(matchData)
    ],
    rawMatchReason: matchDetails.matchReason,
    isMatched: matchDetails.isMatch,
    matchedAt: new Date(),
    updatedAt: new Date()
  };
} 