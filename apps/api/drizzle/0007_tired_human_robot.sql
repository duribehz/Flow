CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_count_id" uuid,
	"replenishment_request_id" uuid,
	"content" text NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_single_parent_check" CHECK (num_nonnulls("comments"."inventory_count_id", "comments"."replenishment_request_id") = 1),
	CONSTRAINT "comments_content_length_check" CHECK (char_length("comments"."content") between 1 and 4000)
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_inventory_count_id_inventory_counts_id_fk" FOREIGN KEY ("inventory_count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_replenishment_request_id_replenishment_requests_id_fk" FOREIGN KEY ("replenishment_request_id") REFERENCES "public"."replenishment_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_inventory_count_created_at_idx" ON "comments" USING btree ("inventory_count_id","created_at","id");--> statement-breakpoint
CREATE INDEX "comments_replenishment_created_at_idx" ON "comments" USING btree ("replenishment_request_id","created_at","id");