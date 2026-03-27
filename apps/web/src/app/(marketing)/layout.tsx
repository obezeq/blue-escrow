import { LenisProvider } from '@/providers/LenisProvider';
import { ThreeProvider } from '@/providers/ThreeProvider';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LenisProvider>
      <ThreeProvider>
        <main>{children}</main>
      </ThreeProvider>
    </LenisProvider>
  );
}
