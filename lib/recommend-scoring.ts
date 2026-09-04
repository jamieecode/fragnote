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

// 홈 화면 카드 하나에 필요한 만큼만 줄인 모양 — 서버 초기 렌더(app/home/page.tsx)와
// 날씨 반영 후 클라이언트 재조회(app/home/weather-actions.ts) 두 곳이 같은 모양을
// 만들어야 해서, 그 변환 로직도 이 파일에서 하나로 공유한다.
export type HomeRecItem = { name: string; brand: string; tint: string; reason: string };

export function toHomeRecItem(item: RecommendItem, usedFallback: boolean): HomeRecItem {
  return {
    name: item.name,
    brand: item.brand,
    tint: item.tint,
    reason: item.reasons[0] ?? (usedFallback ? "취향에 잘 맞는 향수예요" : "오늘 뿌려보기 좋아요"),
  };
}

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
  const capped: T[] = [];
  const overflow: T[] = [];
  const familyCount = new Map<string, number>();

  // limit에서 멈추지 않고 sorted 전체를 훑는다 — 캡을 지킨 항목이 총 몇 개나
  // 되는지 먼저 다 알아야, 부족한 만큼만 overflow로 채울지 판단할 수 있다.
  for (const item of sorted) {
    const key = item.family ?? "unknown";
    const count = familyCount.get(key) ?? 0;
    if (count < maxPerFamily) {
      capped.push(item);
      familyCount.set(key, count + 1);
    } else {
      overflow.push(item);
    }
  }

  if (capped.length >= limit) return capped.slice(0, limit);

  // 캡을 지킨 것만으론 limit을 못 채우는 경우에만 overflow(캡에 걸려 밀린 항목,
  // 점수 내림차순)로 나머지를 채운다. capped가 항상 overflow보다 앞에 온다 —
  // 다양성이 순수 점수보다 우선이라는 diversify의 목적상, 캡을 지킨 저점수 항목이
  // 캡에 걸린 고점수 항목보다 앞에 오는 게 맞다. (예전에 점수로 병합했을 때, 캡에
  // 걸려 밀려난 고점수 항목이 이미 캡을 통과한 다른 계열 항목을 다시 밀어내
  // 캡 자체를 무력화하는 회귀가 있었다.)
  return capped.concat(overflow.slice(0, limit - capped.length));
}
