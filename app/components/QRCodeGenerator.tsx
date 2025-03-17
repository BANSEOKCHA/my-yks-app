"use client";

import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRCodeGenerator() {
  // 여기에 원하는 고유 문자열을 설정하세요.
  const secretCode = "YOUR_SECRET_CODE";
  
  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-xl font-bold mb-4">인증용 QR 코드</h2>
      <QRCodeCanvas value={secretCode} size={256} />
      <p className="mt-4">이 QR 코드를 스캔하면 인증되고 달란트 점수가 5점 추가됩니다.</p>
    </div>
  );
}
