import type { NoteFamily } from "@prisma/client";

// OnboardingWizard의 문항 수(5개)와 같음 — 한 계열이 받을 수 있는 최대 가중치.
// 추천 엔진(lib/recommend.ts)이 매치율을 0~100%로 정규화할 때 이 값을 분모로 쓴다.
export const MAX_PREFERENCE_WEIGHT = 5;

// 문항마다 다른 각도(기분/계절/자리)로 물어보므로, 여러 문항에 걸쳐 반복해서
// 고른 계열일수록 더 일관된 취향으로 보고 그 횟수(1~5)를 그대로 가중치로 쓴다.
export function computeFamilyWeights(answers: NoteFamily[][]): Map<NoteFamily, number> {
  const counts = new Map<NoteFamily, number>();
  for (const group of answers) {
    for (const family of group) {
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
  }
  return counts;
}
