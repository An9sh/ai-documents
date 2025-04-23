import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../../lib/firebase-admin';
import { db } from '../../../lib/db';
import { classifications } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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
    const { requirementId, classifications: classificationsData } = await request.json();
    if (!requirementId || !classificationsData || !Array.isArray(classificationsData)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Update classifications
    const updatedClassifications = await Promise.all(
      classificationsData.map(async (data) => {
        // Update existing classification or create if it doesn't exist
        const [classification] = await db
          .insert(classifications)
          .values({
            id: uuidv4(),
            documentId: data.documentId,
            requirementId: data.requirementId,
            score: data.score,
            confidence: data.confidence,
            isPrimary: data.isPrimary,
            isSecondary: data.isSecondary,
            isMatched: data.isMatched,
            details: data.details,
            matchedContent: data.matchedContent || []
          })
          .onConflictDoUpdate({
            target: [classifications.documentId, classifications.requirementId],
            set: {
              score: data.score,
              confidence: data.confidence,
              isPrimary: data.isPrimary,
              isSecondary: data.isSecondary,
              isMatched: data.isMatched,
              details: data.details,
              matchedContent: data.matchedContent || []
            }
          })
          .returning();

        return classification;
      })
    );

    // Group classifications by requirement
    const groupedClassifications = updatedClassifications.reduce((acc, classification) => {
      if (!classification.requirementId) return acc;
      
      const reqId = classification.requirementId;
      if (!acc[reqId]) {
        acc[reqId] = [];
      }
      acc[reqId].push(classification);
      return acc;
    }, {} as Record<string, typeof updatedClassifications>);

    return NextResponse.json({
      success: true,
      classifications: groupedClassifications
    });

  } catch (error) {
    console.error('Error updating batch classifications:', error);
    return NextResponse.json(
      { error: 'Failed to update classifications' },
      { status: 500 }
    );
  }
} 