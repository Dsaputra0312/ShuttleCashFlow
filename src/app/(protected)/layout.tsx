import { BottomNav } from '@/components/layout/BottomNav';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-neutral-50">
      <main className="pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
