import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { embedder } from "../../lib/embedder";
import { ChatOpenAI } from "@langchain/openai";

const pinecone = new Pinecone();
const indexName = process.env.PINECONE_INDEX_NAME!;
export async function POST(request: Request) {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // const decodedToken = await verifyFirebaseToken(token);
    // if (!decodedToken) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const userId = decodedToken.uid;

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

    // If no documentIds provided, return empty results
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({
        documents: [],
        totalMatches: 0,
        requirementEvaluated: false,
        message: "No documents to search"
      });
    }

    console.log("requirement", requirement);
    console.log("userId", userId);
    console.log("query", query);
    console.log("documentIds", documentIds);

    const index = pinecone.index(indexName).namespace(userId);

    // Get query embedding
    const queryEmbedding = await embedder.embed(query);

    // Query the index
    const queryResult = await index.query({
      vector: queryEmbedding.values,
      includeMetadata: true,
      includeValues: true,
      filter: {
        documentId: {
          $in: documentIds
        }
      },
      topK: 50,
    });

    console.log("Query result matches:", queryResult.matches?.length);
    console.log("First match metadata:", queryResult.matches?.[0]?.metadata);

    // Group matches by document and get unique documents with their best chunks
    const uniqueDocuments = new Map<string, {
      documentId: string;
      filename: string;
      vectorScore: number;
      chunks: Array<{ content: string; score: number }>;
    }>();

    queryResult.matches?.forEach(match => {
      const docId = match.metadata?.documentId as string;
      const filename = match.metadata?.filename as string;
      const content = match.metadata?.pageContent as string;
      console.log("Processing match:", { docId, filename, content: content?.substring(0, 50) });
      
      if (!docId || !filename || !content) {
        console.log("Skipping match - missing required fields:", { docId, filename, hasContent: !!content });
        return;
      }

      if (!uniqueDocuments.has(docId)) {
        uniqueDocuments.set(docId, {
          documentId: docId,
          filename: filename,
          vectorScore: match.score || 0,
          chunks: [{ content, score: match.score || 0 }]
        });
      } else {
        const doc = uniqueDocuments.get(docId)!;
        doc.chunks.push({ content, score: match.score || 0 });
        // Keep track of the highest vector score
        if (match.score && match.score > doc.vectorScore) {
          doc.vectorScore = match.score;
        }
      }
    });

    console.log("Unique documents found:", uniqueDocuments.size);

    if (uniqueDocuments.size === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        topMatch: null,
        message: "No documents found in the namespace"
      });
    }

    // Process each unique document with AI
    const results = await Promise.all(Array.from(uniqueDocuments.values()).map(async (doc) => {
      // Sort chunks by score and take top 3 for context
      const topChunks = doc.chunks
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(c => c.content)
        .join("\n\n");

      console.log("Top chunks:", topChunks);

      const openai = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-3.5-turbo",
      });

      // Process each requirement separately
      const requirements = requirement.split('\n').filter(req => req.trim());
      if (requirements.length === 0) {
        return {
          documentId: doc.documentId,
          filename: doc.filename,
          vectorScore: 0,
          aiScore: 0,
          finalScore: 0,
          isMatch: false,
          matchDetails: []
        } as const;
      }

      const requirementResults = await Promise.all(
        requirements.map(async (req: string) => {
          const chatResponse = await openai.invoke([
            {
              role: "system",
              content: `You are a document analyzer that evaluates how well a document matches a specific requirement. 
              Use the following context to determine if the requirement is met.
              For classification matching, be flexible and consider partial matches.
              Do not make up information, only use the context provided.

              SCORING GUIDELINES:
              - 100: Perfect match with ALL required keywords/requirements
              - 80-99: Strong match with MOST required keywords/requirements
              - 60-79: Good match with SOME required keywords/requirements
              - 40-59: Partial match with FEW required keywords/requirements
              - 0-39: No match or insufficient evidence

              MATCH CRITERIA:
              - A document is considered a match (match: true) ONLY if it contains ALL required keywords/requirements
              - If ANY required keyword/requirement is missing, the match should be false
              - The score should reflect the percentage of requirements met, but match should be binary

              You MUST return a valid JSON object with the following structure:
              {
                "score": number (0-100 based on percentage of requirements met),
                "match": boolean (true ONLY if ALL requirements are met),
                "reason": string (explanation of which requirements were met/missing),
                "requirement": string (the requirement being matched)
              }

              Do not include any additional text or explanation outside the JSON object.
              Context: From "${doc.filename}":\n${topChunks}`,
            },
            {
              role: "user",
              content: req.trim(),
            }
          ]);

          // Parse AI response
          let aiResponse;
          try {
            const responseText = typeof chatResponse.content === 'string' ? 
              chatResponse.content : 
              JSON.stringify(chatResponse.content);
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiResponse = JSON.parse(jsonMatch[0]);
            } else {
              aiResponse = {
                score: 0,
                match: false,
                reason: "Failed to parse AI response",
                requirement: req.trim()
              };
            }
          } catch (error) {
            console.error("Error parsing AI response:", error);
            aiResponse = {
              score: 0,
              match: false,
              reason: "Failed to parse AI response",
              requirement: req.trim()
            };
          }

          // Calculate final score for this requirement
          const vectorScore = doc.vectorScore * 100; // Convert to 0-100 scale
          const finalScore = (vectorScore * 0.5) + (aiResponse.score * 0.5); // 50-50 split

          return {
            ...aiResponse,
            vectorScore,
            finalScore
          };
        })
      );

      // Filter out null results and calculate overall document score
      const validResults = requirementResults.filter((result): result is NonNullable<typeof result> => result !== null);
      
      if (validResults.length === 0) {
        return {
          documentId: doc.documentId,
          filename: doc.filename,
          vectorScore: 0,
          aiScore: 0,
          finalScore: 0,
          isMatch: false,
          matchDetails: []
        };
      }

      // Calculate overall scores
      const overallVectorScore = validResults.reduce((sum, result) => sum + (result.vectorScore || 0), 0) / validResults.length;
      const overallAIScore = validResults.reduce((sum, result) => sum + (result.score || 0), 0) / validResults.length;
      const overallFinalScore = (overallVectorScore * 0.5) + (overallAIScore * 0.5);
      const overallMatch = validResults.every(result => result.match);


      return {
        documentId: doc.documentId,
        filename: doc.filename,
        vectorScore: overallVectorScore || 0,
        aiScore: overallAIScore || 0,
        finalScore: overallFinalScore || 0,
        isMatch: doc.vectorScore >= 0.7 && overallMatch,
        matchDetails: validResults.map(result => ({
          vectorScore: result.vectorScore || 0,
          aiScore: result.score || 0,
          finalScore: result.finalScore || 0,
          match: result.match,
          reason: result.reason,
          requirement: result.requirement
        }))
      }; 
    }));

    // console.log("Results:", results);    
    // Sort by final score
    results.sort((a, b) => b.finalScore - a.finalScore);

    return NextResponse.json({
      results,
      total: results.length,
      topMatch: results[0] || null
    });

  } catch (error) {
    console.error("Error in search route:", error);
    return NextResponse.json(
      { error: "Failed to process search" },
      { status: 500 }
    );
  }
}