import { LenisProvider } from '@/providers/LenisProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SkipLink } from '@/components/layout/SkipLink';
import { ScrollProgressIndicator } from '@/components/ui/ScrollProgressIndicator';
import { ClientEnhancements } from '@/components/layout/ClientEnhancements';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LenisProvider>
      <SkipLink />
      <ScrollProgressIndicator />
      <Header />
      <ClientEnhancements />
      <main id="main-content">{children}</main>
      <Footer />
    </LenisProvider>
  );
}
