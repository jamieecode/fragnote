"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { logout } from "@/lib/auth-actions";
import { subscribeTheme, getThemeSnapshot, getThemeServerSnapshot, setDarkMode as applyDarkMode } from "@/lib/theme";

export default function MyPageView({ nickname, email }: { nickname: string; email: string }) {
  const darkMode = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const toggleDarkMode = () => applyDarkMode(!darkMode);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      <div style={{ padding: "24px 20px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 24 }}>마이페이지</div>
      </div>

      <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 22, color: "var(--accent-text)" }}>{[...nickname][0]}</span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{nickname}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>{email}</div>
        </div>
      </div>

      <div style={{ padding: "0 20px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>환경설정</div>
        <div style={{ border: "1px solid var(--border-soft)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>다크 모드</span>
            <button
              onClick={toggleDarkMode}
              aria-label="다크 모드 전환"
              role="switch"
              aria-checked={darkMode}
              style={{ width: 42, height: 24, border: "none", borderRadius: 999, position: "relative", padding: 0, cursor: "pointer", background: darkMode ? "var(--accent)" : "var(--border)" }}
            >
              <span style={{ position: "absolute", top: 2, left: darkMode ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 2px oklch(0% 0 0 / 0.2)" }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>계정</div>
        <div style={{ border: "1px solid var(--border-soft)", borderRadius: 16, overflow: "hidden" }}>
          <Link href="/onboarding" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", textDecoration: "none", color: "var(--text)" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>취향 프로필 재설정</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>

      <div style={{ padding: "8px 20px" }}>
        {showLogoutConfirm ? (
          <div style={{ padding: 16, border: "1px solid var(--border-soft)", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>정말 로그아웃 하시겠어요?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: 11, border: "1.5px solid var(--border)", borderRadius: 10, background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              <form action={logout} style={{ flex: 1 }}>
                <button type="submit" style={{ width: "100%", padding: 11, border: "none", borderRadius: 10, background: "var(--danger)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{ width: "100%", padding: 13, border: "1.5px solid var(--border-soft)", borderRadius: 14, background: "var(--surface)", color: "var(--danger)", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
          >
            로그아웃
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
