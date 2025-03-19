"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export default function QRLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");

  // URL에 포함된 code 파라미터 확인 (예: ?code=YOUR_SECRET_CODE)
  const codeFromUrl = searchParams.get("code");
  const expectedCode = process.env.NEXT_PUBLIC_QR_SECRET || "YOUR_SECRET_CODE";

  useEffect(() => {
    if (!codeFromUrl || codeFromUrl !== expectedCode) {
      setMessage("유효하지 않은 QR 코드입니다.");
      setLoading(false);
      return;
    }

    // 로그인 상태 확인: 사용자가 로그인 되어있지 않으면 로그인 페이지로 리다이렉트
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login?redirect=/qr-login?code=" + expectedCode);
      } else {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            // 오늘 이미 출석 등록되었는지 확인 (lastQRDate 필드 사용)
            let canAward = true;
            if (userData.lastQRDate) {
              const lastQRDate = new Date(userData.lastQRDate.seconds * 1000);
              const today = new Date();
              const isSameDay =
                lastQRDate.getFullYear() === today.getFullYear() &&
                lastQRDate.getMonth() === today.getMonth() &&
                lastQRDate.getDate() === today.getDate();
              if (isSameDay) {
                canAward = false;
              }
            }
            if (canAward) {
              // 달란트 점수 5점 추가 및 출석 기록
              const newScore = (userData.talentScore || 0) + 5;
              await updateDoc(userRef, {
                talentScore: newScore,
                lastQRDate: serverTimestamp(),
              });
              // scoreHistory 하위 컬렉션에 기록 추가
              await addDoc(collection(db, "users", currentUser.uid, "scoreHistory"), {
                score: 5,
                missionContent: "QR 코드 출석 인증",
                createdAt: serverTimestamp(),
              });
              setMessage("출석 인증되었습니다! 달란트 점수가 5점 추가되었습니다.");
            } else {
              setMessage("이미 출석이 등록되었습니다.");
            }
          }
        } catch (err: any) {
          setMessage("오류가 발생했습니다: " + err.message);
        }
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, codeFromUrl, expectedCode]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="bg-white p-6 rounded shadow text-center">
          <p>{message}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            대시보드로 이동
          </button>
        </div>
      )}
    </div>
  );
}
