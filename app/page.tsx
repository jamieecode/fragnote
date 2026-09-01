import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pageStyle, centeredMessageStyle, primaryButtonStyle } from "@/lib/ui-styles";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });

    const logoutButton = (
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button type="submit" style={primaryButtonStyle}>
          로그아웃
        </button>
      </form>
    );

    // 세션 쿠키는 유효한데 DB의 User row가 사라진 경우(수동 정리, 로컬 DB 리셋 등) —
    // provider/nickname을 알 수 없으니 잘못된 값을 보여주는 대신 별도 안내를 띄운다.
    if (!dbUser) {
      return (
        <div style={pageStyle}>
          <div style={centeredMessageStyle}>
            <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>계정 정보를 찾을 수 없어요</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>로그아웃 후 다시 로그인해주세요</div>
            {logoutButton}
          </div>
        </div>
      );
    }

    // 아직 취향 설정을 안 한 유저는 온보딩으로 바로 보낸다.
    const prefCount = await prisma.userNotePreference.count({ where: { userId: session.user.id } });
    if (prefCount === 0) redirect("/onboarding");

    const providerLabel = dbUser.provider === "KAKAO" ? "카카오" : "구글";

    return (
      <div style={pageStyle}>
        <div style={centeredMessageStyle}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>{providerLabel} 계정으로 로그인했어요</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{dbUser.nickname}님, 환영해요</div>
          </div>
          <Link href="/onboarding" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            취향 다시 설정하기
          </Link>
          {logoutButton}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ position: "relative", width: 160, height: 120 }}>
            <div style={{ position: "absolute", left: 8, top: 10, width: 56, height: 56, borderRadius: 16, background: "oklch(91% 0.025 95)", transform: "rotate(-8deg)" }} />
            <div style={{ position: "absolute", left: 56, top: 0, width: 64, height: 64, borderRadius: 18, background: "oklch(89% 0.025 50)", transform: "rotate(6deg)" }} />
            <div style={{ position: "absolute", left: 96, top: 30, width: 52, height: 52, borderRadius: 14, background: "oklch(91% 0.02 350)", transform: "rotate(-4deg)" }} />
          </div>
        </div>

        <div style={{ padding: "0 32px 8px", textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 34, marginBottom: 10 }}>Fragnote</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 40 }}>
            매일 아침, 오늘의 향을
            <br />
            골라드릴게요
          </div>
        </div>

        <div style={{ padding: "0 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <form
            action={async () => {
              "use server";
              await signIn("kakao");
            }}
          >
            <button type="submit" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, border: "none", borderRadius: 14, background: "#FEE500", color: "#191600", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#191600">
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7-.2.7-.7 2.6-.8 3-.1.5.2.5.4.3.2-.1 2.7-1.8 3.7-2.6.7.1 1.4.2 2.1.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
              </svg>
              카카오로 시작하기
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button type="submit" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, border: "1.5px solid var(--border)", borderRadius: 14, background: "var(--surface)", color: "var(--text)", fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.4-.2-2.1H12v4h5.9c-.1 1-.8 2.5-2.3 3.5l3.7 2.9c2.2-2 3.5-5 3.5-8.3z" />
                <path fill="#34A853" d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.6-2-6.5-4.8l-3.8 3C3.4 20.5 7.4 23 12 23z" />
                <path fill="#FBBC05" d="M5.5 13.6c-.2-.7-.4-1.4-.4-2.1s.1-1.5.4-2.1l-3.8-3C.9 7.9.4 9.4.4 11c0 1.6.5 3.1 1.3 4.6l3.8-3z" />
                <path fill="#EA4335" d="M12 5.4c1.7 0 2.9.7 3.6 1.3l3.3-3.2C16.9 1.7 14.6.7 12 .7 7.4.7 3.4 3.2 1.7 6.8l3.8 3c.9-2.8 3.5-4.4 6.5-4.4z" />
              </svg>
              구글로 시작하기
            </button>
          </form>
        </div>

        <div style={{ padding: "0 32px 28px", textAlign: "center", fontSize: 11, color: "var(--text-faint)", lineHeight: 1.6 }}>
          계속 진행하면 이용약관 및 개인정보처리방침에
          <br />
          동의하는 것으로 간주돼요
        </div>
      </div>
    </div>
  );
}
