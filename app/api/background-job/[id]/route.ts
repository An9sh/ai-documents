// app/api/background-job/[id]/route.ts
import { NextResponse } from 'next/server';
import { adminAuth, verifyFirebaseToken } from '@/app/lib/firebase-admin';
import { BackgroundJob } from '@/app/lib/services/background-job';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }


    // Get the job result directly from BackgroundJob
    const jobResult = await BackgroundJob.getJobResult(params.id, token);
    
    return NextResponse.json(jobResult);
  } catch (error) {
    console.error('Error fetching job result:', error);
    return NextResponse.json({ error: 'Failed to fetch job result' }, { status: 500 });
  }
}