import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { SyncService } from '../../lib/services/sync-service';

export async function POST(request: Request) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get request body
    const { requirement } = await request.json();
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement is required' }, { status: 400 });
    }
    console.log("Requirement:", requirement);
    // Use SyncService to handle the sync
    const result = await SyncService.syncRequirement(requirement, userId, token);
    console.log("Sync result:", result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error syncing classifications:', error);
    return NextResponse.json(
      { error: 'Failed to sync classifications' },
      { status: 500 }
    );
  }
} 