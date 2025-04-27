import { db } from '../db';
import { progress } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export async function createProgress(uploadId: string, userId: string) {
  return await db.insert(progress).values({
    id: uploadId,
    userId,
    status: 'uploading',
    message: 'Starting upload...',
    progress: 0
  });
}

export async function updateProgress(uploadId: string, data: {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
}) {
  return await db
    .update(progress)
    .set({
      status: data.status,
      message: data.message,
      progress: data.progress
    })
    .where(eq(progress.id, uploadId));
}

export async function getProgress(uploadId: string) {
  const result = await db
    .select()
    .from(progress)
    .where(eq(progress.id, uploadId))
    .limit(1);
  
  return result[0] || null;
} 