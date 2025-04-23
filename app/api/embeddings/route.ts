import { randomUUID } from "crypto";
import { Pipeline, pipeline, AutoConfig, FeatureExtractionPipeline } from "@xenova/transformers";
import type {
  PineconeRecord,
  RecordMetadata,
} from "@pinecone-database/pinecone";
import type { Document } from "langchain/document";
import { EmbeddingsParams, Embeddings } from "@langchain/core/embeddings";
import { sliceIntoChunks } from "../../utils/util";
import { OpenAIEmbeddings } from '@langchain/openai';

export class Embedder {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async init(modelName: string) {
    // No initialization needed for OpenAI embeddings
    return;
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
}

interface TransformersJSEmbeddingParams extends EmbeddingsParams {
  modelName: string;
  onEmbeddingDone?: (embeddings: PineconeRecord[]) => void;
}

class TransformersJSEmbedding
  extends Embeddings
  implements TransformersJSEmbeddingParams
{
  modelName: string;
  pipe: FeatureExtractionPipeline | null = null;

  constructor(params: TransformersJSEmbeddingParams) {
    super(params);
    this.modelName = params.modelName;
  }
  async embedDocuments(texts: string[]): Promise<number[][]> {
    this.pipe = this.pipe || (await pipeline("feature-extraction", this.modelName));

    const embeddings = await Promise.all(
      texts.map(async (text) => this.embedQuery(text))
    );
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    this.pipe = this.pipe || (await pipeline("embeddings", this.modelName));

    const result = await this.pipe!(text);
    return Array.from(result.data) as number[];
  }
}

const embedder = new Embedder();
export { embedder, TransformersJSEmbedding };
