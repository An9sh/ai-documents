CREATE TABLE "categories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(50) NOT NULL,
	"threshold" integer NOT NULL,
	"is_custom" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classifications" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"document_id" varchar(255),
	"requirement_id" varchar(255),
	"score" integer NOT NULL,
	"confidence" integer NOT NULL,
	"is_primary" boolean NOT NULL,
	"is_secondary" boolean NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_matches" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"document_id" varchar(255),
	"classification_id" varchar(255),
	"match_percentage" integer NOT NULL,
	"confidence" integer NOT NULL,
	"matched_at" timestamp DEFAULT now(),
	"matched_requirements" text[],
	"raw_match_reason" text,
	"is_matched" boolean NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"pinecone_id" varchar(255),
	"user_id" varchar(255),
	"filename" varchar(255) NOT NULL,
	"file_key" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"summary" text,
	"page_count" integer,
	"namespace" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "requirements" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"color" varchar(50),
	"match_threshold" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(256),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_requirement_id_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_matches" ADD CONSTRAINT "document_matches_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_matches" ADD CONSTRAINT "document_matches_classification_id_classifications_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."classifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "classifications_document_id_idx" ON "classifications" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "classifications_requirement_id_idx" ON "classifications" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "document_matches_document_id_idx" ON "document_matches" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_matches_classification_id_idx" ON "document_matches" USING btree ("classification_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_pinecone_id_idx" ON "documents" USING btree ("pinecone_id");--> statement-breakpoint
CREATE INDEX "requirements_user_id_idx" ON "requirements" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");