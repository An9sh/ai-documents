import { pgTable as table } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

export const users = table(
  "users",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    email: t.varchar("email", { length: 255 }).notNull(),
    name: t.varchar("name", { length: 256 }),
    createdAt: t.timestamp("created_at").defaultNow(),
  },
  (table) => [
    t.uniqueIndex("users_email_idx").on(table.email)
  ]
);

export const categories = table(
  "categories",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    userId: t.varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    name: t.varchar("name", { length: 255 }).notNull(),
    color: t.varchar("color", { length: 50 }).notNull(),
    threshold: t.integer("threshold").notNull(),
    isCustom: t.boolean("is_custom").notNull().default(true),
    createdAt: t.timestamp("created_at").notNull().defaultNow(),
    updatedAt: t.timestamp("updated_at").defaultNow(),
  },
  (table) => [
    t.index("categories_user_id_idx").on(table.userId)
  ]
);

export const documents = table(
  "documents",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    pineconeId: t.varchar("pinecone_id", { length: 255 }),
    userId: t.varchar("user_id", { length: 255 }).references(() => users.id),
    filename: t.varchar("filename", { length: 255 }).notNull(),
    fileKey: t.varchar("file_key", { length: 255 }).notNull(),
    type: t.varchar("type", { length: 100 }).notNull(),
    uploadedAt: t.timestamp("uploaded_at").defaultNow(),
    size: t.integer("size").notNull(),
    mimeType: t.varchar("mime_type", { length: 100 }).notNull(),
    summary: t.text("summary"),
    pageCount: t.integer("page_count"),
    namespace: t.varchar("namespace", { length: 100 }),
  },
  (table) => [
    t.index("documents_user_id_idx").on(table.userId),
    t.index("documents_pinecone_id_idx").on(table.pineconeId)
  ]
);

export const requirements = table(
  "requirements",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    userId: t.varchar("user_id", { length: 255 }).notNull().references(() => users.id),
    name: t.varchar("name", { length: 255 }).notNull(),
    description: t.text("description"),
    category: t.varchar("category", { length: 50 }).notNull(),
    color: t.varchar("color", { length: 50 }),
    matchThreshold: t.integer("match_threshold").notNull(),
    requirements: t.text("requirements").array(),
    createdAt: t.timestamp("created_at").defaultNow(),
  },
  (table) => [
    t.index("requirements_user_id_idx").on(table.userId)
  ]
);

export const classifications = table(
  "classifications",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    documentId: t.varchar("document_id", { length: 255 }).references(() => documents.id),
    requirementId: t.varchar("requirement_id", { length: 255 }).references(() => requirements.id),
    userId: t.varchar("user_id", { length: 255 }).references(() => users.id),
    score: t.integer("score").notNull(),
    confidence: t.integer("confidence").notNull(),
    isPrimary: t.boolean("is_primary").notNull().default(false),
    isSecondary: t.boolean("is_secondary").notNull().default(false),
    isMatched: t.boolean("is_matched").notNull().default(false),
    details: t.jsonb("details").notNull().default({}),
    matchedContent: t.text("matched_content").array(),
    createdAt: t.timestamp("created_at").defaultNow(),
    updatedAt: t.timestamp("updated_at").defaultNow(),
  },
  (table) => [
    t.index("classifications_document_id_idx").on(table.documentId),
    t.index("classifications_requirement_id_idx").on(table.requirementId),
    t.uniqueIndex("classifications_document_requirement_uniq").on(table.documentId, table.requirementId)
  ]
);

export const documentMatches = table(
  "document_matches",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    documentId: t.varchar("document_id", { length: 255 }).references(() => documents.id),
    requirementId: t.varchar("requirement_id", { length: 255 }).references(() => requirements.id),
    classificationId: t.varchar("classification_id", { length: 255 }).references(() => classifications.id),
    matchPercentage: t.integer("match_percentage").notNull(),
    confidence: t.integer("confidence").notNull(),
    matchedAt: t.timestamp("matched_at").defaultNow(),
    matchedRequirements: t.text("matched_requirements").array(),
    rawMatchReason: t.text("raw_match_reason"),
    isMatched: t.boolean("is_matched").notNull(),
    updatedAt: t.timestamp("updated_at").defaultNow(),
  },
  (table) => [
    t.index("document_matches_document_id_idx").on(table.documentId),
    t.index("document_matches_classification_id_idx").on(table.classificationId)
  ]
);

export const progress = table(
  "progress",
  {
    id: t.varchar("id", { length: 255 }).primaryKey(),
    uploadId: t.varchar("upload_id", { length: 255 }).notNull(),
    fileId: t.varchar("file_id", { length: 255 }).notNull(),
    userId: t.varchar("user_id", { length: 255 }).notNull(),
    status: t.varchar("status", { enum: ['uploading', 'processing', 'completed', 'error'] }).notNull(),
    progress: t.integer("progress").notNull().default(0),
    createdAt: t.timestamp("created_at").defaultNow(),
    updatedAt: t.timestamp("updated_at").defaultNow(),
  },
  (table) => [
    t.index("progress_user_id_idx").on(table.userId)
  ]
); 