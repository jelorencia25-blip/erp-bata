export const dynamic = 'force-dynamic';

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// ... rest of your existing code stays the same

import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
