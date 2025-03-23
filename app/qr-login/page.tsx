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

  const codeFromUrl = searchParams.get("code");
  const expectedCode = process.env.NEXT_PUBLIC_QR_SECRET || "YOUR_SECRET_CODE";

  useEffect(() => {
    const runQRCheck = async () => {
      // 🔧 QR 코드 유효성 검사
      if (!codeFromUrl || codeFromUrl !== expectedCode) {
        setMessage("유효하지 않은 QR 코드입니다.");
        setLoading(false);
        return;
      }

      const currentUser = auth.currentUser; // 🔧 auth.currentUser를 직접 사용하여 로그인 상태 확인
      if (!currentUser) {
        router.push("/login?redirect=/qr-login?code=" + expectedCode);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setMessage("사용자 정보를 불러올 수 없습니다.");
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        const now = new Date();

        // 🔧 일요일 검사
        if (now.getDay() !== 0) {
          setMessage("출석 인증은 일요일에만 가능합니다.");
          setLoading(false);
          return;
        }

        // 🔧 시간 제한 검사 (06:00:00 ~ 10:54:59)
        const hour = now.getHours();
        const minute = now.getMinutes();
        const second = now.getSeconds();
        const currentTime = hour * 3600 + minute * 60 + second;
        const startTime = 6 * 3600;
        const endTime = 8 * 3600 + 54 * 60 + 59;

        if (currentTime < startTime || currentTime > endTime) {
          setMessage("출석 인증은 일요일 오전 6시부터 8시 54분까지 가능합니다.");
          setLoading(false);
          return;
        }

        // 🔧 하루 1회 제한 검사
        //let canAward = true;
        //if (userData.lastQRDate) {
         // const lastQRDate = new Date(userData.lastQRDate.seconds * 1000);
          //const isSameDay =
            //lastQRDate.getFullYear() === now.getFullYear() &&
            //lastQRDate.getMonth() === now.getMonth() &&
            //lastQRDate.getDate() === now.getDate();

          //if (isSameDay) {
            //canAward = false;
          //}
        //}

        if (!canAward) {
          setMessage("이미 오늘 출석이 등록되었습니다.");
          setLoading(false);
          return;
        }

        // 🔧 달란트 5점 추가 및 기록 저장
        const newScore = (userData.talentScore || 0) + 5;
        await updateDoc(userRef, {
          talentScore: newScore,
          lastQRDate: serverTimestamp(),
        });

        await addDoc(collection(db, "users", currentUser.uid, "scoreHistory"), {
          score: 5,
          missionContent: "QR 코드 출석 인증",
          createdAt: serverTimestamp(),
        });

        setMessage("출석 인증되었습니다! 달란트 5점이 적립되었습니다.");

        // 🔧 3초 후 내 정보 페이지로 이동
        setTimeout(() => router.push("/my-info"), 3000);
      } catch (err: any) {
        setMessage("오류가 발생했습니다: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    // 🔧 auth.currentUser가 null일 수 있으므로 살짝 delay 후 실행
    const delay = setTimeout(() => {
      runQRCheck();
    }, 300);

    return () => clearTimeout(delay);
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
