"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/lib/wishlist-actions";

const HEART_PATH = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";

const BOTTLE_ICON = (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

type NoteSection = { label: string; notes: { name: string; intensity: number }[] };
type SimilarItem = { id: string; name: string; brand: string; tint: string };

export default function PerfumeDetailView({
  perfumeId,
  name,
  nameEn,
  brand,
  brandEn,
  tint,
  familyLabel,
  noteSections,
  owned,
  initialWished,
  similar,
}: {
  perfumeId: string;
  name: string;
  nameEn: string | null;
  brand: string;
  brandEn: string | null;
  tint: string;
  familyLabel: string;
  noteSections: NoteSection[];
  owned: boolean;
  initialWished: boolean;
  similar: SimilarItem[];
}) {
  const router = useRouter();
  const [wished, setWished] = useState(initialWished);
  const [pending, setPending] = useState(false);

  const toggleWish = async () => {
    if (pending) return;
    setPending(true);
    const prev = wished;
    setWished(!prev);
    try {
      await toggleWishlist(perfumeId);
    } catch {
      setWished(prev);
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 4px" }}>
        <button onClick={() => router.back()} aria-label="뒤로" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", border: "none", background: "none", cursor: "pointer" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button onClick={toggleWish} aria-label={wished ? "위시리스트에서 제거" : "위시리스트에 추가"} style={{ border: "none", background: "none", padding: 4, display: "flex", cursor: "pointer" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={wished ? "var(--text)" : "none"} stroke={wished ? "var(--text)" : "var(--text-faint)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={HEART_PATH} />
          </svg>
        </button>
      </div>

      <div style={{ padding: "8px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: 24, background: tint, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{BOTTLE_ICON(40)}</div>
        {owned && (
          <div style={{ marginBottom: 8, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "var(--used-bg)", color: "var(--used-text)" }}>보유중</div>
        )}
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
          {brand}
          {brandEn && ` · ${brandEn}`}
        </div>
        <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>{name}</div>
        {nameEn && <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 10 }}>{nameEn}</div>}
        <div style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--border-soft)", color: "var(--text-muted)" }}>{familyLabel}</div>
      </div>

      <div style={{ padding: "0 20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>노트 구성</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {noteSections.map((section) =>
            section.notes.length > 0 ? (
              <div key={section.label}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{section.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {section.notes.map((n) => (
                    <div key={n.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 12.5, width: 84, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.name}</div>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${(n.intensity / 5) * 100}%`, background: "var(--accent)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
          {noteSections.every((s) => s.notes.length === 0) && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>등록된 노트 정보가 없어요</div>}
        </div>
      </div>

      {similar.length > 0 && (
        <div style={{ padding: "0 20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>비슷한 계열의 향수</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {similar.map((s) => (
              <Link key={s.id} href={`/perfume/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: 11, border: "1px solid var(--border-soft)", borderRadius: 14, background: "var(--surface)", textDecoration: "none", color: "inherit" }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: s.tint, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON(18)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{s.brand}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 20px" }}>
        <Link
          href={`/collection/new?perfumeId=${perfumeId}`}
          style={{ display: "block", width: "100%", boxSizing: "border-box", textAlign: "center", padding: 16, border: "none", borderRadius: 14, background: "var(--accent)", color: "white", fontSize: 15.5, fontWeight: 700, textDecoration: "none" }}
        >
          컬렉션에 추가
        </Link>
      </div>
    </div>
  );
}
