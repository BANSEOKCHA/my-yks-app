"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

interface UserData {
  uid: string;
  email: string;
  name: string;
  cell?: string;
  phone?: string;
  role: string;
  talentScore?: number;
}

interface ScoreHistory {
  id: string;
  score: number;
  missionContent: string;
  createdAt: any;
}

export default function MyInfoPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeHistory: () => void = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserData;
          setUserData(data);
          // scoreHistory 하위 컬렉션의 실시간 업데이트 구독
          const historyRef = collection(db, "users", currentUser.uid, "scoreHistory");
          const q = query(historyRef, orderBy("createdAt", "desc"));
          unsubscribeHistory = onSnapshot(q, (snapshot) => {
            const historyData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as ScoreHistory[];
            setScoreHistory(historyData);
          });
        } else {
          router.push("/login");
        }
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    });
    return () => {
      unsubscribeAuth();
      unsubscribeHistory();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err: any) {
      alert("로그아웃 중 오류가 발생했습니다: " + err.message);
    }
  };

  if (loading) return <div className="p-6">로딩 중...</div>;
  if (!userData) return <div className="p-6">사용자 정보를 불러오지 못했습니다.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 정보</h1>
        <button 
          onClick={handleLogout} 
          className="text-sm text-blue-500 hover:text-blue-700 transition"
        >
          로그아웃
        </button>
      </div>
      <div className="bg-white p-4 rounded shadow my-4">
        <p><strong>이름:</strong> {userData.name}</p>
        <p><strong>이메일:</strong> {userData.email}</p>
        <p><strong>소속:</strong> {userData.cell || "미정"}</p>
        <p><strong>핸드폰:</strong> {userData.phone || "미입력"}</p>
        <p><strong>현재 달란트:</strong> {userData.talentScore || 0}</p>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">달란트 획득 내역</h2>
        {scoreHistory.length === 0 ? (
          <p className="text-gray-500">아직 획득 내역이 없습니다.</p>
        ) : (
          scoreHistory.map((record) => (
            <div key={record.id} className="border-b pb-2 mb-2">
              <p>
                <strong>획득 점수:</strong> {record.score}
              </p>
              <p>
                <strong>미션 내용:</strong> {record.missionContent}
              </p>
              <p>
                <strong>획득 일자:</strong>{" "}
                {record.createdAt?.seconds
                  ? new Date(record.createdAt.seconds * 1000).toLocaleString()
                  : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
