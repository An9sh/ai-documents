"use client";

import { useState, useEffect } from 'react';
import { DocumentMetadata } from '../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { getUnclassifiedDocuments, deleteDocument } from '../lib/db/documents';
import { useAuth } from '../contexts/auth-context';

interface UnclassifiedSectionProps {
  onDocumentsChange: (documents: DocumentMetadata[]) => void;
}

export function UnclassifiedSection({ onDocumentsChange }: UnclassifiedSectionProps) {
  const { user } = useAuth();
  const [unclassifiedDocuments, setUnclassifiedDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUnclassifiedDocuments = async () => {
      if (!user) return;
      try {
        const docs = await getUnclassifiedDocuments(user.uid);
        setUnclassifiedDocuments(docs);
      } catch (error) {
        console.error('Error loading unclassified documents:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUnclassifiedDocuments();
  }, [user]);

  const handleDelete = async (document: DocumentMetadata) => {
    if (!user) return;
    try {
      await deleteDocument(document.id, user.uid);
      setUnclassifiedDocuments(prev => prev.filter(doc => doc.id !== document.id));
      onDocumentsChange(unclassifiedDocuments.filter(doc => doc.id !== document.id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading unclassified documents...</div>;
  }

  if (unclassifiedDocuments.length === 0) {
    return <div className="p-4">No unclassified documents found.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Unclassified Documents</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {unclassifiedDocuments.map((doc) => (
          <div
            key={doc.id}
            className="relative flex flex-col p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {doc.filename}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Uploaded: {doc.uploadedAt.toLocaleDateString()}
              </p>
              {doc.summary && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                  {doc.summary}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => handleDelete(doc)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 