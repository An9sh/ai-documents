import { NextResponse } from "next/server";
import { DocumentAnalyzer } from "../../lib/services/DocumentAnalyzer";
import { verifyFirebaseToken } from "../../lib/firebase-admin";

export async function POST(req: Request) {
  try {
    // Get and verify the token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get other data from request body
    const { question, documentIds, requirement } = await req.json();

    const analyzer = await DocumentAnalyzer.init();
    const result = await analyzer.analyze(question, userId, documentIds, requirement);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
