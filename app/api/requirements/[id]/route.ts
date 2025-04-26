import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../../lib/firebase-admin';
import { updateRequirement } from '../../../lib/db/requirements';
import { db } from '../../../lib/db';
import { requirements } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    const { id } = await params;
    const updateData = await request.json();

    // Ensure createdAt is properly handled as a Date
    if (updateData.createdAt) {
      updateData.createdAt = new Date(updateData.createdAt);
    }

    const updatedRequirement = await updateRequirement(id, updateData);

    return NextResponse.json(updatedRequirement);
  } catch (error) {
    console.error('Error updating requirement:', error);
    return NextResponse.json(
      { error: 'Failed to update requirement' },
      { status: 500 }
    );
  }
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const data = await request.json();

    // Update the requirement
    const [updatedRequirement] = await db
      .update(requirements)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(requirements.id, id))
      .returning();

    if (!updatedRequirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    return NextResponse.json(updatedRequirement);
  } catch (error) {
    console.error('Error updating requirement:', error);
    return NextResponse.json(
      { error: 'Failed to update requirement' },
      { status: 500 }
    );
  }
} 