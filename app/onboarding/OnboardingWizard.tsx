"use client";

import { useState } from "react";
import type { NoteFamily } from "@prisma/client";
import Link from "next/link";
import { saveTastePreferences } from "./actions";
import { pageStyle, centeredMessageStyle, primaryButtonStyle } from "@/lib/ui-styles";

// example: 계열 이름이 생소한 사람도 감 잡을 수 있게 붙이는 대표 노트 예시
const FAMILIES: Record<NoteFamily, { label: string; example: string; tint: string }> = {
  CITRUS: { label: "시트러스", example: "베르가못 · 레몬처럼 상큼한 향", tint: "oklch(91% 0.025 95)" },
  FLORAL: { label: "플로럴", example: "장미 · 자스민 같은 꽃향", tint: "oklch(91% 0.02 350)" },
  WOODY: { label: "우디", example: "샌달우드 · 시더 같은 나무향", tint: "oklch(87% 0.015 60)" },
  ORIENTAL_AMBER: { label: "오리엔탈 · 앰버", example: "바닐라 · 앰버처럼 따뜻하고 짙은 향", tint: "oklch(89% 0.025 50)" },
  FRESH: { label: "프레시", example: "바다 · 풀잎처럼 청량한 향", tint: "oklch(91% 0.02 210)" },
  FOUGERE: { label: "푸제르", example: "라벤더 · 이끼가 어우러진 마른 향", tint: "oklch(89% 0.02 140)" },
  CHYPRE: { label: "시프레", example: "이끼 · 가죽 느낌의 중후한 향", tint: "oklch(88% 0.018 300)" },
  GOURMAND: { label: "구르망", example: "카라멜 · 초콜릿 같은 달콤한 향", tint: "oklch(89% 0.022 70)" },
};

const QUESTIONS: { title: string; options: NoteFamily[] }[] = [
  { title: "지금 끌리는 향의 느낌은 무엇인가요?", options: ["CITRUS", "FLORAL", "WOODY", "ORIENTAL_AMBER"] },
  { title: "산뜻하고 깨끗한 향, 좋아하세요?", options: ["FRESH", "FOUGERE", "CITRUS", "CHYPRE"] },
  { title: "특별한 자리엔 어떤 향을 뿌리고 싶나요?", options: ["ORIENTAL_AMBER", "CHYPRE", "GOURMAND", "FLORAL"] },
  { title: "여름엔 어떤 향에 손이 가나요?", options: ["CITRUS", "FRESH", "FOUGERE", "FLORAL"] },
  { title: "겨울에 어울리는 묵직한 향은?", options: ["WOODY", "ORIENTAL_AMBER", "GOURMAND", "CHYPRE"] },
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<NoteFamily[][]>([[], [], [], [], []]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  if (done) {
    return (
      <div style={pageStyle}>
        <div style={centeredMessageStyle}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 26, marginBottom: 8 }}>취향 설정 완료</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              고른 취향으로 향수를 추천해드릴게요
              <br />
              언제든 마이페이지에서 다시 설정할 수 있어요
            </div>
          </div>
          <Link href="/home" style={{ ...primaryButtonStyle, textDecoration: "none", display: "inline-block" }}>
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  const selected = answers[step];

  const toggle = (id: NoteFamily) => {
    setAnswers((prev) =>
      prev.map((arr, i) => (i !== step ? arr : arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]))
    );
  };

  const goBack = () => {
    setError(null);
    setAuthExpired(false);
    setStep(step - 1);
  };

  const next = async () => {
    if (saving || selected.length === 0) return;
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    setError(null);
    setAuthExpired(false);
    try {
      await saveTastePreferences(answers);
      setDone(true);
    } catch (e) {
      if (e instanceof Error && e.message === "로그인이 필요해요") {
        setAuthExpired(true);
        setError("로그인이 만료됐어요. 다시 로그인해주세요.");
      } else {
        setError("저장에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...pageStyle, padding: "28px 20px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
        <div style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center" }}>
          {step > 0 && (
            <button
              onClick={goBack}
              aria-label="이전 질문으로"
              style={{ width: 32, height: 32, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "var(--accent)" : "var(--border-soft)" }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {step + 1} / {QUESTIONS.length}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 27, lineHeight: 1.35, marginBottom: 10 }}>{q.title}</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 28 }}>하나 이상 골라주세요</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
          {q.options.map((id) => {
            const fam = FAMILIES[id];
            const isSel = selected.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                aria-pressed={isSel}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: 16,
                  minHeight: 124,
                  borderRadius: 14,
                  border: `1.5px solid ${isSel ? "var(--accent)" : "var(--border)"}`,
                  background: isSel ? "var(--accent-soft)" : "var(--surface)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: fam.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 3h6" />
                      <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
                      <path d="M8 13h8" />
                    </svg>
                  </div>
                  {isSel && (
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>{fam.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.4 }}>{fam.example}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {error && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--danger)", textAlign: "center" }}>{error}</div>}

        {authExpired ? (
          <Link
            href="/"
            style={{ marginTop: 0, width: "100%", padding: 16, borderRadius: 14, background: "var(--accent)", color: "white", fontSize: 15.5, fontWeight: 700, textAlign: "center", textDecoration: "none", display: "block", boxSizing: "border-box" }}
          >
            로그인 화면으로 이동
          </Link>
        ) : (
          <button
            onClick={next}
            disabled={selected.length === 0 || saving}
            style={{ marginTop: error ? 0 : 28, width: "100%", padding: 16, border: "none", borderRadius: 14, background: "var(--accent)", color: "white", fontSize: 15.5, fontWeight: 700, cursor: "pointer", opacity: selected.length === 0 || saving ? 0.38 : 1 }}
          >
            {saving ? "저장 중..." : step === QUESTIONS.length - 1 ? "시작하기" : "다음"}
          </button>
        )}
      </div>
    </div>
  );
}
