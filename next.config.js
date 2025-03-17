/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 만약 다른 옵션이 있다면 아래에 추가

  experimental: {
    appDir: true, // ← 이 부분 추가!
  },
};

module.exports = nextConfig;
