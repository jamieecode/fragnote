"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { WEEKDAY_HEADERS, type CalendarCell } from "@/lib/stats-helpers";

type MonthlyEntry = { label: string; count: number };
type RankingEntry = { name: string; brand: string; count: number };

const TABS = [
  { key: "calendar", label: "캘린더" },
  { key: "frequency", label: "빈도" },
  { key: "ranking", label: "랭킹" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function StatsView({
  hasData,
  thisMonthCount,
  topPerfumeName,
  calendar,
  calendarLabel,
  monthly,
  seasonal,
  ranking,
}: {
  hasData: boolean;
  thisMonthCount: number;
  topPerfumeName: string;
  calendar: CalendarCell[];
  calendarLabel: string;
  monthly: MonthlyEntry[];
  seasonal: MonthlyEntry[];
  ranking: RankingEntry[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("calendar");
  const [showTable, setShowTable] = useState(false);
  const [activeCalDay, setActiveCalDay] = useState<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);

  if (!hasData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
        <div style={{ padding: "24px 20px 4px" }}>
          <div style={{ fontWeight: 700, fontSize: 24 }}>통계</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: "40px 30px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M12 20V4M20 20v-7" /></svg>
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>아직 쌓인 데이터가 없어요</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
            향수를 사용하고 기록을 남기면
            <br />
            여기에 나만의 통계가 쌓여요
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const dayCell = activeCalDay != null ? (calendar.find((c) => !c.blank && c.day === activeCalDay) as Extract<CalendarCell, { blank: false }> | undefined) : null;
  const calActiveLabel = dayCell ? `${dayCell.day}일 · ${dayCell.count}회` : calendarLabel;

  const monthMax = Math.max(1, ...monthly.map((m) => m.count));
  const seasonMax = Math.max(1, ...seasonal.map((s) => s.count));
  const rankMax = Math.max(1, ...ranking.map((r) => r.count));

  const renderBarChart = (
    data: MonthlyEntry[],
    max: number,
    active: number | null,
    setActive: (i: number | null) => void,
    height: number
  ) => (
    <div style={{ padding: "14px 20px 4px" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: data.length > 4 ? 8 : 10 }}>
        {data.map((d, i) => {
          const isActive = active === i;
          return (
            <button
              key={d.label}
              onClick={() => setActive(isActive ? null : i)}
              aria-pressed={isActive}
              aria-label={`${d.label} ${d.count}회`}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <div style={{ height: 15, fontSize: 10, fontWeight: 700, color: "var(--text)" }} aria-live="polite">
                {isActive ? `${d.count}회` : ""}
              </div>
              <div style={{ height, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", borderRadius: "5px 5px 0 0", background: isActive ? "var(--text)" : "var(--border)", height: `${Math.round((d.count / max) * 100)}%` }} />
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 7 }}>{d.label}</div>
            </button>
          );
        })}
      </div>
      <div style={{ height: 1, background: "var(--border-soft)", marginTop: 2 }} />
    </div>
  );

  const renderTable = (data: MonthlyEntry[]) => (
    <div style={{ padding: "10px 20px 4px", display: "flex", flexDirection: "column" }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ borderTop: i > 0 ? "1px solid var(--border-soft)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{d.label}</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{d.count}회</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 84 }}>
      <div style={{ padding: "24px 20px 4px" }}>
        <div style={{ fontWeight: 700, fontSize: 24 }}>통계</div>
      </div>

      <div style={{ padding: "8px 20px 4px", display: "flex", gap: 10 }}>
        <div style={{ flex: 1, padding: 16, border: "1px solid var(--border-soft)", borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>이번 달 사용</div>
          <div style={{ fontWeight: 700, fontSize: 24 }}>
            {thisMonthCount}
            <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}>회</span>
          </div>
        </div>
        <div style={{ flex: 1, padding: 16, border: "1px solid var(--border-soft)", borderRadius: 16 }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6 }}>최다 사용 향수</div>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topPerfumeName}</div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0", display: "flex", borderBottom: "1.5px solid var(--border-soft)" }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              role="tab"
              aria-selected={active}
              style={{ flex: 1, padding: "10px 0", border: "none", background: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", color: active ? "var(--text)" : "var(--text-faint)", borderBottom: `2px solid ${active ? "var(--text)" : "transparent"}`, marginBottom: -1.5 }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "calendar" && (
        <>
          <div style={{ padding: "20px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>사용 캘린더</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }} aria-live="polite">
              {calActiveLabel}
            </div>
          </div>
          <div style={{ padding: "10px 20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
              {WEEKDAY_HEADERS.map((w) => (
                <div key={w} style={{ textAlign: "center", fontSize: 10.5, color: "var(--text-faint)" }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {calendar.map((c, i) => {
                if (c.blank) return <div key={`b${i}`} />;
                const active = activeCalDay === c.day;
                const hasLog = c.count > 0;
                return (
                  <button
                    key={c.day}
                    onClick={c.isFuture ? undefined : () => setActiveCalDay(active ? null : c.day)}
                    disabled={c.isFuture}
                    aria-label={`${c.day}일${hasLog ? ` ${c.count}회 기록` : " 기록 없음"}`}
                    aria-pressed={active}
                    style={{
                      border: c.isToday ? "2px solid var(--text)" : "none",
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "50%",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11.5,
                      cursor: c.isFuture ? "default" : "pointer",
                      background: active ? "var(--accent)" : hasLog ? "var(--accent-soft)" : "none",
                      color: active ? "var(--surface)" : c.isFuture ? "var(--text-faint)" : hasLog ? "var(--text)" : "var(--text-muted)",
                      fontWeight: c.isToday || active ? 700 : 400,
                    }}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent-soft)" }} />
              <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>기록한 날</span>
              <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--text)", marginLeft: 10 }} />
              <span style={{ fontSize: 10.5, color: "var(--text-faint)" }}>오늘</span>
            </div>
          </div>
        </>
      )}

      {activeTab === "frequency" && (
        <>
          <div style={{ padding: "20px 20px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>월별 사용 빈도</div>
            <button onClick={() => setShowTable(!showTable)} style={{ border: "none", background: "none", fontSize: 11.5, color: "var(--accent-text)", fontWeight: 600, padding: 2, cursor: "pointer" }}>
              {showTable ? "차트로 보기" : "표로 보기"}
            </button>
          </div>
          {showTable ? renderTable(monthly) : renderBarChart(monthly, monthMax, activeMonth, setActiveMonth, 110)}

          <div style={{ padding: "24px 20px 4px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>계절별 패턴</div>
          </div>
          {showTable ? renderTable(seasonal) : renderBarChart(seasonal, seasonMax, activeSeason, setActiveSeason, 90)}
        </>
      )}

      {activeTab === "ranking" && (
        <div style={{ padding: "20px 20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>최다 사용 향수</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ranking.map((r, i) => (
              <div key={r.name + r.brand} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, fontSize: 12.5, fontWeight: 700, color: "var(--text-faint)", flexShrink: 0, textAlign: "center" }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-faint)", flexShrink: 0, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{r.count}회</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.round((r.count / rankMax) * 100)}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
