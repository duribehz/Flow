CREATE TYPE "public"."user_role" AS ENUM('manager', 'admin', 'super_admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_branch_id_idx" ON "users" USING btree ("branch_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_branch_check" CHECK (("users"."role" = 'manager' and "users"."branch_id" is not null) or ("users"."role" <> 'manager' and "users"."branch_id" is null));