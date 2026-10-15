CREATE TYPE "public"."tipe_kas" AS ENUM('pemasukan', 'pengeluaran');--> statement-breakpoint
CREATE TABLE "admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"kode_unik" text NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grup_kode_unik_unique" UNIQUE("kode_unik")
);
--> statement-breakpoint
CREATE TABLE "grup_admin" (
	"grup_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"peran" text DEFAULT 'member' NOT NULL,
	CONSTRAINT "grup_admin_grup_id_admin_id_pk" PRIMARY KEY("grup_id","admin_id")
);
--> statement-breakpoint
CREATE TABLE "sesi_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"grup_id" uuid NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"kedaluwarsa_pada" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kategori_kas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"tipe" "tipe_kas" NOT NULL,
	"adalah_sistem" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "konfigurasi_grup" (
	"grup_id" uuid PRIMARY KEY NOT NULL,
	"harga_bola_per_biji" integer DEFAULT 5000 NOT NULL,
	"isi_per_tabung" integer DEFAULT 12 NOT NULL,
	"biaya_lapangan_non_member" integer DEFAULT 10000 NOT NULL,
	"iuran_bulanan" integer DEFAULT 50000 NOT NULL,
	"kelipatan_pembulatan" integer DEFAULT 1000 NOT NULL,
	"hari_main" jsonb DEFAULT '[2,5]'::jsonb NOT NULL,
	"biaya_sewa_default" integer DEFAULT 100000 NOT NULL,
	"stok_awal" integer DEFAULT 0 NOT NULL,
	"diperbarui_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_aktivitas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"admin_id" uuid,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text,
	"detail" jsonb,
	"alasan" text,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pemain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"no_hp" text,
	"catatan" text,
	"bebas_biaya" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diperbarui_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin" ADD CONSTRAINT "admin_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grup_admin" ADD CONSTRAINT "grup_admin_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grup_admin" ADD CONSTRAINT "grup_admin_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi_admin" ADD CONSTRAINT "sesi_admin_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi_admin" ADD CONSTRAINT "sesi_admin_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kategori_kas" ADD CONSTRAINT "kategori_kas_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konfigurasi_grup" ADD CONSTRAINT "konfigurasi_grup_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pemain" ADD CONSTRAINT "pemain_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;