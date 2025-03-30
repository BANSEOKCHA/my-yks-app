"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface PostData {
  id: string;
  userId: string;
  content: string;
  isPublic: boolean;
  missionType?: string; // ✅ 게시글 종류 추가
  createdAt?: any;
}

interface UserData {
  id: string;
  uid: string;
  name: string;
  cell?: string;
}

export default function SquarePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [usersMap, setUsersMap] = useState<{ [key: string]: { name: string; cell: string } }>({});
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredPosts, setFilteredPosts] = useState<PostData[]>([]);

  const fetchPublicPosts = async () => {
    try {
      const postsRef = collection(db, "posts");
      const q = query(
        postsRef,
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PostData[];

      const now = new Date();
      data = data.filter(post => {
        if (!post.createdAt || !post.createdAt.seconds) return false;
        const postDate = new Date(post.createdAt.seconds * 1000);
        const diffHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
        return diffHours <= 24;
      });

      setPosts(data);
      setFilteredPosts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[];
      const map: { [key: string]: { name: string; cell: string } } = {};
      data.forEach(user => {
        map[user.uid] = { name: user.name, cell: user.cell || "미정" };
      });
      setUsersMap(map);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredPosts(posts);
      return;
    }
    const lowerTerm = searchTerm.toLowerCase();
    const filtered = posts.filter(post => {
      const userInfo = usersMap[post.userId];
      return (
        userInfo?.name?.toLowerCase().includes(lowerTerm) ||
        userInfo?.cell?.toLowerCase().includes(lowerTerm)
      );
    });
    setFilteredPosts(filtered);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        fetchPublicPosts();
        fetchUsers();
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">광장</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* 🔍 검색창 */}
      <div className="mb-4 flex items-center space-x-2">
        <input
          type="text"
          placeholder="이름 또는 소속으로 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          검색
        </button>
      </div>

      {filteredPosts.length === 0 ? (
        <p className="text-gray-500 text-center">해당 조건에 맞는 게시글이 없습니다.</p>
      ) : (
        <div className="flex flex-col space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white p-4 rounded shadow">
              <p className="text-sm font-medium text-left">{post.content}</p>
              <small className="text-xs text-gray-600 text-left mt-1 block">
                {usersMap[post.userId]?.name || "알 수 없음"},{" "}
                {usersMap[post.userId]?.cell || "알 수 없음"},{" "}
                {post.missionType || "미정"}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
