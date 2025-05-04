import { NextResponse } from "next/server";
import { DocumentAnalyzer } from "../../lib/services/DocumentAnalyzer";
import { verifyFirebaseToken } from "../../lib/firebase-admin";

export async function POST(req: Request) {
  try {
    // Get and verify the token
    const authHeader = req.headers.get('Authorization');
    console.log('Question route - Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Question route - Invalid auth header format');
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Question route - Token extracted, length:', token.length);
    
    try {
      const decodedToken = await verifyFirebaseToken(token);
      console.log('Question route - Token verified, uid:', decodedToken?.uid);
      
      if (!decodedToken?.uid) {
        console.log('Question route - No uid in decoded token');
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      const userId = decodedToken.uid;

      // Get other data from request body
      const { question, documentIds, requirement } = await req.json();
      console.log('Question route - Request body:', { 
        hasQuestion: !!question,
        documentIds,
        hasRequirement: !!requirement
      });

      console.log('Processing question:', {
        userId,
        documentIds,
        environment: process.env.NODE_ENV,
        apiUrl: process.env.NEXT_PUBLIC_API_URL
      });

      const analyzer = await DocumentAnalyzer.init();
      const result = await analyzer.analyze(question, userId, documentIds, requirement);
      console.log('Result from the question route:', result);
      return NextResponse.json(result);
    } catch (verifyError) {
      console.error('Question route - Token verification failed:', verifyError);
      return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
    }
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
