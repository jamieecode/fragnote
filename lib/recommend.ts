import { prisma } from "@/lib/prisma";
import { FAMILY_TINTS, riskFor, openedMonthsLabel } from "@/lib/collection";
import { scoreNotes, diversify, type RecommendItem } from "@/lib/recommend-scoring";
import { weatherFamilyBonus, type WeatherSnapshot } from "@/lib/weather-rules";

export type { RecommendItem } from "@/lib/recommend-scoring";

// CLAUDE.md 설계 결정: 추천 엔진은 하나로 통합하고 취향 매칭/데일리 모드를
// 파라미터로만 분기한다 (별도 엔진 두 개를 만들지 않음). 두 모드 모두 이
// getRecommendations() 하나를 통해서만 추천 결과를 만든다.

export type RecommendMode = "taste" | "daily";

async function getUserPreferenceWeights(userId: string): Promise<Map<string, number>> {
  const prefs = await prisma.userNotePreference.findMany({ where: { userId } });
  return new Map(prefs.map((p) => [p.noteId, p.weight]));
}

async function scoreCatalog(userId: string, prefWeights: Map<string, number>): Promise<RecommendItem[]> {
  const [perfumes, collections] = await Promise.all([
    prisma.perfume.findMany({
      include: { brand: true, notes: { select: { noteId: true, intensity: true } } },
    }),
    prisma.collection.findMany({ where: { userId }, select: { perfumeId: true } }),
  ]);
  const ownedPerfumeIds = new Set(collections.map((c) => c.perfumeId));

  return perfumes
    .map((p) => {
      const matchPercent = scoreNotes(p.notes, prefWeights);
      return {
        perfumeId: p.id,
        name: p.name,
        brand: p.brand.name,
        family: p.family,
        tint: p.family ? FAMILY_TINTS[p.family] : "var(--border-soft)",
        matchPercent,
        score: matchPercent,
        owned: ownedPerfumeIds.has(p.id),
        reasons: [] as string[],
      };
    })
    .sort((a, b) => b.score - a.score);
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// 데일리 모드의 정상 경로와 폴백(취향 매칭 대체) 경로 둘 다에서 날씨 보너스를
// 반영해야 해서 공용 함수로 뺀다 — 하나에만 적용하면 폴백으로 빠진 유저(막 온보딩을
// 마쳐 보유 향수가 없는, 이 기능이 특히 도움이 될 유저)만 날씨가 안 반영되는 문제가 생긴다.
function applyWeatherBonus(item: RecommendItem, weather: WeatherSnapshot | null): RecommendItem {
  if (!weather || !item.family) return item;
  const weatherBonus = weatherFamilyBonus(item.family, weather);
  const reasons =
    weatherBonus >= 10 ? [...item.reasons, `오늘 날씨(${weather.label} ${weather.tempC}°)와 잘 맞아요`] : item.reasons;
  return { ...item, score: item.score + weatherBonus, reasons };
}

// 취향 매칭 모드는 이 함수가 "다양화 전 전체 목록"을 반환하고, 실제 화면에 몇 개를
// 어떻게 다양화해서 보여줄지는 호출부(화면의 탭 구성)에 맡긴다 — 여기서 미리
// 일부 개수로 다양화해버리면, 그 결과를 다시 잘라 쓰는 화면에서 다양성이
// 깨질 수 있기 때문 (실제로 한 번 겪은 문제).
export async function getRecommendations(
  userId: string,
  mode: RecommendMode,
  { limit = 10, weather = null }: { limit?: number; weather?: WeatherSnapshot | null } = {}
): Promise<{ mode: RecommendMode; usedFallback: boolean; items: RecommendItem[] }> {
  const prefWeights = await getUserPreferenceWeights(userId);

  if (mode === "taste") {
    const scored = await scoreCatalog(userId, prefWeights);
    return { mode: "taste", usedFallback: false, items: scored };
  }

  // mode === 'daily': 보유한 향수 중에서만 추천 — 취향 매칭 + 최근 미사용 +
  // 변질 위험 + (넘겨받은 경우) 날씨 가중치를 더해 오늘 뿌리기 좋은 순으로 정렬한다.
  // weather는 브라우저 위치 정보가 있어야 얻을 수 있어 호출부(클라이언트)가 넘겨줄
  // 때만 반영되고, 없으면(null) 날씨 보너스 없이 기존과 동일하게 동작한다.
  const collections = await prisma.collection.findMany({
    where: { userId },
    include: {
      perfume: { include: { brand: true, notes: { select: { noteId: true, intensity: true } } } },
      usageLogs: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  if (collections.length === 0) {
    // 보유 향수가 없으면 데일리 모드를 취향 매칭으로 대체한다 (CLAUDE.md 폴백 규칙).
    // 이 경로도 날씨가 있으면 반영한다 — 없으면 applyWeatherBonus가 원본을 그대로 돌려준다.
    const scored = (await scoreCatalog(userId, prefWeights))
      .map((it) => applyWeatherBonus(it, weather))
      .sort((a, b) => b.score - a.score);
    return { mode: "daily", usedFallback: true, items: diversify(scored, limit, Math.max(1, Math.ceil(limit / 3))) };
  }

  const items: RecommendItem[] = collections.map((c) => {
    const matchPercent = scoreNotes(c.perfume.notes, prefWeights);
    const reasons: string[] = [];
    let bonus = 0;

    const lastUsedAt = c.usageLogs[0]?.date ?? null;
    if (!lastUsedAt) {
      reasons.push("아직 사용 기록이 없어요");
      bonus += 10;
    } else {
      const idleDays = daysSince(lastUsedAt);
      if (idleDays >= 3) {
        reasons.push(`${idleDays}일째 사용 안 함`);
        bonus += Math.min(20, idleDays * 2);
      }
    }

    const risk = riskFor(c.openedAt);
    if (risk?.tier === "check") {
      reasons.push(`개봉 ${openedMonthsLabel(c.openedAt)}개월 · 확인해볼 때예요`);
      bonus += 20;
    } else if (risk?.tier === "caution") {
      reasons.push(`개봉 ${openedMonthsLabel(c.openedAt)}개월 · 변질 주의`);
      bonus += 10;
    }

    const item: RecommendItem = {
      perfumeId: c.perfumeId,
      collectionId: c.id,
      name: c.perfume.name,
      brand: c.perfume.brand.name,
      family: c.perfume.family,
      tint: c.perfume.family ? FAMILY_TINTS[c.perfume.family] : "var(--border-soft)",
      matchPercent,
      score: matchPercent + bonus, // 정렬은 상한 없는 원점수로 — 100 근처 동점 역전 방지
      owned: true,
      reasons,
    };
    return applyWeatherBonus(item, weather);
  });

  items.sort((a, b) => b.score - a.score);
  return {
    mode: "daily",
    usedFallback: false,
    items: items.slice(0, limit).map((it) => ({ ...it, score: Math.min(100, it.score) })),
  };
}
