"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { searchCatalog, createCollectionEntry, uploadCollectionPhoto, type CatalogResult } from "./actions";

type Selected = { id: string; name: string; brand: string; tint: string };

const PRESETS = [
  { label: "새 것", value: 100 },
  { label: "약간 사용", value: 80 },
  { label: "절반", value: 50 },
  { label: "얼마 안 남음", value: 25 },
  { label: "거의 다 씀", value: 10 },
];

const BOTTLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(35% 0.01 250 / 0.55)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" />
    <path d="M10 3v3.5a1 1 0 0 1-.4.8L8 8.6A2 2 0 0 0 7 10.2V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-8.8a2 2 0 0 0-1-1.6l-1.6-1.3a1 1 0 0 1-.4-.8V3" />
    <path d="M8 13h8" />
  </svg>
);

type Step = "search" | "preowned" | "amount" | "details" | "done";

export default function RegisterWizard({ initialPerfume }: { initialPerfume: Selected | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialPerfume ? "preowned" : "search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [selected, setSelected] = useState<Selected | null>(initialPerfume);
  const [isPreOwned, setIsPreOwned] = useState(false);
  const [amountPercent, setAmountPercent] = useState(50);
  const [volume, setVolume] = useState("100");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [price, setPrice] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewUrlRef = useRef<string | null>(null);

  const pickPhoto = (file: File | null) => {
    setPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      const next = file ? URL.createObjectURL(file) : null;
      photoPreviewUrlRef.current = next;
      return next;
    });
    setPhotoFile(file);
    // 같은 파일을 지웠다가 다시 고를 때도 change 이벤트가 발생하도록 초기화한다.
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // 등록 완료 후 "상세보기"로 이동해 이 컴포넌트가 언마운트될 때도
  // 마지막으로 만든 미리보기 objectURL을 정리한다.
  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== "search") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await searchCatalog(query);
      if (!cancelled) setResults(r);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, step]);

  const titles: Record<Step, string> = { search: "향수 찾기", preowned: "등록 정보", amount: "잔량 설정", details: "세부 정보", done: "" };

  const back = () => {
    if (step === "preowned") setStep("search");
    else if (step === "amount") setStep("preowned");
    else if (step === "details") setStep(isPreOwned ? "amount" : "preowned");
  };

  const finish = async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    // 사진 업로드가 실패해도(용량 초과, 네트워크 오류 등) 등록 자체는 막지 않는다 —
    // 사진 없이라도 등록은 성공해야 하므로 별도 try로 감싸 상위 catch로 전파되지 않게 한다.
    let photoUrl: string | null = null;
    if (photoFile) {
      try {
        const formData = new FormData();
        formData.set("photo", photoFile);
        photoUrl = await uploadCollectionPhoto(formData);
      } catch {
        photoUrl = null;
      }
    }
    try {
      const id = await createCollectionEntry({
        perfumeId: selected.id,
        isPreOwned,
        amountPercent,
        volumeMl: Number(volume) || 100,
        purchasedAt,
        price: price ? Number(price) : null,
        photoUrl,
      });
      setStep("done");
      router.prefetch(`/collection/${id}`);
      // 아래 done 화면의 링크가 방금 만든 id를 참조해야 하므로 상태에 저장해둔다.
      setCreatedId(id);
    } catch {
      setSubmitError("등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setStep("search");
    setQuery("");
    setSelected(null);
    setIsPreOwned(false);
    setAmountPercent(50);
    setVolume("100");
    setPurchasedAt("");
    setPrice("");
    pickPhoto(null);
    setCreatedId(null);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {step !== "done" && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "22px 20px 8px" }}>
          <div style={{ width: 32, height: 32, flexShrink: 0 }}>
            {step !== "search" && (
              <button onClick={back} aria-label="이전 단계로" style={{ width: 32, height: 32, border: "none", background: "none", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{titles[step]}</div>
        </div>
      )}

      {step === "search" && (
        <div style={{ padding: "8px 20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", display: "flex" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="브랜드 또는 향수명 검색"
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 12, padding: "13px 14px 13px 40px", fontSize: 14.5, color: "var(--text)", background: "var(--surface)" }}
            />
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>{query.trim() === "" ? "전체 향수" : "검색 결과"}</div>

          {results.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setStep("preowned");
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 11, border: "1px solid var(--border-soft)", borderRadius: 14, background: "var(--surface)", textAlign: "left", cursor: "pointer" }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: p.tint, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{BOTTLE_ICON}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>
                      {p.name}
                      {p.nameEn && <span style={{ fontWeight: 400, color: "var(--text-muted)" }}> · {p.nameEn}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                      {p.brand}
                      {p.brandEn && ` · ${p.brandEn}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: "40px 20px" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>현재 지원하지 않는 향수예요</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
                아직 카탈로그에 없는 향수예요
                <br />
                다른 검색어로 다시 시도해보세요
              </div>
            </div>
          )}
        </div>
      )}

      {step === "preowned" && selected && (
        <div style={{ padding: "8px 20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, border: "1px solid var(--border-soft)", borderRadius: 14, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: selected.tint, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{selected.brand}</div>
            </div>
            <button onClick={() => setStep("search")} style={{ flexShrink: 0, border: "none", background: "none", fontSize: 12, color: "var(--accent-text)", fontWeight: 600, padding: 4, cursor: "pointer" }}>
              다시 검색
            </button>
          </div>

          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>이미 쓰던 향수인가요?</div>
          <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 24 }}>잔량을 정확히 기록하기 위해 확인할게요</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => {
                setIsPreOwned(false);
                setAmountPercent(100);
                setStep("details");
              }}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, border: "1.5px solid var(--border)", borderRadius: 16, background: "var(--surface)", textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>새 향수예요</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>처음 뜯는 향수, 잔량 100%로 시작해요</div>
              </div>
            </button>
            <button
              onClick={() => {
                setIsPreOwned(true);
                setStep("amount");
              }}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, border: "1.5px solid var(--border)", borderRadius: 16, background: "var(--surface)", textAlign: "left", cursor: "pointer" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {BOTTLE_ICON}
              </div>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>쓰던 향수예요</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>이미 쓰고 있던 향수, 남은 만큼 기록해요</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {step === "amount" && (
        <div style={{ padding: "8px 20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>잔량이 얼마나 남았나요?</div>
          <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 32 }}>정확하지 않아도 괜찮아요, 나중에 다시 조정할 수 있어요</div>

          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ fontWeight: 700, fontSize: 44 }}>{amountPercent}</span>
            <span style={{ fontSize: 20, color: "var(--text-muted)" }}>%</span>
          </div>
          <input type="range" min={0} max={100} value={amountPercent} onChange={(e) => setAmountPercent(Number(e.target.value))} style={{ marginBottom: 24, width: "100%" }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PRESETS.map((ps) => {
              const active = amountPercent === ps.value;
              return (
                <button
                  key={ps.label}
                  onClick={() => setAmountPercent(ps.value)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: active ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    color: active ? "var(--accent-text)" : "var(--text-muted)",
                  }}
                >
                  {ps.label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={() => setStep("details")} style={{ width: "100%", padding: 16, border: "none", borderRadius: 14, background: "var(--accent)", color: "white", fontSize: 15.5, fontWeight: 700, cursor: "pointer" }}>
            다음
          </button>
        </div>
      )}

      {step === "details" && (
        <div style={{ padding: "8px 20px 24px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 24 }}>세부 정보</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>사진 (선택)</div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: "1.5px dashed var(--border)",
                  borderRadius: 12,
                  padding: photoPreviewUrl ? 8 : "13px 14px",
                  cursor: "pointer",
                }}
              >
                {photoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreviewUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ color: "var(--text-faint)", flexShrink: 0, display: "flex" }}>{BOTTLE_ICON}</div>
                )}
                <span style={{ fontSize: 13, color: "var(--text-muted)", flex: 1 }}>
                  {photoPreviewUrl ? "사진 변경하기" : "향수 사진 추가하기"}
                </span>
                {photoPreviewUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      pickPhoto(null);
                    }}
                    style={{ border: "none", background: "none", color: "var(--text-faint)", fontSize: 12, cursor: "pointer", padding: 4 }}
                  >
                    제거
                  </button>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>용량 (ml)</div>
              <input type="number" value={volume} onChange={(e) => setVolume(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 12, padding: "13px 14px", fontSize: 14.5, background: "var(--surface)", color: "var(--text)" }} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>구매일</div>
              <DatePicker value={purchasedAt} onChange={setPurchasedAt} placeholder="구매일 선택" />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>가격</div>
              <input type="number" placeholder="₩" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 12, padding: "13px 14px", fontSize: 14.5, background: "var(--surface)", color: "var(--text)" }} />
            </div>
          </div>

          <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "12px 14px", background: "var(--accent-soft)", borderRadius: 12, marginBottom: 12 }}>
            {isPreOwned ? `초기 잔량 ${amountPercent}%로 등록돼요` : "새 향수라 잔량 100%로 등록돼요"}
          </div>

          {submitError && <div style={{ marginBottom: 12, fontSize: 13, color: "var(--danger)", textAlign: "center" }}>{submitError}</div>}

          <div style={{ flex: 1 }} />
          <button onClick={finish} disabled={submitting} style={{ width: "100%", padding: 16, border: "none", borderRadius: 14, background: "var(--accent)", color: "white", fontSize: 15.5, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "등록 중..." : "등록 완료"}
          </button>
        </div>
      )}

      {step === "done" && selected && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20, padding: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 24 }}>컬렉션에 추가됐어요</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px solid var(--border-soft)", borderRadius: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: selected.tint, flexShrink: 0 }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{selected.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                {selected.brand} · {volume}ml
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {createdId && (
              <button onClick={() => router.push(`/collection/${createdId}`)} style={{ padding: "14px 22px", border: "none", borderRadius: 14, background: "var(--accent)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                상세보기
              </button>
            )}
            <button onClick={restart} style={{ padding: "14px 22px", border: "1.5px solid var(--border)", borderRadius: 14, background: "var(--surface)", color: "var(--text)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              새 향수 등록하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
