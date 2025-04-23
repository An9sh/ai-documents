ALTER TABLE "classifications" ALTER COLUMN "details" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "classifications" ADD COLUMN "matched_content" text[];