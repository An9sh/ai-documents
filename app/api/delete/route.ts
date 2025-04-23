import { NextResponse } from "next/server";
import { getPineconeClient } from "../../../lib/pinecone-client";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function DELETE(req: Request) {
  try {
    const { documentId, userId, fileKey } = await req.json();

    if (!documentId || !userId || !fileKey) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // 1. Delete from Pinecone
    const pineconeClient = await getPineconeClient();
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME!);
    const ns = index.namespace(userId);
    
    // Use a more efficient approach with pagination
    let allVectorIds: string[] = [];
    let hasMore = true;
    const pageSize = 100; // Process in smaller batches

    while (hasMore) {
      const fetchResponse = await ns.query({
        vector: new Array(1536).fill(0), // Dummy vector for filtering
        topK: pageSize,
        filter: {
          documentId: documentId
        },
        includeMetadata: true
      });

      const vectorIds = fetchResponse.matches.map(match => match.id);
      
      // If we get fewer results than requested, we've found all vectors
      if (vectorIds.length < pageSize) {
        hasMore = false;
      }

      // Add new vectors to our collection
      allVectorIds = [...allVectorIds, ...vectorIds];

      // If we've found no new vectors, we're done
      if (vectorIds.length === 0) {
        hasMore = false;
      }
    }

    // Delete vectors in batches to avoid overwhelming the API
    const batchSize = 100;
    for (let i = 0; i < allVectorIds.length; i += batchSize) {
      const batch = allVectorIds.slice(i, i + batchSize);
      if (batch.length > 0) {
        await ns.deleteMany(batch);
      }
    }

    // 2. Delete from UploadThing
    await utapi.deleteFiles(fileKey);

    // 3. Return success response
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully from all storage locations",
      deletedFrom: {
        pinecone: true,
        uploadthing: true
      },
      vectorsDeleted: allVectorIds.length
    });

  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
} 