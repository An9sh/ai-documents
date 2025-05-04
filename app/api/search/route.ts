import { NextResponse } from "next/server";
import { SearchService } from "../../lib/services/search-service";

export async function POST(request: Request) {
  try {
    // Get request body
    const { query, requirement, userId, documentIds } = await request.json();

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        documents: [],
        totalMatches: 0,
        requirementEvaluated: false
      }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ 
        error: 'Search query is required',
        documents: [],
        totalMatches: 0,
        requirementEvaluated: false
      }, { status: 400 });
    }

    if (!requirement || typeof requirement !== 'string') {
      return NextResponse.json({ 
        error: 'Valid requirement is required',
        documents: [],
        totalMatches: 0,
        requirementEvaluated: false
      }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key is not configured',
        documents: [],
        totalMatches: 0,
        requirementEvaluated: false
      }, { status: 500 });
    }

    // Use SearchService to handle the search
    const result = await SearchService.searchDocuments(
      query,
      requirement,
      userId,
      documentIds
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error in search route:", error);
    return NextResponse.json(
      { error: "Failed to process search" },
      { status: 500 }
    );
  }
}