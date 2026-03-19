import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PM Advisory Board',
  description: 'Search 312+ product leader interviews from Lenny\'s Podcast. Real quotes, real wisdom, zero AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f]">{children}</body>
    </html>
  );
}
