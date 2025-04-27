import { db } from '../db';
import { documents, users, classifications, requirements } from '../../../db/schema';
import { eq, and, notExists } from 'drizzle-orm';
import { DocumentMetadata } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export async function createDocument(document: Omit<DocumentMetadata, 'id'> & { pineconeId: string }, userId: string): Promise<DocumentMetadata> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Check if user exists
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found in database');
    }

    // Check if document with this pineconeId already exists
    const existingDoc = await db.select()
      .from(documents)
      .where(eq(documents.pineconeId, document.pineconeId))
      .limit(1);

    if (existingDoc.length > 0) {
      // Update existing document instead of creating a new one
      const [updatedDoc] = await db.update(documents)
        .set({
          [documents.filename.name]: document.filename,
          [documents.fileKey.name]: document.fileKey,
          [documents.type.name]: document.type,
          [documents.size.name]: document.size,
          [documents.mimeType.name]: document.mimeType,
          [documents.userId.name]: userId,
          [documents.uploadedAt.name]: document.uploadedAt,
          [documents.summary.name]: document.summary || '',
          [documents.pageCount.name]: document.pageCount || 0,
          [documents.namespace.name]: userId,
          [documents.pineconeId.name]: document.pineconeId
        })
        .where(eq(documents.pineconeId, document.pineconeId))
        .returning();

      return {
        id: updatedDoc.id.toString(),
        pineconeId: updatedDoc.pineconeId || undefined,
        filename: updatedDoc.filename,
        fileKey: updatedDoc.fileKey,
        type: updatedDoc.type,
        uploadedAt: updatedDoc.uploadedAt || new Date(),
        size: updatedDoc.size,
        mimeType: updatedDoc.mimeType,
        summary: updatedDoc.summary || '',
        pageCount: updatedDoc.pageCount || 0,
        fileSize: updatedDoc.size,
        namespace: userId
      };
    }

    // Create new document if it doesn't exist
    const [newDocument] = await db.insert(documents)
      .values({
        id: uuidv4(),
        [documents.pineconeId.name]: document.pineconeId,
        filename: document.filename,
        fileKey: document.fileKey,
        type: document.type,
        size: document.size,
        mimeType: document.mimeType,
        [documents.userId.name]: userId,
        [documents.uploadedAt.name]: document.uploadedAt,
        [documents.summary.name]: document.summary || '',
        [documents.pageCount.name]: document.pageCount || 0,
        [documents.namespace.name]: userId
      })
      .returning();

    if (!newDocument) {
      throw new Error('Failed to create document');
    }

    return {
      id: newDocument.id.toString(),
      pineconeId: newDocument.pineconeId || undefined,
      filename: newDocument.filename,
      fileKey: newDocument.fileKey,
      type: newDocument.type,
      uploadedAt: newDocument.uploadedAt || new Date(),
      size: newDocument.size,
      mimeType: newDocument.mimeType,
      summary: newDocument.summary || '',
      pageCount: newDocument.pageCount || 0,
      fileSize: newDocument.size,
      namespace: userId
    };
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}

export async function getDocuments(userId: string): Promise<DocumentMetadata[]> {
  try {
    const dbDocuments = await db.select().from(documents).where(eq(documents.userId, userId));
    return dbDocuments.map(doc => {
      if (!doc.pineconeId) {
        console.error(`Document ${doc.id} is missing pineconeId`);
        return null;
      }

      const uploadedAt = doc.uploadedAt ? new Date(doc.uploadedAt) : new Date();

      return {
        id: doc.id.toString(),
        filename: doc.filename,
        fileKey: doc.fileKey,
        type: doc.type,
        uploadedAt,
        size: doc.size,
        mimeType: doc.mimeType,
        summary: doc.summary || '',
        pageCount: doc.pageCount || 0,
        fileSize: doc.size,
        namespace: userId,
        pineconeId: doc.pineconeId
      };
    }).filter((doc): doc is NonNullable<typeof doc> => doc !== null);
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // 1. Update classifications to remove document reference
    await db.update(classifications)
      .set({ [classifications.documentId.name]: null })
      .where(and(
        eq(classifications.documentId, documentId),
        eq(classifications.userId, userId)
      ));

    // 2. Then delete the document
    await db.delete(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.userId, userId)
      ));
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

export async function getDocument(documentId: string): Promise<DocumentMetadata | null> {
  try {
    const [document] = await db.select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    
    if (!document) {
      return null;
    }

    return {
      id: document.id,
      pineconeId: document.pineconeId || undefined,
      filename: document.filename,
      fileKey: document.fileKey,
      type: document.type,
      uploadedAt: document.uploadedAt ? new Date(document.uploadedAt) : new Date(),
      size: document.size,
      mimeType: document.mimeType,
      summary: document.summary || '',
      pageCount: document.pageCount || 0,
      fileSize: document.size,
      namespace: document.namespace || 'default'
    };
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

export async function getUnclassifiedDocuments(userId: string): Promise<DocumentMetadata[]> {
  try {
    // First check if there are any requirements
    const [requirement] = await db.select()
      .from(requirements)
      .where(eq(requirements.userId, userId))
      .limit(1);

    // If there are no requirements, all documents are considered unclassified
    if (!requirement) {
      const allDocs = await db.select()
        .from(documents)
        .where(eq(documents.userId, userId));

      return allDocs.map(doc => {
        const uploadedAt = new Date(doc.uploadedAt || new Date());

        return {
          id: doc.id.toString(),
          filename: doc.filename,
          fileKey: doc.fileKey,
          type: doc.type,
          uploadedAt,
          size: doc.size,
          mimeType: doc.mimeType,
          summary: doc.summary || '',
          pageCount: doc.pageCount || 0,
          fileSize: doc.size,
          namespace: userId,
          pineconeId: doc.pineconeId || doc.id.toString()
        };
      });
    }

    // If there are requirements, get documents that don't have any classifications
    const unclassifiedDocs = await db.select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          notExists(
            db.select()
              .from(classifications)
              .where(eq(classifications.documentId, documents.id))
          )
        )
      );

    return unclassifiedDocs.map(doc => {
      const uploadedAt = new Date(doc.uploadedAt || new Date());

      return {
        id: doc.id.toString(),
        filename: doc.filename,
        fileKey: doc.fileKey,
        type: doc.type,
        uploadedAt,
        size: doc.size,
        mimeType: doc.mimeType,
        summary: doc.summary || '',
        pageCount: doc.pageCount || 0,
        fileSize: doc.size,
        namespace: userId,
        pineconeId: doc.pineconeId || doc.id.toString()
      };
    });
  } catch (error) {
    console.error('Error fetching unclassified documents:', error);
    throw error;
  }
}

export async function uploadDocument(file: File, authToken: string, userId: string): Promise<DocumentMetadata | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Upload error:', {
        status: response.status,
        error: errorData.error,
        details: errorData.details,
        step: errorData.step
      });
      throw new Error(errorData.details || errorData.error || "Failed to upload file");
    }

    const data = await response.json();
    console.log("Document created when upload from db:", data);
    // Return the document created by the server
    return {
      id: data.document.id,
      filename: data.document.filename,
      fileKey: data.document.fileKey,
      uploadedAt: new Date(data.document.uploadedAt),
      size: data.document.size,
      mimeType: data.document.mimeType,
      type: data.document.type,
      summary: data.document.summary,
      pageCount: data.document.pageCount,
      fileSize: data.document.fileSize,
      namespace: data.document.namespace,
      pineconeId: data.document.pineconeId
    };
  } catch (error) {
    console.error("Error uploading document:", error);
    return null;
  }
}