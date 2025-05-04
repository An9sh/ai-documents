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
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use the original token since we've already verified it
    console.log('Using verified token for background job');

    const result = await BackgroundJob.processDocument(
      {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: () => file.arrayBuffer()
      },
      userId,
      token, // Use the original verified token
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