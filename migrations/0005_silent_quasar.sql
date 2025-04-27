CREATE TABLE "progress" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"status" varchar NOT NULL,
	"message" varchar(255) NOT NULL,
	"progress" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "progress_user_id_idx" ON "progress" USING btree ("user_id");