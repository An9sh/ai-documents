import { db } from '../db';
import { classifications, documentMatches } from '../../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { getDocuments } from '../db/documents';
import { RequirementsClassifier } from '../../api/requirements/route';
import { eq, inArray } from 'drizzle-orm';
import { SearchService } from './search-service';

export class SyncService {
  static async syncRequirement(
    requirement: { id: string; name: string; matchThreshold: number },
    userId: string,
    token: string
  ) {
    try {
      // Get all documents for the user
      const docs = await getDocuments(userId);
      const documentIds = docs.map(doc => doc.pineconeId).filter((id): id is string => id !== undefined);

      if (!documentIds.length) {
        return { message: 'No documents found to sync' };
      }

      // Build question for the requirement
      const question = RequirementsClassifier.buildQuestionForRequirement(requirement);

      // Search for matches using SearchService
      const searchResults = await SearchService.searchDocuments(
        question,
        requirement.name,
        userId,
        documentIds
      );

      if (!searchResults.results || searchResults.results.length === 0) {
        return { message: 'No matches found' };
      }

      // Filter out documents that don't exist in our database
      const validDocuments = searchResults.results.filter(doc => 
        docs.some(dbDoc => dbDoc.pineconeId === doc.documentId)
      );

      if (validDocuments.length === 0) {
        return { message: 'No valid documents found' };
      }

      // Prepare classifications data
      const classificationsData = validDocuments.map(doc => {
        const vectorScore = doc.vectorScore || 0;
        const finalScore = vectorScore; // Using vector score as final score
        const isMatched = doc.isMatch === true && finalScore >= requirement.matchThreshold;
        const isPrimary = isMatched && finalScore >= requirement.matchThreshold;
        const isSecondary = isMatched && finalScore >= requirement.matchThreshold * 0.8;
        const confidence = finalScore > 80 ? 3 : finalScore > 60 ? 2 : 1;

        const dbDoc = docs.find(dbDoc => dbDoc.pineconeId === doc.documentId);
        const score = Math.round(Math.max(0, Math.min(100, finalScore)));
        const matchReason = doc.matchDetails?.[0]?.reason || "No match reason provided";

        const details = {
          requirements: {
            matched: doc.matchDetails?.map(detail => detail.requirement) || [],
            missing: []
          },
          metadata: {
            documentId: dbDoc?.id || doc.documentId,
            filename: doc.filename,
            lines: { from: 0, to: 0 },
            userId,
            matchedAt: new Date().toISOString(),
            confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
            matchedRequirements: doc.matchDetails?.map(detail => detail.requirement) || [],
            rawMatchReason: matchReason,
            threshold: requirement.matchThreshold,
            isMatched,
            documentInfo: {
              type: 'document',
              size: 0
            }
          },
          scores: {
            vector: vectorScore,
            final: finalScore
          }
        };

        return {
          id: uuidv4(),
          documentId: dbDoc?.id || doc.documentId,
          requirementId: requirement.id,
          userId,
          score,
          confidence,
          isPrimary,
          isSecondary,
          isMatched,
          details: JSON.stringify(details)
        };
      });

      // Get existing classifications
      const existingClassifications = await db
        .select()
        .from(classifications)
        .where(eq(classifications.requirementId, requirement.id));

      // Delete document matches for existing classifications
      if (existingClassifications.length > 0) {
        const classificationIds = existingClassifications.map(c => c.id);
        await db
          .delete(documentMatches)
          .where(inArray(documentMatches.classificationId, classificationIds));
      }

      // Delete existing classifications
      await db
        .delete(classifications)
        .where(eq(classifications.requirementId, requirement.id));

      // Create new classifications
      const newClassifications = await db
        .insert(classifications)
        .values(classificationsData)
        .returning();

      // Create document matches
      const documentMatchesData = newClassifications
        .filter(cls => cls.isMatched)
        .map(cls => {
          const details = typeof cls.details === 'string' 
            ? JSON.parse(cls.details)
            : cls.details;
          
          return {
            id: uuidv4(),
            documentId: cls.documentId,
            classificationId: cls.id,
            requirementId: cls.requirementId,
            userId: cls.userId,
            matchPercentage: cls.score,
            matchedAt: new Date(),
            isMatched: true,
            confidence: cls.confidence,
            matchReason: details.metadata?.rawMatchReason || "No reason provided",
            matchedRequirements: details.metadata?.matchedRequirements || [],
            rawMatchReason: details.metadata?.rawMatchReason || "No reason provided"
          };
        });

      if (documentMatchesData.length > 0) {
        await db
          .insert(documentMatches)
          .values(documentMatchesData);
      }

      // Format response
      const formattedClassifications = newClassifications.map(classification => {
        const details = typeof classification.details === 'string' 
          ? JSON.parse(classification.details)
          : classification.details;
        return {
          ...classification,
          details: JSON.stringify(details)
        };
      });

      return {
        success: true,
        classifications: {
          [requirement.id]: formattedClassifications
        }
      };
    } catch (error) {
      console.error('Error syncing requirement:', error);
      throw error;
    }
  }
} 