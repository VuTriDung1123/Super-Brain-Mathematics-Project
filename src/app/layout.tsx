import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Geist_Mono,
  Noto_Serif,
} from "next/font/google";
import GlobalToolbar from "@/components/GlobalToolbar";
import SakuraBackdrop from "@/components/SakuraBackdrop";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIÊU TRÍ TUỆ • 超頭脳道場 (The Brain Dojo)",
  description:
    "Đạo quán luyện tập tư duy toán học, trí nhớ, không gian 3D, mật mã và tốc độ phản xạ mang phong cách Nhật Bản cổ điển lấy cảm hứng từ chương trình Siêu Trí Tuệ.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} ${notoSerif.variable} ${geistMono.variable} antialiased bg-slate-950 text-[#f6efe4] overflow-x-hidden`}
      >
        <SakuraBackdrop />
        <GlobalToolbar />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
