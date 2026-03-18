CREATE TYPE "public"."lead_status" AS ENUM('Pendente', 'Contatado');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"address" text,
	"website" text,
	"phone" text,
	"status" "lead_status" DEFAULT 'Pendente' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
