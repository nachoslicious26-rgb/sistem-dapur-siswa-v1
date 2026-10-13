import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem Tempahan Dapur Siswa Madani - KHAR UPSI",
  description: "Sistem Tempahan Dapur Siswa Madani Kolej Harun Aminurrashid (KHAR), UPSI",
  icons: {
    icon: "/logo-khar.png", // Boleh tukar ke '/logo-dapur-siswa.jpg' jika mahu logo dapur
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body className={inter.className}>{children}</body>
    </html>
  );
}