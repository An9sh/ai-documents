import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { db } from '../../lib/db';
import { classifications, documentMatches } from '../../../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { getDocuments } from '../../lib/db/documents';
import { RequirementsClassifier } from '../requirements/route';
import { eq, inArray } from 'drizzle-orm';

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

    // Get all documents for the user
    const docs = await getDocuments(userId);
    const documentIds = docs.map(doc => doc.id);
    const documentIdsString = docs.map(doc => doc.pineconeId);

    console.log("documentIds", documentIds);
    console.log("documentIdsString", documentIdsString);

    // Build question for the requirement
    const question = RequirementsClassifier.buildQuestionForRequirement(requirement);

    // Call the search API with the question and requirement
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        query: question,
        requirement: requirement.name,
        userId: userId,
        documentIds: documentIdsString
      })
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json().catch(() => ({}));
      console.error('Search API error:', {
        status: searchResponse.status,
        statusText: searchResponse.statusText,
        error: errorData
      });
      throw new Error(`Failed to search documents: ${searchResponse.statusText}`);
    }

    const searchResults = await searchResponse.json();
    // console.log('Raw search results:', JSON.stringify(searchResults, null, 2));
    
    if (!searchResults.results || searchResults.results.length === 0) {
      console.log('No documents found in search results');
      return NextResponse.json({ message: 'No matches found' });
    }

    // Filter out documents that don't exist in our database
    const validDocuments = searchResults.results.filter((doc: any) => 
      docs.some(dbDoc => dbDoc.pineconeId === doc.documentId)
    );

    if (validDocuments.length === 0) {
      console.log('No valid documents found in search results');
      return NextResponse.json({ message: 'No valid documents found' });
    }

    console.log('Found valid documents:', validDocuments.length);
    
    // Prepare classifications data for batch creation
    const classificationsData = validDocuments.map((doc: any) => {
      const vectorScore = doc.vectorScore || 0;
      const aiScore = doc.aiScore || 0;
      const finalScore = doc.finalScore || 0;
      const isMatched = doc.isMatch === true && finalScore >= requirement.matchThreshold;
      const isPrimary = isMatched && finalScore >= requirement.matchThreshold;
      const isSecondary = isMatched && finalScore >= requirement.matchThreshold * 0.8;
      const confidence = finalScore > 80 ? 3 : finalScore > 60 ? 2 : 1;

      // Find the corresponding database document
      const dbDoc = docs.find(dbDoc => dbDoc.pineconeId === doc.documentId);

      // Ensure score is an integer between 0 and 100
      const score = Math.round(Math.max(0, Math.min(100, finalScore)));

      // Get match reason from the first match detail if available
      const matchReason = doc.matchDetails?.[0]?.reason || "No match reason provided";

      // Create classification details
      const details = {
        requirements: {
          matched: doc.matchDetails?.map((detail: any) => detail.requirement) || [],
          missing: []
        },
        metadata: {
          documentId: dbDoc?.id || doc.documentId,
          filename: doc.filename,
          lines: { from: 0, to: 0 },
          userId,
          matchedAt: new Date().toISOString(),
          confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
          matchedRequirements: doc.matchDetails?.map((detail: any) => detail.requirement) || [],
          rawMatchReason: matchReason,
          threshold: requirement.matchThreshold,
          isMatched,
          documentInfo: {
            type: 'document',
            size: 0
          }
        },
        scores: {
          vector: vectorScore,
          ai: aiScore,
          final: finalScore
        }
      };

      return {
        id: uuidv4(),
        documentId: dbDoc?.id || doc.documentId,
        requirementId: requirement.id,
        userId,
        score,
        confidence,
        isPrimary,
        isSecondary,
        isMatched,
        details: JSON.stringify(details)
      };
    });

    // First, get existing classifications for this requirement
    const existingClassifications = await db
      .select()
      .from(classifications)
      .where(eq(classifications.requirementId, requirement.id));

    // Delete document matches for existing classifications
    if (existingClassifications.length > 0) {
      const classificationIds = existingClassifications.map(c => c.id);
      await db
        .delete(documentMatches)
        .where(inArray(documentMatches.classificationId, classificationIds));
    }

    // Delete existing classifications for this requirement
    await db
      .delete(classifications)
      .where(eq(classifications.requirementId, requirement.id));

    // Create new classifications
    const newClassifications = await db
      .insert(classifications)
      .values(classificationsData)
      .returning();

    console.log('Processed classifications:', newClassifications);

    // Format the response to include all necessary details
    const formattedClassifications = newClassifications.map(classification => {
      const details = typeof classification.details === 'string' 
        ? JSON.parse(classification.details)
        : classification.details;
      return {
        ...classification,
        details: JSON.stringify(details) // Re-stringify to ensure proper formatting
      };
    });

    return NextResponse.json({
      success: true,
      classifications: {
        [requirement.id]: formattedClassifications
      }
    });

  } catch (error) {
    console.error('Error syncing classifications:', error);
    return NextResponse.json(
      { error: 'Failed to sync classifications' },
      { status: 500 }
    );
  }
} 