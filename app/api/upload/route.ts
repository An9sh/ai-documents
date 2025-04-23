import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { v4 as uuidv4 } from 'uuid';
import { verifyFirebaseToken } from '../../lib/firebase-admin';
import { createDocument } from '../../lib/db/documents';
import { ensureUserExists } from '../../lib/db/users';
import { getRequirements } from "app/lib/db/requirements";
import { RequirementsClassifier } from "../requirements/route";
import { createDocumentMatch, prepareDocumentMatch } from "../../lib/db/requirement-matches";
import { createClassification } from "../../lib/db/classifications";
import { Classification } from '../../types';
import { sendProgressUpdate } from './progress/route';
import { chunkedUpsert } from "../../utils/chunkedUpsert";
import { embedder } from "../embeddings/route";
import pdfParse from 'pdf-parse-fork';
import { getPineconeClient } from "lib/pinecone-client";

// const pinecone = new Pinecone();
// const indexName = process.env.PINECONE_INDEX_NAME!;

// Initialize OpenAI embeddings with specific configuration
// const embeddings = new OpenAIEmbeddings({
//   modelName: 'text-embedding-ada-002',
//   openAIApiKey: process.env.OPENAI_API_KEY,
//   maxConcurrency: 5,
//   batchSize: 1,
//   timeout: 60000, // 60 seconds timeout
// });

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

async function verifyDocumentIndexing(documentId: string, userId: string, token: string, maxRetries = 5): Promise<boolean> {
  let retries = 0;
  const retryDelay = 2000; // 2 seconds

  while (retries < maxRetries) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: 'Test query to verify indexing',
          documentIds: [documentId],
          userId
        })
      });

      if (response.ok) {
        return true;
      }
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries)));
      }
    } catch (error) {
      console.error('Error checking index status:', error);
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries)));
      }
    }
  }

  return false;
}

export async function POST(request: Request) {
  // Get upload ID from headers
  const uploadId = request.headers.get('X-Upload-Id') || uuidv4();
  
  try {
    // Send initial progress update
    sendProgressUpdate(uploadId, { 
      status: 'uploading',
      message: 'Starting document upload...',
      progress: 0
    });

    const formData = await request.formData();
    const file = formData.get("file") as unknown as { 
      name: string;
      type: string;
      size: number;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "No auth token provided" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    await ensureUserExists(userId, decodedToken.email || '', decodedToken.name || '');

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    sendProgressUpdate(uploadId, { 
      status: 'processing',
      message: 'Processing PDF document...',
      progress: 20
    });

    const documentId = uuidv4();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text from PDF
    const text = await extractTextFromPDF(buffer);

    // Split text into chunks with optimal configuration
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,  // Optimal size for document context
      chunkOverlap: 400,  // 20% overlap for smooth transitions
      separators: ["\n\n", "\n", ".", "!", "?", " ", ""]  // Sentence separators
    });

    // Clean and prepare the text
    const cleanedText = text.replace(/\s+/g, ' ').trim();

    const splitDocs = await textSplitter.splitDocuments([{
      pageContent: cleanedText,
      metadata: {
        id: documentId,
        documentId: documentId,
        source: file.name,
        userId: userId,
        filename: file.name,
        type: 'document',
        uploadedAt: new Date().toISOString()
      }
    }]);

    // Initialize Pinecone and store vectors
    const pinecone = await getPineconeClient();
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Store documents in Pinecone with explicit namespace
    console.log("Storing documents in Pinecone with namespace:", userId);
    console.log("Number of documents to store:", splitDocs.length);
    console.log("First document metadata:", splitDocs[0].metadata);
    
    await PineconeStore.fromDocuments(splitDocs, new OpenAIEmbeddings(), {
      pineconeIndex: index,
      namespace: userId,
      textKey: 'pageContent'
    });

    console.log("Documents stored successfully in Pinecone");

    // Create document in database
    const dbDocument = await createDocument({
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

    // Verify document is properly indexed
    const isIndexed = await verifyDocumentIndexing(dbDocument.id, userId, token);
    if (!isIndexed) {
      throw new Error('Document uploaded but indexing failed');
    }

    sendProgressUpdate(uploadId, { 
      status: 'processing',
      message: 'Document sections stored successfully, starting classification...',
      progress: 60
    });

    const allRequirements = await getRequirements(userId);
    const classifications: Classification[] = [];

    for (const req of allRequirements) {
      const progress = 60 + (classifications.length / allRequirements.length * 20);
      sendProgressUpdate(uploadId, { 
        status: 'processing',
        message: `Processing requirement: ${req.name}`,
        progress
      });

      // Search across all sections
      const question = RequirementsClassifier.buildQuestionForRequirement(req);
      const documentInfo = await RequirementsClassifier.fetchDocumentInformation(
        question,
        [documentId],
        // sections.map(s => s.sectionId), // Pass all section IDs
        token,
        userId,
        req.id
      );

      if (!documentInfo || !documentInfo.matches?.length) {
        continue;
      }

      const match = documentInfo.matches[0];
      const vectorScore = match.vectorScore || 0;
      const aiScore = match.aiScore || 0;
      const finalScore = documentInfo.finalScore || 0;

      try {
        const classification = await createClassification({
          documentId: dbDocument.id,
          documentName: file.name,
          updatedAt: new Date(),
          matchDetails: documentInfo.matchDetails || {},
          requirementId: req.id,
          score: Math.round(finalScore),
          isMatched: documentInfo.matchDetails?.match === true,
          confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
          isPrimary: documentInfo.matchDetails?.match === true && finalScore >= req.matchThreshold,
          isSecondary: documentInfo.matchDetails?.match === true && finalScore >= req.matchThreshold * 0.8,
          details: {
            requirements: {
              matched: match.content ? [match.content] : [],
              missing: []
            },
            metadata: {
              documentId: dbDocument.id,
              filename: file.name,
              lines: { from: 0, to: 0 },
              userId,
              matchedAt: new Date().toISOString(),
              confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
              matchedRequirements: match.content ? [match.content] : [],
              rawMatchReason: documentInfo.matchDetails?.reason || "No match found",
              threshold: req.matchThreshold,
              isMatched: documentInfo.matchDetails?.match === true,
              documentInfo: {
                type: 'document',
                size: file.size,
                // sectionCount: sections.length
              }
            },
            scores: {
              vector: vectorScore,
              ai: aiScore,
              final: finalScore
            }
          }
        });

        if (documentInfo.matchDetails?.match === true) {
          const documentMatch = prepareDocumentMatch(
            dbDocument.id,
            classification.id,
            req.id,
            {
              vectorScore,
              aiScore,
              finalScore,
              isMatch: true,
              confidence: finalScore > 80 ? 'high' : finalScore > 60 ? 'medium' : 'low',
              matchReason: documentInfo.matchDetails.reason || "No reason provided",
              matchedContent: match.content ? [match.content] : []
            }
          );
          await createDocumentMatch(documentMatch);
        }

        classifications.push(classification);
      } catch (error) {
        console.error('Error processing classification:', error);
        continue;
      }
    }

    sendProgressUpdate(uploadId, { 
      status: 'completed',
      message: 'Document processing completed successfully',
      progress: 100
    });

    return NextResponse.json({ 
      success: true,
      document: dbDocument,
      classifications: classifications.map(c => ({
        documentId: c.documentId,
        requirementId: c.requirementId,
        score: c.score,
        confidence: c.confidence,
        isPrimary: c.isPrimary,
        isSecondary: c.isSecondary,
        isMatched: c.isMatched,
        details: c.details
      })),
      matchedRequirements: allRequirements.map(req => {
        const reqClassification = classifications.find(c => c.requirementId === req.id);
        return reqClassification ? {
          documentId: reqClassification.documentId,
          requirementId: reqClassification.requirementId,
          score: reqClassification.score,
          confidence: reqClassification.confidence,
          isMatched: reqClassification.isPrimary,
          reason: reqClassification.details.metadata?.rawMatchReason || "No reason provided",
          threshold: req.matchThreshold,
          requirement: req.name
        } : null;
      }).filter(Boolean),
      message: `Document processed successfully. Matched with ${classifications.filter(c => c.isPrimary).length} out of ${allRequirements.length} requirements.`,
      uploadId
    });
  } catch (error) {
    sendProgressUpdate(uploadId, { 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to process document',
      progress: 0
    });

    return NextResponse.json(
      { 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error',
        step: 'document_processing'
      },
      { status: 500 }
    );
  }
}
