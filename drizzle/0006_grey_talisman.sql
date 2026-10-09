CREATE TABLE "account_connect_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"connected_account_id" text,
	"connected_email" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_connect_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "account_connect_tokens" ADD CONSTRAINT "account_connect_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_connect_tokens" ADD CONSTRAINT "account_connect_tokens_connected_account_id_google_accounts_id_fk" FOREIGN KEY ("connected_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_connect_tokens_token_idx" ON "account_connect_tokens" USING btree ("token");