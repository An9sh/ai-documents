// /lib/services/background-job.ts
import { DocumentProcessor } from './document-processor';
import { RequirementMatcher } from './requirement-matcher';
import { createDocument } from '../../lib/db/documents';
import { sendProgressUpdate } from '../../lib/upload-progress';
import { v4 as uuidv4 } from 'uuid';
import { DocumentAnalyzer } from './DocumentAnalyzer';
import { RequirementsClassifier } from '@/app/api/requirements/route';
import { getRequirements } from '../db/requirements';
import { createClassification } from '../db/classifications';
import { createDocumentMatch } from '../db/document-matches';
import { Classification } from '../../types';

export class BackgroundJob {
  static async processDocument(
    file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
    userId: string,
    token: string,
    uploadId: string
  ) {
    const documentId = uuidv4();
    const classifications: Classification[] = [];
    
    try {
      console.log('Starting document processing...');

      // Update progress for file upload start
      await sendProgressUpdate(uploadId, {
        status: 'uploading',
        message: `Uploading ${file.name}...`,
        progress: 0
      });

      // Step 1: Process the file and upload sections to Pinecone
      await DocumentProcessor.processDocument(file, userId, documentId);
      console.log('Document processed and embedded in Pinecone');

      // Step 2: Save metadata to database
      const dbDocument = await createDocument({
        id: documentId,
        filename: file.name,
        fileKey: documentId,
        type: 'document',
        size: file.size,
        mimeType: file.type,
        summary: '',
        pageCount: 0,
        pineconeId: documentId,
        uploadedAt: new Date(),
        fileSize: file.size,
        namespace: userId,
      }, userId);

      if (!dbDocument) {
        throw new Error('Failed to create document in database');
      }
      console.log('Document metadata saved to database');

      // Wait for document to be fully saved
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Process requirements with AI
      console.log('Starting requirements processing...');
      const allRequirements = await getRequirements(userId);
      console.log(`Found ${allRequirements.length} requirements to process`);

      for (const req of allRequirements) {
        try {
          console.log(`Processing requirement: ${req.name}`);
          await sendProgressUpdate(uploadId, { 
            status: 'processing',
            message: `Processing requirement: ${req.name}...`,
            progress: 60 + (40 * (allRequirements.indexOf(req) / allRequirements.length))
          });

          const question = RequirementsClassifier.buildQuestionForRequirement(req);
          console.log(`Generated question: ${question}`);
          
          // Ensure token is properly formatted
          // const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          // console.log('Using auth token for document information fetch:', authToken);
          
          const documentInfo = await RequirementsClassifier.fetchDocumentInformation(
            question,
            [documentId],
            token,
            userId,
            req.id
          );

          if (!documentInfo || !documentInfo.matches?.length) {
            console.log('No document info or matches found');
            continue;
          }

          const match = documentInfo.matches[0];
          const vectorScore = match.score || 0;
          const aiScore = match.aiScore || 0;
          const finalScore = Math.round(vectorScore);
          const isMatch = documentInfo.matchDetails?.match === true || finalScore >= req.matchThreshold;
          
          const dbClassification = await createClassification({
            id: uuidv4(),
            documentId: dbDocument.id,
            requirementId: req.id,
            requirementText: req.description || req.name,
            userId,
            score: finalScore,
            confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
            isPrimary: isMatch && finalScore >= req.matchThreshold,
            isSecondary: isMatch && finalScore >= req.matchThreshold * 0.8,
            isMatched: isMatch,
            documentName: file.name,
            matchDetails: match.content ? [match.content] : [],
            details: {
              requirements: {
                matched: match.content ? [match.content] : [],
                missing: []
              },
              metadata: {
                documentId: dbDocument.id,
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
                }
              },
              scores: {
                vector: vectorScore,
                ai: aiScore,
                final: finalScore
              }
            },
            updatedAt: new Date()
          });

          // Convert the database classification to the expected Classification type
          const classification: Classification = {
            ...dbClassification,
            documentId: dbClassification.documentId || dbDocument.id,
            requirementId: dbClassification.requirementId || req.id,
            userId: dbClassification.userId || userId,
            requirementText: req.description || req.name,
            updatedAt: dbClassification.updatedAt || new Date(),
            documentName: file.name,
            matchDetails: match.content ? [match.content] : [],
            confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
            details: {
              requirements: {
                matched: match.content ? [match.content] : [],
                missing: []
              },
              metadata: {
                documentId: dbDocument.id,
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
                }
              },
              scores: {
                vector: vectorScore,
                ai: aiScore,
                final: finalScore
              }
            }
          };

          if (documentInfo.matchDetails?.match === true) {
            
            const matchData = {
              documentId: dbDocument.id,
              classificationId: classification.id,
              matchPercentage: Math.round(vectorScore * 100),
              confidence: finalScore > 80 ? 3 : finalScore > 60 ? 2 : 1,
              matchedRequirements: match.content ? [match.content] : [],
              rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
              isMatched: documentInfo.matchDetails?.match === true
            };
            await createDocumentMatch(matchData);
          }

          classifications.push(classification);
        } catch (error) {
          console.error('Error processing classification:', error);
          continue;
        }
       
      }

      await sendProgressUpdate(uploadId, { 
        status: 'completed',
        message: 'Document fully processed!',
        progress: 100
      });

      return {
        success: true,
        document: dbDocument,
        classifications,
        message: `Processed successfully. Matched with ${classifications.filter(c => c.isPrimary).length} primary requirements.`,
        uploadId
      };
    } catch (error) {
      console.error('BackgroundJob failed:', error);

      await sendProgressUpdate(uploadId, { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown background job error',
        progress: 0
      });

      throw error;
    }
  }
}
