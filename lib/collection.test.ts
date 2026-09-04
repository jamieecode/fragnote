import { describe, it, expect } from "vitest";
import { riskFor, openedMonthsLabel, percentOf } from "./collection";

describe("riskFor", () => {
  it("미개봉(openedAt null)이면 위험도가 없다", () => {
    expect(riskFor(null)).toBeNull();
  });

  it("6개월 미만은 안전 등급이다", () => {
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    expect(riskFor(fourMonthsAgo)?.tier).toBe("safe");
  });

  it("6개월 이상 12개월 미만은 주의 등급이다", () => {
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);
    expect(riskFor(eightMonthsAgo)?.tier).toBe("caution");
  });

  it("12개월 이상은 확인 필요 등급이다", () => {
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
    expect(riskFor(thirteenMonthsAgo)?.tier).toBe("check");
  });

  it("자정 근처(UTC/KST 경계)에서도 KST 기준으로 개월수를 계산한다", () => {
    // 실제로 있었던 버그: 로컬 타임존 getter를 쓰면 서버가 UTC로 돌 때 자정 근처
    // 기록의 개월수가 하루(때로는 한 달) 어긋날 수 있었다.
    const now = new Date();
    // KST로는 6개월 전이지만 UTC로 읽으면 아직 6개월이 안 된 것처럼 보이는 경계값.
    const sixMonthsAgoLateNightKst = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 30); // KST 00:30 가정 시각대
    const risk = riskFor(sixMonthsAgoLateNightKst);
    expect(risk?.tier === "caution" || risk?.tier === "check").toBe(true);
  });
});

describe("openedMonthsLabel", () => {
  it("미개봉이면 0을 반환한다", () => {
    expect(openedMonthsLabel(null)).toBe(0);
  });

  it("음수가 나오지 않는다 (미래 날짜가 들어와도 0 이상)", () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    expect(openedMonthsLabel(future)).toBeGreaterThanOrEqual(0);
  });
});

describe("percentOf", () => {
  it("정상적으로 퍼센트를 계산하고 정수로 반올림한다", () => {
    expect(percentOf(48, 100)).toBe(48);
    expect(percentOf(1, 3)).toBe(33);
  });

  it("totalMl이 0 이하면 0을 반환한다 (0으로 나누기 방지)", () => {
    expect(percentOf(10, 0)).toBe(0);
    expect(percentOf(10, -5)).toBe(0);
  });

  it("반올림값이 0%여도 실제 잔량이 있으면 currentMl로 구분할 수 있다", () => {
    // 0.49ml/200ml처럼 반올림하면 0%지만 진짜로 빈 건 아닌 경우 — 화면 쪼에서
    // isEmpty 판단은 이 반환값이 아니라 currentMl<=0으로 별도 확인해야 한다.
    expect(percentOf(0.49, 200)).toBe(0);
  });
});
