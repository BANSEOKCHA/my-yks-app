"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

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

interface PostData {
  id: string;
  userId: string;
  content: string;
  isPublic: boolean;
  createdAt?: any;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UserData[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as UserData;
          if (data.role === "admin") {
            setIsAdmin(true);
            await fetchUsers();
            await fetchPosts();
          } else {
            alert("관리자 권한이 없습니다.");
            router.push("/dashboard");
          }
        } else {
          router.push("/");
        }
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data: UserData[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as UserData),
      }));
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPosts = async () => {
    try {
      const postsRef = collection(db, "posts");
      const q = query(postsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data: PostData[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as PostData),
      }));
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePost = async (postId: string, postUserId: string) => {
    if (confirm("해당 게시글을 삭제하고, 해당 회원의 달란트 점수를 1점 차감하시겠습니까?")) {
      try {
        const userRef = doc(db, "users", postUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData;
          const currentScore = userData.talentScore || 0;
          const newScore = currentScore > 0 ? currentScore - 1 : 0;
          await updateDoc(userRef, { talentScore: newScore });
        }
        await deleteDoc(doc(db, "posts", postId));
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err: any) {
        alert("삭제 중 오류 발생: " + err.message);
      }
    }
  };

  const handleRemoveUser = async (userId: string, uid: string) => {
    if (
      confirm(
        "해당 회원을 탈퇴시키겠습니까? (탈퇴 후 해당 아이디로는 로그인할 수 없습니다.)"
      )
    ) {
      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { disabled: true });
        alert("회원이 탈퇴 처리되었습니다.");
        await fetchUsers();
      } catch (err: any) {
        alert("회원 탈퇴 중 오류 발생: " + err.message);
      }
    }
  };

  const handleAddScore = async (uid: string) => {
    const input = prompt("추가할 달란트 점수를 입력하세요 (숫자만 입력)");
    const addScore = Number(input);
    if (isNaN(addScore) || addScore <= 0) {
      alert("유효한 점수를 입력하세요.");
      return;
    }
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        const currentScore = userData.talentScore || 0;
        await updateDoc(userRef, { talentScore: currentScore + addScore });
        alert(`${addScore}점이 추가되었습니다.`);
        await fetchUsers();
      }
    } catch (err: any) {
      alert("점수 추가 중 오류 발생: " + err.message);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = users.filter(
        (u) =>
          !u.disabled &&
          (u.name.includes(searchQuery) || u.email.includes(searchQuery))
      );
      setSearchResults(results);
    } catch (err: any) {
      alert("검색 중 오류 발생: " + err.message);
    }
  };

  const handleViewActiveUsers = () => {
    window.open("/admin/active-users", "_blank");
  };

  const handleViewDisabledUsers = () => {
    window.open("/admin/disabled-users", "_blank");
  };

  if (loading) return <div className="p-6">로딩 중...</div>;
  if (!isAdmin)
    return (
      <div className="p-6">
        <p>관리자 권한이 없습니다.</p>
      </div>
    );

  const activeUsers = users.filter((u) => !u.disabled);
  const disabledUsers = users.filter((u) => u.disabled);
  const topRankings = [...activeUsers]
    .sort((a, b) => (b.talentScore || 0) - (a.talentScore || 0))
    .slice(0, 5);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-center">관리자 페이지</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* 상단 등록회원 순위 */}
      <section>
        <h2 className="text-xl font-semibold mb-2">등록회원 순위 (상위 5명)</h2>
        <ul className="space-y-2">
          {topRankings.map((u, index) => (
            <li
              key={u.id}
              className="p-2 bg-gray-100 rounded shadow flex justify-between items-center"
            >
              <span>
                {index + 1}. {u.name} ({u.talentScore || 0}점)
              </span>
              <button
                onClick={() => handleAddScore(u.uid)}
                className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition whitespace-nowrap"
              >
                점수 추가
              </button>
            </li>
          ))}
        </ul>
        <div className="flex space-x-2 mt-3">
          <button
            onClick={handleViewActiveUsers}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            전체 등록회원 목록 보기
          </button>
          <button
            onClick={handleViewDisabledUsers}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            전체 탈퇴회원 목록 보기
          </button>
        </div>
      </section>

      {/* 회원 검색 및 관리 */}
      <section>
        <h2 className="text-xl font-semibold mb-2">회원 검색</h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="회원 검색 (이름 또는 이메일)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            검색
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-1">검색 결과:</h3>
            <ul className="space-y-1">
              {searchResults.map((u) => (
                <li
                  key={u.id}
                  className="flex justify-between items-center p-2 bg-gray-100 rounded shadow"
                >
                  <div>
                    <div>UID: {u.uid}</div>
                    <div>Name: {u.name}</div>
                    <div>Email: {u.email}</div>
                  </div>
                  <button
                    onClick={() => handleAddScore(u.uid)}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition whitespace-nowrap"
                  >
                    점수 추가
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 회원 목록 */}
      <section>
        <h2 className="text-xl font-semibold mb-2">등록회원 목록</h2>
        <ul className="space-y-2">
          {activeUsers.map((u) => (
            <li
              key={u.id}
              className="p-2 bg-gray-100 rounded shadow flex justify-between items-center"
            >
              <div>
                <div>UID: {u.uid}</div>
                <div>Email: {u.email}</div>
                <div>Name: {u.name}</div>
                <div>셀: {u.cell}</div>
                <div>Phone: {u.phone}</div>
                <div>Role: {u.role}</div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAddScore(u.uid)}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition whitespace-nowrap"
                >
                  점수 추가
                </button>
                <button
                  onClick={() => handleRemoveUser(u.id, u.uid)}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition whitespace-nowrap"
                >
                  회원 탈퇴
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <p className="text-sm text-gray-600">탈퇴회원은 아래에 표시됩니다.</p>
          <ul className="space-y-2 mt-2">
            {disabledUsers.length === 0 ? (
              <p className="text-gray-500">탈퇴한 회원이 없습니다.</p>
            ) : (
              disabledUsers.map((u) => (
                <li
                  key={u.id}
                  className="p-2 bg-gray-100 rounded shadow flex justify-between items-center"
                >
                  <div>
                    <div>UID: {u.uid}</div>
                    <div>Email: {u.email}</div>
                    <div>Name: {u.name}</div>
                  </div>
                  <button
                    onClick={() => handleAddScore(u.uid)}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition whitespace-nowrap"
                  >
                    점수 추가
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {/* 게시글 목록 */}
      <section>
        <h2 className="text-xl font-semibold mb-2">전체 게시글 (비공개 포함)</h2>
        <ul className="space-y-2">
          {posts.map((p) => (
            <li
              key={p.id}
              className="p-2 bg-white rounded shadow flex flex-col sm:flex-row justify-between items-start sm:items-center"
            >
              <div className="mb-2 sm:mb-0">
                <div>작성자: {p.userId}</div>
                <div>내용: {p.content}</div>
                <div>공개여부: {p.isPublic ? "공개" : "비공개"}</div>
                <div>
                  작성일:{" "}
                  {p.createdAt?.seconds
                    ? new Date(p.createdAt.seconds * 1000).toLocaleString()
                    : ""}
                </div>
              </div>
              <button
                onClick={() => handleDeletePost(p.id, p.userId)}
                className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition whitespace-nowrap"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
