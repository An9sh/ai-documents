"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentMetadata, Classification, ClassificationRequirement, RequirementData } from '../types';
import { Category } from '../types/filtering';
import { useAuth } from '../contexts/auth-context';
import { getDocuments } from '../lib/db/documents';
import { getRequirements } from '../lib/db/requirements';
import { getCategories } from '../lib/db/categories';
import { ClassificationSection } from '../components/classification-section';
import { UploadSection } from '../components/upload-section';
import { createRequirement } from '../lib/db/requirements';

interface RelevantDocument {
  documentId: string;
  filename: string;
  finalScore: number;
}

interface MatchDetails {
  score: {
    final: number;
    vector: number;
    ai: number;
    threshold: number;
  };
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface SyncResponse {
  classifications: Record<string, Array<{
    documentId: string;
    score: number;
  }>>;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, getFreshToken } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [requirements, setRequirements] = useState<ClassificationRequirement[]>([]);
  const [groupedResumes, setGroupedResumes] = useState<Map<string, RequirementData>>(new Map());
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [showNoMatchAlert, setShowNoMatchAlert] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !getFreshToken) return;
      try {
        // Load documents
        const docs = await getDocuments(user.uid);
        setDocuments(docs);

        // Load requirements
        const reqs = await getRequirements(user.uid);
        setRequirements(reqs);

        // Load categories from database
        const cats = await getCategories(user.uid);
        // Add 'all' category if it doesn't exist
        const allCategory = cats.find(cat => cat.id === 'all');
        if (!allCategory) {
          cats.unshift({
            id: 'all',
            name: 'All Categories',
            color: '#6B7280',
            threshold: 0,
            isCustom: false,
            userId: user.uid,
            createdAt: new Date()
          });
        }
        setCustomCategories(cats);

        // Load classifications from database
        const token = await getFreshToken();
        const response = await fetch('/api/classifications', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const results = await response.json();
          const groupedData = new Map();
          Object.entries(results).forEach(([requirementId, classifications]) => {
            groupedData.set(requirementId, {
              requirementId,
              classifications: (classifications as Classification[]).filter(c => c.isMatched)
            });
          });
          setGroupedResumes(groupedData);
          
          // Log the data to help with debugging
          console.log('Loaded classifications:', {
            rawResults: results,
            groupedData: Array.from(groupedData.entries())
          });
        } else {
          console.error('Failed to load classifications:', await response.text());
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [user, getFreshToken]);

  const handleDocumentUpload = async (newDocuments: DocumentMetadata[]) => {
    if (!user) return;
    
    try {
      // Update documents state
      setDocuments(prev => [...prev, ...newDocuments]);
      
      // Refresh classifications from database
      const token = await getFreshToken();
      const response = await fetch('/api/classifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const results = await response.json();
        const groupedData = new Map();
        Object.entries(results).forEach(([requirementId, classifications]) => {
          groupedData.set(requirementId, {
            requirementId,
            classifications: (classifications as Classification[]).filter(c => c.isMatched)
          });
        });
        setGroupedResumes(groupedData);
      }
    } catch (error) {
      console.error('Error handling document upload:', error);
    }
  };

  const handleSyncClassification = async (requirement: ClassificationRequirement) => {
    if (!user || !getFreshToken) return { classifications: {} };
    try {
      const token = await getFreshToken();
      
      // Call the new sync API endpoint
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requirement })
      });

      if (!response.ok) {
        throw new Error('Failed to sync classifications');
      }

      const result = await response.json();
      return result as SyncResponse;
    } catch (error) {
      console.error('Error during classification sync:', error);
      setShowNoMatchAlert(true);
      setTimeout(() => setShowNoMatchAlert(false), 3000);
      return { classifications: {} };
    }
  };

  const handleCreateRequirement = async (requirement: ClassificationRequirement) => {
    if (!user) return;
    try {
      // Create requirement in database
      const newRequirement = await createRequirement(user.uid, {
        name: requirement.name,
        description: requirement.description,
        categoryId: parseInt(requirement.category),
        category: requirement.category,
        color: requirement.color,
        requirements: requirement.requirements,
        threshold: requirement.matchThreshold,
        matchThreshold: requirement.matchThreshold
      });
      
      // Update local state
      setRequirements(prev => {
        const existingIndex = prev.findIndex(r => r.id === newRequirement.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newRequirement;
          return updated;
        }
        return [...prev, newRequirement];
      });
    } catch (error) {
      console.error('Error creating requirement:', error);
    }
  };

  const filteredRequirements = requirements.filter(req => 
    activeCategory === 'all' ? true : req.category === activeCategory
  );

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
        <div className="container mx-auto">
          
          {/* Add Upload Section */}
          <div className="mb-8">
            <UploadSection onUploadComplete={handleDocumentUpload} />
          </div>
          
          {/* Category Navigation */}
          <div className="mt-8 mb-6">
            <nav className="flex space-x-4" aria-label="Categories">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeCategory === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Classifications
              </button>
              {customCategories.filter(category => category.id !== 'all').map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeCategory === category.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </div>

          <ClassificationSection
            requirements={filteredRequirements}
            classifications={Array.from(groupedResumes.values()).flatMap(data => data.classifications || [])}
            onCreateRequirement={handleCreateRequirement}
            onSyncClassification={handleSyncClassification}
            onUpdateRequirement={(updatedRequirement) => {
              setRequirements(prev => 
                prev.map(req => req.id === updatedRequirement.id ? updatedRequirement : req)
              );
            }}
          />
        </div>
      </div>
    </div>
  );
} 