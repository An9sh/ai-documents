import { Classification, DocumentMetadata } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RequirementsClassifier } from '../api/requirements/route';
import { getRequirements } from './db/requirements';
import { createDocumentMatch } from './db/document-matches';
import { createClassification } from './db/classifications';

export class DocumentManager {
  

  private updateProgress(progress: number, status: string, callback?: (progress: number, status: string) => void): void {
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
          fileKey: result.documentId,
          classifications: result.classifications || []
        };

        documents.push(document);

        // Update progress for document processing
        this.updateProgress(
          Math.round(((i + 1) / files.length) * 100),
          `Processed ${file.name}`,
          onProgress
        );
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