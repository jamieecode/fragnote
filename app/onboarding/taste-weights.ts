import type { NoteFamily } from "@prisma/client";

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
