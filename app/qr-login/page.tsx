"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";

export default function QRLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrCodeParam = searchParams.get("code");
  const expectedCode = process.env.NEXT_PUBLIC_QR_SECRET || "YOUR_SECRET_CODE";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      if (qrCodeParam && qrCodeParam === expectedCode) {
        const now = new Date();

        // 일요일 체크 (0: 일요일)
        if (now.getDay() !== 0) {
          alert("QR 코드는 일요일에만 출석 등록이 가능합니다.");
          router.push("/login");
          return;
        }

        // 출석 등록 가능 시간: 일요일 오전 06:00:00 ~ 08:44:59
        const startTime = new Date(now);
        startTime.setHours(6, 0, 0, 0);
        const endTime = new Date(now);
        endTime.setHours(8, 44, 59, 999);
        if (now < startTime || now > endTime) {
          alert("출석 등록 시간은 일요일 오전 06시부터 08시44분59초까지입니다.");
          router.push("/login");
          return;
        }

        // 중복 출석 체크 및 점수 업데이트
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.lastQRLogin) {
            const lastQRLogin = new Date(userData.lastQRLogin.seconds * 1000);
            const isSameDay =
              lastQRLogin.getFullYear() === now.getFullYear() &&
              lastQRLogin.getMonth() === now.getMonth() &&
              lastQRLogin.getDate() === now.getDate();
            if (isSameDay) {
              alert("이미 출석이 등록되었습니다.");
              router.push("/dashboard");
              return;
            }
          }
          const newScore = (userData.talentScore || 0) + 5;
          await updateDoc(userRef, {
            talentScore: newScore,
            lastQRLogin: serverTimestamp(),
          });
          // scoreHistory 하위 컬렉션에 기록 추가
          await addDoc(collection(db, "users", user.uid, "scoreHistory"), {
            score: 5,
            missionContent: "QR 코드 출석 인증",
            createdAt: serverTimestamp(),
          });
          alert("출석 인증되었습니다");
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError("로그인 실패: " + err.message);
      if (err.code === "auth/user-disabled") {
        await signOut(auth);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white rounded shadow p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">QR 코드 로그인</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-semibold py-3 rounded hover:bg-blue-600 transition"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
