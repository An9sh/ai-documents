"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from "lucide-react";

interface ProgressIndicatorProps {
  uploadId: string;
  onComplete?: () => void;
}

export function ProgressIndicator({ uploadId, onComplete }: ProgressIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'uploading' | 'processing' | 'completed' | 'error'>('uploading');
  const [message, setMessage] = useState('Starting upload...');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload/progress/${uploadId}`);
        const data = await response.json();
        
        setProgress(data.progress);
        setStatus(data.status);
        setMessage(data.message);

        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(interval);
          if (data.status === 'completed' && onComplete) {
            onComplete();
          }
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [uploadId, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-6 py-12">
      {/* Spinner */}
      {status !== "completed" && status !== "error" && (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      )}
      
      {/* Status Message */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{message}</h2>
        <p className="text-sm text-gray-500 mt-2">
          {status === "completed"
            ? "Upload complete!"
            : status === "error"
            ? "Something went wrong. Please try again."
            : `Progress: ${progress}%`}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              status === "error" ? "bg-red-500" : "bg-indigo-600"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
