import { ChatOpenAI } from "@langchain/openai";
import { NextResponse } from "next/server";
import { embedder } from "../../lib/embedder";
import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone();
const indexName = process.env.PINECONE_INDEX_NAME!;

export async function POST(req: Request) {
  try {
    const { question, documentIds, userId } = await req.json();

    if (!question || !documentIds || !Array.isArray(documentIds) || !userId) {
      return new Response("Invalid request: Missing question, documentIds, or userId", { status: 400 });
    }

    console.log("Question:", question);
    console.log("Document IDs:", documentIds);
    console.log("User ID:", userId);

    if (!process.env.OPENAI_API_KEY) {
      return new Response("OpenAI API key is not configured", { status: 500 });
    }

    const index = pinecone.index(indexName).namespace(userId);
    
    // Get query embedding
    const queryEmbedding = await embedder.embed(question);
    
    // Query the index
    const queryResult = await index.query({
      vector: queryEmbedding.values,
      includeMetadata: true,
      includeValues: true,
      filter: {
        documentId: { $in: documentIds }
      },
      topK: 20,
    });

    console.log("Query result:", {
      matchesFound: queryResult.matches?.length || 0,
      matches: queryResult.matches?.map(m => ({
        documentId: m.metadata?.documentId,
        score: m.score,
        hasPageContent: !!m.metadata?.pageContent
      }))
    });
    
    // Check if we have any matches
    if (!queryResult.matches || queryResult.matches.length === 0) {
      console.log("No matches found in initial query");
      return NextResponse.json({
        answer: "No relevant documents found to answer your question.",
        relevantDocuments: [],
        matches: []
      });
    }

    // Group matches by document
    const documentGroups = queryResult.matches.reduce((groups, match) => {
      const docId = match.metadata?.documentId as string;
      if (!docId) return groups;

      if (!groups[docId]) {
        groups[docId] = {
          documentId: docId,
          filename: match.metadata?.filename as string || 'Unknown Document',
          chunks: [],
          totalScore: 0
        };
      }

      const score = match.score || 0;
      groups[docId].chunks.push({
        content: match.metadata?.pageContent as string,
        score
      });
      groups[docId].totalScore += score;

      return groups;
    }, {} as Record<string, {
      documentId: string;
      filename: string;
      chunks: Array<{ content: string; score: number }>;
      totalScore: number;
    }>);

    // Process each document group
    const processedDocuments = Object.values(documentGroups).map(group => {
      // Sort chunks by score
      const sortedChunks = group.chunks.sort((a, b) => b.score - a.score);
      
      // Take top 3 chunks for context
      const topChunks = sortedChunks.slice(0, 3);
      
      // Calculate average score
      const avgScore = group.chunks.length > 0 ? group.totalScore / group.chunks.length : 0;

      return {
        documentId: group.documentId,
        filename: group.filename,
        content: topChunks.map(c => c.content).join("\n\n"),
        score: avgScore,
        chunkCount: group.chunks.length
      };
    });

    // Sort documents by score
    processedDocuments.sort((a, b) => b.score - a.score);

    // Combine context from all relevant documents
    const context = processedDocuments
      .map(doc => `From "${doc.filename}":\n${doc.content}`)
      .join("\n\n");

      // console.log("Context:", context);

      const openai = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-3.5-turbo",
        
      });

      // const isStructuredResponse = question.includes("Return a JSON response") || 
      // question.includes("JSON response with") ||
      // question.includes("matches") && question.includes("score");

    // let systemPrompt = `You are a helpful AI assistant. Use the following context to answer the question. If the context doesn't contain relevant information, say so. For each piece of information you use, mention which document it came from. Context: ${context}`;

    //  if (isStructuredResponse) {
    //   systemPrompt =
    // }

    const chatResponse = await openai.invoke([
      {
        role: "system",
        content:  `You are a document analyzer that evaluates how well a document matches requirements. 
        Use the following context to determine if the requirements are met.
        If the context doesn't contain relevant information, indicate that in your response.
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
        Context: ${context}`,
      },
      {
        role: "user",
        content: question,
      }
    ]);

    // Parse the AI's response as JSON
    let aiResponse;
    try {
      const responseText = typeof chatResponse.content === 'string' ? 
        chatResponse.content : 
        JSON.stringify(chatResponse.content);
      
      console.log("Raw AI response:", responseText);
      
      // Try to extract JSON if it's embedded in other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, try to construct a response from the text
        const requirementMatch = question.match(/\"([^\"]+)\"/);
        const requirement = requirementMatch ? requirementMatch[1] : undefined;
        
        // Check if the response indicates a match
        const hasMatch = responseText.toLowerCase().includes("match") || 
                        responseText.toLowerCase().includes("meet") ||
                        responseText.toLowerCase().includes("satisfy");
        
        // Calculate score based on match confidence
        let score = 0;
        if (hasMatch) {
          if (responseText.toLowerCase().includes("strong") || 
              responseText.toLowerCase().includes("excellent")) {
            score = 90;
          } else if (responseText.toLowerCase().includes("good") || 
                    responseText.toLowerCase().includes("suitable")) {
            score = 75;
          } else if (responseText.toLowerCase().includes("partial") || 
                    responseText.toLowerCase().includes("some")) {
            score = 50;
          } else {
            score = 60; // Default match score
          }
        }
        
        aiResponse = {
          score,
          match: score >= 60,
          reason: responseText,
          requirement
        };
      } else {
        const jsonString = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas before } or ]
          .replace(/```json|```/g, '') // Remove markdown code block syntax
          .replace(/\n/g, ' ') // Remove newlines
          .replace(/\s+/g, ' '); // Normalize whitespace
        
        aiResponse = JSON.parse(jsonString);
        
        // Validate the parsed response has required fields
        if (!aiResponse.hasOwnProperty('score') || 
            !aiResponse.hasOwnProperty('match') || 
            !aiResponse.hasOwnProperty('reason')) {
          throw new Error('Missing required fields in response');
        }
      }
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw response:", chatResponse.content);
      
      // Extract requirement from question
      const requirementMatch = question.match(/\"([^\"]+)\"/);
      const requirement = requirementMatch ? requirementMatch[1] : undefined;
      
      aiResponse = {
        score: 0,
        match: false,
        reason: "Failed to parse AI response",
        requirement
      };
    }

    // Calculate final score using both vector similarity and AI judgment
    const vectorScore = processedDocuments.length > 0 ? 
      processedDocuments.reduce((sum, doc) => sum + doc.score, 0) / processedDocuments.length : 
      0;

    const finalScore = (vectorScore * 50) + (aiResponse.score * 0.5); // 50% vector similarity, 50% AI judgment
    
    console.log("Matching details:", {
      vectorScore: vectorScore * 100,
      aiScore: aiResponse.score,
      finalScore,
      match: aiResponse.match,
      reason: aiResponse.reason,
      requirement: aiResponse.requirement
    });

    return NextResponse.json({
      answer: aiResponse,
      relevantDocuments: processedDocuments.map(doc => ({
        documentId: doc.documentId,
        filename: doc.filename,
        chunkCount: doc.chunkCount
      })),
      finalScore: finalScore,
      matchDetails: {
        requirement: aiResponse.requirement,
        score: {
          final: Math.round(finalScore * 10) / 10,
          vector: Math.round(vectorScore * 1000) / 10,
          ai: aiResponse.score,
          threshold: 70 // Default threshold for considering a match
        },
        match: aiResponse.match,
        reason: aiResponse.reason,
        confidence: finalScore > 80 ? "high" : finalScore > 60 ? "medium" : "low"
      },
      matches: processedDocuments.map(doc => ({
        documentId: doc.documentId,
        filename: doc.filename,
        score: Math.round(doc.score * 1000) / 10,
        chunkCount: doc.chunkCount
      })).filter(match => match.score > 50) // Only include significant matches
    });

  } catch (error) {
    console.error("Error in question route:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}