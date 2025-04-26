import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeRecord } from "@pinecone-database/pinecone";

export class Embedder {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async embed(text: string, metadata?: any): Promise<PineconeRecord> {
    const embedding = await this.embeddings.embedQuery(text);
    return {
      id: metadata?.id || `query-${text.slice(0, 20).replace(/\s+/g, '-')}`,
      values: embedding,
      metadata: metadata || { text },
    };
  }

  async embedBatch(
    documents: any[],
    batchSize: number,
    onBatchComplete: (embeddings: PineconeRecord[]) => Promise<void>
  ) {
    const texts = documents.map(doc => doc.pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);

    const records = embeddings.map((embedding, i) => ({
      id: documents[i].metadata.documentId,
      values: embedding,
      metadata: documents[i].metadata,
    }));

    await onBatchComplete(records);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }
}

export const embedder = new Embedder(); 