import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TikTok Video Performance - DECOCO",
  description: "Web app nTi bT giAp DECOCO theo dAi vA phAn tA-ch hiu sut video TikTok Shop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
