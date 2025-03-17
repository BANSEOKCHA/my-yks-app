"use client";

import Link from "next/link";

export default function NavBar() {
  return (
    <header className="bg-white shadow px-4 py-3">
      {/* 최상단 브랜드 */}
      <div className="text-center text-xl font-bold mb-4">
        YK 쉐마고등마을
      </div>
      {/* 하단 메뉴 레이어 */}
      <nav className="flex justify-around">
        <Link href="/dashboard" className="text-base font-medium text-gray-700 hover:text-blue-600 transition">
          미션인증
        </Link>
        <Link href="/square" className="text-base font-medium text-gray-700 hover:text-blue-600 transition">
          광장
        </Link>
        <Link href="/myinfo" className="text-base font-medium text-gray-700 hover:text-blue-600 transition">
          내정보
        </Link>
        <Link href="/admin" className="text-base font-medium text-gray-700 hover:text-blue-600 transition">
          관리자
        </Link>
      </nav>
    </header>
  );
}
