import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { createDocument } from '../../lib/db/documents';
import { ensureUserExists } from '../../lib/db/users';
import { sendProgressUpdate } from '../../lib/upload-progress';
import { createProgress } from '../../lib/db/progress';
import { DocumentProcessor } from '../../lib/services/document-processor';
import { RequirementMatcher } from '../../lib/services/requirement-matcher';
import { BackgroundJob } from '../../lib/services/background-job';

export async function POST(request: Request) {
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
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    await ensureUserExists(userId, decodedToken.email || '', decodedToken.name || '');

    // Create initial progress record
    // await createProgress(uploadId, userId);
 

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

    // Start background processing
    BackgroundJob.processDocument(file, userId, token, uploadId)
      .catch(error => {
        console.error('Background job failed:', error);
      });

    // Return immediate response
    return NextResponse.json({ 
      success: true,
      message: 'Document processing started',
      uploadId
    });
  } catch (error) {


    return NextResponse.json(
      { 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error',
        step: 'document_processing'
      },
      { status: 500 }
    );
  }
}