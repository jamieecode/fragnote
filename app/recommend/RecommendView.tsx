"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { toggleWishlist } from "@/lib/wishlist-actions";
import { diversify, type RecommendItem } from "@/lib/recommend-scoring";
import type { NoteFamily } from "@prisma/client";

const BOTTLE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

const HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

type Family = { key: NoteFamily; label: string; tint: string };

export default function RecommendView({
  tasteItems,
  dailyItems,
  dailyUsedFallback,
  families,
  initialWishedIds,
}: {
  tasteItems: RecommendItem[];
  dailyItems: RecommendItem[];
  dailyUsedFallback: boolean;
  families: Family[];
  initialWishedIds: string[];
}) {
  const [mode, setMode] = useState<"taste" | "daily">("taste");
  const [activeFamily, setActiveFamily] = useState<NoteFamily | "all">("all");
  const [wished, setWished] = useState(new Set(initialWishedIds));
  const [pendingWish, setPendingWish] = useState<string | null>(null);

  const effectiveMode = mode === "daily" && dailyUsedFallback ? "taste" : mode;
  const isTaste = effectiveMode === "taste";

  // "전체" 탭은 한 계열에 쏠리지 않게 다양화한다 — 표시 개수(10) 기준으로 직접
  // 다양화해야 의미가 있어서(더 큰 풀에서 다양화한 뒤 앞부분만 잘라 쓰면 그 안에서
  // 다시 쏠릴 수 있음), 실제 화면에 보여줄 개수로 여기서 바로 계산한다.
  const visibleTasteItems = activeFamily === "all" ? diversify(tasteItems, 10, 3) : tasteItems.filter((it) => it.family === activeFamily).slice(0, 15);
  const items = isTaste ? visibleTasteItems : dailyItems;

  const activeModeStyle = { border: "1.5px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent-text)" };
  const inactiveModeStyle = { border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" };

  const toggleWish = async (perfumeId: string) => {
    if (pendingWish) return;
    setPendingWish(perfumeId);
    const wasWished = wished.has(perfumeId);
    setWished((prev) => {
      const next = new Set(prev);
      if (wasWished) next.delete(perfumeId);
      else next.add(perfumeId);
      return next;
    });
    try {
      await toggleWishlist(perfumeId);
    } catch {
      // 실패 시 낙관적 업데이트 되돌리기
      setWished((prev) => {
        const next = new Set(prev);
        if (wasWished) next.add(perfumeId);
        else next.delete(perfumeId);
        return next;
      });
    } finally {
      setPendingWish(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      <div style={{ padding: "24px 20px 4px" }}>
        <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 4 }}>추천</div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          {isTaste ? "취향에 가까운 향수 순으로 골라봤어요" : "오늘 뿌리기 좋은 보유 향수 순으로 골라봤어요"}
        </div>
      </div>

      <div style={{ padding: "12px 20px 16px", display: "flex", gap: 8 }}>
        <button onClick={() => setMode("taste")} aria-pressed={mode === "taste"} style={{ ...(mode === "taste" ? activeModeStyle : inactiveModeStyle), flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          취향 매칭
        </button>
        <button onClick={() => setMode("daily")} aria-pressed={mode === "daily"} style={{ ...(mode === "daily" ? activeModeStyle : inactiveModeStyle), flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          데일리 추천
        </button>
      </div>

      {mode === "daily" && dailyUsedFallback && (
        <div style={{ margin: "0 20px 16px", padding: "12px 14px", borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent-text)", fontSize: 12.5, lineHeight: 1.6 }}>
          아직 보유한 향수가 없어서 취향 매칭 결과를 보여드려요
        </div>
      )}

      {isTaste && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 20px 4px", marginBottom: 16 }}>
          <button
            onClick={() => setActiveFamily("all")}
            style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", ...(activeFamily === "all" ? activeModeStyle : inactiveModeStyle) }}
          >
            전체
          </button>
          {families.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFamily(f.key)}
              style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", ...(activeFamily === f.key ? activeModeStyle : inactiveModeStyle) }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "0 20px 24px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>추천할 향수를 찾지 못했어요</div>}
        {items.map((it) => {
          const isWished = wished.has(it.perfumeId);
          return (
            <div key={it.collectionId ?? it.perfumeId} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--border-soft)", borderRadius: 16, background: "var(--surface)" }}>
              <Link href={`/perfume/${it.perfumeId}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: it.tint, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
                    {isTaste && it.owned && (
                      <div style={{ padding: "2px 7px", borderRadius: 999, fontSize: 9.5, fontWeight: 700, background: "var(--border-soft)", color: "var(--text-muted)", flexShrink: 0 }}>보유중</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 6 }}>{it.brand}</div>
                  {it.reasons.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {it.reasons.map((tag) => (
                        <div key={tag} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10.5, background: "var(--accent-soft)", color: "var(--accent-text)" }}>
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {isTaste && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{it.matchPercent}%</div>
                    <div style={{ fontSize: 9, color: "var(--text-faint)" }}>매치</div>
                  </div>
                )}
                <button onClick={() => toggleWish(it.perfumeId)} aria-label={isWished ? "위시리스트에서 제거" : "위시리스트에 추가"} style={{ border: "none", background: "none", padding: 2, display: "flex", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isWished ? "var(--text)" : "none"} stroke={isWished ? "var(--text)" : "var(--text-faint)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={HEART_PATH} />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
