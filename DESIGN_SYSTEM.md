# ShuttleCashFlow Design System

> **Platform:** Next.js 16 (App Router) + TailwindCSS v4 + Lucide Icons  
> **Target Form Factor:** Mobile-first PWA / Web (Max container width: 430px)  
> **Typography:** Plus Jakarta Sans (`--font-sans`)

---

## 1. Color Palette & Tokens

### Primary / Brand Navy
- `--color-primary-900`: `#1B2A63` (Deep brand text & accents)
- `--color-primary-700`: `#28408F` (Primary action buttons, active states)
- `--color-primary-500`: `#4A62B3` (Sub-actions & hover states)
- `--color-primary-100`: `#E4E8F7` (Tonal badges, soft backgrounds)

### Accent Pink & Warm Backgrounds
- `--color-pink-500`: `#F29BA7` (Brand accent, FABs, highlights)
- `--color-pink-100`: `#FCE3E6` (Soft tint badges)
- `--color-peach-50`: `#FEF4F0` (Default page background canvas)
- `--color-peach-100`: `#FDEBE4` (Segmented controls, chips, cards)
- `--color-peach-200`: `#FBDDD3` (Borders & divider accents)

### Surfaces & Lines
- `--color-surface`: `#FFFFFF` (Card background, modals, sheets)
- `--color-line`: `#F1E4DE` (Card borders, dividers)

### Typography / Ink Colors
- `--color-ink-900`: `#1A1D3A` (Primary titles, headers, values)
- `--color-ink-600`: `#5B6178` (Body copy, secondary labels)
- `--color-ink-400`: `#9096AA` (Muted hints, timestamps, placeholders)

### Semantic Status Colors
- **Success / Mint**: `#1A9F6A` (Tonal: `#D6F4E6` / `#D1FAE5`) — Lunas, Pemasukan, Kuota Aman
- **Warning / Amber**: `#E27D14` (Tonal: `#FEF3C7` / `#FDE8D0`) — Sesi Sedang Main, Stok Menipis
- **Danger / Rose**: `#E5484D` (Tonal: `#FCE3E6` / `#FFE4E6`) — Pengeluaran, Tagihan Tertunggak, Hapus

---

## 2. Typography Scale (Mobile-Optimized Compact Scale)

| Token | Size | Line Height | Weight | Typical Usage |
|---|---|---|---|---|
| `display` | 28px | 34px | 800 | Big Dashboard Metrics |
| `title-lg`| 20px | 26px | 700 | Page Header & Section Title |
| `title`   | 17px | 23px | 700 | Modal / Sheet Title |
| `heading` | 14px | 20px | 600 | Card Title, Player Name |
| `body`    | 13px | 18px | 400 | Standard Labels, Form Inputs |
| `caption` | 11px | 15px | 500 | Badges, Helper Text, Chips |

---

## 3. Core UI Components

### 1. `CurrencyInput` (`src/components/ui/CurrencyInput.tsx`)
- Automatic Indonesian Rupiah thousands separator (`.` as separator).
- Clear `Rp` prefix badge.
- Quick-add chips (`+5.000`, `+10.000`, `+50.000`, `+100.000`).
- Clean numeric sanitation preventing `NaN` and negative inputs.

### 2. `PageHeader` (`src/components/ui/PageHeader.tsx`)
- Standard 56px sticky top bar with back navigation, page title, and action slot.

### 3. `Badge` (`src/components/ui/Badge.tsx`)
- Status variants: `aktif`, `terkunci`, `member`, `non-member`, `bermain`, `selesai`, `lunas`, `pemasukan`, `pengeluaran`.

### 4. `Tabs` (`src/components/ui/Tabs.tsx`)
- Variants:
  - `pill`: segmented container on `peach-100` background for filtering.
  - `underline`: clean navigation tabs with indicator border.

### 5. `BottomSheet` & `ConfirmDialog`
- Mobile-first slide-up sheet with gesture close, drag handle, and sticky bottom actions.

### 6. `RekapWhatsAppSheet` (`src/components/pertemuan/RekapWhatsAppSheet.tsx`)
- Dedicated sheet for previewing meeting summaries formatted for WhatsApp.
- 1-Tap "Kirim ke WA" direct link (`https://wa.me/?text=...`).
- 1-Tap "Salin Teks" with visual copy feedback.

---

## 4. Badminton Court Operations UX Rules

1. **High Contrast for Active Court Cards**: Active sessions (`bola_terpakai === 0`) must use a distinctive highlight border (`border-2 border-amber-400`) and pulsating `🟡 Sedang Main` badge to stand out in bright court lighting.
2. **Compact Player Cards**: In lists with 20+ members, cards should have compact height (~76px), inline status badges, and 2-row layouts to minimize vertical scrolling.
3. **Court-Side Bulk Actions**: Provide "Tandai Semua Lunas (Cash)" with a clear confirmation dialog for rapid post-game settlements.
4. **Currency Formatting**: Never display unformatted integers for financial numbers. Always use `formatRupiah(value)`.
