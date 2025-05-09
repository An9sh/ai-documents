import { db } from '../../lib/db';
import { progress } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export async function createProgress(uploadId: string, userId: string, fileId: string) {
  const id = `${uploadId}-${fileId}`;
  return await db
    .insert(progress)
    .values({
      id,
      uploadId,
      userId,
      fileId,
      status: 'uploading',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: progress.id,
      set: {
        status: 'uploading',
        progress: 0,
        updatedAt: new Date()
      }
    });
}

export async function updateProgress(id: string, status: 'uploading' | 'processing' | 'completed' | 'error', progressValue: number) {
  return await db
    .update(progress)
    .set({
      status,
      progress: progressValue,
      updatedAt: new Date()
    })
    .where(eq(progress.id, id));
}

export async function getProgress(id: string) {
  return await db.query.progress.findFirst({
    where: eq(progress.id, id)
  });
}

export async function getUploadProgress(uploadId: string) {
  return await db.query.progress.findMany({
    where: eq(progress.uploadId, uploadId)
  });
} 