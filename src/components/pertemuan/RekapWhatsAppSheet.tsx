'use client';

import React, { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { ToastContainer } from '@/components/ui/Toast';

interface RekapWhatsAppSheetProps {
  open: boolean;
  onClose: () => void;
  teks: string;
  loading?: boolean;
}

/**
 * BottomSheet to preview and share WhatsApp meeting recap directly to WhatsApp or clipboard.
 */
export function RekapWhatsAppSheet({
  open,
  onClose,
  teks,
  loading = false,
}: RekapWhatsAppSheetProps) {
  const { toasts, addToast, dismiss } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(teks);
      setCopied(true);
      addToast('Teks rekap berhasil disalin!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Gagal menyalin teks', 'error');
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(teks);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Rekap Pertemuan WhatsApp"
        stickyBottom={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="flex-1 !h-11 font-semibold"
              disabled={loading || !teks}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-icon-mint" />
                  Disalin!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Salin Teks
                </>
              )}
            </Button>
            <Button
              variant="primary"
              onClick={handleOpenWhatsApp}
              className="flex-1 !h-11 font-bold !bg-emerald-600 hover:!bg-emerald-700 !text-white"
              disabled={loading || !teks}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Kirim ke WA
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-caption text-ink-500">
            <span>Pratinjau pesan WhatsApp:</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Format Siap Kirim
            </span>
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl bg-peach-100 animate-pulse flex items-center justify-center text-ink-400 text-caption">
              Menyiapkan rekap WhatsApp...
            </div>
          ) : (
            <div className="relative rounded-2xl border border-emerald-200/70 bg-emerald-50/30 p-4 font-mono text-xs whitespace-pre-wrap text-ink-900 leading-relaxed max-h-[50vh] overflow-y-auto select-all shadow-inner">
              {teks || 'Belum ada data rekap untuk pertemuan ini.'}
            </div>
          )}

          <p className="text-[11px] text-ink-400 text-center">
            Tekan <strong>Kirim ke WA</strong> untuk langsung membuka aplikasi WhatsApp dan memilih grup mabar.
          </p>
        </div>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
