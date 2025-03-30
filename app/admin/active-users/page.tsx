"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebaseConfig";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

interface UserData {
  id: string;
  uid: string;
  email: string;
  name: string;
  cell?: string;
  phone?: string;
  role: string;
  talentScore?: number;
  disabled?: boolean;
}

// ✅ 소속 정렬 기준 배열 정의
const customCellOrder = [
  "전도사",
  ...Array.from({ length: 8 }, (_, i) => `1-${i + 1}셀`),
  ...Array.from({ length: 7 }, (_, i) => `2-${i + 1}셀`),
  ...Array.from({ length: 8 }, (_, i) => `3-${i + 1}셀`),
  "장년교사",
  "청년교사",
];

export default function ActiveUsersPage() {
  const router = useRouter();
  const [activeUsers, setActiveUsers] = useState<UserData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchActiveUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("name", "asc")); // 정렬은 JS에서 처리할 것이므로 Firestore 정렬은 무시
      const snapshot = await getDocs(q);
      let data: UserData[] = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as UserData) }))
        .filter(user => !user.disabled);

      // ✅ 소속 기준 정렬 적용
      data.sort((a, b) => {
        const indexA = customCellOrder.indexOf(a.cell || "");
        const indexB = customCellOrder.indexOf(b.cell || "");
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      setActiveUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">등록 회원 목록</h1>
      {loading ? (
        <p className="text-center">로딩 중...</p>
      ) : error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : activeUsers.length === 0 ? (
        <p className="text-gray-500 text-center">등록된 회원이 없습니다.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">순위</th>
              <th className="text-left p-2">이름</th>
              <th className="text-left p-2">소속</th>
              <th className="text-left p-2">달란트 점수</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map((user, index) => (
              <tr key={user.id} className="border-b">
                <td className="p-2">{index + 1}</td>
                <td className="p-2">{user.name}</td>
                <td className="p-2">{user.cell}</td>
                <td className="p-2">{user.talentScore ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        onClick={() => router.push("/admin")}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        관리자 페이지로 돌아가기
      </button>
    </div>
  );
}
