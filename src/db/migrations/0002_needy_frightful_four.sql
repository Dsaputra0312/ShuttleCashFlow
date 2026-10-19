ALTER TABLE "iuran" ADD COLUMN "status" text DEFAULT 'lunas' NOT NULL;--> statement-breakpoint
ALTER TABLE "iuran" ADD COLUMN "dibayar_pada" timestamp with time zone;