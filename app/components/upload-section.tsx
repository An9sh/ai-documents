"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentMetadata } from '../types';
import { Dialog } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/auth-context';
import { DocumentManager } from '../lib/DocumentManager';

interface UploadSectionProps {
  onUploadComplete: (documents: DocumentMetadata[]) => void;
}

interface MatchResult {
  documentId: string;
  requirementId: string;
  score: number;
  confidence: string;
  isMatched: boolean;
  reason: string;
  threshold: number;
  vectorScore: number;
  aiScore: number;
  matchedContent?: string[];
  requirement?: string;
  requirementName?: string;
  requirementDescription?: string;
}

export function UploadSection({ onUploadComplete }: UploadSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});
  const [uploadResults, setUploadResults] = useState<{
    document: DocumentMetadata;
    matchedRequirements: MatchResult[];
  }[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      setError('Please sign in to upload documents');
      return;
    }

    if (acceptedFiles.length > 10) {
      setError('You can upload up to 10 PDF files at once');
      return;
    }

    const manager = new DocumentManager();

    try {
      setError(null);
      setUploadProgress(0);
      setUploading(true);
      setShowResults(false);
      setExpandedReasons({});

      const token = await user.getIdToken();
      const documents = await manager.uploadDocuments(
        acceptedFiles, 
        user.uid, 
        token,
        (progress, status) => {
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}% - ${status}`);
        }
      );
      console.log('Raw documents from server:', JSON.stringify(documents, null, 2));
      
      // Transform the documents into the expected format
      const transformedResults = documents.map(doc => {
        console.log('Processing document:', JSON.stringify(doc, null, 2));
        
        // If the document has classifications, use those
        const matchedRequirements = doc.classifications && Array.isArray(doc.classifications) 
          ? doc.classifications.map((classification: any) => {
              console.log('Processing classification:', JSON.stringify(classification, null, 2));
              const details = classification.details || {};
              const metadata = details.metadata || {};
              const scores = details.scores || {};
              
              return {
                documentId: doc.id,
                requirementId: classification.requirementId || doc.id,
                score: classification.score || 0,
                confidence: classification.confidence || 'medium',
                isMatched: classification.isMatched || false,
                reason: metadata.rawMatchReason || classification.reason || 'No reason provided',
                threshold: metadata.threshold || 0.65,
                vectorScore: scores.vector || 0,
                aiScore: scores.ai || 0,
                requirement: metadata.requirementName || classification.requirementText || 'Unnamed Requirement',
                requirementName: metadata.requirementName || classification.requirementName || 'Unnamed Requirement',
                requirementDescription: metadata.requirementDescription || classification.requirementDescription || '',
                matchedContent: details.matchDetails || classification.matchDetails || []
              };
            })
          : [{
              documentId: doc.id,
              requirementId: doc.id,
              score: doc.score || 0,
              confidence: 'medium',
              isMatched: doc.isMatched || false,
              reason: 'No classifications available',
              threshold: 0.65,
              vectorScore: 0,
              aiScore: 0,
              requirement: 'No requirements available',
              requirementName: 'No requirements available',
              requirementDescription: '',
              matchedContent: []
            }];

        return {
          document: doc,
          matchedRequirements
        };
      });
      
      console.log('Transformed results:', JSON.stringify(transformedResults, null, 2));
      setUploadResults(transformedResults);
      onUploadComplete(documents);
      setShowResults(true);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  }, [user, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10 MB limit
    multiple: true // ✅ Allow multiple files
  });

  return (
    <div className="space-y-6">
      {/* Upload box */}
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop your PDF files here...</p>
        ) : (
          <p>Drag & drop PDF files here, or click to select</p>
        )}
        <p className="text-sm text-gray-500 mt-2">Up to 10 PDFs (max 10MB each)</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-2">Uploading... {uploadProgress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Results Dialog */}
      <Dialog
        open={showResults}
        onClose={() => setShowResults(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl rounded-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Document Analysis Results
            </Dialog.Title>

            {uploadResults && uploadResults.length > 0 && (
              <div className="space-y-4">
                {/* File selector for multiple files */}
                {uploadResults.length > 1 && (
                  <div className="mb-4">
                    <label htmlFor="file-selector" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Document
                    </label>
                    <select
                      id="file-selector"
                      value={selectedFileIndex}
                      onChange={(e) => setSelectedFileIndex(Number(e.target.value))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {uploadResults.map((result, index) => (
                        <option key={index} value={index}>
                          {result.document.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Current file results */}
                {uploadResults[selectedFileIndex] && (
                  <>
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Document Details</h3>
                      <p className="text-sm text-gray-500">
                        Filename: {uploadResults[selectedFileIndex].document.filename}
                      </p>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Requirement Matches</h3>
                      <div className="space-y-3">
                        {uploadResults[selectedFileIndex].matchedRequirements.map((match, index) => (
                          <div key={index} className="flex flex-col p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-start space-x-3">
                              {match.isMatched ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-grow">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">
                                      {match.requirementName || 'Unnamed Requirement'}
                                    </span>
                                    {match.requirementDescription && (
                                      <span className="text-xs text-gray-500">
                                        {match.requirementDescription}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    match.isMatched 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {match.isMatched ? 'Matched' : 'Not Matched'}
                                  </span>
                                </div>
                                
                                <div className="mt-2">
                                  <button
                                    onClick={() => {
                                      const newExpandedReasons = { ...expandedReasons };
                                      newExpandedReasons[index] = !newExpandedReasons[index];
                                      setExpandedReasons(newExpandedReasons);
                                    }}
                                    className="flex items-center text-sm font-medium text-gray-900 hover:text-indigo-600"
                                  >
                                    <span>Match Reason</span>
                                    <ChevronDownIcon
                                      className={`h-4 w-4 ml-1 transition-transform ${
                                        expandedReasons[index] ? 'transform rotate-180' : ''
                                      }`}
                                    />
                                  </button>
                                  {expandedReasons[index] && (
                                    <p className="text-sm text-gray-600 mt-1">{match.reason}</p>
                                  )}
                                </div>

                                {match.matchedContent && match.matchedContent.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-900">Matched Content:</p>
                                    <ul className="mt-1 space-y-1">
                                      {match.matchedContent.map((content, idx) => (
                                        <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                                          {content}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {(!match.matchedContent || match.matchedContent.length === 0) && match.isMatched && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <p className="text-sm text-yellow-800">
                                      ⚠️ Please verify the document to ensure it matches the requirement.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}