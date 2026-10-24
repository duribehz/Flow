CREATE TABLE "replenishment_request_counters" (
	"branch_id_prefix" text PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
