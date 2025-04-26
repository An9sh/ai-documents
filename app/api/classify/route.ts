import { NextResponse } from "next/server";
import { getRequirements } from "../../../app/lib/db/requirements";
import { RequirementsClassifier } from "../requirements/route";
import { createDocumentMatch, prepareDocumentMatch } from "../../lib/db/requirement-matches";
import { createClassification } from "../../lib/db/classifications";
import { Classification } from '../../types';
import { sendProgressUpdate } from '../../lib/upload-progress';
import { verifyFirebaseToken } from '../../lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { documentId, userId, token, uploadId } = await request.json();

    if (!documentId || !userId || !token || !uploadId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken?.uid || decodedToken.uid !== userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const allRequirements = await getRequirements(userId);
    const classifications: Classification[] = [];

    for (const req of allRequirements) {
      const progress = 60 + (classifications.length / allRequirements.length * 20);
      sendProgressUpdate(uploadId, { 
        status: 'processing',
        message: `Processing requirement: ${req.name}`,
        progress
      });

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
      const aiScore = match.aiScore || 0;
      const finalScore = documentInfo.finalScore || 0;

      try {
        const classification = await createClassification({
          documentId,
          documentName: documentInfo.documentName || '',
          updatedAt: new Date(),
          matchDetails: documentInfo.matchDetails || {},
          requirementId: req.id,
          score: Math.round(finalScore),
          isMatched: documentInfo.matchDetails?.match === true,
          confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
          isPrimary: documentInfo.matchDetails?.match === true && finalScore >= req.matchThreshold,
          isSecondary: documentInfo.matchDetails?.match === true && finalScore >= req.matchThreshold * 0.8,
          details: {
            requirements: {
              matched: match.content ? [match.content] : [],
              missing: []
            },
            metadata: {
              documentId,
              filename: documentInfo.documentName || '',
              lines: { from: 0, to: 0 },
              userId,
              matchedAt: new Date().toISOString(),
              confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
              matchedRequirements: match.content ? [match.content] : [],
              rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
              threshold: req.matchThreshold,
              isMatched: documentInfo.matchDetails?.match === true,
              documentInfo: {
                type: 'document',
                size: documentInfo.documentSize || 0,
              }
            },
            scores: {
              vector: vectorScore,
              ai: aiScore,
              final: finalScore
            }
          }
        });

        if (documentInfo.matchDetails?.match === true) {
          const documentMatch = prepareDocumentMatch(
            documentId,
            classification.id,
            req.id,
            {
              vectorScore,
              aiScore,
              finalScore,
              isMatch: true,
              confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
              matchReason: documentInfo.matchDetails.reason || "No reason provided",
              matchedContent: match.content ? [match.content] : []
            }
          );
          await createDocumentMatch(documentMatch);
        }

        classifications.push(classification);
      } catch (error) {
        console.error('Error processing classification:', error);
        continue;
      }
    }

    sendProgressUpdate(uploadId, { 
      status: 'completed',
      message: 'Document processing completed successfully',
      progress: 100
    });

    return NextResponse.json({ 
      success: true,
      classifications: classifications.map(c => ({
        documentId: c.documentId,
        requirementId: c.requirementId,
        score: c.score,
        confidence: c.confidence,
        isPrimary: c.isPrimary,
        isSecondary: c.isSecondary,
        isMatched: c.isMatched,
        details: c.details
      })),
      matchedRequirements: allRequirements.map(req => {
        const reqClassification = classifications.find(c => c.requirementId === req.id);
        return reqClassification ? {
          documentId: reqClassification.documentId,
          requirementId: reqClassification.requirementId,
          score: reqClassification.score,
          confidence: reqClassification.confidence,
          isMatched: reqClassification.isPrimary,
          reason: reqClassification.details.metadata?.rawMatchReason || "No reason provided",
          threshold: req.matchThreshold,
          requirement: req.name
        } : null;
      }).filter(Boolean),
      message: `Document processed successfully. Matched with ${classifications.filter(c => c.isPrimary).length} out of ${allRequirements.length} requirements.`
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process classifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 