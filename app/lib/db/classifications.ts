import { db } from '../../lib/db';
import { classifications } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { Classification, ClassificationDetails } from '../../../app/types';
import { ClassificationRequirement, ConfidenceLevel } from '../../../app/types/resume';
import { documents } from '../../../db/schema';
import { requirements } from '../../../db/schema';
import { nanoid } from 'nanoid';
import { documentMatches } from '../../../db/schema';

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 100) return 'high';
  if (score >= 75) return 'medium';
  return 'low';
}

export async function getClassifications(documentId: string): Promise<Classification[]> {
  const dbClassifications = await db.select()
    .from(classifications)
    .where(eq(classifications.documentId, documentId));
  
  return dbClassifications.map((cls) => ({
    id: cls.id.toString(),
    documentId: cls.documentId?.toString() ?? '',
    requirementId: cls.requirementId?.toString() ?? '',
    requirementText: (cls.details as any)?.metadata?.rawMatchReason ?? '',
    requirementName: (cls.details as any)?.metadata?.requirementName ?? '',
    requirementDescription: (cls.details as any)?.metadata?.requirementDescription ?? '',
    userId: cls.userId?.toString() ?? '',
    score: cls.score,
    confidence: getConfidenceLevel(cls.confidence),
    isPrimary: cls.isPrimary,
    isSecondary: cls.isSecondary,
    isMatched: cls.isMatched,
    reason: (cls.details as any)?.metadata?.rawMatchReason ?? '',
    matchedContent: (cls.details as any)?.metadata?.matchedContent ?? null,
    details: {
      requirements: {
        matched: Array.isArray((cls.details as any)?.requirements?.matched) ? (cls.details as any).requirements.matched : [],
        missing: Array.isArray((cls.details as any)?.requirements?.missing) ? (cls.details as any).requirements.missing : []
      },
      metadata: {
        documentId: cls.documentId?.toString() ?? '',
        filename: '',
        lines: { from: 0, to: 0 },
        userId: cls.userId?.toString() ?? '',
        matchedAt: new Date().toISOString(),
        confidence: getConfidenceLevel(cls.confidence),
        matchedRequirements: [],
        rawMatchReason: (cls.details as any)?.metadata?.rawMatchReason ?? '',
        threshold: (cls.details as any)?.metadata?.threshold ?? 0,
        isMatched: cls.isMatched,
        documentInfo: { type: 'document', size: 0 },
        requirementName: (cls.details as any)?.metadata?.requirementName ?? '',
        requirementDescription: (cls.details as any)?.metadata?.requirementDescription ?? ''
      },
      scores: {
        vector: (cls.details as any)?.scores?.vector ?? 0,
        ai: (cls.details as any)?.scores?.ai ?? 0,
        final: cls.score
      },
      matchDetails: Array.isArray((cls.details as any)?.requirements?.matched) 
        ? (cls.details as any).requirements.matched 
        : []
    },
    documentName: '',
    updatedAt: new Date(),
    matchDetails: Array.isArray((cls.details as any)?.requirements?.matched) 
      ? (cls.details as any).requirements.matched 
      : []
  }));
}

export async function createClassification(classification: Classification) {
  try {
    // Verify document exists before creating classification
    let document = await db.query.documents.findFirst({
      where: eq(documents.id, classification.documentId)
    });

    // Retry up to 3 times if document not found
    let retries = 0;
    while (!document && retries < 3) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      document = await db.query.documents.findFirst({
        where: eq(documents.id, classification.documentId)
      });
      retries++;
    }

    // If document still not found, throw error
    if (!document) {
      throw new Error(`Cannot create classification: Document ${classification.documentId} does not exist`);
    }

    const confidence = classification.confidence === 'high' ? 3 :
      classification.confidence === 'medium' ? 2 :
      classification.confidence === 'low' ? 1 :
      1;
    
    const result = await db.insert(classifications)
      .values({
        id: classification.id,  // Use the provided ID
        documentId: classification.documentId,  // Use the document's ID
        requirementId: classification.requirementId,
        userId: classification.userId,
        score: classification.score,
        confidence,
        isPrimary: classification.isPrimary,
        isSecondary: classification.isSecondary,
        isMatched: classification.isMatched,
        details: classification.details
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error creating classification:', error);
    throw error;
  }
}

export async function updateClassification(
  id: string,
  data: Partial<Classification>
): Promise<Classification | null> {
  const [updatedClassification] = await db
    .update(classifications)
    .set({
      documentId: data.documentId || undefined,
      requirementId: data.requirementId || undefined,
      userId: data.userId || undefined,
      score: data.score || 0,
      confidence: data.score || 0,
      isPrimary: data.isPrimary,
      isSecondary: data.isSecondary,
      isMatched: data.isMatched,
      details: data.details,
      matchedContent: Array.isArray(data.matchDetails) ? data.matchDetails : [],
      updatedAt: new Date()
    })
    .where(eq(classifications.id, id))
    .returning();

  if (!updatedClassification) return null;

  return {
    id: updatedClassification.id,
    documentId: updatedClassification.documentId || '',
    requirementId: updatedClassification.requirementId || '',
    requirementText: (updatedClassification.details as any)?.metadata?.rawMatchReason ?? '',
    requirementName: (updatedClassification.details as any)?.metadata?.requirementName ?? '',
    requirementDescription: (updatedClassification.details as any)?.metadata?.requirementDescription ?? '',
    userId: updatedClassification.userId || '',
    score: updatedClassification.score,
    confidence: getConfidenceLevel(updatedClassification.score),
    isPrimary: updatedClassification.isPrimary,
    isSecondary: updatedClassification.isSecondary,
    isMatched: updatedClassification.isMatched,
    reason: (updatedClassification.details as any)?.metadata?.rawMatchReason ?? '',
    matchedContent: (updatedClassification.details as any)?.metadata?.matchedContent ?? null,
    details: {
      requirements: {
        matched: Array.isArray((updatedClassification.details as any)?.requirements?.matched) ? (updatedClassification.details as any).requirements.matched : [],
        missing: Array.isArray((updatedClassification.details as any)?.requirements?.missing) ? (updatedClassification.details as any).requirements.missing : []
      },
      metadata: {
        documentId: updatedClassification.documentId || '',
        filename: '',
        lines: { from: 0, to: 0 },
        userId: updatedClassification.userId || '',
        matchedAt: new Date().toISOString(),
        confidence: getConfidenceLevel(updatedClassification.score),
        matchedRequirements: [],
        rawMatchReason: (updatedClassification.details as any)?.metadata?.rawMatchReason ?? '',
        threshold: (updatedClassification.details as any)?.metadata?.threshold ?? 0,
        isMatched: updatedClassification.isMatched,
        documentInfo: { type: 'document', size: 0 },
        requirementName: (updatedClassification.details as any)?.metadata?.requirementName ?? '',
        requirementDescription: (updatedClassification.details as any)?.metadata?.requirementDescription ?? ''
      },
      scores: {
        vector: (updatedClassification.details as any)?.scores?.vector ?? 0,
        ai: (updatedClassification.details as any)?.scores?.ai ?? 0,
        final: updatedClassification.score
      },
      matchDetails: Array.isArray((updatedClassification.details as any)?.requirements?.matched) 
        ? (updatedClassification.details as any).requirements.matched 
        : []
    },
    documentName: '',
    updatedAt: new Date(),
    matchDetails: Array.isArray((updatedClassification.details as any)?.requirements?.matched) 
      ? (updatedClassification.details as any).requirements.matched 
      : []
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
    requirementText: (cls.details as any)?.metadata?.rawMatchReason ?? '',
    requirementName: (cls.details as any)?.metadata?.requirementName ?? '',
    requirementDescription: (cls.details as any)?.metadata?.requirementDescription ?? '',
    userId: cls.userId?.toString() ?? '',
    score: cls.score,
    confidence: getConfidenceLevel(cls.confidence),
    isPrimary: cls.isPrimary,
    isSecondary: cls.isSecondary,
    isMatched: cls.isMatched,
    reason: (cls.details as any)?.metadata?.rawMatchReason ?? '',
    matchedContent: (cls.details as any)?.metadata?.matchedContent ?? null,
    details: {
      requirements: {
        matched: Array.isArray((cls.details as any)?.requirements?.matched) ? (cls.details as any).requirements.matched : [],
        missing: Array.isArray((cls.details as any)?.requirements?.missing) ? (cls.details as any).requirements.missing : []
      },
      metadata: {
        documentId: cls.documentId?.toString() ?? '',
        filename: '',
        lines: { from: 0, to: 0 },
        userId: cls.userId?.toString() ?? '',
        matchedAt: new Date().toISOString(),
        confidence: getConfidenceLevel(cls.confidence),
        matchedRequirements: [],
        rawMatchReason: (cls.details as any)?.metadata?.rawMatchReason ?? '',
        threshold: (cls.details as any)?.metadata?.threshold ?? 0,
        isMatched: cls.isMatched,
        documentInfo: { type: 'document', size: 0 },
        requirementName: (cls.details as any)?.metadata?.requirementName ?? '',
        requirementDescription: (cls.details as any)?.metadata?.requirementDescription ?? ''
      },
      scores: {
        vector: (cls.details as any)?.scores?.vector ?? 0,
        ai: (cls.details as any)?.scores?.ai ?? 0,
        final: cls.score
      },
      matchDetails: Array.isArray((cls.details as any)?.requirements?.matched) 
        ? (cls.details as any).requirements.matched 
        : []
    },
    documentName: '',
    updatedAt: new Date(),
    matchDetails: Array.isArray((cls.details as any)?.requirements?.matched) 
      ? (cls.details as any).requirements.matched 
      : []
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
    details: classifications.details,
    matchDetails: documentMatches.matchedRequirements,
    matchReason: documentMatches.rawMatchReason,
    isMatched: documentMatches.isMatched ?? false,
    matchPercentage: documentMatches.matchPercentage,
    matchedAt: documentMatches.matchedAt
  })
    .from(classifications)
    .innerJoin(documents, eq(documents.id, classifications.documentId))
    .innerJoin(requirements, eq(requirements.id, classifications.requirementId))
    .leftJoin(documentMatches, eq(documentMatches.classificationId, classifications.id))
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
      matchDetails: match.matchDetails || [],
      matchReason: match.matchReason || "No match reason provided",
      isMatched: match.isMatched ?? false,
      matchPercentage: match.matchPercentage,
      matchedAt: match.matchedAt
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
      matchDetails: any[],
      matchReason: string,
      isMatched: boolean,
      matchPercentage: number | null,
      matchedAt: Date | null
    }>
  }>);
  return Object.values(groupedByDocument);
} 