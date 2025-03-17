"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../firebaseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

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

export default function ActiveUsersPage() {
  const router = useRouter();
  const [activeUsers, setActiveUsers] = useState<UserData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchActiveUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      // active회원: disabled 필드가 false 또는 없음을 가정
      const q = query(usersRef, where("disabled", "==", false), orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      const data: UserData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as UserData),
      }));
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
              <th className="text-left p-2">이메일</th>
              <th className="text-left p-2">달란트 점수</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map((user, index) => (
              <tr key={user.id} className="border-b">
                <td className="p-2">{index + 1}</td>
                <td className="p-2">{user.name}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2">{user.talentScore ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button
        onClick={() => router.back()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        뒤로가기
      </button>
    </div>
  );
}
