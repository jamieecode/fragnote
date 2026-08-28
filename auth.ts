import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

// Prisma Adapter 없이 JWT 세션 전략 사용 (CLAUDE.md 설계 결정).
// Account/Session 테이블 없이, signIn 콜백에서 User 테이블에 직접 upsert한다.
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Kakao, Google],
  session: { strategy: "jwt" },
  pages: { error: "/auth-error" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email || !account) return false;

      // 이메일 소유 여부가 검증되지 않은 상태로 upsert하면, 공격자가 피해자의
      // 이메일로 카카오/구글 계정을 만들어 로그인하는 것만으로 피해자의 기존
      // User row에 그대로 연결(계정 탈취)될 수 있다. Auth.js 공식 문서도 이 값을
      // 직접 확인하도록 권장함 — 구글은 profile.email_verified, 카카오는
      // kakao_account.is_email_verified.
      const emailVerified =
        account.provider === "google"
          ? profile?.email_verified === true
          : account.provider === "kakao"
            ? (profile as { kakao_account?: { is_email_verified?: boolean } })?.kakao_account
                ?.is_email_verified === true
            : false;
      if (!emailVerified) return false;

      const provider = account.provider === "kakao" ? "KAKAO" : "GOOGLE";
      const dbUser = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          provider,
          nickname: user.name ?? user.email,
          profileImageUrl: user.image ?? null,
        },
        create: {
          email: user.email,
          provider,
          nickname: user.name ?? user.email,
          profileImageUrl: user.image ?? null,
        },
      });

      // 어댑터 없이 JWT 세션 전략을 쓰는 구조에서는 이 user 객체가 그대로
      // jwt 콜백까지 전달되므로, 여기서 id를 실제 DB row id로 바꿔두면
      // jwt 콜백에서 email로 다시 조회할 필요가 없다.
      user.id = dbUser.id;

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
