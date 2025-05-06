import { Pinecone } from "@pinecone-database/pinecone";
import { embedder } from "../embedder";
import { ChatOpenAI } from "@langchain/openai";

export class SearchService {
  private static pinecone = new Pinecone();
  private static indexName = process.env.PINECONE_INDEX_NAME!;
  private static VECTOR_SCORE_THRESHOLD = 0.7; // 70% similarity threshold

  static async searchDocuments(
    query: string,
    requirement: string,
    userId: string,
    documentIds: string[]
  ) {
    try {
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return {
          documents: [],
          totalMatches: 0,
          requirementEvaluated: false,
          message: "No documents to search"
        };
      }

      const index = this.pinecone.index(this.indexName).namespace(userId);
      const queryEmbedding = await embedder.embed(query);

      console.log("documentIds:", documentIds);
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

      console.log("queryResult:", queryResult);
      // Group matches by document
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
        
        if (!docId || !filename || !content) return;

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
          if (match.score && match.score > doc.vectorScore) {
            doc.vectorScore = match.score;
          }
        }
      });

      if (uniqueDocuments.size === 0) {
        return {
          results: [],
          total: 0,
          topMatch: null,
          message: "No documents found in the namespace"
        };
      }

      // Process results with vector scores and get LLM reasons
      const results = await Promise.all(
        Array.from(uniqueDocuments.values()).map(async doc => {
          const vectorScore = doc.vectorScore * 100;
          const isMatch = doc.vectorScore >= this.VECTOR_SCORE_THRESHOLD;

          // Get match reason from LLM
          const { match: llmMatch, reason } = await this.getMatchReason(doc, requirement, isMatch);

          return {
            documentId: doc.documentId,
            filename: doc.filename,
            vectorScore,
            finalScore: vectorScore, // Using vector score as final score
            isMatch: llmMatch, // Use LLM's match decision instead of vector score
            matchDetails: [{
              vectorScore,
              finalScore: vectorScore,
              match: llmMatch,
              reason,
              requirement: requirement.trim()
            }]
          };
        })
      );

      // Filter out non-matching documents and sort by final score
      const matchingResults = results
        .filter(result => result.isMatch)
        .sort((a, b) => b.finalScore - a.finalScore);

      return {
        results: matchingResults,
        total: matchingResults.length,
        topMatch: matchingResults[0] || null
      };
    } catch (error) {
      console.error("Error in search service:", error);
      throw error;
    }
  }

  private static async getMatchReason(
    doc: {
      documentId: string;
      filename: string;
      vectorScore: number;
      chunks: Array<{ content: string; score: number }>;
    },
    requirement: string,
    isMatch: boolean
  ): Promise<{ match: boolean; reason: string }> {
    const openai = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo",
    });

    // Get top chunks for context
    const topChunks = doc.chunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(c => c.content)
      .join("\n\n");

    const chatResponse = await openai.invoke([
      {
        role: "system",
        content: `You are a document evaluator. Your task is to determine if a document meets a specific requirement.

          Rules:
          1. Base your evaluation ONLY on the actual content provided
          2. Do not make assumptions or infer categories
          3. If the document type is not explicitly mentioned in the content, do not guess
          4. Be strict about categorization - a document must clearly belong to the required category
          5. If in doubt, mark as not matching
          6. Do not hallucinate or invent content that isn't present

          Respond with a JSON object in this format:
          {
            "match": true|false,
            "reason": "Clear explanation based only on the provided content"
          }`
      },
      {
        role: "user",
        content: `Requirement: ${requirement.trim()}
Vector similarity score: ${Math.round(doc.vectorScore * 100)}%
Document Content:
${topChunks}

Evaluate if this document meets the requirement. Be strict and only mark as match if the document clearly belongs to the required category.`
      }
    ]);

    try {
      // Get the raw response text
      const responseText = chatResponse.content.toString();
      
      // Extract JSON from the response, handling markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON found in response:", responseText);
        return { match: false, reason: "Error: Could not parse response" };
      }

      // Clean up the JSON string
      const cleaned = jsonMatch[0]
        .replace(/```json|```/g, '') // Remove markdown code block markers
        .replace(/\n/g, ' ')         // Replace newlines with spaces
        .replace(/\s+/g, ' ')        // Normalize whitespace
        .trim();                     // Remove leading/trailing whitespace

      // Parse the cleaned JSON
      const response = JSON.parse(cleaned);
      console.log("response:", response);
      
      // Return both match status and reason
      return {
        match: response.match || false,
        reason: response.reason || "No reason provided"
      };
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return { match: false, reason: "Error evaluating document match" };
    }
  }
} 