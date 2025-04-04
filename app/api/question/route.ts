import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { NextResponse } from "next/server";
import { getPineconeClient } from "@/lib/pinecone-client";
import { ScoredPineconeRecord, RecordMetadata } from "@pinecone-database/pinecone";

interface DocumentResult {
  content: string[];
  filename: string;
}

export async function POST(req: Request) {
  try {
    const { question, documentIds, userId } = await req.json();

    if (!question || !documentIds || !Array.isArray(documentIds) || !userId) {
      return new Response("Invalid request: Missing question, documentIds, or userId", { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response("OpenAI API key is not configured", { status: 500 });
    }

    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX_NAME) {
      return new Response("Pinecone configuration is missing", { status: 500 });
    }

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const pineconeClient = await getPineconeClient();
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME);
    const ns = index.namespace(userId);

    // Get index stats to verify documents exist
    const stats = await index.describeIndexStats();
    console.log("Pinecone index stats before search:", stats);

    // Log the document IDs we're searching for
    console.log("Searching for documents with IDs:", documentIds);

    // Search across all documents in the user's namespace
    const searchResponse = await ns.query({
      vector: await embeddings.embedQuery(question),
      topK: 10, // Increased to get more potential matches
      includeMetadata: true
    });

    // Log detailed search results
    // console.log("Search results:", {
    //   resultCount: searchResponse.matches?.length || 0,
    //   firstResult: searchResponse.matches?.[0] ? {
    //     content: typeof searchResponse.matches[0].metadata?.pageContent === 'string' 
    //       ? searchResponse.matches[0].metadata.pageContent.substring(0, 100) + "..."
    //       : "Content not available",
    //     metadata: searchResponse.matches[0].metadata,
    //     documentId: searchResponse.matches[0].metadata?.documentId
    //   } : null,
    //   question
    // });

    // if (!searchResponse.matches || searchResponse.matches.length === 0) {
    //   // Log why no results were found
    //   console.log("No results found. Possible reasons:", {
    //     documentIds,
    //     stats,
    //     question
    //   });
    //   return NextResponse.json({ 
    //     error: "No relevant information found in the selected documents",
    //     documents: []
    //   }, { status: 404 });
    // }

    // // Group results by document
    // const resultsByDocument = searchResponse.matches.reduce<Record<string, DocumentResult>>((acc, match) => {
    //   const docId = match.metadata?.documentId as string;
    //   if (!acc[docId]) {
    //     acc[docId] = {
    //       content: [],
    //       filename: match.metadata?.filename as string || 'Unknown Document'
    //     };
    //   }
    //   if (match.metadata?.pageContent) {
    //     acc[docId].content.push(match.metadata.pageContent as string);
    //   }
    //   return acc;
    // }, {});

    // // Combine context from all relevant documents
    // const context = Object.entries(resultsByDocument)
    //   .map(([docId, doc]) => 
    //     `From "${(doc as DocumentResult).filename}":\n${(doc as DocumentResult).content.join("\n")}`
    //   )
    //   .join("\n\n");

    // const openai = new ChatOpenAI({
    //   openAIApiKey: process.env.OPENAI_API_KEY,
    //   modelName: "gpt-3.5-turbo",
    // });

    // // Check if the question is asking for a structured JSON response
    // const isStructuredResponse = question.includes("Return a JSON response") || 
    //                             question.includes("JSON response with") ||
    //                             question.includes("matches") && question.includes("score");

    // let systemPrompt = `You are a helpful AI assistant. Use the following context to answer the question. If the context doesn't contain relevant information, say so. For each piece of information you use, mention which document it came from. Context: ${context}`;
    
    // if (isStructuredResponse) {
    //   systemPrompt = `You are a helpful AI assistant that analyzes documents against requirements. 
    //   Use the following context to determine if the candidate matches the requirements.
    //   If the context doesn't contain relevant information, indicate that in your response.
    //   For classification matching, be flexible and consider partial matches.
    //   Return ONLY a valid JSON object with the requested fields.
    //   Context: ${context}`;
    // }

    // const chatResponse = await openai.invoke([
    //   {
    //     role: "system",
    //     content: systemPrompt,
    //   },
    //   {
    //     role: "user",
    //     content: question,
    //   },
    // ]);

    // const documents = Object.values(resultsByDocument).map(doc => (doc as DocumentResult).filename);

    // // If it's a structured response, try to parse it as JSON
    // if (isStructuredResponse) {
    //   try {
    //     // Extract JSON from the response if it's wrapped in markdown code blocks
    //     let jsonStr = chatResponse.content.toString();
    //     if (jsonStr.includes("```json")) {
    //       jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
    //     } else if (jsonStr.includes("```")) {
    //       jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
    //     }
        
    //     const parsedResponse = JSON.parse(jsonStr);
    //     return NextResponse.json({ 
    //       ...parsedResponse,
    //       documents
    //     });

    //   } catch (error) {
    //     console.error("Failed to parse structured response:", error);
    //     // Fall back to returning the raw response
    //     return NextResponse.json({ 
    //       answer: chatResponse.content,
    //       documents,
    //       error: "Failed to parse structured response"
    //     });
    //   }
    // }

    // Return the response
    const response = searchResponse.matches[0].metadata;
    console.log('Question API Response:', response);
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Question API error:", error);
    return new Response(`Error processing question: ${errorMessage}`, { status: 500 });
  }
}
