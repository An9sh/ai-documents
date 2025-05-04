// /lib/DocumentProcessor.ts
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import pdfParse from 'pdf-parse-fork';
import { getPineconeClient } from '../../../lib/pinecone-client';
import { createDocument } from '../db/documents';

export class DocumentProcessor {
  private static embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  private static async splitText(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", " ", ""]
    });
    return await splitter.splitText(text);
  }

  private static async generateEmbedding(text: string): Promise<number[]> {
    const [embedding] = await this.embeddings.embedDocuments([text]);
    return embedding;
  }

  private static getDynamicBatchSize(totalVectors: number): number {
    if (totalVectors > 2000) return 20;
    if (totalVectors > 500) return 50;
    return 100;
  }

  private static async uploadWithRetry(index: any, batch: any[], retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await index.upsert(batch);
        return;
      } catch (error) {
        console.error(`Batch upload failed (attempt ${attempt}):`, error);
        if (attempt === retries) throw new Error(`Upload failed after ${retries} retries.`);
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
  }

  static async processDocument(
    file: { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
    userId: string,
    documentId: string
  ) {
    try {
      console.log('Starting document processing for:', file.name);
      const buffer = await file.arrayBuffer();
      const data = await pdfParse(Buffer.from(buffer));
      const text = data.text;

      const chunks = await this.splitText(text);
      console.log('Text split into chunks:', chunks.length);

      const processedChunks = await Promise.all(
        chunks.map(async (chunk: string, index: number) => {
          const chunkId = `${documentId}_chunk_${index}`;
          const embedding = await this.generateEmbedding(chunk);
          return {
            id: chunkId,
            text: chunk,
            embedding
          };
        })
      );

      const pinecone = await getPineconeClient();
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!).namespace(userId);

      const vectors = processedChunks.map(chunk => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          pageContent: chunk.text, // ✅ Corrected key for analyzer compatibility
          documentId,
          userId,
          filename: file.name
        }
      }));

      const batchSize = this.getDynamicBatchSize(vectors.length);
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await this.uploadWithRetry(index, batch);
        const progress = Math.round(((i + batch.length) / vectors.length) * 100);
        console.log(`Progress: ${progress}% (${i + batch.length}/${vectors.length})`);
      }

      const dbDocument = await createDocument({
        id: documentId,
        filename: file.name,
        fileKey: documentId,
        type: 'document',
        size: file.size,
        mimeType: file.type,
        summary: '',
        pageCount: 0,
        pineconeId: documentId,
        uploadedAt: new Date(),
        fileSize: file.size,
        namespace: userId
      }, userId);

      if (!dbDocument) {
        throw new Error('Failed to create document in database');
      }

      console.log('Document processing completed successfully');
      return {
        success: true,
        chunks: processedChunks.length,
        documentId
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
}
