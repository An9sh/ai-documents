// /* eslint-disable import/no-extraneous-dependencies */
// /* eslint-disable dot-notation */
// import * as dotenv from "dotenv";
// import {
//   Pinecone,
//   type PineconeRecord,
//   type ServerlessSpecCloudEnum,
// } from "@pinecone-database/pinecone";
// import { getEnv, validateEnvironmentVariables } from "../../utils/util";
// import cliProgress from "cli-progress";
// import { Document } from "langchain/document";
// import * as dfd from "danfojs-node";
// import { embedder } from "../embeddings/route";
// import splitFile from "../../utils/fileSplitter";
// import type { ArticleRecord } from "../../types/types";
// import { chunkedUpsert } from "../../utils/chunkedUpsert";

// dotenv.config();
// validateEnvironmentVariables();

// const progressBar = new cliProgress.SingleBar(
//   {},
//   cliProgress.Presets.shades_classic
// );

// // Index setup
// const indexName = getEnv("PINECONE_INDEX");
// const indexCloud = getEnv("PINECONE_CLOUD") as ServerlessSpecCloudEnum;
// const indexRegion = getEnv("PINECONE_REGION");
// const pinecone = new Pinecone();

// async function getChunk(
//   df: dfd.DataFrame,
//   start: number,
//   size: number
// ): Promise<dfd.DataFrame> {
//   // eslint-disable-next-line no-return-await
//   return await df.head(start + size).tail(size);
// }

// async function* processInChunks<T, M extends keyof T, P extends keyof T>(
//   dataFrame: dfd.DataFrame,
//   chunkSize: number,
//   metadataFields: M[],
//   pageContentField: P
// ): AsyncGenerator<Document[]> {
//   for (let i = 0; i < dataFrame.shape[0]; i += chunkSize) {
//     const chunk = await getChunk(dataFrame, i, chunkSize);
//     const records = dfd.toJSON(chunk) as T[];
//     yield records.map((record: T) => {
//       const metadata: Partial<Record<M, T[M]>> = {};
//       for (const field of metadataFields) {
//         metadata[field] = record[field];
//       }
//       return new Document({
//         pageContent: record[pageContentField] as string,
//         metadata,
//       });
//     });
//   }
// }

// async function embedAndUpsert(dataFrame: dfd.DataFrame, chunkSize: number) {
//   const chunkGenerator = processInChunks<
//     ArticleRecord,
//     "category" | "classification" | "title" | "description" | "requirements",
//     "content"
//   >(
//     dataFrame,
//     chunkSize,
//     ["category", "classification", "title", "description", "requirements"],
//   );
//   const index = pinecone.index(indexName);

//   for await (const documents of chunkGenerator) {
//     await embedder.embedBatch(
//       documents,
//       chunkSize,
//       async (embeddings: PineconeRecord[]) => {
//         await chunkedUpsert(index, embeddings, "default");
//         progressBar.increment(embeddings.length);
//       }
//     );
//   }
// }

// try {
//   const fileParts = await splitFile("./data/all-the-news-2-1.csv", 100000);
//   const firstFile = fileParts[0];

//   // For this example, we will use the first file part to create the index
//   const data = await loadCSVFile(firstFile);
//   const clean = data.dropNa() as dfd.DataFrame;
//   clean.head().print();

//   // Create the index if it doesn't already exist
//   const indexList = await pinecone.listIndexes();
//   if (!indexList.indexes?.some((index) => index.name === indexName)) {
//     await pinecone.createIndex({
//       name: indexName,
//       dimension: 384,
//       spec: { serverless: { region: indexRegion, cloud: indexCloud } },
//       waitUntilReady: true,
//     });
//   }

//   progressBar.start(clean.shape[0], 0);
//   await embedder.init("Xenova/all-MiniLM-L6-v2");
//   await embedAndUpsert(clean, 1);
//   progressBar.stop();
//   console.log(
//     `Inserted ${progressBar.getTotal()} documents into index ${indexName}`
//   );
// } catch (error) {
//   console.error(error);
// }
