// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

// NavBar(클라이언트 컴포넌트) import
import NavBar from "./NavBar";

export const metadata: Metadata = {
  title: "YK 쉐마고등마을 사순절",
  description: "사순절 40일 동안 매일 다른 말씀으로 인증!",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-800">
        {/* (1) 전역 네비게이션 바 */}
        <NavBar />

        {/* (2) 메인 컨텐츠 */}
        <main>{children}</main>
      </body>
    </html>
  );
}
