import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRecommendations } from "@/lib/recommend";
import { FAMILY_TINTS } from "@/lib/collection";
import { kstParts } from "@/lib/stats-helpers";
import HomeView from "./HomeView";

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

function kstDayIndex(date: Date): number {
  const p = kstParts(date);
  return Math.floor(Date.UTC(p.year, p.month, p.day) / 86400000);
}

function relativeDayLabel(date: Date, todayIndex: number): string {
  const diff = todayIndex - kstDayIndex(date);
  if (diff <= 0) return "오늘";
  if (diff === 1) return "어제";
  return `${diff}일 전`;
}

export default async function HomePage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const [user, daily, recentLogs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getRecommendations(userId, "daily", { limit: 5 }),
    prisma.usageLog.findMany({
      where: { userId },
      include: { collection: { include: { perfume: { include: { brand: true } } } } },
      orderBy: { date: "desc" },
      take: 3,
    }),
  ]);

  // 세션은 유효한데 DB의 User row가 사라진 경우(수동 정리, 로컬 DB 리셋 등) — 조용히
  // 일반 추천을 보여주는 대신, 이 상황을 이미 안내하는 루트 페이지로 보낸다.
  if (!user) redirect("/");

  const now = new Date();
  const today = kstParts(now);
  const weekday = WEEKDAY_NAMES[new Date(today.year, today.month, today.day).getDay()];
  const todayLabel = `${today.month + 1}월 ${today.day}일 ${weekday}요일`;
  const todayIndex = kstDayIndex(now);

  return (
    <HomeView
      todayLabel={todayLabel}
      nickname={user.nickname}
      recItems={daily.items.map((it) => ({
        name: it.name,
        brand: it.brand,
        tint: it.tint,
        reason: it.reasons[0] ?? (daily.usedFallback ? "취향에 잘 맞는 향수예요" : "오늘 뿌려보기 좋아요"),
      }))}
      recent={recentLogs.map((log) => ({
        name: log.collection.perfume.name,
        tint: log.collection.perfume.family ? FAMILY_TINTS[log.collection.perfume.family] : "var(--border-soft)",
        dateLabel: relativeDayLabel(log.date, todayIndex),
        sprays: log.sprayCount,
      }))}
    />
  );
}
