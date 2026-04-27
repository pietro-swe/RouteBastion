CREATE TYPE "public"."cargo_kind" AS ENUM('bulk_cargo', 'containerized_cargo', 'refrigerated_cargo', 'dry_cargo', 'alive_cargo', 'dangerous_cargo', 'fragile_cargo', 'indivisible_and_exceptional_cargo', 'vehicle_cargo');--> statement-breakpoint
CREATE TYPE "public"."communication_method" AS ENUM('http', 'protocol_buffers');--> statement-breakpoint
CREATE TYPE "public"."constraint_kind" AS ENUM('budget', 'availability', 'performance', 'security', 'feature');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"revoked_at" timestamp DEFAULT NULL,
	"last_used_at" timestamp DEFAULT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" "constraint_kind" NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT NULL,
	"deleted_at" timestamp DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"business_identifier" text NOT NULL,
	"contact_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT NULL,
	"deleted_at" timestamp DEFAULT NULL,
	CONSTRAINT "customers_business_identifier_unique" UNIQUE("business_identifier")
);
--> statement-breakpoint
CREATE TABLE "providers_access_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"communication_method" "communication_method" NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT NULL,
	"deleted_at" timestamp DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE "providers_constraints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"max_waypoints_per_request" integer NOT NULL,
	"modified_at" timestamp DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE "providers_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"supports_async_operations" boolean NOT NULL,
	"modified_at" timestamp DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"birth_date" timestamp NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT NULL,
	"deleted_at" timestamp DEFAULT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"plate" text NOT NULL,
	"capacity" double precision NOT NULL,
	"cargo_type" "cargo_kind" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"modified_at" timestamp DEFAULT NULL,
	"deleted_at" timestamp DEFAULT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constraints" ADD CONSTRAINT "constraints_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers_access_methods" ADD CONSTRAINT "providers_access_methods_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers_constraints" ADD CONSTRAINT "providers_constraints_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers_features" ADD CONSTRAINT "providers_features_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_customer_id" ON "api_keys" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_customer_id_created_at_desc_active" ON "api_keys" USING btree ("customer_id","created_at" DESC NULLS LAST) WHERE "api_keys"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "idx_constraints_customer_id" ON "constraints" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_constraints_customer_id_kind" ON "constraints" USING btree ("customer_id","kind");--> statement-breakpoint
CREATE INDEX "idx_constraints_active" ON "constraints" USING btree ("customer_id") WHERE "constraints"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_provider_access_methods_provider_id" ON "providers_access_methods" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_constraints_provider_id" ON "providers_constraints" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_provider_features_provider_id" ON "providers_features" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_providers_active" ON "providers" USING btree ("id") WHERE "providers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_vehicles_customer_id" ON "vehicles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_plate" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_vehicles_customer_id_plate" ON "vehicles" USING btree ("customer_id","plate");