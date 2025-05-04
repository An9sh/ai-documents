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
        const content = match.metadata?.text as string;
        
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
          const reason = await this.getMatchReason(doc, requirement, isMatch);

          return {
            documentId: doc.documentId,
            filename: doc.filename,
            vectorScore,
            finalScore: vectorScore, // Using vector score as final score
            isMatch,
            matchDetails: [{
              vectorScore,
              finalScore: vectorScore,
              match: isMatch,
              reason,
              requirement: requirement.trim()
            }]
          };
        })
      );

      // Sort by final score
      results.sort((a, b) => b.finalScore - a.finalScore);

      return {
        results,
        total: results.length,
        topMatch: results[0] || null
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
  ): Promise<string> {
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
        content: `You are a document analyzer that explains why a document matches or doesn't match a requirement.
        Use the following context to explain the match or mismatch.
        Focus on explaining the semantic relationship between the document content and the requirement.
        Be specific about which parts of the requirement are met or not met.
        Keep your explanation concise and factual.
        Do not make up information, only use the context provided.
        
        Context: From "${doc.filename}":\n${topChunks}`,
      },
      {
        role: "user",
        content: `Requirement: ${requirement.trim()}\nVector similarity score: ${Math.round(doc.vectorScore * 100)}%\nIs match: ${isMatch}\nExplain why this document ${isMatch ? 'matches' : 'does not match'} the requirement.`,
      }
    ]);

    return chatResponse.content.toString();
  }
} 