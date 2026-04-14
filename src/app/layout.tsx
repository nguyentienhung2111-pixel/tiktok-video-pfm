import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TikTok Video Performance - DECOCO",
  description: "Web app nội bộ giúp DECOCO theo dõi và phân tích hiệu suất video TikTok Shop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-[260px] flex-1 flex flex-col min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
