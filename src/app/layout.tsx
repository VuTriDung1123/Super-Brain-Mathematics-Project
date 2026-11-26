import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalToolbar from "@/components/GlobalToolbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIÊU TRÍ TUỆ • The Brain Training Center",
  description:
    "Nền tảng luyện tập tư duy toán học, trí nhớ, không gian 3D, mật mã và tốc độ phản xạ lấy cảm hứng từ chương trình Siêu Trí Tuệ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-white`}
      >
        <GlobalToolbar />
        {children}
      </body>
    </html>
  );
}
