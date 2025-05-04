import { NextResponse } from "next/server";
import { DocumentAnalyzer } from "../../lib/services/DocumentAnalyzer";

export async function POST(req: Request) {
  try {
    const { question, documentIds, userId, requirement } = await req.json();

    const analyzer = await DocumentAnalyzer.init();
    const result = await analyzer.analyze(question, userId, documentIds, requirement);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return new Response("Failed to analyze document", { status: 500 });
  }
}
