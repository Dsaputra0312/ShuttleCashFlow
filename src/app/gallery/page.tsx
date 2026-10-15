'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { Stepper } from '@/components/ui/Stepper';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';

export default function GalleryPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stepperValue, setStepperValue] = useState(3);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const { toasts, addToast, dismiss } = useToast();

  function toggleChip(id: string) {
    setSelectedChips((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[360px] space-y-8 p-4 bg-neutral-50">
      <h1 className="text-xl font-bold text-neutral-900">Galeri Komponen UI</h1>

      {/* Buttons */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Button</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Input</h2>
        <Input label="Email" type="email" placeholder="admin@example.com" />
        <Input label="With error" error="Field ini wajib diisi" placeholder="Masukkan nilai..." />
        <Input label="With hint" hint="Format: DD/MM/YYYY" placeholder="01/01/2024" />
      </section>

      {/* Card */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Card</h2>
        <Card>
          <CardHeader title="Pertemuan #12" subtitle="Selasa, 15 Juli 2025" />
          <p className="mt-2 text-sm text-neutral-600">10 pemain hadir · 2 tabung bola</p>
        </Card>
      </section>

      {/* Stepper */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Stepper</h2>
        <Stepper
          label="Jumlah pemain"
          value={stepperValue}
          onChange={setStepperValue}
          min={0}
          max={30}
        />
      </section>

      {/* Chips */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Chip</h2>
        <div className="flex flex-wrap gap-2">
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => (
            <Chip
              key={day}
              label={day}
              selected={selectedChips.includes(day)}
              onSelect={() => toggleChip(day)}
            />
          ))}
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Badge</h2>
        <div className="flex flex-wrap gap-2">
          <Badge label="Default" variant="default" />
          <Badge label="Aktif" variant="success" />
          <Badge label="Nonaktif" variant="danger" />
          <Badge label="Pending" variant="warning" />
          <Badge label="Info" variant="info" />
        </div>
      </section>

      {/* Toast */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Toast</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => addToast('Berhasil disimpan!', 'success')}>
            Success Toast
          </Button>
          <Button variant="secondary" size="sm" onClick={() => addToast('Terjadi kesalahan.', 'error')}>
            Error Toast
          </Button>
          <Button variant="secondary" size="sm" onClick={() => addToast('Perhatian!', 'warning')}>
            Warning Toast
          </Button>
        </div>
      </section>

      {/* BottomSheet */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">BottomSheet</h2>
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Buka BottomSheet
        </Button>
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Pilih Opsi"
        >
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">Konten bottom sheet di sini.</p>
            <Button variant="primary" className="w-full" onClick={() => setSheetOpen(false)}>
              Konfirmasi
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setSheetOpen(false)}>
              Batal
            </Button>
          </div>
        </BottomSheet>
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
