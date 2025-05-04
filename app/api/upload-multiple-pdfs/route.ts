import { NextResponse } from "next/server";
import { DocumentManager } from "../../lib/DocumentManager";

export async function POST(req: Request) {
  const manager = new DocumentManager();
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const userId = formData.get("userId") as string;
    const token = formData.get("token") as string;

    if (!files.length || !userId || !token) {
      return new Response("Missing files, userId, or token", { status: 400 });
    }

    const documents = await manager.uploadDocuments(files, userId, token);
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response("Failed to upload documents", { status: 500 });
  }
}
