import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PantherTMS — Multi-Tenant Transport Management System",
  description: "Enterprise SaaS TMS for logistics companies: jobs, bookings, billing, and fleet operations.",
  icons: {
    icon: [
      { url: "/panther-logo-transparent.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/panther-logo-transparent.png",
    apple: "/panther-logo-transparent.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/panther-logo-transparent.png" type="image/png" />
        <link rel="shortcut icon" href="/panther-logo-transparent.png" type="image/png" />
        <link rel="apple-touch-icon" href="/panther-logo-transparent.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-[var(--color-bg)] text-slate-900 antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
