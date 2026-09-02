import { prisma } from "@/lib/prisma";
import type { NoteFamily } from "@prisma/client";

export const ML_PER_SPRAY = 0.09;

// 향수 계열별 톤 (목업의 FAMILIES 팔레트와 동일 — 카탈로그 이미지가 없을 때 색 블록으로 대체)
export const FAMILY_TINTS: Record<NoteFamily, string> = {
  CITRUS: "oklch(91% 0.025 95)",
  FLORAL: "oklch(91% 0.02 350)",
  WOODY: "oklch(87% 0.015 60)",
  ORIENTAL_AMBER: "oklch(89% 0.025 50)",
  FRESH: "oklch(91% 0.02 210)",
  FOUGERE: "oklch(89% 0.02 140)",
  CHYPRE: "oklch(88% 0.018 300)",
  GOURMAND: "oklch(89% 0.022 70)",
};

export const FAMILY_LABELS: Record<NoteFamily, string> = {
  CITRUS: "시트러스",
  FLORAL: "플로럴",
  WOODY: "우디",
  ORIENTAL_AMBER: "오리엔탈 · 앰버",
  FRESH: "프레시",
  FOUGERE: "푸제르",
  CHYPRE: "시프레",
  GOURMAND: "구르망",
};

// 로그 추가/삭제 시 호출 — initialMl(마지막 보정 기준점)에서 그 이후 로그를 전부
// 다시 순회해 재계산한다 (실시간 차감이 아니라 항상 처음부터 다시 계산).
export async function recalcCollectionMl(collectionId: string) {
  const collection = await prisma.collection.findUniqueOrThrow({ where: { id: collectionId } });

  const logs = await prisma.usageLog.findMany({
    where: {
      collectionId,
      ...(collection.lastAdjustedAt ? { date: { gt: collection.lastAdjustedAt } } : {}),
    },
  });

  const usedMl = logs.reduce((sum, log) => sum + log.sprayCount * ML_PER_SPRAY, 0);
  const currentMl = Math.max(0, collection.initialMl - usedMl);

  await prisma.collection.update({ where: { id: collectionId }, data: { currentMl } });
  return currentMl;
}

// 수동 보정 — 이 시점 값을 새 기준점(initialMl)으로 삼고, 이후부터는 이 시점 이후의
// 로그만 재계산에 반영한다.
export async function manuallyAdjustCollection(collectionId: string, percent: number) {
  const collection = await prisma.collection.findUniqueOrThrow({ where: { id: collectionId } });
  const ml = Math.max(0, Math.min(collection.totalMl, (percent / 100) * collection.totalMl));

  // lastAdjustedAt은 DB의 NOW()로 찍는다 — UsageLog.date도 DB 쪽 DEFAULT CURRENT_TIMESTAMP라,
  // 앱 서버 시각(new Date())을 쓰면 두 시계가 어긋날 때 방금 보정한 직후 추가한 로그가
  // recalcCollectionMl의 "> lastAdjustedAt" 비교에서 누락될 수 있다.
  await prisma.$executeRaw`UPDATE "Collection" SET "initialMl" = ${ml}, "currentMl" = ${ml}, "lastAdjustedAt" = NOW() WHERE id = ${collectionId}`;
}

export function percentOf(currentMl: number, totalMl: number) {
  if (totalMl <= 0) return 0;
  return Math.round((currentMl / totalMl) * 100);
}

// 서버 타임존과 무관하게 항상 KST(UTC+9) 기준 달력 값을 쓰기 위한 변환 —
// lib/stats-helpers.ts의 kstParts와 같은 이유(자정 근처 오프바이원 방지).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
function kstYearMonth(date: Date) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

function monthsBetween(from: Date, to: Date) {
  const f = kstYearMonth(from);
  const t = kstYearMonth(to);
  return (t.year - f.year) * 12 + (t.month - f.month);
}

export type RiskTier = "safe" | "caution" | "check";

export function riskFor(openedAt: Date | null): { tier: RiskTier; badge: string; text: string } | null {
  if (!openedAt) return null;
  const months = monthsBetween(openedAt, new Date());
  if (months < 6) return { tier: "safe", badge: "안전", text: "아직 향이 안정적이에요" };
  if (months < 12) return { tier: "caution", badge: "주의", text: "슬슬 향 변화를 확인해볼 때예요" };
  return { tier: "check", badge: "확인 필요", text: "변질 가능성이 있어요, 향을 확인해보세요" };
}

export function openedMonthsLabel(openedAt: Date | null): number {
  if (!openedAt) return 0;
  return Math.max(0, monthsBetween(openedAt, new Date()));
}
