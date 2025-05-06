import { Classification, ConfidenceLevel } from '../../types';
import { createClassification } from '../../lib/db/classifications';
import { createDocumentMatch, prepareDocumentMatch } from '../../lib/db/requirement-matches';
import { RequirementsClassifier } from '../../api/requirements/route';
import { getRequirements } from '../db/requirements';
import { nanoid } from 'nanoid';

export class RequirementMatcher {
  static async matchRequirements(
    documentId: string,
    userId: string,
    token: string,
    filename: string,
    fileSize: number
  ) {
    const allRequirements = await getRequirements(userId);
    const classifications: Classification[] = [];

    for (const req of allRequirements) {
      const question = RequirementsClassifier.buildQuestionForRequirement(req);
      const documentInfo = await RequirementsClassifier.fetchDocumentInformation(
        question,
        [documentId],
        token,
        userId,
        req.id
      );

      if (!documentInfo || !documentInfo.matches?.length) {
        continue;
      }

      const match = documentInfo.matches[0];
      const vectorScore = match.vectorScore || 0;
      
      const finalScore = vectorScore;

      const confidence: 'high' | 'medium' | 'low' = finalScore >= 70 ? 'high' : 
                        finalScore >= 40 ? 'medium' : 
                        'low';

      try {
        const dbClassification = await createClassification({
          id: nanoid(),
          documentId,
          requirementId: req.id,
          requirementText: req.description || req.name,
          requirementName: req.name,
          requirementDescription: req.description || '',
          userId,
          score: Math.round(finalScore),
          confidence: confidence as ConfidenceLevel,
          isPrimary: documentInfo.matchDetails?.match === true && finalScore >= req.matchThreshold,
          isSecondary: documentInfo.matchDetails?.match === true && finalScore >= req.matchThreshold * 0.8,
          isMatched: documentInfo.matchDetails?.match === true,
          documentName: filename,
          matchDetails: match.content ? [match.content] : [],
          reason: documentInfo.matchDetails?.reason || "No match found",
          details: {
            requirements: {
              matched: match.content ? [match.content] : [],
              missing: []
            },
            metadata: {
              documentId,
              filename,
              lines: { from: 0, to: 0 },
              userId,
              matchedAt: new Date().toISOString(),
              confidence: confidence as ConfidenceLevel,
              matchedRequirements: match.content ? [match.content] : [],
              rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
              threshold: req.matchThreshold,
              isMatched: documentInfo.matchDetails?.match === true,
              documentInfo: {
                type: 'document',
                size: fileSize
              },
              requirementName: req.name,
              requirementDescription: req.description || ''
            },
            scores: {
              vector: match.vectorScore || 0,
              ai: match.aiScore || 0,
              final: finalScore
            },
            matchDetails: match.content ? [match.content] : []
          },
          updatedAt: new Date()
        });

        const classification: Classification = {
          ...dbClassification,
          documentId: dbClassification.documentId || '',
          requirementId: dbClassification.requirementId || '',
          userId: dbClassification.userId || '',
          confidence: dbClassification.confidence === 3 ? 'high' : 
                    dbClassification.confidence === 2 ? 'medium' : 'low',
          requirementText: req.description || req.name,
          requirementName: req.name,
          requirementDescription: req.description || '',
          documentName: filename,
          matchDetails: match.content ? [match.content] : [],
          reason: documentInfo.matchDetails?.reason || "No match found",
          details: {
            requirements: {
              matched: match.content ? [match.content] : [],
              missing: []
            },
            metadata: {
              documentId,
              filename,
              lines: { from: 0, to: 0 },
              userId,
              matchedAt: new Date().toISOString(),
              confidence: confidence as ConfidenceLevel,
              matchedRequirements: match.content ? [match.content] : [],
              rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
              threshold: req.matchThreshold,
              isMatched: documentInfo.matchDetails?.match === true,
              documentInfo: {
                type: 'document',
                size: fileSize
              },
              requirementName: req.name,
              requirementDescription: req.description || ''
            },
            scores: {
              vector: match.vectorScore || 0,
              ai: match.aiScore || 0,
              final: finalScore
            },
            matchDetails: match.content ? [match.content] : []
          },
          updatedAt: dbClassification.updatedAt || new Date()
        };

        if (documentInfo.matchDetails?.match === true) {
          const documentMatch = prepareDocumentMatch(
            documentId,
            classification.id,
            req.id,
            req.description || req.name,
            {
              vectorScore: match.vectorScore || 0,
              aiScore: match.aiScore || 0,
              finalScore,
              isMatch: true,
              confidence: confidence as ConfidenceLevel,
              matchReason: documentInfo.matchDetails.reason || "No reason provided",
              matchedContent: match.content ? [match.content] : []
            }
          );
          
          const createdMatch = await createDocumentMatch(documentMatch);
          if (!createdMatch) {
            console.error('Failed to create document match for requirement:', req.id);
          } else {
            console.log('Created document match:', createdMatch);
          }
        }

        classifications.push(classification);
      } catch (error) {
        console.error('Error processing classification:', error);
        continue;
      }
    }

    return classifications;
  }
} 