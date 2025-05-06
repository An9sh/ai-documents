import { Classification, DocumentMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RequirementsClassifier } from '../api/requirements/route';
import { getRequirements } from './db/requirements';
import { createDocumentMatch } from './db/document-matches';
import { createClassification } from './db/classifications';

export class DocumentManager {
  private getBaseUrl(): string {
    // In Vercel, we should use the Vercel URL
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    // For local development
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

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
    const baseUrl = this.getBaseUrl();

    try {
      this.updateProgress(0, 'Starting upload...', onProgress);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        this.updateProgress(
          Math.round((i / files.length) * 100), 
          `Uploading ${file.name}...`,
          onProgress
        );

        const response = await fetch(`${baseUrl}/api/process-document`, {
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
            error: errorText,
            baseUrl,
            uploadId
          });
          throw new Error(`Failed to upload document: ${errorText || response.statusText}`);
        }

        const result = await response.json();
        console.log('Process document response:', result);
        
        if (!result.documentId) {
          console.error('Invalid server response:', result);
          throw new Error('No document ID received from server');
        }

        // Create document metadata
        const document: DocumentMetadata = {
          id: result.documentId,
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

        this.updateProgress(
          Math.round(((i + 0.3) / files.length) * 100),
          `Verifying document...`,
          onProgress
        );

        // Verify document with retries
        let isDocumentAvailable = false;
        let retryCount = 0;
        const maxRetries = 10;
        const retryDelay = 2000;

        while (!isDocumentAvailable && retryCount < maxRetries) {
          try {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            
            const verifyResponse = await fetch(
              `${baseUrl}/api/verify-document?documentId=${result.documentId}`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                cache: 'no-store'
              }
            );

            if (!verifyResponse.ok) {
              const errorText = await verifyResponse.text();
              console.error('Verification error:', {
                status: verifyResponse.status,
                statusText: verifyResponse.statusText,
                error: errorText,
                documentId: result.documentId
              });
              throw new Error(`Document verification failed: ${errorText || verifyResponse.statusText}`);
            }

            const verifyResult = await verifyResponse.json();
            if (verifyResult.available) {
              isDocumentAvailable = true;
              break;
            }
          } catch (error) {
            console.error(`Verification attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }

        if (!isDocumentAvailable) {
          throw new Error('Document processing timeout. Please try again later.');
        }

        // Process requirements
        this.updateProgress(
          Math.round(((i + 0.5) / files.length) * 100),
          `Processing requirements...`,
          onProgress
        );

        if (isDocumentAvailable) {
          const requirements = await getRequirements(userId);
          
          const requirementClassifications = await Promise.all(
            requirements.map(async (req) => {
              try {
                const question = RequirementsClassifier.buildQuestionForRequirement(req);
                
                const response = await fetch(`${baseUrl}/api/question`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    question,
                    documentIds: [result.documentId],
                    requirementId: req.id,
                    requirement: req
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Question API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    documentId: result.documentId,
                    requirementId: req.id
                  });
                  throw new Error(`Failed to process requirement: ${errorText || response.statusText}`);
                }

                const data = await response.json();
                console.log('Question API response:', data);
                
                // Extract matched content from the response
                const matchedContent = data.matches?.map((match: any) => 
                  match.content || match.metadata?.pageContent
                ).filter(Boolean) || [];

                // Create classification in database
                const classification = await createClassification({
                  id: uuidv4(),
                  documentId: result.dbDocument.id,
                  requirementId: req.id,
                  requirementText: req.description || req.name,
                  requirementName: req.name,
                  requirementDescription: req.description,
                  userId,
                  score: data.score || 0,
                  confidence: data.score > 80 ? 'high' : data.score > 60 ? 'medium' : 'low',
                  isPrimary: data.isMatched && data.score >= req.matchThreshold,
                  isSecondary: data.isMatched && data.score >= req.matchThreshold * 0.8,
                  isMatched: data.isMatched || false,
                  documentName: file.name,
                  matchDetails: matchedContent,
                  reason: data.reason || "No match found",
                  details: {
                    requirements: {
                      matched: data.matchedRequirements || [],
                      missing: data.missingRequirements || []
                    },
                    metadata: {
                      documentId: result.dbDocument.id,
                      filename: file.name,
                      lines: data.lines || { from: 0, to: 0 },
                      userId,
                      matchedAt: new Date().toISOString(),
                      confidence: data.score > 80 ? 'high' : data.score > 60 ? 'medium' : 'low',
                      matchedRequirements: data.matchedRequirements || [],
                      rawMatchReason: data.reason || "No match found",
                      threshold: req.matchThreshold,
                      isMatched: data.isMatched || false,
                      documentInfo: {
                        type: 'document',
                        size: file.size
                      },
                      requirementName: req.name,
                      requirementDescription: req.description || ''
                    },
                    scores: {
                      vector: data.vectorScore || 0,
                      ai: data.aiScore || 0,
                      final: data.score || 0
                    },
                    matchDetails: matchedContent
                  },
                  updatedAt: new Date()
                });

                // If there's a match, create a document match record
                if (data.isMatched) {
                  await createDocumentMatch({
                    documentId: result.dbDocument.id,
                    classificationId: classification.id,
                    matchPercentage: Math.round((data.score || 0) * 100),
                    confidence: data.score > 80 ? 3 : data.score > 60 ? 2 : 1,
                    matchedRequirements: data.matchedRequirements || [],
                    rawMatchReason: data.reason || "No match found",
                    isMatched: data.isMatched || false
                  });
                }

                return {
                  ...classification,
                  requirementId: req.id,
                  requirement: req.name,
                  question,
                  matchedContent: matchedContent,
                  isMatched: data.isMatched || false,
                  reason: data.reason || "No match found",
                  score: data.score || 0
                };
              } catch (error) {
                console.error('Error processing requirement:', error);
                return null;
              }
            })
          );

          const validClassifications = requirementClassifications.filter(Boolean);
          documents.push({
            ...document,
            classifications: validClassifications
          });
        }
      }

      this.updateProgress(100, 'Upload complete', onProgress);
      return documents;

    } catch (error) {
      console.error('Error in uploadDocuments:', error);
      throw error;
    }
  }
} 