import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "จัดการหนังสือ",
  description: "Next.js CRUD boilerplate with Prisma and SQLite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        {children}
      </body>
    </html>
  );
}
