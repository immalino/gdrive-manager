CREATE TABLE "shared_roots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"primary_account_id" text NOT NULL,
	"drive_folder_id" text NOT NULL,
	"folder_name" text DEFAULT 'GDrive Pool' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"shared_root_id" text NOT NULL,
	"google_account_id" text NOT NULL,
	"drive_permission_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "role" text DEFAULT 'pool' NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_roots" ADD CONSTRAINT "shared_roots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_roots" ADD CONSTRAINT "shared_roots_primary_account_id_google_accounts_id_fk" FOREIGN KEY ("primary_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_permissions" ADD CONSTRAINT "shared_permissions_shared_root_id_shared_roots_id_fk" FOREIGN KEY ("shared_root_id") REFERENCES "public"."shared_roots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_permissions" ADD CONSTRAINT "shared_permissions_google_account_id_google_accounts_id_fk" FOREIGN KEY ("google_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shared_permissions_root_idx" ON "shared_permissions" USING btree ("shared_root_id");