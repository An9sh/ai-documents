ALTER TABLE "classifications" ALTER COLUMN "is_primary" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "classifications" ALTER COLUMN "is_secondary" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "classifications" ALTER COLUMN "is_matched" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "classifications" ADD COLUMN "user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "classifications" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "classifications" ADD CONSTRAINT "classifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "classifications_document_requirement_uniq" ON "classifications" USING btree ("document_id","requirement_id");