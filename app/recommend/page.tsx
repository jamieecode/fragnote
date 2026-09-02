import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecommendations } from "@/lib/recommend";
import { FAMILY_LABELS, FAMILY_TINTS } from "@/lib/collection";
import RecommendView from "./RecommendView";

export default async function RecommendPage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const [taste, wishlistRows, ownedCount] = await Promise.all([
    getRecommendations(userId, "taste"),
    prisma.wishlist.findMany({ where: { userId }, select: { perfumeId: true } }),
    prisma.collection.count({ where: { userId } }),
  ]);

  // 보유 향수가 없으면 데일리 모드는 취향 매칭 결과를 그대로 쓴다 — 이미 위에서
  // 계산한 taste 결과를 재사용해, 카탈로그 전체를 다시 채점하는 중복 조회를 피한다.
  const daily = ownedCount === 0 ? { mode: "daily" as const, usedFallback: true, items: taste.items } : await getRecommendations(userId, "daily");

  const families = (Object.keys(FAMILY_LABELS) as (keyof typeof FAMILY_LABELS)[]).map((key) => ({
    key,
    label: FAMILY_LABELS[key],
    tint: FAMILY_TINTS[key],
  }));

  return (
    <RecommendView
      tasteItems={taste.items}
      dailyItems={daily.items}
      dailyUsedFallback={daily.usedFallback}
      families={families}
      initialWishedIds={wishlistRows.map((w) => w.perfumeId)}
    />
  );
}
