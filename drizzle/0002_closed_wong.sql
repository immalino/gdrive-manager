ALTER TABLE "upload_jobs" ADD COLUMN "resumable_uri" text;--> statement-breakpoint
ALTER TABLE "upload_jobs" ADD COLUMN "uploaded_bytes" bigint DEFAULT 0 NOT NULL;