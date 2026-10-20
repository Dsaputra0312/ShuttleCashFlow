import { AppShell } from '@/components/ui/AppShell';
import { BottomNav } from '@/components/layout/BottomNav';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <main>{children}</main>
      <BottomNav />
    </AppShell>
  );
}
