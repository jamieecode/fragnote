import { describe, it, expect } from "vitest";
import { scoreNotes, dedupeNotes, diversify, type RecommendItem } from "./recommend-scoring";

describe("dedupeNotes / scoreNotes", () => {
  it("동일 노트가 TOP/MIDDLE/BASE에 중복 등재돼도 매치율을 부풀리지 않는다", () => {
    // 실제로 있었던 문제: 톰포드 블랙 오키드 시딩본이 같은 노트를 여러 포지션에
    // 나눠 적어서, 중복 제거 전엔 매치율이 왜곡됐었다.
    const prefWeights = new Map([
      ["noteA", 5], // 선호
      ["noteB", 0], // 비선호
    ]);
    const dedupedOnce: { noteId: string; intensity: number }[] = [
      { noteId: "noteA", intensity: 5 },
      { noteId: "noteB", intensity: 5 },
    ];
    const repeatedThreeTimes = [
      { noteId: "noteA", intensity: 5 },
      { noteId: "noteA", intensity: 5 },
      { noteId: "noteA", intensity: 5 },
      { noteId: "noteB", intensity: 5 },
    ];

    expect(scoreNotes(dedupedOnce, prefWeights)).toBe(scoreNotes(repeatedThreeTimes, prefWeights));
    expect(scoreNotes(dedupedOnce, prefWeights)).toBe(50);
  });

  it("같은 노트가 중복되면 더 큰 intensity를 대표값으로 쓴다", () => {
    const notes = [
      { noteId: "noteA", intensity: 2 },
      { noteId: "noteA", intensity: 5 },
    ];
    expect(dedupeNotes(notes)).toEqual([{ noteId: "noteA", intensity: 5 }]);
  });

  it("노트가 없으면 0점, 선호 노트가 하나도 안 맞으면 0점", () => {
    expect(scoreNotes([], new Map())).toBe(0);
    expect(scoreNotes([{ noteId: "x", intensity: 5 }], new Map([["y", 5]]))).toBe(0);
  });

  it("모든 노트가 최대 선호(5)와 일치하면 100점", () => {
    const notes = [
      { noteId: "a", intensity: 3 },
      { noteId: "b", intensity: 5 },
    ];
    const prefWeights = new Map([
      ["a", 5],
      ["b", 5],
    ]);
    expect(scoreNotes(notes, prefWeights)).toBe(100);
  });
});

describe("diversify", () => {
  function item(id: string, family: RecommendItem["family"], score: number): RecommendItem {
    return { perfumeId: id, name: id, brand: "", family, tint: "", matchPercent: score, score, owned: false, reasons: [] };
  }

  it("한 계열이 상위권을 다 차지해도, 다른 계열 후보가 충분하면 캡을 넘지 않는다", () => {
    // 실제로 있었던 회귀: 백필을 점수로 병합해버리면 캡이 무력화됐었다.
    const sorted = [
      item("f1", "FLORAL", 100),
      item("f2", "FLORAL", 90),
      item("f3", "FLORAL", 80),
      item("f4", "FLORAL", 70),
      item("f5", "FLORAL", 60),
      item("w1", "WOODY", 55),
      item("w2", "WOODY", 50),
      item("c1", "CITRUS", 45),
      item("c2", "CITRUS", 40),
    ];

    const result = diversify(sorted, 5, 2);
    const familyCounts = new Map<string, number>();
    for (const r of result) familyCounts.set(r.family!, (familyCounts.get(r.family!) ?? 0) + 1);

    expect(result.length).toBe(5);
    expect(familyCounts.get("FLORAL")).toBeLessThanOrEqual(2);
  });

  it("캡을 지켜서는 limit을 못 채울 만큼 계열이 적으면, 남는 자리는 캡을 넘겨서라도 채운다", () => {
    // 입력에 계열이 3종류뿐이라 캡(2)을 지키면 최대 4개(2+1+1)만 나오는데 limit은 5 —
    // 물리적으로 불가능한 요구라 이 경우엔 캡을 넘기는 게 맞다(빈 자리로 두지 않음).
    const sorted = [
      item("f1", "FLORAL", 100),
      item("f2", "FLORAL", 90),
      item("f3", "FLORAL", 80),
      item("w1", "WOODY", 50),
      item("c1", "CITRUS", 40),
    ];
    const result = diversify(sorted, 5, 2);
    expect(result.length).toBe(5);
  });

  it("캡을 지킨 항목은 점수가 더 낮아도 캡에 걸려 밀린(overflow) 항목보다 항상 앞에 온다", () => {
    // diversify의 목적 자체가 "다양성이 순수 점수보다 우선"이라, 백필된 항목이
    // 캡을 통과한 항목을 점수만으로 다시 밀어내면 캡이 무력화된다 — 실제로 한 번
    // 그렇게 회귀했던 부분이라 순서를 명시적으로 고정해둔다.
    const sorted = [
      item("f1", "FLORAL", 100),
      item("f2", "FLORAL", 90),
      item("f3", "FLORAL", 85), // 캡(2)에 걸려 overflow로 밀림 — w1(70)보다 점수가 높음
      item("w1", "WOODY", 70),
    ];

    const result = diversify(sorted, 4, 2);
    expect(result.map((r) => r.perfumeId)).toEqual(["f1", "f2", "w1", "f3"]);
  });

  it("캡을 지킨 항목들 사이에서는 점수 내림차순이 유지된다", () => {
    const sorted = [item("a", "FLORAL", 100), item("b", "WOODY", 90), item("c", "CITRUS", 80)];
    const result = diversify(sorted, 3, 1);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("family가 null인 항목도 죽지 않고 하나의 그룹으로 처리된다", () => {
    const sorted = [item("a", null, 50), item("b", null, 40), item("c", null, 30)];
    const result = diversify(sorted, 3, 1);
    expect(result.length).toBe(3); // 캡에 걸려도 backfill로 다 채워짐
  });

  it("캡을 만족하는 후보가 모자라면 남는 자리는 점수 순으로 채운다", () => {
    const sorted = [item("f1", "FLORAL", 100), item("f2", "FLORAL", 90), item("f3", "FLORAL", 80)];
    const result = diversify(sorted, 3, 1); // FLORAL은 1개만 되는데 3자리 요청
    expect(result.length).toBe(3);
    expect(result.map((r) => r.perfumeId)).toEqual(["f1", "f2", "f3"]);
  });
});
