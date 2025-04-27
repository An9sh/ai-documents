import { db } from '../../lib/db';
import { classifications } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { Classification } from '../../../app/types';
import { ClassificationRequirement, ConfidenceLevel } from '../../../app/types/resume';
import { v4 as uuidv4 } from 'uuid';
import { documents } from '../../../db/schema';
import { requirements } from '../../../db/schema';

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 100) return 'high';
  if (score >= 75) return 'medium';
  return 'low';
}

function getConfidenceScore(level: ConfidenceLevel): number {
  switch (level) {
    case 'high': return 100;
    case 'medium': return 75;
    case 'low': return 50;
  }
}

export async function getClassifications(documentId: string): Promise<Classification[]> {
  const dbClassifications = await db.select()
    .from(classifications)
    .where(eq(classifications.documentId, documentId));
  
  return dbClassifications.map((cls) => ({
    id: cls.id.toString(),
    documentId: cls.documentId?.toString() ?? '',
    requirementId: cls.requirementId?.toString() ?? '',
    score: cls.score,
    confidence: getConfidenceLevel(cls.confidence),
    isPrimary: cls.isPrimary,
    isSecondary: cls.isSecondary,
    isMatched: cls.isMatched,
    details: cls.details as Classification['details'],
    documentName: '',
    updatedAt: new Date(),
    matchDetails: cls.details
  }));
}

export async function createClassification(classification: Omit<Classification, 'id'>): Promise<Classification> {
  const [newClassification] = await db.insert(classifications)
    .values({
      id: uuidv4(),
      document_id: classification.documentId,
      requirement_id: classification.requirementId,
      score: classification.score,
      is_matched: classification.isMatched ?? false,
      confidence: getConfidenceScore(classification.confidence),
      is_primary: classification.isPrimary ?? false,
      is_secondary: classification.isSecondary ?? false,
      details: classification.details ?? {},
      created_at: new Date(),
      updated_at: new Date()
    } as typeof classifications.$inferInsert)
    .returning();

  return {
    ...classification,
    id: newClassification.id,
    documentName: '',
    updatedAt: new Date(),
    matchDetails: classification.details
  };
}

export async function updateClassification(classificationId: string, classification: Partial<Classification>): Promise<Classification> {
  const [updatedClassification] = await db.update(classifications)
    .set({
      score: classification.score,
      confidence: classification.confidence ? getConfidenceScore(classification.confidence) : undefined,
      is_primary: classification.isPrimary ?? false,
      is_secondary: classification.isSecondary ?? false,
      is_matched: classification.isMatched ?? false,
      details: classification.details ?? {},
      updated_at: new Date()
    } as Partial<typeof classifications.$inferInsert>)
    .where(eq(classifications.id, classificationId))
    .returning();

  if (!updatedClassification.documentId || !updatedClassification.requirementId) {
    throw new Error('Invalid classification data');
  }

  return {
    id: updatedClassification.id.toString(),
    documentId: updatedClassification.documentId.toString(),
    requirementId: updatedClassification.requirementId.toString(),
    score: updatedClassification.score,
    confidence: getConfidenceLevel(updatedClassification.confidence),
    isPrimary: updatedClassification.isPrimary,
    isSecondary: updatedClassification.isSecondary,
    isMatched: updatedClassification.isMatched,
    details: updatedClassification.details as Classification['details'],
    documentName: '',
    updatedAt: new Date(),
    matchDetails: updatedClassification.details
  };
}

export async function deleteClassification(classificationId: string): Promise<void> {
  await db.delete(classifications)
    .where(eq(classifications.id, classificationId));

  // Update cache
  const cached = localStorage.getItem('classifications-cache');
  if (cached) {
    try {
      const classifications = JSON.parse(cached);
      const filtered = classifications.filter((c: ClassificationRequirement) => c.id !== classificationId);
      localStorage.setItem('classifications-cache', JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to update cached classifications:', e);
    }
  }
}

export async function getUserClassifications(userId: string): Promise<Classification[]> {
  const dbClassifications = await db.select()
    .from(classifications)
    .innerJoin(documents, eq(documents.id, classifications.documentId))
    .where(eq(documents.userId, userId));
  
  return dbClassifications.map(({ classifications: cls }) => ({
    id: cls.id.toString(),
    documentId: cls.documentId?.toString() ?? '',
    requirementId: cls.requirementId?.toString() ?? '',
    score: cls.score,
    confidence: getConfidenceLevel(cls.confidence),
    isPrimary: cls.isPrimary,
    isSecondary: cls.isSecondary,
    isMatched: cls.isMatched,
    details: cls.details as Classification['details'],
    documentName: '',
    updatedAt: new Date(),
    matchDetails: cls.details
  }));
}

export async function getClassificationRequirements(userId: string) {
  const dbRequirements = await db.select({
    requirementId: classifications.requirementId,
    documentId: classifications.documentId,
    score: classifications.score,
    confidence: classifications.confidence,
    isPrimary: classifications.isPrimary,
    isSecondary: classifications.isSecondary,
    isMatched: classifications.isMatched,
    details: classifications.details,
    filename: documents.filename,
    requirementName: requirements.name,
    requirementDescription: requirements.description,
    requirementCategory: requirements.category,
    requirementColor: requirements.color
  })
    .from(classifications)
    .innerJoin(documents, eq(documents.id, classifications.documentId))
    .innerJoin(requirements, eq(requirements.id, classifications.requirementId))
    .where(eq(documents.userId, userId));

  return dbRequirements.map(req => ({
    requirementId: req.requirementId?.toString() ?? '',
    documentId: req.documentId?.toString() ?? '',
    score: req.score,
    confidence: req.confidence,
    isPrimary: req.isPrimary,
    isSecondary: req.isSecondary,
    isMatched: req.isMatched,
    details: req.details,
    filename: req.filename,
    requirement: {
      name: req.requirementName,
      description: req.requirementDescription,
      category: req.requirementCategory,
      color: req.requirementColor
    }
  }));
}

export async function getMatchedDocumentsForDashboard(userId: string) {
  const dbMatches = await db.select({
    documentId: documents.id,
    filename: documents.filename,
    uploadedAt: documents.uploadedAt,
    requirementId: requirements.id,
    requirementName: requirements.name,
    requirementCategory: requirements.category,
    requirementColor: requirements.color,

    matchScore: classifications.score,
    confidence: classifications.confidence,
    isPrimary: classifications.isPrimary,
    isSecondary: classifications.isSecondary,
    details: classifications.details
  })
    .from(classifications)
    .innerJoin(documents, eq(documents.id, classifications.documentId))
    .innerJoin(requirements, eq(requirements.id, classifications.requirementId))
    .where(eq(documents.userId, userId))
    .orderBy(documents.uploadedAt);

  // Group by document for easier display
  const groupedByDocument = dbMatches.reduce((acc, match) => {
    const docId = match.documentId?.toString() ?? '';
    if (!acc[docId]) {
      acc[docId] = {
        documentId: docId,
        filename: match.filename ?? 'Untitled',
        uploadedAt: match.uploadedAt,
        matches: []
      };
    }

    acc[docId].matches.push({
      requirementId: match.requirementId?.toString() ?? '',
      name: match.requirementName ?? '',
      category: match.requirementCategory ?? '',
      color: match.requirementColor ?? '',
      score: match.matchScore,
      confidence: match.confidence,
      isPrimary: match.isPrimary,
      isSecondary: match.isSecondary,
      matchDetails: match.details
    });

    return acc;
  }, {} as Record<string, {
    documentId: string,
    filename: string,
    uploadedAt: Date | null,
    matches: Array<{
      requirementId: string,
      name: string,
      category: string,
      color: string,
      score: number,
      confidence: number,
      isPrimary: boolean,
      isSecondary: boolean,
      matchDetails: any
    }>
  }>);

  return Object.values(groupedByDocument);
} 