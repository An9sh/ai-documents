import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
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
    let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
        console.log('Array buffer created:', {
          size: buffer.byteLength,
          type: buffer.constructor.name
        });
      } catch (error) {
        console.error('Error creating array buffer:', error);
        throw new Error('Failed to read file content');
      }
  
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Empty file buffer received');
      }
  
      if (buffer.byteLength > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
      }
  
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = Buffer.from(buffer);
        console.log('PDF buffer created:', {
          size: pdfBuffer.length,
          type: pdfBuffer.constructor.name
        });
      } catch (error) {
        console.error('Error creating PDF buffer:', error);
        throw new Error('Failed to convert file to PDF buffer');
      }
  
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Invalid PDF buffer: Buffer is empty or undefined');
      }

      // Use LangChain's PDFLoader
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const loader = new PDFLoader(blob);
      const docs = await loader.load();

      if (!docs || docs.length === 0) {
        throw new Error('No content extracted from PDF');
      }

      // Extract text from all pages
      const extractedText = docs.map((doc: { pageContent: any; }) => doc.pageContent).join('\n\n');
      
      if (extractedText.trim().length === 0) {
        throw new Error('No valid text extracted from PDF');
      }

      console.log('PDF parsed successfully:', {
        pageCount: docs.length,
        textLength: extractedText.length,
        preview: extractedText.slice(0, 100)
      });
  
      const chunks = await this.splitText(extractedText);
      if (!Array.isArray(chunks) || chunks.length === 0) {
        throw new Error('Text splitting failed or returned empty chunks');
      }
  
      console.log(`Text split into ${chunks.length} chunks.`);

      const processedChunks = await Promise.all(
        chunks.map(async (chunk: string, index: number) => {
          if (!chunk || typeof chunk !== 'string') {
            console.warn(`Skipping invalid chunk at index ${index}`);
            return null;
          }

          const chunkId = `${documentId}_chunk_${index}`;
          const embedding = await this.generateEmbedding(chunk);
          return {
            id: chunkId,
            text: chunk,
            embedding,
            metadata: {
              pageContent: chunk,
              documentId,
              userId,
              filename: file.name,
              chunkIndex: index
            }
          };
        })
      );

      const validChunks = processedChunks.filter(Boolean);
      if (!validChunks || validChunks.length === 0) {
        throw new Error('No valid chunks were processed');
      }

      console.log(`Successfully processed ${validChunks.length} chunks`);

      const pinecone = await getPineconeClient();
      if (!pinecone) {
        throw new Error('Failed to initialize Pinecone client');
      }

      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!).namespace(userId);
      if (!index) {
        throw new Error('Failed to get Pinecone index');
      }

      const vectors = validChunks.map(chunk => {
        if (!chunk) return null;
        return {
          id: chunk.id,
          values: chunk.embedding,
          metadata: chunk.metadata
        };
      }).filter(Boolean);

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
        summary: extractedText.slice(0, 500), // Store first 500 chars as summary
        pageCount: docs.length,
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
        chunks: validChunks.length,
        dbDocument,
        documentId,
        summary: extractedText.slice(0, 500),
        pageCount: docs.length
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
}