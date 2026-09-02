import type { NoteFamily } from "@prisma/client";
import { MAX_PREFERENCE_WEIGHT } from "@/app/onboarding/taste-weights";

// Prisma(DB) 의존이 없는 순수 계산 로직만 모아둔 파일 — 클라이언트 컴포넌트에서
// 직접 import해도 안전하다 (lib/recommend.ts는 prisma를 불러오므로 서버 전용).

export type RecommendItem = {
  perfumeId: string;
  collectionId?: string;
  name: string;
  brand: string;
  family: NoteFamily | null;
  tint: string;
  matchPercent: number;
  score: number; // 정렬/표시용 — 100 상한 적용 전 원점수로 정렬해 동점 역전을 피한다
  owned: boolean;
  reasons: string[];
};

export type NoteWithIntensity = { noteId: string; intensity: number };

// 같은 노트가 TOP/MIDDLE/BASE에 중복 등재된 경우(시딩 스크립트가 노트 하나를
// 여러 포지션에 나눠 적기도 함) 그대로 합산하면 "실제로 그 노트가 강해서"가
// 아니라 "시딩할 때 몇 군데 나눠 적었는지"에 따라 매치율이 왜곡된다. 같은
// noteId는 하나로 합치고, 그중 가장 큰 intensity만 대표값으로 쓴다.
export function dedupeNotes(notes: NoteWithIntensity[]): NoteWithIntensity[] {
  const byNote = new Map<string, number>();
  for (const n of notes) {
    const prev = byNote.get(n.noteId);
    if (prev === undefined || n.intensity > prev) byNote.set(n.noteId, n.intensity);
  }
  return [...byNote.entries()].map(([noteId, intensity]) => ({ noteId, intensity }));
}

export function scoreNotes(notes: NoteWithIntensity[], prefWeights: Map<string, number>): number {
  const deduped = dedupeNotes(notes);
  if (deduped.length === 0) return 0;
  let raw = 0;
  let maxPossible = 0;
  for (const n of deduped) {
    raw += n.intensity * (prefWeights.get(n.noteId) ?? 0);
    maxPossible += n.intensity * MAX_PREFERENCE_WEIGHT;
  }
  return maxPossible > 0 ? Math.round((raw / maxPossible) * 100) : 0;
}

// 상위 결과가 한 계열에 쏠리지 않도록, 계열당 최대 개수를 넘으면 뒤로 미룬다.
// limit/maxPerFamily는 반드시 "실제로 화면에 보여줄 개수" 기준으로 호출해야
// 의미가 있다 — 큰 풀에서 다양화한 뒤 그 일부만 잘라 보여주면, 상위권이 한
// 계열에 쏠려 있을 때 그 잘린 부분에서 다양성이 사라질 수 있다.
export function diversify<T extends { family: NoteFamily | null; score: number }>(
  sorted: T[],
  limit: number,
  maxPerFamily: number
): T[] {
  const result: T[] = [];
  const familyCount = new Map<string, number>();
  const overflow: T[] = [];

  for (const item of sorted) {
    if (result.length >= limit) break;
    const key = item.family ?? "unknown";
    const count = familyCount.get(key) ?? 0;
    if (count < maxPerFamily) {
      result.push(item);
      familyCount.set(key, count + 1);
    } else {
      overflow.push(item);
    }
  }

  if (result.length >= limit) return result;

  // 계열 캡 때문에 limit을 다 못 채운 경우에만 overflow로 나머지를 채운다.
  // result/overflow 둘 다 이미 점수 내림차순이므로, 뒤에 그냥 이어붙이면 overflow의
  // 고득점 항목이 result의 저득점 항목보다 뒤로 밀려 정렬이 깨진다 — 병합정렬로 합친다.
  const merged: T[] = [];
  let ri = 0;
  let oi = 0;
  while (merged.length < limit && (ri < result.length || oi < overflow.length)) {
    const r = result[ri];
    const o = overflow[oi];
    if (o === undefined || (r !== undefined && r.score >= o.score)) {
      merged.push(r);
      ri++;
    } else {
      merged.push(o);
      oi++;
    }
  }
  return merged;
}
