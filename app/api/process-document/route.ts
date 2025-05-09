import { NextResponse } from 'next/server';
import { adminAuth } from '../../lib/firebase-admin-config';
import { DocumentProcessor } from '../../lib/services/document-processor';
import { createDocument } from '../../lib/db/documents';
import { ensureUserExists } from '../../lib/db/users';
import { v4 as uuidv4 } from 'uuid';
import { createProgress, updateProgress } from '../../lib/db/progress';

export async function POST(request: Request) {
  // Get upload ID and file ID from headers
  const uploadId = request.headers.get('X-Upload-Id') || uuidv4();
  const fileId = request.headers.get('X-File-Id');
  
  if (!fileId) {
    return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
  }

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
    await createProgress(uploadId, userId, fileId);

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

    // Update progress to processing
    await updateProgress(`${uploadId}-${fileId}`, 'processing', 20);

    const documentId = uuidv4();

    try {
      const result = await DocumentProcessor.processDocument(file, userId, documentId);
      console.log('Document processing result:', result);

      // Update progress to completed
      await updateProgress(`${uploadId}-${fileId}`, 'completed', 100);

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
      
      // Update progress to error
      await updateProgress(`${uploadId}-${fileId}`, 'error', 0);

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
    
    // Update progress to error
    await updateProgress(`${uploadId}-${fileId}`, 'error', 0);

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