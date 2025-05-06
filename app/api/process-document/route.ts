import { NextResponse } from 'next/server';
import { adminAuth } from '../../lib/firebase-admin-config';
import { DocumentProcessor } from '../../lib/services/document-processor';
import { createDocument } from '../../lib/db/documents';
import { ensureUserExists } from '../../lib/db/users';
import { v4 as uuidv4 } from 'uuid';
import { sendProgressUpdate } from '../../lib/upload-progress';
import { createProgress } from '../../lib/db/progress';

export async function POST(request: Request) {
  // Get upload ID from headers
  const uploadId = request.headers.get('X-Upload-Id') || uuidv4();
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as unknown as { 
      name: string;
      type: string;
      size: number;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    await ensureUserExists(userId, decodedToken.email || '', decodedToken.name || '');

    // Create initial progress record
    await createProgress(uploadId, userId);

    // Send initial progress update
    await sendProgressUpdate(uploadId, { 
      status: 'uploading',
      message: 'Starting document upload...',
      progress: 0
    });

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    if (!process.env.PINECONE_INDEX_NAME) {
      return NextResponse.json({ error: "Pinecone index name not configured" }, { status: 500 });
    }

    sendProgressUpdate(uploadId, { 
      status: 'processing',
      message: 'Processing PDF document...',
      progress: 20
    });

    const documentId = uuidv4();

    try {
      const result = await DocumentProcessor.processDocument(file, userId, documentId);
      console.log('Document processing result:', result);
      sendProgressUpdate(uploadId, { 
        status: 'completed',
        message: 'Document processing completed successfully',
        progress: 100
      });

      return NextResponse.json({ 
        success: true,
        documentId: result.documentId,
        chunks: result.chunks,
        dbDocument: result.dbDocument,
        message: 'Document processed successfully',
        uploadId
      });
    } catch (error) {
      console.error('Error in document processing:', error);
      
      sendProgressUpdate(uploadId, { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process document',
        progress: 0
      });

      return NextResponse.json(
        { 
          error: 'Failed to process document',
          details: error instanceof Error ? error.message : 'Unknown error',
          step: 'document_processing'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in process-document route:', error);
    
    sendProgressUpdate(uploadId, { 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to process document',
      progress: 0
    });

    return NextResponse.json(
      { 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error',
        step: 'route_handling'
      },
      { status: 500 }
    );
  }
} 