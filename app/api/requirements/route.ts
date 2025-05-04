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
    const baseQuestion = `Analyse the content of the document and match them to the following requirements: "${requirement.name} and ${requirement.description}"?`;
    
    if (requirement.requirements && requirement.requirements.length > 0) {
      return `${baseQuestion} Specifically looking for documents that mention: ${requirement.requirements.join(', ')}`;
    }

    return baseQuestion;
  }

  

static async fetchDocumentInformation(question: string, documentIds: string[], token: string, userId: string, requirementId: string) {
  try {
    // Get the base URL for the API
    let baseUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!baseUrl) {
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }

    // Ensure the URL has a protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    // Get all requirements and find the matching one
    const requirements = await getRequirements(userId);
    const requirement = requirements.find(r => r.id === requirementId);

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const apiUrl = `${baseUrl}/api/question`;
    console.log('Fetching document information from:', apiUrl);

    // Format the token properly
    //  const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    const requestBody = {
      question,
      documentIds,
      requirementId,
      requirement: {
        ...requirement,
        requirements: requirements
      }
    };

    console.log('Request body:', requestBody);
    // console.log('Using auth token:', authToken.substring(0, 20) + '...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed. Please try logging in again.');
      }
      
      throw new Error(`Failed to fetch document information: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    
    return {
      ...data,
      requirementId,
      requirement: requirement.name,
      question
    };
  } catch (error) {
    console.error('Error fetching document information:', error);
    throw error;
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