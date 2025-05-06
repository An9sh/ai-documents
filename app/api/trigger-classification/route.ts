import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getRequirements } from '../../lib/db/requirements';
import { createDocumentMatch } from '../../lib/db/document-matches';
import { createClassification } from '../../lib/db/classifications';
import { RequirementsClassifier } from '../requirements/route';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { documentId, fileName, userId, result} = body;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    console.log('Received request body:', body.result.dbDocument.id);
    if (!documentId || !userId || !token) {
      console.error('Missing parameters:', { documentId, userId, hasToken: !!token });
      return NextResponse.json({ 
        error: 'Missing parameters',
        details: {
          documentId: !documentId,
          userId: !userId,
          token: !token
        }
      }, { status: 400 });
    }

    const requirements = await getRequirements(userId);
    console.log('User requirements:', requirements);

    if (!requirements || requirements.length === 0) {
      console.log('No requirements found for user:', userId);
      return NextResponse.json({ 
        success: true,
        classifications: [],
        message: 'No requirements found for classification'
      });
    }

    // Process each requirement
    const requirementClassifications = await Promise.all(
      requirements.map(async (req) => {
        try {
          const question = RequirementsClassifier.buildQuestionForRequirement(req);
          console.log('Generated question:', question);

          const documentInfo = await RequirementsClassifier.fetchDocumentInformation(
            question,
            [documentId],
            token,
            userId,
            req.id
          );
          console.log('Document info:', documentInfo);

          try {
            // Check if we have valid matches
            if (!documentInfo?.matches?.length) {
              console.log('No matches found for requirement:', req.id);
              return null;
            }

            const match = documentInfo.matches[0];
            if (!match) {
              console.log('First match is undefined for requirement:', req.id);
              return null;
            }

            const vectorScore = match.score || 0;
            const aiScore = match.aiScore || 0;
            const finalScore = Math.round(vectorScore);
            const isMatch = finalScore >= req.matchThreshold && documentInfo.matchDetails?.match === true;
            
            // // Generate a more descriptive reason
            // let matchReason = "No match found";
            // if (isMatch) {
            //   if (documentInfo?.reason) {
            //     matchReason = documentInfo.reason;
            //   } else if (match.content) {
            //     matchReason = "Document content matches the requirement";
            //   } else {
            //     matchReason = "Document meets the requirement threshold";
            //   }
            // } else if (finalScore < req.matchThreshold) {
            //   matchReason = `Score (${finalScore}%) is below the required threshold (${req.matchThreshold * 100}%)`;
            // } else if (!documentInfo.matchDetails?.match) {
            //   matchReason = "Document content does not match the requirement";
            // }
            
            const dbClassification = await createClassification({
              id: uuidv4(),
              documentId: result.dbDocument.id,
              requirementId: req.id,
              requirementText: req.name || 'Unnamed Requirement',
              requirementName: req.name || 'Unnamed Requirement',
              requirementDescription: req.description || '',
              userId,
              score: finalScore,
              confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
              isPrimary: isMatch && finalScore >= req.matchThreshold,
              isSecondary: isMatch && finalScore >= req.matchThreshold * 0.8,
              isMatched: isMatch,
              documentName: fileName,
              matchDetails: match.content ? [match.content] : [],
              reason: match.reason,
              matchedContent: match.content ? [match.content] : null,
              details: {
                requirements: {
                  matched: match.content ? [match.content] : [],
                  missing: []
                },
                metadata: {
                  documentId: result.dbDocument.id,
                  filename: fileName,
                  lines: { from: 0, to: 0 },
                  userId,
                  matchedAt: new Date().toISOString(),
                  confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
                  matchedRequirements: match.content ? [match.content] : [],
                  rawMatchReason: match.reason,
                  threshold: req.matchThreshold,
                  isMatched: isMatch,
                  documentInfo: {
                    type: 'document',
                    size: 0
                  },
                  requirementName: req.name || 'Unnamed Requirement',
                  requirementDescription: req.description || ''
                },
                scores: {
                  vector: vectorScore,
                  ai: aiScore,
                  final: finalScore
                },
                matchDetails: match.content ? [match.content] : []
              },
              updatedAt: new Date()
            });

            // Create document match if matched
            if (isMatch) {
              await createDocumentMatch({
                documentId: result.dbDocument.id,
                classificationId: dbClassification.id,
                matchPercentage: finalScore,
                confidence: finalScore > 80 ? 3 : finalScore > 60 ? 2 : 1,
                matchedRequirements: match.content ? [match.content] : [],
                rawMatchReason: match.reason,
                isMatched: true
              });
            }

            return {
              ...dbClassification,
              requirementText: req.name || 'Unnamed Requirement',
              requirementName: req.name || 'Unnamed Requirement',
              reason: match.reason,
              requirementDescription: req.description || ''
            };
          } catch (error) {
            console.error('Error processing classification:', error);
            return null;
          }
        } catch (error) {
          console.error('Error processing requirement:', error);
          return null;
        }
      })
    );

    // Filter out null classifications
    const validClassifications = requirementClassifications.filter(Boolean);
    console.log('Valid classifications:', validClassifications);

    return NextResponse.json({ 
      success: true,
      classifications: validClassifications,
      message: 'Classification completed successfully'
    });
  } catch (error) {
    console.error('Error in classification:', error);
    return NextResponse.json({ 
      error: 'Classification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 