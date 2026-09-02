"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const BOTTLE_ICON = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

type RecItem = { name: string; brand: string; tint: string; reason: string };
type RecentItem = { name: string; tint: string; dateLabel: string; sprays: number };

export default function HomeView({
  todayLabel,
  nickname,
  recItems,
  recent,
}: {
  todayLabel: string;
  nickname: string;
  recItems: RecItem[];
  recent: RecentItem[];
}) {
  const [recIndex, setRecIndex] = useState(0);
  const rec = recItems[recIndex % Math.max(1, recItems.length)];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      <div style={{ padding: "24px 20px 4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{todayLabel}</div>
          <div style={{ fontWeight: 700, fontSize: 24 }}>안녕하세요{nickname ? `, ${nickname}님` : ""}</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21a8 8 0 1 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>오늘의 추천</div>
        {rec ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 20, padding: 20, boxShadow: "0 1px 2px oklch(0% 0 0 / 0.03), 0 10px 24px oklch(0% 0 0 / 0.05)" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 14, background: rec.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{rec.brand}</div>
                <div style={{ fontWeight: 700, fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.name}</div>
              </div>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-muted)", padding: "12px 14px", background: "var(--accent-soft)", borderRadius: 12, marginBottom: 16 }}>{rec.reason}</div>
            {recItems.length > 1 && (
              <button
                onClick={() => setRecIndex((recIndex + 1) % recItems.length)}
                style={{ width: "100%", padding: 13, border: "1.5px solid var(--border)", background: "var(--surface)", borderRadius: 12, fontSize: 14, fontWeight: 600, color: "var(--text)", cursor: "pointer" }}
              >
                다른 향수 보기
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 20, padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
            추천할 향수를 찾지 못했어요
          </div>
        )}
      </div>

      <div style={{ padding: "24px 20px 8px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>최근 사용 기록</div>
        {recent.length > 0 ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 16, overflow: "hidden" }}>
            {recent.map((r, i) => (
              <div key={i} style={{ borderTop: i > 0 ? "1px solid var(--border-soft)" : "none", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: r.tint, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{r.dateLabel}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{r.sprays}회</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
            아직 사용 기록이 없어요
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav />
    </div>
  );
}
