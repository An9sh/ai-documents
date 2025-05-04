// /lib/embedder.ts
import { OpenAIEmbeddings } from "@langchain/openai";

const openAIApiKey = process.env.OPENAI_API_KEY;

if (!openAIApiKey) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey,
  modelName: "text-embedding-ada-002", // Standard model for embeddings
  maxRetries: 3,
});

export const embedder = {
  async embed(text: string) {
    const result = await embeddings.embedQuery(text);
    return { values: result };
  }
};
