import Link from 'next/link';

interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  {
    href: '/lainnya/konfigurasi',
    label: 'Konfigurasi',
    description: 'Atur harga bola, iuran, dan biaya lapangan',
    icon: '⚙️',
  },
  {
    href: '/lainnya/admin',
    label: 'Admin',
    description: 'Kelola akun admin grup',
    icon: '👥',
  },
  {
    href: '/lainnya/kategori-kas',
    label: 'Kategori Kas',
    description: 'Atur kategori pemasukan dan pengeluaran',
    icon: '🗂️',
  },
  {
    href: '/lainnya/log',
    label: 'Log Aktivitas',
    description: 'Riwayat perubahan data oleh admin',
    icon: '📋',
  },
  {
    href: '/lainnya/ubah-kata-sandi',
    label: 'Ubah Kata Sandi',
    description: 'Ganti password akun Anda',
    icon: '🔑',
  },
  {
    href: '/lainnya/stok',
    label: 'Stok Bola',
    description: 'Kelola stok dan pembelian bola',
    icon: '🏸',
  },
];

export default function LainnyaPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Lainnya</h1>

      <nav aria-label="Menu lainnya">
        <ul className="flex flex-col gap-3">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-4 bg-white rounded-xl border border-neutral-200 shadow-sm p-4 min-h-[44px] active:bg-neutral-50"
              >
                <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">{item.label}</p>
                  <p className="text-sm text-neutral-500 mt-0.5">{item.description}</p>
                </div>
                <span className="text-neutral-400 text-lg" aria-hidden="true">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
