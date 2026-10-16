CREATE TYPE "public"."status_main" AS ENUM('bermain', 'selesai', 'lunas');--> statement-breakpoint
CREATE TABLE "pertemuan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"konfigurasi_snapshot" jsonb NOT NULL,
	"terkunci" boolean DEFAULT false NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"diperbarui_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peserta_pertemuan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pertemuan_id" uuid NOT NULL,
	"pemain_id" uuid NOT NULL,
	"grup_id" uuid NOT NULL,
	"status_main" "status_main" DEFAULT 'bermain' NOT NULL,
	"tagihan" integer DEFAULT 0 NOT NULL,
	"dibayar" integer DEFAULT 0 NOT NULL,
	"metode_bayar" text,
	"selesai_pada" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sesi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pertemuan_id" uuid NOT NULL,
	"grup_id" uuid NOT NULL,
	"lapangan" smallint NOT NULL,
	"bola_terpakai" smallint NOT NULL,
	"ditanggung_oleh_pemain_id" uuid,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesi_pemain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sesi_id" uuid NOT NULL,
	"pemain_id" uuid NOT NULL,
	"grup_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iuran" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"pemain_id" uuid NOT NULL,
	"periode_tahun" smallint NOT NULL,
	"periode_bulan" smallint NOT NULL,
	"nominal" integer NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "iuran_unique_per_periode" UNIQUE("grup_id","pemain_id","periode_tahun","periode_bulan")
);
--> statement-breakpoint
CREATE TABLE "koreksi_stok" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"jumlah" integer NOT NULL,
	"alasan" text NOT NULL,
	"dibuat_oleh_admin_id" uuid,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pembelian_bola" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"jumlah_tabung" smallint NOT NULL,
	"isi_per_tabung" smallint NOT NULL,
	"harga_total" integer NOT NULL,
	"transaksi_kas_id" uuid,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaksi_kas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grup_id" uuid NOT NULL,
	"kategori_id" uuid,
	"nominal" integer NOT NULL,
	"tipe" text NOT NULL,
	"keterangan" text NOT NULL,
	"referensi_tipe" text,
	"referensi_id" text,
	"pertemuan_id" uuid,
	"dapat_diubah" boolean DEFAULT true NOT NULL,
	"dibuat_pada" timestamp with time zone DEFAULT now() NOT NULL,
	"dibuat_oleh_admin_id" uuid
);
--> statement-breakpoint
ALTER TABLE "pertemuan" ADD CONSTRAINT "pertemuan_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peserta_pertemuan" ADD CONSTRAINT "peserta_pertemuan_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peserta_pertemuan" ADD CONSTRAINT "peserta_pertemuan_pemain_id_pemain_id_fk" FOREIGN KEY ("pemain_id") REFERENCES "public"."pemain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peserta_pertemuan" ADD CONSTRAINT "peserta_pertemuan_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi" ADD CONSTRAINT "sesi_ditanggung_oleh_pemain_id_pemain_id_fk" FOREIGN KEY ("ditanggung_oleh_pemain_id") REFERENCES "public"."pemain"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi_pemain" ADD CONSTRAINT "sesi_pemain_sesi_id_sesi_id_fk" FOREIGN KEY ("sesi_id") REFERENCES "public"."sesi"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi_pemain" ADD CONSTRAINT "sesi_pemain_pemain_id_pemain_id_fk" FOREIGN KEY ("pemain_id") REFERENCES "public"."pemain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesi_pemain" ADD CONSTRAINT "sesi_pemain_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iuran" ADD CONSTRAINT "iuran_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iuran" ADD CONSTRAINT "iuran_pemain_id_pemain_id_fk" FOREIGN KEY ("pemain_id") REFERENCES "public"."pemain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "koreksi_stok" ADD CONSTRAINT "koreksi_stok_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "koreksi_stok" ADD CONSTRAINT "koreksi_stok_dibuat_oleh_admin_id_admin_id_fk" FOREIGN KEY ("dibuat_oleh_admin_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembelian_bola" ADD CONSTRAINT "pembelian_bola_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pembelian_bola" ADD CONSTRAINT "pembelian_bola_transaksi_kas_id_transaksi_kas_id_fk" FOREIGN KEY ("transaksi_kas_id") REFERENCES "public"."transaksi_kas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_kas" ADD CONSTRAINT "transaksi_kas_grup_id_grup_id_fk" FOREIGN KEY ("grup_id") REFERENCES "public"."grup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_kas" ADD CONSTRAINT "transaksi_kas_kategori_id_kategori_kas_id_fk" FOREIGN KEY ("kategori_id") REFERENCES "public"."kategori_kas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_kas" ADD CONSTRAINT "transaksi_kas_pertemuan_id_pertemuan_id_fk" FOREIGN KEY ("pertemuan_id") REFERENCES "public"."pertemuan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_kas" ADD CONSTRAINT "transaksi_kas_dibuat_oleh_admin_id_admin_id_fk" FOREIGN KEY ("dibuat_oleh_admin_id") REFERENCES "public"."admin"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pertemuan_grup_id_idx" ON "pertemuan" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "pertemuan_tanggal_idx" ON "pertemuan" USING btree ("tanggal");--> statement-breakpoint
CREATE INDEX "pertemuan_grup_tanggal_idx" ON "pertemuan" USING btree ("grup_id","tanggal");--> statement-breakpoint
CREATE INDEX "peserta_pertemuan_grup_id_idx" ON "peserta_pertemuan" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "peserta_pertemuan_pertemuan_id_idx" ON "peserta_pertemuan" USING btree ("pertemuan_id");--> statement-breakpoint
CREATE INDEX "peserta_pertemuan_pemain_id_idx" ON "peserta_pertemuan" USING btree ("pemain_id");--> statement-breakpoint
CREATE INDEX "peserta_pertemuan_grup_pemain_idx" ON "peserta_pertemuan" USING btree ("grup_id","pemain_id");--> statement-breakpoint
CREATE INDEX "sesi_grup_id_idx" ON "sesi" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "sesi_pertemuan_id_idx" ON "sesi" USING btree ("pertemuan_id");--> statement-breakpoint
CREATE INDEX "sesi_pemain_grup_id_idx" ON "sesi_pemain" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "sesi_pemain_sesi_id_idx" ON "sesi_pemain" USING btree ("sesi_id");--> statement-breakpoint
CREATE INDEX "sesi_pemain_pemain_id_idx" ON "sesi_pemain" USING btree ("pemain_id");--> statement-breakpoint
CREATE INDEX "sesi_pemain_grup_pemain_idx" ON "sesi_pemain" USING btree ("grup_id","pemain_id");--> statement-breakpoint
CREATE INDEX "iuran_grup_id_idx" ON "iuran" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "iuran_pemain_id_idx" ON "iuran" USING btree ("pemain_id");--> statement-breakpoint
CREATE INDEX "iuran_grup_pemain_idx" ON "iuran" USING btree ("grup_id","pemain_id");--> statement-breakpoint
CREATE INDEX "koreksi_stok_grup_id_idx" ON "koreksi_stok" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "pembelian_bola_grup_id_idx" ON "pembelian_bola" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "transaksi_kas_grup_id_idx" ON "transaksi_kas" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "transaksi_kas_pertemuan_id_idx" ON "transaksi_kas" USING btree ("pertemuan_id");--> statement-breakpoint
CREATE INDEX "transaksi_kas_grup_dibuat_pada_idx" ON "transaksi_kas" USING btree ("grup_id","dibuat_pada");--> statement-breakpoint
CREATE INDEX "log_aktivitas_grup_id_idx" ON "log_aktivitas" USING btree ("grup_id");--> statement-breakpoint
CREATE INDEX "log_aktivitas_grup_dibuat_pada_idx" ON "log_aktivitas" USING btree ("grup_id","dibuat_pada");