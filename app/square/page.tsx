"use client";

import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

interface PostData {
  id: string;
  userId: string;
  content: string;
  isPublic: boolean;
  createdAt?: any;
}

interface UserData {
  id: string;
  uid: string;
  name: string;
  cell?: string;
}

export default function SquarePage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [usersMap, setUsersMap] = useState<{ [key: string]: { name: string; cell: string } }>({});
  const [error, setError] = useState<string | null>(null);

  // 게시글 불러오기 및 오늘 요일 필터 적용, 무작위 정렬
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

      // 오늘 요일 필터링: 오늘의 요일에 등록된 게시글만 표시
      const today = new Date().getDay();
      data = data.filter(post => {
        if (!post.createdAt || !post.createdAt.seconds) return false;
        const postDate = new Date(post.createdAt.seconds * 1000);
        return postDate.getDay() === today;
      });

      // 무작위 정렬
      data = data.sort(() => Math.random() - 0.5);

      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 사용자 데이터 불러오기
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

  useEffect(() => {
    fetchPublicPosts();
    fetchUsers();
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">광장</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}
      {posts.length === 0 ? (
        <p className="text-gray-500 text-center">오늘 등록된 게시글이 없습니다.</p>
      ) : (
        <div className="flex flex-col space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white p-4 rounded shadow">
              <p className="text-sm font-medium text-left">{post.content}</p>
              <small className="text-xs text-gray-600 text-left mt-1 block">
                {usersMap[post.userId]?.name || "알 수 없음"}, {usersMap[post.userId]?.cell || "알 수 없음"}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
