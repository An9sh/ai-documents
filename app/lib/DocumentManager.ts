import { Classification, DocumentMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RequirementsClassifier } from '../api/requirements/route';
import { getRequirements } from './db/requirements';
import { createDocumentMatch } from './db/document-matches';
import { createClassification } from './db/classifications';
import { createProgress, updateProgress } from './db/progress';

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
    const errors: { filename: string; error: string }[] = [];

    try {
      // Update progress for upload start
      this.updateProgress(0, 'Starting parallel upload...', onProgress);

      // Process all files in parallel
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Validate file type and size before processing
          if (!file.type.includes('pdf')) {
            throw new Error('Only PDF files are supported');
          }

          if (file.size === 0) {
            throw new Error('The PDF file is empty');
          }

          // Check if file is password protected or corrupted
          try {
            const fileArrayBuffer = await file.arrayBuffer();
            if (fileArrayBuffer.byteLength === 0) {
              throw new Error('The PDF file appears to be corrupted');
            }
          } catch (error) {
            throw new Error('Unable to read the PDF file. It may be corrupted or password protected');
          }

          const fileId = uuidv4();
          const formData = new FormData();
          formData.append('file', file);
          formData.append('userId', userId);
          formData.append('fileId', fileId);

          // Create progress entry for this file
          await createProgress(uploadId, userId, fileId);

          // Update progress for each file start
          this.updateProgress(
            Math.round((index / files.length) * 100), 
            `Starting upload for ${file.name}...`,
            onProgress
          );

          const response = await fetch('/api/process-document', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Upload-Id': uploadId,
              'X-File-Id': fileId
            },
            body: formData
          });

          if (!response.ok) {
            let errorDetails;
            try {
              const errorText = await response.text();
              let parsedError;
              try {
                parsedError = JSON.parse(errorText);
              } catch {
                parsedError = { error: errorText };
              }
              
              errorDetails = {
                status: response.status,
                statusText: response.statusText,
                error: parsedError,
                headers: Object.fromEntries(response.headers.entries()),
                url: response.url
              };

              // Handle specific error cases
              let userFriendlyError = response.statusText;
              if (parsedError.details === "No content extracted from PDF") {
                userFriendlyError = "The PDF file could not be processed. Please ensure:\n" +
                  "1. The PDF contains text (not just images)\n" +
                  "2. The PDF is not password protected\n" +
                  "3. The PDF is not corrupted\n" +
                  "4. The PDF is not empty\n\n" +
                  "If your PDF contains only images, please convert it to a text-based PDF first.";
              } else if (parsedError.step === "document_processing") {
                userFriendlyError = "Failed to process the document. Please ensure the file is a valid PDF and try again.";
              }

              console.error('Upload error details:', JSON.stringify(errorDetails, null, 2));
              throw new Error(`Failed to upload document ${file.name}: ${userFriendlyError}`);
            } catch (parseError) {
              errorDetails = {
                status: response.status,
                statusText: response.statusText,
                error: 'Failed to parse error response',
                parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
              };
              console.error('Upload error details:', JSON.stringify(errorDetails, null, 2));
              throw new Error(`Failed to upload document ${file.name}: ${response.statusText} (Status: ${response.status})`);
            }
          }

          let result;
          try {
            result = await response.json();
            console.log('Raw server response:', JSON.stringify(result, null, 2));
          } catch (parseError) {
            console.error('Failed to parse server response:', parseError);
            throw new Error(`Failed to parse server response for ${file.name}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }

          if (!result.documentId) {
            console.error('Server response missing documentId:', JSON.stringify(result, null, 2));
            throw new Error(`No document ID received for ${file.name}`);
          }

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
          await updateProgress(`${uploadId}-${fileId}`, 'processing', Math.round(((index + 0.3) / files.length) * 100));
          this.updateProgress(
            Math.round(((index + 0.3) / files.length) * 100),
            `Processing ${file.name}...`,
            onProgress
          );

          // Wait for document to be fully processed with retries
          let isDocumentAvailable = false;
          let retryCount = 0;
          const maxRetries = 10;
          const retryDelay = 2000;

          while (!isDocumentAvailable && retryCount < maxRetries) {
            try {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              
              console.log(`Verification attempt ${retryCount + 1}/${maxRetries} for document:`, result.documentId);
              
              let baseUrl = process.env.NEXT_PUBLIC_API_URL;
              
              if (!baseUrl) {
                if (typeof window !== 'undefined') {
                  baseUrl = window.location.origin;
                } else if (process.env.VERCEL_URL) {
                  baseUrl = `https://${process.env.VERCEL_URL}`;
                } else {
                  baseUrl = 'http://localhost:3000';
                }
              }

              const verifyUrl = `/api/verify-document?documentId=${result.documentId}`;
              const verifyResponse = await fetch(verifyUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!verifyResponse.ok) {
                throw new Error('Document verification failed');
              }

              const verifyResult = await verifyResponse.json();
              if (verifyResult.available) {
                isDocumentAvailable = true;
                break;
              }

              retryCount++;
              if (retryCount < maxRetries) {
                await updateProgress(`${uploadId}-${fileId}`, 'processing', Math.round(((index + 0.3 + (retryCount * 0.05)) / files.length) * 100));
                this.updateProgress(
                  Math.round(((index + 0.3 + (retryCount * 0.05)) / files.length) * 100),
                  `Processing ${file.name} (attempt ${retryCount + 1}/${maxRetries})...`,
                  onProgress
                );
              }
            } catch (error) {
              console.error(`Document verification attempt ${retryCount + 1} failed:`, error);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }

          if (!isDocumentAvailable) {
            throw new Error(`Document ${file.name} processing is taking longer than expected. Please try again in a few moments.`);
          }

          // Update progress for requirements processing
          await updateProgress(`${uploadId}-${fileId}`, 'processing', Math.round(((index + 0.5) / files.length) * 100));
          this.updateProgress(
            Math.round(((index + 0.5) / files.length) * 100),
            `Processing requirements for ${file.name}...`,
            onProgress
          );

          // Get requirements for the user
          const requirements = await getRequirements(userId);

          // Process each requirement
          const requirementClassifications = await Promise.all(
            requirements.map(async (req) => {
              try {
                const question = RequirementsClassifier.buildQuestionForRequirement(req);
                const documentInfo = await RequirementsClassifier.fetchDocumentInformation(
                  question,
                  [result.documentId],
                  token,
                  userId,
                  req.id
                );

                const match = documentInfo.matches[0];
                const vectorScore = match.score || 0;
                const aiScore = match.aiScore || 0;
                const finalScore = Math.round(vectorScore);
                const isMatch = finalScore >= req.matchThreshold && documentInfo.matchDetails?.match === true;

                const classification = await createClassification({
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
                  },
                  updatedAt: new Date()
                });

                if (documentInfo.matchDetails?.match === true) {
                  await createDocumentMatch({
                    documentId: result.dbDocument.id,
                    classificationId: classification.id,
                    matchPercentage: Math.round(vectorScore * 100),
                    confidence: finalScore > 80 ? 3 : finalScore > 60 ? 2 : 1,
                    matchedRequirements: match.content ? [match.content] : [],
                    rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
                    isMatched: documentInfo.matchDetails?.match === true
                  });
                }

                return classification;
              } catch (error) {
                console.error('Error processing requirement:', error);
                return null;
              }
            })
          );

          // Filter out null classifications and add to document
          const validClassifications = requirementClassifications.filter(Boolean);
          
          // Mark this file as completed
          await updateProgress(`${uploadId}-${fileId}`, 'completed', 100);
          
          return {
            ...document,
            classifications: validClassifications
          };
        } catch (error) {
          console.error(`Error processing document ${file.name}:`, error);
          errors.push({
            filename: file.name,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
          return null;
        }
      });

      // Wait for all uploads to complete
      const uploadedDocuments = await Promise.all(uploadPromises);
      
      // Filter out null results and add to documents array
      const validDocuments = uploadedDocuments.filter((doc): doc is DocumentMetadata & { classifications: any[] } => doc !== null);
      documents.push(...validDocuments);

      // If we have any errors, throw a combined error with details
      if (errors.length > 0) {
        const errorMessage = `Some documents failed to process:\n${errors.map(e => `- ${e.filename}: ${e.error}`).join('\n')}`;
        console.error(errorMessage);
        // We don't throw here, just log the error and continue with successful documents
      }

      // Update progress for completion
      this.updateProgress(100, 'All uploads complete', onProgress);
      return documents;

    } catch (error) {
      console.error('Error in uploadDocuments:', error);
      throw error;
    }
  }
} 