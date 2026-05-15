import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "일용직 근태 관리 시스템",
  description: "QR 코드 기반 출퇴근 관리 및 급여 조회 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="bg-background">
      <body>{children}</body>
    </html>
  );
}
