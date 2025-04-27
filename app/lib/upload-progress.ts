import { updateProgress } from './db/progress';

export async function sendProgressUpdate(uploadId: string, data: {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
}) {
  try {
    await updateProgress(uploadId, data);
  } catch (error) {
    console.error('Error updating progress:', error);
  }
} 