import { DocumentMetadata } from "../types/index";

export async function deleteDocument(document: DocumentMetadata) {
  try {
    // 1. Delete from localStorage
    const storedDocs = localStorage.getItem("documents");
    if (storedDocs) {
      const docs = JSON.parse(storedDocs) as DocumentMetadata[];
      const updatedDocs = docs.filter(doc => doc.id !== document.id);
      localStorage.setItem("documents", JSON.stringify(updatedDocs));
    }

    // 2. Call delete API to remove from Pinecone and UploadThing
    const response = await fetch('/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: document.id,
        userId: 'default-user',
        fileKey: document.fileKey
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete document from server');
    }

    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
} 