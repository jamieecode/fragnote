import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 컬렉션 등록 시 향수 사진을 서버 액션으로 업로드하는데, Next.js 기본 서버
    // 액션 바디 제한(1MB)은 실제 폰 카메라 사진보다 작아 업로드가 항상 실패한다.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
