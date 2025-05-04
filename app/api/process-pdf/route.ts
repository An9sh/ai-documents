import { NextResponse } from 'next/server';
import { DocumentProcessor } from '../../lib/services/document-processor';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 });
    }

    const documentId = crypto.randomUUID();
    await DocumentProcessor.processDocument(file, userId, documentId);

    return NextResponse.json({ success: true, documentId });
  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
  }
} 