"use client";

import { useState, useEffect } from "react";
import { DocumentMetadata } from "@/app/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClassificationRequirement, ParsedResume } from './types/resume';
import { UploadSection } from './components/upload-section';
import { ClassificationSection } from './components/classification-section';
import { MatchAPI } from './api/match';

// Constants
const REQUIREMENTS_STORAGE_KEY = 'resume-filtering-requirements';

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentMetadata[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [requirements, setRequirements] = useState<ClassificationRequirement[]>([]);
  const [groupedResumes, setGroupedResumes] = useState<Map<string, ParsedResume[]>>(new Map());

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedDocs = localStorage.getItem("documents");
      if (savedDocs) {
        const parsedDocs = JSON.parse(savedDocs);
        setDocuments(parsedDocs.map((doc: any) => ({
          ...doc,
          uploadedAt: new Date(doc.uploadedAt)
        })));
      }

      // Load requirements from localStorage
      const savedRequirements = localStorage.getItem(REQUIREMENTS_STORAGE_KEY);
      if (savedRequirements) {
        setRequirements(JSON.parse(savedRequirements));
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("documents", JSON.stringify(documents));
    }
  }, [documents, isClient]);

  const handleDocumentSelect = (doc: DocumentMetadata) => {
    setSelectedDocuments(prev => 
      prev.some(d => d.id === doc.id)
        ? prev.filter(d => d.id !== doc.id)
        : [...prev, doc]
    );
  };

  const handleUploadComplete = (newDocuments: DocumentMetadata[]) => {
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleCreateRequirement = (newRequirement: ClassificationRequirement) => {
    const updatedRequirements = [...requirements, newRequirement];
    setRequirements(updatedRequirements);
    localStorage.setItem(REQUIREMENTS_STORAGE_KEY, JSON.stringify(updatedRequirements));
  };

  const handleSyncClassification = async (requirement: ClassificationRequirement) => {
    try {
      const updatedResumes = await MatchAPI.syncClassification(documents, requirement);
      console.log('Updated resumes:', updatedResumes);
      
      const newGroupedResumes = new Map(groupedResumes);
      newGroupedResumes.set(requirement.id, updatedResumes);
      setGroupedResumes(newGroupedResumes);
    } catch (error) {
      console.error('Error syncing classification:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Document Requirements</h1>
            <ThemeToggle />
          </div>

          <UploadSection
            documents={documents}
            selectedDocuments={selectedDocuments}
            onDocumentSelect={handleDocumentSelect}
            onUploadComplete={handleUploadComplete}
          />

          <ClassificationSection
            requirements={requirements}
            groupedResumes={groupedResumes}
            onCreateRequirement={handleCreateRequirement}
            onSyncClassification={handleSyncClassification}
          />
        </div>
      </div>
    </div>
  );
}
