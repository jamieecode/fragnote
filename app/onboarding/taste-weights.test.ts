import { describe, it, expect } from "vitest";
import { computeFamilyWeights, MAX_PREFERENCE_WEIGHT } from "./taste-weights";

describe("computeFamilyWeights", () => {
  it("여러 문항에 걸쳐 반복해서 고른 계열일수록 가중치가 높다", () => {
    const answers: ("CITRUS" | "FLORAL" | "WOODY")[][] = [
      ["CITRUS", "FLORAL"],
      ["CITRUS"],
      ["CITRUS", "WOODY"],
      [],
      ["WOODY"],
    ];
    const weights = computeFamilyWeights(answers);
    expect(weights.get("CITRUS")).toBe(3);
    expect(weights.get("WOODY")).toBe(2);
    expect(weights.get("FLORAL")).toBe(1);
  });

  it("한 번도 고르지 않은 계열은 맵에 아예 없다 (기본값 0이 아님)", () => {
    const weights = computeFamilyWeights([["CITRUS"]]);
    expect(weights.has("GOURMAND")).toBe(false);
  });

  it("모든 문항에서 같은 계열만 고르면 문항 수(5)를 넘지 않는다", () => {
    const answers: "CITRUS"[][] = [["CITRUS"], ["CITRUS"], ["CITRUS"], ["CITRUS"], ["CITRUS"]];
    const weights = computeFamilyWeights(answers);
    expect(weights.get("CITRUS")).toBe(MAX_PREFERENCE_WEIGHT);
  });

  it("빈 답변이면 빈 맵을 돌려준다", () => {
    expect(computeFamilyWeights([[], [], [], [], []]).size).toBe(0);
  });
});
