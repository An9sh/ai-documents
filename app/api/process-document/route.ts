import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { BackgroundJob } from '../../lib/services/background-job';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return NextResponse.json({ error: 'No auth token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Token extracted, length:', token.length);
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      console.log('Token verified, uid:', decodedToken?.uid);
      
      if (!decodedToken?.uid) {
        console.log('No uid in decoded token');
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'Missing file' }, { status: 400 });
      }

      // Use userId from the verified token
      const userId = decodedToken.uid;
      
      // Ensure token is properly formatted and includes Bearer prefix
      const authToken = `Bearer ${token}`;
      console.log('Processing document:', { 
        userId, 
        tokenLength: authToken.length,
        environment: process.env.NODE_ENV,
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        fileSize: file.size,
        fileName: file.name
      });

      const result = await BackgroundJob.processDocument(
        {
          name: file.name,
          type: file.type,
          size: file.size,
          arrayBuffer: () => file.arrayBuffer()
        },
        userId,
        authToken,
        crypto.randomUUID()
      );

      return NextResponse.json(result);
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
} 