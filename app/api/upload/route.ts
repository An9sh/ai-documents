import { NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { getPineconeClient } from "@/lib/pinecone-client";
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse-fork';

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Generate a UUID for the document
    const documentId = uuidv4();

    // Extract text from PDF
    const text = await extractTextFromPDF(file);
    
    // Create initial document
    const doc = {
      pageContent: text,
      metadata: {
        filename: file.name
      }
    };

    // Split the text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      lengthFunction: (text) => text.length,
    });

    const splitDocs = await textSplitter.splitDocuments([doc]);

    // Add document ID and userId to metadata of each chunk
    const docsWithMetadata = splitDocs.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        documentId,
        userId,
        filename: file.name
      }
    }));

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Pinecone client
    const pineconeClient = await getPineconeClient();
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME!);

    // Store documents in Pinecone using userId as namespace
    await PineconeStore.fromDocuments(docsWithMetadata, embeddings, {
      pineconeIndex: index,
      namespace: userId
    });

    // Log the document storage process
    console.log("Document stored in Pinecone:", {
      documentId,
      userId,
      filename: file.name,
      chunkCount: docsWithMetadata.length,
      firstChunk: docsWithMetadata[0] ? {
        content: docsWithMetadata[0].pageContent.substring(0, 100) + "...",
        metadata: docsWithMetadata[0].metadata
      } : null
    });

    return NextResponse.json({ 
      success: true,
      documentId,
      filename: file.name,
      chunkCount: docsWithMetadata.length
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process the file" },
      { status: 500 }
    );
  }
}

// Add delete namespace endpoint
export async function DELETE(req: Request) {
  try {
    const { documentId, userId } = await req.json();

    if (!documentId || !userId) {
      return new Response("No document ID or user ID provided", { status: 400 });
    }

    const pineconeClient = await getPineconeClient();
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME!);
    const ns = index.namespace(userId);
    
    // Delete record by ID in user's namespace
    await ns.deleteOne(documentId);

    return NextResponse.json({
      message: `Document ${documentId} deleted successfully from user ${userId}'s namespace`,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(errorMessage);
    return new Response(errorMessage, { status: 500 });
  }
}
