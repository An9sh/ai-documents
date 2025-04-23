'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { DocumentSection } from '../components/document-section';
import { UnclassifiedSection } from '../components/unclassified-section';
import { DocumentMetadata } from '../types';
import { getDocuments } from '../lib/db/documents';

export default function DocumentsPage() {
  const { user, loading } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user) return;
      try {
        const docs = await getDocuments(user.uid);
        setDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
      }
    };

    loadDocuments();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Documents</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
            </div>
          </div>

          <div className="space-y-8">
            <DocumentSection documents={documents} onDocumentsChange={setDocuments} />
            <UnclassifiedSection onDocumentsChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
} 