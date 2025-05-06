import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { getDocument } from '../../lib/db/documents';
import { getPineconeClient } from '../../../lib/pinecone-client';

export async function GET(request: Request) {
  try {
    // Get and verify the token
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

    // Get document ID from query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Check if document exists in database
    const document = await getDocument(documentId);
    if (!document) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // Check if document is indexed in Pinecone
    const pinecone = await getPineconeClient();
    if (!pinecone) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!).namespace(userId);
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector for checking existence
      topK: 1,
      filter: { documentId }
    });

    const isAvailable = queryResponse.matches && queryResponse.matches.length > 0;

    return NextResponse.json({ available: isAvailable }, { status: 200 });
  } catch (error) {
    console.error('Error verifying document:', error);
    return NextResponse.json({ error: 'Failed to verify document' }, { status: 500 });
  }
} 