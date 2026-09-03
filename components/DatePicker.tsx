"use client";

import { useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toValue(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseValue(value: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  disableFuture = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disableFuture?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parseValue(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const openPicker = () => {
    setViewYear(parsed?.year ?? today.getFullYear());
    setViewMonth(parsed?.month ?? today.getMonth());
    setOpen(true);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = toValue(today.getFullYear(), today.getMonth(), today.getDate());

  const displayLabel = parsed ? `${parsed.year}년 ${parsed.month + 1}월 ${parsed.day}일` : "";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={openPicker}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1.5px solid var(--border)",
          borderRadius: 12,
          padding: "13px 14px",
          fontSize: 14.5,
          background: "var(--surface)",
          color: displayLabel ? "var(--text)" : "var(--text-faint)",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>{displayLabel || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 21,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              boxShadow: "0 10px 24px oklch(0% 0 0 / 0.1)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button type="button" onClick={goPrevMonth} aria-label="이전 달" style={{ border: "none", background: "none", padding: 4, cursor: "pointer", color: "var(--text)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
              </button>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                {viewYear}년 {viewMonth + 1}월
              </div>
              <button type="button" onClick={goNextMonth} aria-label="다음 달" style={{ border: "none", background: "none", padding: 4, cursor: "pointer", color: "var(--text)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
              {WEEKDAYS.map((w) => (
                <div key={w} style={{ textAlign: "center", fontSize: 10.5, color: "var(--text-faint)", padding: "4px 0" }}>
                  {w}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
              {Array.from({ length: firstWeekday }, (_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const key = toValue(viewYear, viewMonth, day);
                const isSelected = key === value;
                const isFuture = disableFuture && key > todayKey;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isFuture}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    style={{
                      aspectRatio: "1",
                      border: "none",
                      borderRadius: "50%",
                      fontSize: 12.5,
                      cursor: isFuture ? "default" : "pointer",
                      background: isSelected ? "var(--accent)" : "none",
                      color: isSelected ? "var(--surface)" : isFuture ? "var(--text-faint)" : "var(--text)",
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
