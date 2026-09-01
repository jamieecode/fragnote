"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLabel, deleteCollectionEntry, addUsageLog, adjustPercent } from "./actions";
import type { RiskTier } from "@/lib/collection";

const LABEL_CHOICES = ["정품", "미니어처", "여행용", "없음"];

const BOTTLE_ICON = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

const RISK_COLORS: Record<RiskTier, { bg: string; color: string }> = {
  safe: { bg: "var(--border-soft)", color: "var(--text-muted)" },
  caution: { bg: "var(--accent-soft)", color: "var(--accent-text)" },
  check: { bg: "var(--warn-bg)", color: "var(--warn-text)" },
};

type Item = {
  name: string;
  brand: string;
  tint: string;
  familyLabel: string;
  isPreOwned: boolean;
  label: string | null;
  percent: number;
  wasManuallyAdjusted: boolean;
};

type Log = { id: string; date: string; location: string; sprays: number };
type Risk = { tier: RiskTier; badge: string; text: string } | null;

export default function DetailView({
  collectionId,
  item,
  openedMonths,
  risk,
  logs,
}: {
  collectionId: string;
  item: Item;
  openedMonths: number;
  risk: Risk;
  logs: Log[];
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(item.label ?? "없음");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [currentLabel, setCurrentLabel] = useState(item.label);
  const [percent, setPercent] = useState(item.percent);
  const [wasManuallyAdjusted, setWasManuallyAdjusted] = useState(item.wasManuallyAdjusted);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustDraft, setAdjustDraft] = useState(item.percent);
  const [savingAdjust, setSavingAdjust] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formSprays, setFormSprays] = useState(3);
  const [formLocation, setFormLocation] = useState<"실외" | "실내">("실외");
  const [savingLog, setSavingLog] = useState(false);
  const [localLogs, setLocalLogs] = useState(logs);

  const displayName = currentLabel ? `${item.name} (${currentLabel})` : item.name;

  const [labelError, setLabelError] = useState<string | null>(null);
  const [savingLabel, setSavingLabel] = useState(false);

  const saveLabel = async () => {
    setSavingLabel(true);
    setLabelError(null);
    try {
      await updateLabel(collectionId, labelDraft);
      setCurrentLabel(labelDraft === "없음" ? null : labelDraft);
      setEditingLabel(false);
    } catch {
      setLabelError("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSavingLabel(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteCollectionEntry(collectionId);
      router.push("/collection");
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const commitAdjust = async () => {
    setSavingAdjust(true);
    try {
      await adjustPercent(collectionId, adjustDraft);
      setPercent(adjustDraft);
      setWasManuallyAdjusted(true);
      setAdjusting(false);
    } finally {
      setSavingAdjust(false);
    }
  };

  const saveLog = async () => {
    setSavingLog(true);
    try {
      const newPercent = await addUsageLog(collectionId, formSprays, formLocation);
      setLocalLogs([{ id: `temp-${Date.now()}`, date: "오늘", location: formLocation, sprays: formSprays }, ...localLogs]);
      setPercent(newPercent);
      setShowForm(false);
      setFormSprays(3);
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 4px", position: "relative" }}>
        <button onClick={() => router.back()} aria-label="뒤로" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", border: "none", background: "none", cursor: "pointer" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="더보기" aria-expanded={menuOpen} style={{ width: 32, height: 32, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></svg>
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", top: 36, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 24px oklch(0% 0 0 / 0.08)", overflow: "hidden", zIndex: 10, minWidth: 140 }}>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setLabelDraft(currentLabel ?? "없음");
                  setEditingLabel(true);
                }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", background: "var(--surface)", fontSize: 13, color: "var(--text)", cursor: "pointer" }}
              >
                라벨 수정
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmingDelete(true);
                }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", border: "none", background: "var(--surface)", fontSize: 13, color: "var(--danger)", cursor: "pointer" }}
              >
                이 항목 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmingDelete && (
        <div style={{ margin: "8px 20px 0", padding: "14px 16px", border: "1px solid var(--danger-soft)", background: "var(--danger-soft)", borderRadius: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>정말 삭제하시겠어요? 사용 기록도 함께 사라져요</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmingDelete(false)} style={{ flex: 1, padding: 10, border: "1.5px solid var(--border)", borderRadius: 10, background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              취소
            </button>
            <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, padding: 10, border: "none", borderRadius: 10, background: "var(--danger)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
              {deleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "8px 20px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 76, height: 76, borderRadius: 18, background: item.tint, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{item.brand}</div>
          <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>{displayName}</div>
          <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "var(--border-soft)", color: "var(--text-muted)" }}>{item.familyLabel}</div>
        </div>
      </div>

      {editingLabel && (
        <div style={{ margin: "0 20px 20px", padding: "14px 16px", border: "1px solid var(--border-soft)", borderRadius: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>라벨 선택</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {LABEL_CHOICES.map((label) => {
              const active = labelDraft === label;
              return (
                <button
                  key={label}
                  onClick={() => setLabelDraft(label)}
                  style={{ padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: active ? "var(--accent-soft)" : "var(--surface)", color: active ? "var(--accent-text)" : "var(--text-muted)" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {labelError && <div style={{ marginBottom: 10, fontSize: 12.5, color: "var(--danger)" }}>{labelError}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditingLabel(false)} style={{ flex: 1, padding: 11, border: "1.5px solid var(--border)", borderRadius: 10, background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              취소
            </button>
            <button onClick={saveLabel} disabled={savingLabel} style={{ flex: 1, padding: 11, border: "none", borderRadius: 10, background: "var(--accent)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: savingLabel ? 0.6 : 1 }}>
              {savingLabel ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}

      {item.isPreOwned && (
        <div style={{ margin: "0 20px 20px", padding: "12px 14px", borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent-text)", fontSize: 12.5, lineHeight: 1.6 }}>
          이 향수는 등록 전부터 쓰던 향수예요 · 등록 이전 사용 이력은 통계에 반영되지 않아요
        </div>
      )}

      <div style={{ margin: "0 20px 16px", padding: 18, border: "1px solid var(--border-soft)", borderRadius: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>남은 잔량</div>
          <button
            onClick={() => {
              setAdjustDraft(percent);
              setAdjusting(!adjusting);
            }}
            style={{ border: "none", background: "none", fontSize: 12, color: "var(--accent-text)", fontWeight: 600, padding: 2, cursor: "pointer" }}
          >
            {adjusting ? "완료" : "직접 보정하기"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 32 }}>{adjusting ? adjustDraft : percent}</span>
          <span style={{ fontSize: 16, color: "var(--text-muted)" }}>%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--border-soft)", overflow: "hidden", marginBottom: 4 }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${adjusting ? adjustDraft : percent}%`, background: "var(--accent)" }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{wasManuallyAdjusted ? "방금 직접 보정했어요" : "스프레이 횟수 기반 자동 추정치예요"}</div>

        {adjusting && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
            <input type="range" min={0} max={100} value={adjustDraft} onChange={(e) => setAdjustDraft(Number(e.target.value))} style={{ width: "100%" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>슬라이더로 실제 남은 만큼 직접 보정해보세요</div>
              <button onClick={commitAdjust} disabled={savingAdjust} style={{ flexShrink: 0, padding: "6px 12px", border: "none", borderRadius: 8, background: "var(--accent)", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: savingAdjust ? 0.6 : 1 }}>
                {savingAdjust ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}
      </div>

      {risk && (
        <div style={{ margin: "0 20px 16px", padding: "14px 16px", border: "1px solid var(--border-soft)", borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: RISK_COLORS[risk.tier].bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: RISK_COLORS[risk.tier].color }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>개봉한 지 {openedMonths}개월</div>
            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{risk.text}</div>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: RISK_COLORS[risk.tier].bg, color: RISK_COLORS[risk.tier].color, flexShrink: 0 }}>{risk.badge}</div>
        </div>
      )}

      <div style={{ padding: "8px 20px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>사용 기록</div>
          <button onClick={() => setShowForm(!showForm)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "none", fontSize: 12.5, color: "var(--accent-text)", fontWeight: 700, padding: 2, cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            사용 기록 추가
          </button>
        </div>

        {showForm && (
          <div style={{ padding: 16, border: "1px solid var(--border-soft)", borderRadius: 14, marginBottom: 16, background: "var(--surface)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>스프레이 횟수</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <button onClick={() => setFormSprays(Math.max(1, formSprays - 1))} aria-label="횟수 줄이기" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16, cursor: "pointer" }}>
                −
              </button>
              <div style={{ fontWeight: 700, fontSize: 22, minWidth: 24, textAlign: "center" }}>{formSprays}</div>
              <button onClick={() => setFormSprays(Math.min(10, formSprays + 1))} aria-label="횟수 늘리기" style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 16, cursor: "pointer" }}>
                +
              </button>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>어디서 뿌렸나요?</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {(["실외", "실내"] as const).map((loc) => {
                const active = formLocation === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => setFormLocation(loc)}
                    style={{ padding: "8px 16px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)", background: active ? "var(--accent-soft)" : "var(--surface)", color: active ? "var(--accent-text)" : "var(--text-muted)" }}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
            <button onClick={saveLog} disabled={savingLog} style={{ width: "100%", padding: 13, border: "none", borderRadius: 12, background: "var(--accent)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: savingLog ? 0.6 : 1 }}>
              {savingLog ? "저장 중..." : "저장"}
            </button>
          </div>
        )}

        <div style={{ position: "relative", paddingLeft: 20 }}>
          {localLogs.length > 0 && <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 1.5, background: "var(--border-soft)" }} />}
          {localLogs.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>아직 사용 기록이 없어요</div>}
          {localLogs.map((log) => (
            <div key={log.id} style={{ position: "relative", paddingBottom: 18 }}>
              <div style={{ position: "absolute", left: -20, top: 4, width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{log.date}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {log.location} · {log.sprays}회
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
