"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [name, setName] = useState("");
  const [cell, setCell] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adminEmail = "amorfortunae@naver.com";

  // 소속 셀 옵션 (전도사, 장년교사, 청년교사, 1-1셀 ~ 1-8셀, 2-1셀 ~ 2-7셀, 3-1셀 ~ 3-8셀)
  const cellOptions = [
    "전도사",
    "장년교사",
    "청년교사",
    ...Array.from({ length: 8 }, (_, i) => `1-${i + 1}셀`),
    ...Array.from({ length: 7 }, (_, i) => `2-${i + 1}셀`),
    ...Array.from({ length: 8 }, (_, i) => `3-${i + 1}셀`),
  ];

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      alert("이미 가입 처리가 진행 중입니다.");
      return;
    }
    setError(null);
    if (pw !== pwConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!/^\d{6}$/.test(pw)) {
      setError("비밀번호는 숫자 6자리여야 합니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, pw);
      const user = userCred.user;
      const userRole = email === adminEmail ? "admin" : "user";

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        name,
        cell,
        phone,
        role: userRole,
        createdAt: serverTimestamp(),
      });

      setSuccess(true);
      alert("가입되었습니다.");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("이미 가입된 회원정보 입니다.");
      } else {
        setError(err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white rounded shadow p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">회원가입 완료</h2>
          <p className="mb-6">가입이 정상 처리되었습니다!</p>
          <button
            onClick={() => router.push("/")}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            로그인 하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white rounded shadow p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">회원가입</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleSignup} className="space-y-4">
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
            placeholder="비밀번호 (6자리 숫자)"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
            maxLength={6}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
            maxLength={6}
          />
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
          />
          <select
            value={cell}
            onChange={(e) => setCell(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
          >
            <option value="">소속 셀 선택</option>
            {cellOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            type="tel"
            placeholder="핸드폰 번호"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-green-500 text-white font-semibold py-3 rounded transition ${
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "hover:bg-green-600"
            }`}
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
}
