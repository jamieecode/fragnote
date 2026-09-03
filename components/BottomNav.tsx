"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { key: "home", label: "홈", href: "/home" },
  { key: "collection", label: "컬렉션", href: "/collection" },
  { key: "rec", label: "추천", href: "/recommend" },
  { key: "stats", label: "통계", href: "/stats" },
  { key: "me", label: "마이", href: "/mypage" },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  collection: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  rec: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  ),
  stats: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  ),
  me: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--surface)", borderTop: "1px solid var(--border-soft)", display: "flex", padding: "8px 4px 12px" }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        const color = active ? "var(--accent)" : "var(--text-faint)";
        return (
          <Link key={item.key} href={item.href} style={{ flex: 1, textDecoration: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 2px", color }}>
              {ICONS[item.key]}
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
