CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_status" (
	"id" text PRIMARY KEY DEFAULT 'worker-main' NOT NULL,
	"service" text DEFAULT 'background-worker' NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limits_key_ts_idx" ON "rate_limits" USING btree ("key","timestamp");