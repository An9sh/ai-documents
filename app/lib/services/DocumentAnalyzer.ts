// /lib/DocumentAnalyzer.ts
import { ChatOpenAI } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { embedder } from "../embedder";
import { getPineconeClient } from "../../../lib/pinecone-client";

const VECTOR_SCORE_THRESHOLD = 0.65; // used to skip LLM if relevance is low

export class DocumentAnalyzer {
  private readonly pinecone: Pinecone;
  private readonly indexName: string;

  
  constructor(pinecone: Pinecone, indexName: string) {
    this.pinecone = pinecone;
    this.indexName = indexName;
  }

  static async init(): Promise<DocumentAnalyzer> {
    const pinecone = await getPineconeClient();
    const indexName = process.env.PINECONE_INDEX_NAME!;
    return new DocumentAnalyzer(pinecone, indexName);
  }

  async analyze(
    question: string,
    userId: string,
    documentIds: string[],
    requirement: any
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OpenAI API key");
    }
    console.log("documentIds", documentIds);
    // console.log("requirement", requirement.requirements);

    const index = this.pinecone.index(this.indexName).namespace(userId);
    const queryEmbedding = await embedder.embed(question);

    const queryResult = await index.query({
      vector: queryEmbedding.values,
      includeMetadata: true,
      includeValues: true,
      filter: { documentId: { $in: documentIds } },
      topK: 20,
    });

    if (!queryResult.matches || queryResult.matches.length === 0) {
      return this.emptyResult(question);
    }

    const documents = this.processMatches(queryResult.matches);
    const maxScore = Math.max(...documents.map(doc => doc.score));
    console.log("maxScore", maxScore);

    if (maxScore < VECTOR_SCORE_THRESHOLD) {
      return {
        ...this.emptyResult(question),
        answer: {
          ...this.emptyResult(question).answer,
          reason: `Document similarity too low (score: ${Math.round(
            maxScore * 100
          )}%) to evaluate.`,
        },
      };
    }

    const context = documents
      .map(doc => `From "${doc.filename}":\n${doc.content}`)
      .join("\n\n");

    const explanation = await this.getLLMExplanation(question, context, maxScore);
    console.log("explanation", explanation);

    return {
      answer: {
        score: Math.round(maxScore * 100),
        match: explanation.match,
        reason: explanation.reason,
        requirement: question,
      },
      relevantDocuments: documents.map(doc => ({
        documentId: doc.documentId,
        filename: doc.filename,
        chunkCount: doc.chunkCount,
      })),
      finalScore: Math.round(maxScore * 100),
      matchDetails: {
        requirement: question,
        score: {
          final: Math.round(maxScore * 100),
          vector: Math.round(maxScore * 100),
          threshold: VECTOR_SCORE_THRESHOLD * 100,
        },
        match: explanation.match,
        reason: explanation.reason,
        confidence:
          maxScore > 0.8 ? "high" : maxScore > 0.7 ? "medium" : "low",
      },
      matches: documents
        .filter(doc => doc.score > 0.5)
        .map(doc => ({
          documentId: doc.documentId,
          filename: doc.filename,
          score: Math.round(doc.score * 100),
          chunkCount: doc.chunkCount,
        })),
    };
  }

  private processMatches(matches: any[]) {
    const grouped: Record<string, any> = {};

    for (const match of matches) {
      const docId = match.metadata?.documentId;
      if (!docId) continue;

      if (!grouped[docId]) {
        grouped[docId] = {
          documentId: docId,
          filename: match.metadata?.filename || "Unknown Document",
          chunks: [],
          totalScore: 0,
        };
      }

      grouped[docId].chunks.push({
        content: match.metadata?.pageContent || "",
        score: match.score || 0,
      });
      grouped[docId].totalScore += match.score || 0;
    }

    return Object.values(grouped).map(group => {
      const sorted = group.chunks.sort((a: any, b: any) => b.score - a.score);
      const topChunks = sorted.slice(0, 3);
      const avgScore = group.chunks.length
        ? group.totalScore / group.chunks.length
        : 0;

      return {
        documentId: group.documentId,
        filename: group.filename,
        content: topChunks.map((c: any) => c.content).join("\n\n"),
        score: avgScore,
        chunkCount: group.chunks.length,
      };
    }).sort((a, b) => b.score - a.score);
  }

  private async getLLMExplanation(
    requirement: string,
    context: string,
    score: number
  ): Promise<{ reason: string; match: boolean }> {
    const chat = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-3.5-turbo",
    });

    const messages = [
      {
        role: "system",
        content: `You are a document evaluator. Based only on the provided context, determine whether the document meets the specified requirement. Respond strictly with a JSON object including "match" (true/false) and a short "reason". Do not assume or invent content.`,
      },
      {
        role: "user",
        content: `Requirement: ${requirement}
        Vector similarity score: ${Math.round(score * 100)}%
        Context:
        ${context}

        Does the document meet the requirement? Respond with ONLY a JSON object like this:
        {"match": true|false, "reason": "..."}`,
              }
    ];

    try {
      const res = await chat.invoke(messages);
      const raw = res?.content?.toString() ?? "";
       console.log("Raw LLM response:", raw);

      // Attempt to extract JSON blob safely
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON found in response:", raw);
        throw new Error("No JSON found in LLM response");
      }

      const cleaned = jsonMatch[0]
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/```json|```/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ');

      try {
        // Attempt to repair bad inner quotes inside the reason string
        const safeJson = cleaned.replace(/"reason":\s*"([^"]*?)(?<!\\)"/, (match, group) => {
          const escaped = group.replace(/"/g, '\\"');
          console.log("Match:", match, "Group:", group, "Escaped:", escaped);
          return `"reason": "${escaped}"`;
        });
    
        const parsed = JSON.parse(safeJson);
      
        if (typeof parsed.match !== 'boolean' || typeof parsed.reason !== 'string') {
          throw new Error("Invalid response format");
        }
      
        return {
          match: parsed.match,
          reason: parsed.reason
        };
      } catch (parseError) {
        // console.error("JSON parse error:", parseError, "on cleaned string:", cleaned);
        return {
          match: false,
          reason: "Could not determine match due to processing error."
        };
      }
      
    } catch (err) {
      console.error("LLM processing error:", err);
      return {
        match: false,
        reason: "Could not determine match due to processing error."
      };
    }
  }

  private emptyResult(question: string) {
    return {
      answer: {
        score: 0,
        match: false,
        reason: "No relevant documents found.",
        requirement: question,
      },
      relevantDocuments: [],
      finalScore: 0,
      matchDetails: {
        requirement: question,
        score: {
          final: 0,
          vector: 0,
          threshold: VECTOR_SCORE_THRESHOLD * 100,
        },
        match: false,
        reason: "No relevant documents found.",
        confidence: "low",
      },
      matches: [],
    };
  }
}
