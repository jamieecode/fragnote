"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export type CollectionItemVM = {
  id: string;
  name: string;
  label: string | null;
  brand: string;
  tint: string;
  percent: number;
  // percent는 반올림값이라 0%로 보여도 실제로는 미량 남아있을 수 있음 —
  // "다 썼어요" 배지/숨기기 판단은 반드시 이 값(currentMl <= 0)을 기준으로 한다.
  isEmpty: boolean;
};

export type WishlistItemVM = {
  id: string;
  perfumeId: string;
  name: string;
  brand: string;
  tint: string;
  owned: boolean;
};

const BOTTLE_ICON = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

function badgeFor(percent: number, isEmpty: boolean) {
  if (isEmpty) return { text: "다 썼어요", bg: "var(--used-bg)", color: "var(--used-text)" };
  if (percent <= 20) return { text: "잔량부족", bg: "var(--accent-soft)", color: "var(--accent-text)" };
  return null;
}

export default function CollectionView({ items, wishlistItems }: { items: CollectionItemVM[]; wishlistItems: WishlistItemVM[] }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"all" | "wishlist">("all");
  const [hideUsed, setHideUsed] = useState(false);

  const visibleItems = hideUsed ? items.filter((it) => !it.isEmpty) : items;
  const countLabel = "총 " + (activeTab === "wishlist" ? wishlistItems.length : visibleItems.length) + "개";

  const tabActiveStyle = { border: "1.5px solid var(--accent)", background: "var(--accent-soft)", color: "var(--accent-text)" };
  const tabInactiveStyle = { border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-muted)" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      <div style={{ padding: "24px 20px 4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 2 }}>내 향수장</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{countLabel}</div>
        </div>
        {activeTab === "all" && (
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("grid")}
              aria-label="그리드로 보기"
              aria-pressed={viewMode === "grid"}
              style={{ width: 36, height: 32, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: viewMode === "grid" ? "var(--accent-soft)" : "var(--surface)", color: viewMode === "grid" ? "var(--accent-text)" : "var(--text-faint)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.2" />
                <rect x="14" y="3" width="7" height="7" rx="1.2" />
                <rect x="3" y="14" width="7" height="7" rx="1.2" />
                <rect x="14" y="14" width="7" height="7" rx="1.2" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="리스트로 보기"
              aria-pressed={viewMode === "list"}
              style={{ width: 36, height: 32, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: viewMode === "list" ? "var(--accent-soft)" : "var(--surface)", color: viewMode === "list" ? "var(--accent-text)" : "var(--text-faint)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setActiveTab("all")} aria-pressed={activeTab === "all"} style={{ ...(activeTab === "all" ? tabActiveStyle : tabInactiveStyle), padding: "8px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 600 }}>
            전체
          </button>
          <button onClick={() => setActiveTab("wishlist")} aria-pressed={activeTab === "wishlist"} style={{ ...(activeTab === "wishlist" ? tabActiveStyle : tabInactiveStyle), padding: "8px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 600 }}>
            위시리스트
          </button>
        </div>
        {activeTab === "all" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap" }}>다 씀 숨기기</span>
            <button
              onClick={() => setHideUsed(!hideUsed)}
              role="switch"
              aria-checked={hideUsed}
              aria-label="다 쓴 향수 숨기기"
              style={{ width: 34, height: 20, border: "none", borderRadius: 999, position: "relative", padding: 0, cursor: "pointer", background: hideUsed ? "var(--accent)" : "var(--border)" }}
            >
              <span style={{ position: "absolute", top: 2, left: hideUsed ? 16 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", boxShadow: "0 1px 2px oklch(0% 0 0 / 0.2)" }} />
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: "4px 20px 24px", flex: 1 }}>
        {activeTab === "all" && visibleItems.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: "60px 30px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6" />
                <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
                <path d="M8 13h8" />
              </svg>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>아직 등록한 향수가 없어요</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
              향수를 등록하면 여기에
              <br />
              내 컬렉션이 쌓여요
            </div>
            <Link href="/collection/new" style={{ marginTop: 4, padding: "12px 22px", borderRadius: 12, background: "var(--accent)", color: "white", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}>
              향수 등록하기
            </Link>
          </div>
        )}

        {activeTab === "all" && viewMode === "grid" && visibleItems.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
            {visibleItems.map((it) => {
              const badge = badgeFor(it.percent, it.isEmpty);
              const displayName = it.label ? `${it.name} (${it.label})` : it.name;
              return (
                <Link key={it.id} href={`/collection/${it.id}`} style={{ textDecoration: "none", color: "inherit", border: "1px solid var(--border-soft)", borderRadius: 16, overflow: "hidden", background: "var(--surface)" }}>
                  <div style={{ position: "relative", aspectRatio: "1/1", background: it.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {BOTTLE_ICON}
                    {badge && (
                      <div style={{ position: "absolute", top: 8, left: 8, padding: "3px 8px", borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.text}</div>
                    )}
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 10 }}>{it.brand}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${it.percent}%`, background: it.isEmpty ? "var(--used-text)" : "var(--accent)" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>{it.percent}%</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {activeTab === "all" && viewMode === "list" && visibleItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleItems.map((it) => {
              const badge = badgeFor(it.percent, it.isEmpty);
              const displayName = it.label ? `${it.name} (${it.label})` : it.name;
              return (
                <Link key={it.id} href={`/collection/${it.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--border-soft)", borderRadius: 14, background: "var(--surface)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 11, background: it.tint, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                      {badge && <div style={{ padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, flexShrink: 0 }}>{badge.text}</div>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 6 }}>{it.brand}</div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: `${it.percent}%`, background: it.isEmpty ? "var(--used-text)" : "var(--accent)" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{it.percent}%</div>
                </Link>
              );
            })}
          </div>
        )}

        {activeTab === "wishlist" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {wishlistItems.length === 0 && <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>위시리스트가 비어있어요</div>}
            {wishlistItems.map((w) => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--border-soft)", borderRadius: 14, background: "var(--surface)" }}>
                <Link href={`/perfume/${w.perfumeId}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 11, background: w.tint, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{w.brand}</div>
                  </div>
                </Link>
                {w.owned ? (
                  <span style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "1.5px solid var(--border)", background: "var(--used-bg)", color: "var(--used-text)" }}>보유중</span>
                ) : (
                  <Link href={`/collection/new?perfumeId=${w.perfumeId}`} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, border: "1.5px solid var(--accent)", background: "var(--surface)", color: "var(--accent-text)", textDecoration: "none" }}>
                    컬렉션에 추가
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/collection/new"
        aria-label="향수 등록하기"
        style={{ position: "fixed", right: 20, bottom: 92, width: 52, height: 52, borderRadius: "50%", background: "var(--accent)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 16px oklch(0% 0 0 / 0.18)", textDecoration: "none" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </Link>

      <BottomNav />
    </div>
  );
}
