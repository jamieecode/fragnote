import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildMonthCalendar, lastNMonths, monthlyFrequency, seasonalPattern, rankPerfumes, kstParts, type UsageLogLike } from "@/lib/stats-helpers";
import StatsView from "./StatsView";

export default async function StatsPage() {
  const userId = (await auth())?.user?.id;
  if (!userId) redirect("/");

  const logs = await prisma.usageLog.findMany({
    where: { userId },
    include: { collection: { include: { perfume: { include: { brand: true } } } } },
    orderBy: { date: "desc" },
  });

  const hasData = logs.length > 0;
  if (!hasData) {
    return <StatsView hasData={false} thisMonthCount={0} topPerfumeName="" calendar={[]} calendarLabel="" monthly={[]} seasonal={[]} ranking={[]} />;
  }

  const usageLogs: UsageLogLike[] = logs.map((l) => ({
    date: l.date,
    perfumeId: l.collection.perfumeId,
    perfumeName: l.collection.perfume.name,
    brand: l.collection.perfume.brand.name,
  }));

  const today = kstParts(new Date());
  const countsByDay = new Map<number, number>();
  for (const log of usageLogs) {
    const logKst = kstParts(log.date);
    if (logKst.year === today.year && logKst.month === today.month) {
      countsByDay.set(logKst.day, (countsByDay.get(logKst.day) ?? 0) + 1);
    }
  }
  const calendar = buildMonthCalendar(today.year, today.month, today.year, today.month, today.day, countsByDay);
  const activeDays = [...countsByDay.keys()].length;

  const months = lastNMonths(6, today.year, today.month);
  const monthly = monthlyFrequency(usageLogs, months);
  const seasonal = seasonalPattern(usageLogs);
  const ranking = rankPerfumes(usageLogs, 5);

  const thisMonthCount = monthly[monthly.length - 1]?.count ?? 0;

  return (
    <StatsView
      hasData
      thisMonthCount={thisMonthCount}
      topPerfumeName={ranking[0]?.name ?? "-"}
      calendar={calendar}
      calendarLabel={`이번 달 ${activeDays}일 기록`}
      monthly={monthly}
      seasonal={seasonal}
      ranking={ranking}
    />
  );
}
