import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { createClassification, getUserClassifications, getMatchedDocumentsForDashboard } from '../../lib/db/classifications';
import { Classification } from '../../types';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
  
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken?.uid) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get all matched documents with their classifications
    const matchedDocuments = await getMatchedDocumentsForDashboard(userId);
    
    // Transform the data into the format expected by the dashboard
    const groupedByRequirement = matchedDocuments.reduce((acc, doc) => {
      doc.matches.forEach(match => {
        if (!acc[match.requirementId]) {
          acc[match.requirementId] = [];
        }
        
        acc[match.requirementId].push({
          id: `${doc.documentId}-${match.requirementId}`,
          documentId: doc.documentId,
          documentName: doc.filename,
          requirementId: match.requirementId,
          score: match.score,
          confidence: match.confidence,
          isPrimary: match.isPrimary,
          isSecondary: match.isSecondary,
          isMatched: match.isPrimary || match.isSecondary,
          details: {
            ...match.matchDetails,
            metadata: {
              ...match.matchDetails?.metadata,
              documentId: doc.documentId,
              filename: doc.filename,
              uploadedAt: doc.uploadedAt
            }
          }
        });
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json(groupedByRequirement);
  } catch (error) {
    console.error('Error fetching classifications:', error);
    return NextResponse.json({ error: 'Failed to fetch classifications' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
  
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      if (!decodedToken?.uid) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const classificationData = await request.json();
    
    // Create the classification
    const classification = await createClassification(classificationData);

    return NextResponse.json(classification);
  } catch (error) {
    console.error('Error creating classification:', error);
    return NextResponse.json({ error: 'Failed to create classification' }, { status: 500 });
  }
} 