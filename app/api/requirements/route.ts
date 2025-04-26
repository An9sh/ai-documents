import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { getClassificationRequirements } from '../../lib/db/classifications';
import { getRequirements } from '../../lib/db/requirements';
import { getDocuments } from '../../lib/db/documents';

interface Match {
  score?: number;
  metadata?: {
    pageContent?: string;
  };
}

export class RequirementsClassifier {


  static buildQuestionForRequirement(requirement: any) {
    const baseQuestion = `Analyse the keywords and match them to the following requirements: "${requirement.name} and ${requirement.description}"?`;
    
    if (requirement.requirements && requirement.requirements.length > 0) {
      return `${baseQuestion} Specifically looking for documents that mention: ${requirement.requirements.join(', ')}`;
    }

    return baseQuestion;
  }

static async fetchDocumentInformation(question: string, documentIds: string[], token: string, userId: string, requirementId: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${apiUrl}/api/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        question,
        documentIds,
        userId,
        requirementId,
        requirement: question.split('"')[1]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch document information');
    }

    const data = await response.json();
    // console.log("requirement:", question.split('"')[1]);
    // console.log("data:", data)
    
    return {
      ...data,
      requirementId,
      requirement: question.split('"')[1],
      question: question
    };
  } catch (error) {
    console.error('Error fetching document information:', error);
    return null;
  }
}
}

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get all requirements for the user
    const allRequirements = await getRequirements(userId);
    
    // Get all documents for the user
    const allDocuments = await getDocuments(userId);
    const documentIds = allDocuments.map(doc => doc.id);
    
    // Get all classifications
    const classifications = await getClassificationRequirements(userId);

    // Process each requirement
    const requirementsWithData = await Promise.all(
      allRequirements.map(async req => {
        const question = RequirementsClassifier.buildQuestionForRequirement(req);
        const documentInfo = await RequirementsClassifier.fetchDocumentInformation(question, documentIds, token, userId, req.id);
        
        return {
          ...req,
          question,
          documentInfo,
          classifications: classifications.filter(cls => cls.requirementId === req.id)
        };
      })
    );

    // Calculate scores
    const vectorScore = requirementsWithData[0]?.documentInfo?.matches[0]?.score || 0;
    const aiScore = requirementsWithData[0]?.documentInfo?.aiResponse?.match ? 100 : 0; // Binary scoring for AI match
    const finalScore = (vectorScore * 0.7) + (aiScore * 0.3);

    // Only consider it a match if both vector and AI scores are above threshold
    const isMatch = vectorScore >= 70 && aiScore === 100;

    return NextResponse.json({
      requirements: requirementsWithData.map(req => ({
        ...req,
        documentInfo: {
          ...req.documentInfo,
          matches: req.documentInfo?.matches.map((match: Match) => ({
            content: match.metadata?.pageContent || '',
            vectorScore: match.score || 0,
            aiScore: aiScore,
            finalScore: (match.score || 0) * 0.7 + (aiScore === 100 ? 30 : 0),
            isMatch: isMatch
          })),
          finalScore,
          matchDetails: {
            vectorScore,
            aiScore,
            finalScore,
            match: isMatch,
            reason: req.documentInfo?.aiResponse?.reason || 'No reason provided',
            requirement: req.name
          }
        }
      })),
      finalScore,
      matchDetails: {
        vectorScore,
        aiScore,
        finalScore,
        match: isMatch,
        reason: aiScore === 100 ? 'AI match' : 'No AI match',
        requirement: requirementsWithData[0]?.name
      }
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requirements' },
      { status: 500 }
    );
  }
} 