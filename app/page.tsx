"use client";

import { useState, useEffect } from "react";
import { DocumentMetadata } from "../app/types";
import { ThemeToggle } from "../components/theme-toggle";
import { ClassificationRequirement, ParsedResume } from './types/resume';
// import { UploadSection } from './components/upload-section';
import { ClassificationSection } from './components/classification-section';
import { MatchAPI } from './api/match';
import { useRouter } from 'next/navigation';
import { signIn, signInWithGoogle } from '../lib/firebase';
import { ensureUserExists } from '../app/lib/db/users';

// Constants
const REQUIREMENTS_STORAGE_KEY = 'resume-filtering-requirements';

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentMetadata[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [requirements, setRequirements] = useState<ClassificationRequirement[]>([]);
  const [groupedResumes, setGroupedResumes] = useState<Map<string, ParsedResume[]>>(new Map());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  // const handleSyncClassification = async (requirement: ClassificationRequirement) => {
  //   try {
  //     const updatedResumes = await MatchAPI.syncClassification(documents, requirement);
  //     console.log('Updated resumes:', updatedResumes);
      
  //     const newGroupedResumes = new Map(groupedResumes);
  //     newGroupedResumes.set(requirement.id, updatedResumes);
  //     setGroupedResumes(newGroupedResumes);
  //   } catch (error) {
  //     console.error('Error syncing classification:', error);
  //   }
  // };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        // Ensure user exists in database
        await ensureUserExists(user.uid, user.email || '', user.displayName || undefined);
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Document Classifier
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your documents and classifications
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSignIn}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
