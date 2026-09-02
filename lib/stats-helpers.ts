// 통계 화면에서 쓰는 순수 계산 로직 (Prisma 의존 없음 — 클라이언트 컴포넌트에서
// import해도 안전). app/stats/page.tsx가 UsageLog를 읽어온 뒤 이 함수들로 가공한다.

export type UsageLogLike = { date: Date; perfumeId: string; perfumeName: string; brand: string };

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

// 앱은 한국 유저만 대상이라 항상 KST(UTC+9, DST 없음) 기준으로 날짜를 계산한다.
// 서버가 UTC로 도는 배포 환경(예: Vercel)에서 그냥 getFullYear()/getMonth() 같은
// 로컬 타임존 getter를 쓰면, 자정~오전 9시 사이 기록이 하루 전 날짜로 집계되는
// 문제가 생긴다 — 이 오프셋을 더한 뒤 UTC getter로 읽어서 서버 타임존과 무관하게
// 항상 같은(KST) 달력 값을 뽑는다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

export function monthKey(d: Date): string {
  const { year, month } = kstParts(d);
  return `${year}-${month}`;
}

export type CalendarCell =
  | { blank: true }
  | { blank: false; day: number; count: number; isToday: boolean; isFuture: boolean };

// 이번 달 달력 셀 목록 (앞쪽 빈 칸 포함, 요일별 정렬용). year/month/todayDay는
// 전부 KST 기준 값으로 넘겨받는다(호출부에서 kstParts로 미리 뽑아서 넘김).
export function buildMonthCalendar(year: number, month: number, todayYear: number, todayMonth: number, todayDay: number, countsByDay: Map<number, number>): CalendarCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = todayYear === year && todayMonth === month;

  const blanks: CalendarCell[] = Array.from({ length: firstWeekday }, () => ({ blank: true }));
  const days: CalendarCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isFuture = isCurrentMonth && day > todayDay;
    return {
      blank: false,
      day,
      count: countsByDay.get(day) ?? 0,
      isToday: isCurrentMonth && day === todayDay,
      isFuture,
    };
  });
  return blanks.concat(days);
}

export const WEEKDAY_HEADERS = WEEKDAY_LABELS;

// 최근 n개월(이번 달 포함) 라벨과 연/월을 오래된 순으로 반환 (todayYear/todayMonth는 KST 기준)
export function lastNMonths(n: number, todayYear: number, todayMonth: number): { year: number; month: number; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(todayYear, todayMonth - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] };
  });
}

export function monthlyFrequency(logs: UsageLogLike[], months: { year: number; month: number; label: string }[]) {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const key = monthKey(log.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return months.map((m) => ({ label: m.label, count: counts.get(`${m.year}-${m.month}`) ?? 0 }));
}

const SEASON_LABELS = ["겨울", "봄", "여름", "가을"] as const; // index: (month%12 -> season group)

function seasonIndexOf(month: number): number {
  // 12,1,2=겨울 / 3,4,5=봄 / 6,7,8=여름 / 9,10,11=가을
  if (month === 11 || month === 0 || month === 1) return 0;
  if (month >= 2 && month <= 4) return 1;
  if (month >= 5 && month <= 7) return 2;
  return 3;
}

// 전체 기간 로그를 계절별로 집계 (봄→겨울 표시 순서에 맞춰 반환)
export function seasonalPattern(logs: UsageLogLike[]) {
  const counts = [0, 0, 0, 0];
  for (const log of logs) counts[seasonIndexOf(kstParts(log.date).month)]++;
  const order = [1, 2, 3, 0]; // 봄, 여름, 가을, 겨울
  return order.map((idx) => ({ label: SEASON_LABELS[idx], count: counts[idx] }));
}

export function rankPerfumes(logs: UsageLogLike[], limit: number) {
  const byPerfume = new Map<string, { name: string; brand: string; count: number }>();
  for (const log of logs) {
    const existing = byPerfume.get(log.perfumeId);
    if (existing) existing.count++;
    else byPerfume.set(log.perfumeId, { name: log.perfumeName, brand: log.brand, count: 1 });
  }
  return [...byPerfume.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
