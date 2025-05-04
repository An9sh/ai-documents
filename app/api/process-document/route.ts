import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { BackgroundJob } from '../../lib/services/background-job';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No auth token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    // const userId = formData.get('userId') as string;

    if (!file || !decodedToken.uid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get a fresh token for the background job
    const freshToken = await decodedToken.getIdToken(true);
    console.log('Using fresh token for background job');

    const result = await BackgroundJob.processDocument(
      {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: () => file.arrayBuffer()
      },
      decodedToken.uid,
      freshToken, // Use the fresh token
      crypto.randomUUID()
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
} 