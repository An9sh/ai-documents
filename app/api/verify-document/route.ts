import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { getDocument } from '../../lib/db/documents';
import { getPineconeClient } from '../../../lib/pinecone-client';
import { db } from '../../lib/db';
import { documents } from '../../../db/schema';
import { eq } from 'drizzle-orm';

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

    console.log('Verifying document:', documentId);

    // Check if document exists in database by Pinecone ID
    const [document] = await db.select()
      .from(documents)
      .where(eq(documents.pineconeId, documentId))
      .limit(1);

    if (!document) {
      console.log('Document not found in database:', documentId);
      return NextResponse.json({ 
        available: false,
        reason: 'Document not found in database'
      }, { status: 200 });
    }

    console.log('Document found in database:', {
      id: document.id,
      pineconeId: document.pineconeId,
      filename: document.filename
    });

    // Check if document is indexed in Pinecone
    const pinecone = await getPineconeClient();
    if (!pinecone) {
      console.log('Pinecone client not available');
      return NextResponse.json({ 
        available: false,
        reason: 'Search service not available'
      }, { status: 200 });
    }

    try {
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!).namespace(userId);
      const queryResponse = await index.query({
        vector: new Array(1536).fill(0), // Dummy vector for checking existence
        topK: 1,
        filter: { documentId }
      });

      const isAvailable = queryResponse.matches && queryResponse.matches.length > 0;
      console.log('Document verification result:', {
        documentId,
        isAvailable,
        matchesFound: queryResponse.matches?.length || 0
      });

      return NextResponse.json({ 
        available: isAvailable,
        reason: isAvailable ? 'Document is available' : 'Document not yet indexed'
      }, { status: 200 });
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      return NextResponse.json({ 
        available: false,
        reason: 'Error checking document index'
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error verifying document:', error);
    return NextResponse.json({ 
      error: 'Failed to verify document',
      reason: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 