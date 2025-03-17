"use client";

import React from "react";
import dynamic from "next/dynamic";

// require 방식을 사용하여 동적 임포트합니다.
const QrReader = dynamic(
  () =>
    Promise.resolve(require("react-qr-reader")).then(
      (mod) => mod.default || mod.QrReader
    ),
  { ssr: false }
);

interface QRScannerProps {
  onResult: (result: string | null, error: any) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onResult }) => {
  const handleScan = (data: string | null) => {
    if (data) {
      onResult(data, null);
    }
  };

  const handleError = (error: any) => {
    onResult(null, error);
  };

  return (
    // 고정 높이를 부여하여 카메라 피드가 나타날 영역을 확보합니다.
    <div className="w-full" style={{ height: "300px" }}>
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        style={{ width: "100%", height: "100%" }}
        constraints={{ facingMode: { exact: "environment" } }}
      />
    </div>
  );
};

export default QRScanner;
