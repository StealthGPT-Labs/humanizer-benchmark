import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Humanizer Benchmark · Private workspace',
  description: 'Private setup workspace for the next humanizer comparison.',
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
