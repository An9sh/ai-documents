import { DocumentMetadata } from '../types';
import { sendProgressUpdate } from './upload-progress';

export class DocumentManager {
  async uploadDocuments(files: File[], userId: string, token: string): Promise<DocumentMetadata[]> {
    const uploadedDocs: DocumentMetadata[] = [];
    
    for (const file of files) {
      const uploadId = crypto.randomUUID();
      
      try {
        // Update progress for file upload start
        await sendProgressUpdate(uploadId, {
          status: 'uploading',
          message: `Uploading ${file.name}...`,
          progress: 0
        });

        // Upload file to API endpoint
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        const response = await fetch('/api/process-document', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        console.log('This is a Response:', response);

        if (!response.ok) {
          throw new Error('Failed to process document');
        }

        const result = await response.json();

        if (result.success && result.document) {
          uploadedDocs.push({
            id: result.document.id,
            filename: result.document.filename,
            size: result.document.size,
            type: result.document.type,
            uploadedAt: result.document.uploadedAt,
            status: 'completed',
            classifications: result.classifications,
            fileKey: result.document.id,
            mimeType: result.document.type,
            summary: '',
            pageCount: 0,
            pineconeId: result.document.id,
            namespace: userId,
            fileSize: result.document.size
          });
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        uploadedDocs.push({
          id: crypto.randomUUID(),
          filename: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          fileKey: crypto.randomUUID(),
          mimeType: file.type,
          summary: '',
          pageCount: 0,
          pineconeId: crypto.randomUUID(),
          namespace: userId,
          fileSize: file.size
        });
      }
    }

    return uploadedDocs;
  }
} 