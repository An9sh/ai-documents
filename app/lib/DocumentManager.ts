import { Classification, DocumentMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RequirementsClassifier } from '../api/requirements/route';
import { getRequirements } from './db/requirements';
import { createDocumentMatch } from './db/document-matches';
import { createClassification } from './db/classifications';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { documents } from '../../db/schema';

export class DocumentManager {
  

  private updateProgress(progress: number, status: string, callback?: (progress: number, status: string) => void) {

    console.log(`Progress: ${progress}% - ${status}`);
    if (callback) {
      callback(progress, status);
    }
  }

  async uploadDocuments(
    files: File[], 
    userId: string, 
    token: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<DocumentMetadata[]> {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!token) {
      throw new Error('Authentication token is required');
    }

    const uploadId = uuidv4();
    const documents: DocumentMetadata[] = [];

    try {
      // Update progress for upload start
      this.updateProgress(0, 'Starting upload...', onProgress);

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        // Update progress for each file
        this.updateProgress(
          Math.round((i / files.length) * 100), 
          `Uploading ${file.name}...`,
          onProgress
        );

        const response = await fetch('/api/process-document', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Upload-Id': uploadId
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`Failed to upload document: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Raw server response:', JSON.stringify(result, null, 2));

        if (!result.documentId) {
          console.error('Server response missing documentId:', result);
          throw new Error('No document ID received from server');
        }

        console.log('Received document ID:', result.documentId);

        // Create document metadata from the response
        const document: DocumentMetadata = {
          id: result.dbDocument.id,
          filename: file.name,
          type: 'document',
          size: file.size,
          mimeType: file.type,
          summary: '',
          pageCount: 0,
          pineconeId: result.documentId,
          uploadedAt: new Date(),
          fileSize: file.size,
          namespace: userId,
          fileKey: result.documentId
        };

        // Update progress for document processing
        this.updateProgress(
          Math.round(((i + 0.3) / files.length) * 100),
          `Processing requirements for ${file.name}...`,
          onProgress
        );

        // Get requirements for the user
        const requirements = await getRequirements(userId);
        console.log('User requirements:', requirements);

        // Process each requirement
        const requirementClassifications = await Promise.all(
          requirements.map(async (req) => {
            try {
              const question = RequirementsClassifier.buildQuestionForRequirement(req);
              console.log('Generated question:', question);

              const documentInfo = await RequirementsClassifier.fetchDocumentInformation(
                question,
                [result.documentId],
                token,
                userId,
                req.id
              );
              console.log('Document info:', documentInfo);

              try {
                const match = documentInfo.matches[0];
                const vectorScore = match.score || 0;
                const aiScore = match.aiScore || 0;
                const finalScore = Math.round(vectorScore);
                const isMatch = finalScore >= req.matchThreshold && documentInfo.matchDetails?.match === true;
                
                const dbClassification = await createClassification({
                  id: uuidv4(),
                  documentId: result.dbDocument.id,
                  requirementId: req.id,
                  requirementText: req.description || req.name,
                  requirementName: req.name,
                  requirementDescription: req.description,
                  userId,
                  score: finalScore,
                  confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
                  isPrimary: isMatch && finalScore >= req.matchThreshold,
                  isSecondary: isMatch && finalScore >= req.matchThreshold * 0.8,
                  isMatched: isMatch,
                  documentName: file.name,
                  matchDetails: match.content ? [match.content] : [],
                  reason: documentInfo.matchDetails?.reason || "No match found",
                  details: {
                    requirements: {
                      matched: match.content ? [match.content] : [],
                      missing: []
                    },
                    metadata: {
                      documentId: result.documentId,
                      filename: file.name,
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
                        size: file.size
                      },
                      requirementName: req.name,
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

                // Convert the database classification to the expected Classification type
                const classification: Classification = {
                  ...dbClassification,
                  documentId: dbClassification.documentId || result.dbDocument.id,
                  requirementId: dbClassification.requirementId || req.id,
                  userId: dbClassification.userId || userId,
                  requirementText: req.description || req.name,
                  requirementName: req.name,
                  requirementDescription: req.description,
                  updatedAt: dbClassification.updatedAt || new Date(),
                  documentName: file.name,
                  matchDetails: match.content ? [match.content] : [],
                  confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
                  reason: documentInfo.matchDetails?.reason || "No match found",
                  details: {
                    requirements: {
                      matched: match.content ? [match.content] : [],
                      missing: []
                    },
                    metadata: {
                      documentId: result.dbDocument.id,
                      filename: file.name,
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
                        size: file.size
                      },
                      requirementName: req.name,
                      requirementDescription: req.description || ''
                    },
                    scores: {
                      vector: vectorScore,
                      ai: aiScore,
                      final: finalScore
                    },
                    matchDetails: match.content ? [match.content] : []
                  }
                };

                if (documentInfo.matchDetails?.match === true) {
                  const matchData = {
                    documentId: result.dbDocument.id,
                    classificationId: classification.id,
                    matchPercentage: Math.round(vectorScore * 100),
                    confidence: finalScore > 80 ? 3 : finalScore > 60 ? 2 : 1,
                    matchedRequirements: match.content ? [match.content] : [],
                    rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
                    isMatched: documentInfo.matchDetails?.match === true
                  };
                  await createDocumentMatch(matchData);
                }

                return classification;
              } catch (error) {
                console.error('Error processing classification:', error);
                return {
                  requirementId: req.id,
                  requirementText: req.description || req.name,
                  score: 0,
                  isMatched: false,
                  reason: 'Error processing requirement',
                  details: {
                    scores: {
                      vector: 0,
                      ai: 0
                    },
                    matchDetails: []
                  }
                };
              }
            } catch (error) {
              console.error('Error processing requirement:', error);
              return null;
            }
          })
        );

        // Filter out null classifications and add to document
        const validClassifications = requirementClassifications.filter(Boolean);
        console.log('Valid classifications:', validClassifications);

        documents.push({
          ...document,
          classifications: validClassifications
        });
      }

      // Update progress for completion
      this.updateProgress(100, 'Upload complete', onProgress);
      return documents;

    } catch (error) {
      console.error('Error in uploadDocuments:', error);
      throw error;
    }
  }
} 