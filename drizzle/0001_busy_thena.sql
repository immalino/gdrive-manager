CREATE TABLE "drive_files" (
	"id" text PRIMARY KEY NOT NULL,
	"google_account_id" text NOT NULL,
	"drive_file_id" text NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"size_bytes" bigint,
	"modified_at" timestamp with time zone,
	"parent_id" text,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_google_account_id_google_accounts_id_fk" FOREIGN KEY ("google_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drive_files_account_file_uq" ON "drive_files" USING btree ("google_account_id","drive_file_id");--> statement-breakpoint
CREATE INDEX "drive_files_kind_idx" ON "drive_files" USING btree ("kind");