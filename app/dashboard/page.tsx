"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [missionType, setMissionType] = useState("감사나눔");
  const [content, setContent] = useState("1. ");
  const [isPublic, setIsPublic] = useState(true);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchMyPosts(currentUser.uid);
      } else {
        router.push("/login?redirect=/dashboard");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const fetchMyPosts = async (uid: string) => {
    try {
      const postsRef = collection(db, "posts");
      const q = query(
        postsRef,
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMyPosts(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !user) return;
    if (content.trim().length < 15) {
      alert("글 내용은 최소 15자 이상 입력되어야 합니다.");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        missionType,
        content,
        isPublic,
        createdAt: serverTimestamp(),
      });
      setContent("1. ");
      await fetchMyPosts(user.uid);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        let shouldUpdate = false;
        if (userData.lastPostDate) {
          const lastPostDate = new Date(userData.lastPostDate.seconds * 1000);
          const today = new Date();
          const isSameDay =
            lastPostDate.getFullYear() === today.getFullYear() &&
            lastPostDate.getMonth() === today.getMonth() &&
            lastPostDate.getDate() === today.getDate();
          if (!isSameDay) shouldUpdate = true;
        } else {
          shouldUpdate = true;
        }

        if (shouldUpdate) {
          const newScore = (userData.talentScore || 0) + 1;
          await updateDoc(userRef, {
            talentScore: newScore,
            lastPostDate: serverTimestamp(),
          });
          await addDoc(collection(db, "users", user.uid, "scoreHistory"), {
            score: 1,
            missionContent: missionType,
            createdAt: serverTimestamp(),
          });
          alert("등록되었습니다. 달란트 점수가 추가되었습니다.");
        } else {
          alert("함께해줘서 고맙고 감사해요!");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPost = async (postId: string, currentContent: string) => {
    const newContent = prompt("새로운 내용을 입력하세요", currentContent);
    if (newContent && newContent.trim().length >= 15) {
      try {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { content: newContent });
        fetchMyPosts(user.uid);
      } catch (err: any) {
        alert("수정 중 오류: " + err.message);
      }
    } else if (newContent) {
      alert("글 내용은 최소 15자 이상이어야 합니다.");
    }
  };

  // 🧠 엔터 시 자동 번호 매기기
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const lines = content.split("\n");
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^(\d+)\.\s?/);
      const nextNumber = match ? parseInt(match[1]) + 1 : 1;
      setContent((prev) => prev + `\n${nextNumber}. `);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center space-y-6 bg-gray-50">
      <div className="bg-white w-full max-w-md p-5 rounded-2xl shadow space-y-4">
        <h2 className="text-xl font-bold text-center">미션 인증</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium">미션 종류</label>
            <select
              value={missionType}
              onChange={(e) => setMissionType(e.target.value)}
              className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="감사나눔">감사나눔</option>
              <option value="기도나눔">기도나눔</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">내용</label>
            <textarea
              className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 whitespace-pre-wrap"
              placeholder="글 내용을 입력하세요 (최소 15자)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleContentKeyDown}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">공개 여부</label>
            <select
              value={isPublic ? "public" : "private"}
              onChange={(e) => setIsPublic(e.target.value === "public")}
              className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="public">공개</option>
              <option value="private">비공개</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-semibold py-3 rounded transition ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            작성
          </button>
        </form>
      </div>

      <div className="bg-white w-full max-w-md p-5 rounded-2xl shadow space-y-4">
        <h2 className="text-xl font-bold">내가 쓴 글</h2>
        {myPosts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">아직 작성한 글이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {myPosts.map((post) => {
              const date = post.createdAt?.seconds
                ? new Date(post.createdAt.seconds * 1000).toISOString().slice(0, 10)
                : "";
              return (
                <li
                  key={post.id}
                  className="border rounded p-3 flex flex-col gap-2 bg-gray-50"
                >
                  <span className="text-sm whitespace-pre-wrap leading-relaxed">
                    <strong className="text-blue-600">[{post.missionType}]</strong>{" "}
                    {post.content}
                  </span>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{date}</span>
                    <button
                      onClick={() => handleEditPost(post.id, post.content)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      수정
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
