"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getWeatherAdjustedDaily, type HomeRecItem } from "./weather-actions";
import { CITIES, type WeatherSnapshot } from "@/lib/weather-rules";

const BOTTLE_ICON = (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

type RecentItem = { name: string; tint: string; dateLabel: string; sprays: number };
type LocationMode = "pending" | "granted" | "denied";

const DEFAULT_CITY = CITIES[0].name;

export default function HomeView({
  todayLabel,
  nickname,
  recItems: initialRecItems,
  recent,
}: {
  todayLabel: string;
  nickname: string;
  recItems: HomeRecItem[];
  recent: RecentItem[];
}) {
  const [recIndex, setRecIndex] = useState(0);
  const [recItems, setRecItems] = useState(initialRecItems);
  const [locationMode, setLocationMode] = useState<LocationMode>("pending");
  const [selectedCity, setSelectedCity] = useState<string>(DEFAULT_CITY);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);

  // 도시를 빠르게 여러 번 바꾸면 먼저 보낸(느린) 요청의 응답이 나중에 도착해
  // 최신 선택을 덮어쓸 수 있다 — 매 호출마다 토큰을 증가시키고, 응답이 왔을 때
  // 그사이 더 최신 요청이 없었는지 확인해서 오래된 응답은 버린다.
  const requestIdRef = useRef(0);
  const cancelledRef = useRef(false);

  const refresh = async (lat: number, lon: number) => {
    const requestId = ++requestIdRef.current;
    try {
      const result = await getWeatherAdjustedDaily(lat, lon, Math.max(1, initialRecItems.length));
      // 더 최신 요청이 이미 진행 중이었거나, 그사이 화면을 벗어났으면 이 결과는 버린다.
      if (requestId !== requestIdRef.current || cancelledRef.current) return;
      setWeather(result.weather);
      if (result.items.length > 0) setRecItems(result.items);
    } catch {
      // 실패해도 서버가 이미 내려준 기본 추천을 그대로 보여주면 되니 조용히 무시한다.
    }
  };

  const applyFallbackCity = (city: string) => {
    // CITIES에 없는 이름이 들어오면(예: 저장된 값이 오래돼 목록과 안 맞는 경우) CITIES[0]로
    // 대체하는데, 이때 화면에 보여줄 도시명도 실제로 좌표를 가져오는 도시와 반드시 맞춘다
    // (안 그러면 "제주"라고 표시해놓고 서울 날씨를 보여주는 식으로 어긋날 수 있음).
    const found = CITIES.find((c) => c.name === city) ?? CITIES[0];
    setLocationMode("denied");
    setSelectedCity(found.name);
    try {
      localStorage.setItem("homeCity", found.name);
    } catch {
      // 프라이빗 브라우징 등으로 저장 실패해도 이번 세션 표시엔 지장 없음
    }
    refresh(found.lat, found.lon);
  };

  useEffect(() => {
    // 컴포넌트 스코프의 cancelledRef를 그대로 쓴다 — refresh()도 같은 플래그를 봐야
    // (언마운트 후 도착한 응답으로 setState하지 않도록) 하나로 통일한다.
    cancelledRef.current = false;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // geolocation API 자체가 없는 아주 예외적인 경우 — getCurrentPosition의 실패
      // 콜백과 같은 형태(비동기 경계 이후)로 처리해 렌더 중 즉시 setState를 피한다.
      Promise.resolve().then(() => {
        if (!cancelledRef.current) applyFallbackCity(DEFAULT_CITY);
      });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelledRef.current) return;
          setLocationMode("granted");
          refresh(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (cancelledRef.current) return;
          let saved: string = DEFAULT_CITY;
          try {
            saved = localStorage.getItem("homeCity") || DEFAULT_CITY;
          } catch {
            // 저장된 값을 못 읽어도 기본 도시로 진행
          }
          applyFallbackCity(saved);
        },
        { timeout: 6000 }
      );
    }

    // 두 분기 모두에서 동일하게 cleanup이 등록되도록 함수 끝에서 한 번만 반환한다
    // (이전엔 geolocation이 없는 분기가 일찍 return해 cleanup이 등록되지 않았음).
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rec = recItems[recIndex % Math.max(1, recItems.length)];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      <div style={{ padding: "24px 20px 4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{todayLabel}</div>
          <div style={{ fontWeight: 700, fontSize: 24 }}>안녕하세요{nickname ? `, ${nickname}님` : ""}</div>
        </div>
        <Link href="/mypage" aria-label="마이페이지로 이동" style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21a8 8 0 1 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>

      {locationMode !== "pending" && (
        <div style={{ padding: "10px 20px 4px", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)" }}>
          {locationMode === "granted" ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{weather ? `현재 위치 · ${weather.label} ${weather.tempC}°` : "현재 위치"}</span>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <span style={{ color: "var(--text-faint)" }}>위치 정보를 사용할 수 없어요 ·</span>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setCityMenuOpen(!cityMenuOpen)}
                  aria-label="도시 선택"
                  aria-expanded={cityMenuOpen}
                  style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, color: "var(--text)", cursor: "pointer" }}
                >
                  {selectedCity}
                  {weather && ` · ${weather.label} ${weather.tempC}°`}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {cityMenuOpen && (
                  <>
                    <div onClick={() => setCityMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                    <div style={{ position: "absolute", top: 34, left: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 10px 24px oklch(0% 0 0 / 0.08)", overflow: "hidden", zIndex: 21, minWidth: 120 }}>
                      {CITIES.map((c) => (
                        <button
                          key={c.name}
                          onClick={() => {
                            setCityMenuOpen(false);
                            applyFallbackCity(c.name);
                          }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "var(--surface)", fontSize: 13, color: "var(--text)", cursor: "pointer" }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
