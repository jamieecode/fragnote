import { describe, it, expect } from "vitest";
import { kstParts, monthKey, buildMonthCalendar, lastNMonths, monthlyFrequency, seasonalPattern, rankPerfumes } from "./stats-helpers";

describe("kstParts", () => {
  it("UTC 기준 자정 근처(KST로는 이미 다음날)를 올바르게 KST 날짜로 바꾼다", () => {
    // 실제로 있었던 버그: 서버가 UTC로 돌면(배포 환경) 2026-03-01 03:00 KST에
    // 생긴 기록이 로컬 타임존 getter로는 2026-02-28로 잘못 집계됐었다.
    const date = new Date("2026-02-28T18:00:00.000Z"); // = 2026-03-01 03:00 KST
    expect(kstParts(date)).toEqual({ year: 2026, month: 2, day: 1 }); // month는 0-indexed(2=3월)
  });

  it("UTC와 KST가 같은 날짜인 낮 시간대는 그대로 나온다", () => {
    const date = new Date("2026-08-21T05:00:00.000Z"); // = 2026-08-21 14:00 KST
    expect(kstParts(date)).toEqual({ year: 2026, month: 7, day: 21 });
  });
});

describe("monthKey", () => {
  it("연도가 다른 12월과 1월은 같은 키로 묶이지 않는다", () => {
    const dec = new Date("2025-12-15T00:00:00.000Z");
    const jan = new Date("2026-01-15T00:00:00.000Z");
    expect(monthKey(dec)).not.toBe(monthKey(jan));
  });
});

describe("buildMonthCalendar", () => {
  it("오늘 날짜 셀에만 isToday가 true이고, 이후 날짜만 isFuture다", () => {
    const cells = buildMonthCalendar(2026, 7, 2026, 7, 21, new Map());
    const days = cells.filter((c) => !c.blank) as Extract<(typeof cells)[number], { blank: false }>[];

    const today = days.find((d) => d.day === 21)!;
    expect(today.isToday).toBe(true);
    expect(today.isFuture).toBe(false);

    const future = days.find((d) => d.day === 22)!;
    expect(future.isFuture).toBe(true);
    expect(future.isToday).toBe(false);

    const past = days.find((d) => d.day === 20)!;
    expect(past.isFuture).toBe(false);
    expect(past.isToday).toBe(false);
  });

  it("다른 달을 보고 있을 땐 today/future 표시가 전부 꺼진다", () => {
    const cells = buildMonthCalendar(2026, 6, 2026, 7, 21, new Map()); // 7월을 보는데 오늘은 8월
    const days = cells.filter((c) => !c.blank) as Extract<(typeof cells)[number], { blank: false }>[];
    expect(days.every((d) => !d.isToday && !d.isFuture)).toBe(true);
  });

  it("월 앞쪽 빈 칸 개수가 그 달 1일의 요일과 일치한다", () => {
    // 2026-08-01은 토요일(getDay() === 6)
    const cells = buildMonthCalendar(2026, 7, 2026, 7, 1, new Map());
    const blanks = cells.filter((c) => c.blank).length;
    expect(blanks).toBe(new Date(2026, 7, 1).getDay());
  });
});

describe("lastNMonths", () => {
  it("연도 경계를 넘는 6개월 롤링 윈도우를 올바르게 계산한다", () => {
    // 2026년 2월 기준 최근 6개월 = 2025년 9월 ~ 2026년 2월
    const months = lastNMonths(6, 2026, 1); // month는 0-indexed(1=2월)
    expect(months).toEqual([
      { year: 2025, month: 8, label: "9월" },
      { year: 2025, month: 9, label: "10월" },
      { year: 2025, month: 10, label: "11월" },
      { year: 2025, month: 11, label: "12월" },
      { year: 2026, month: 0, label: "1월" },
      { year: 2026, month: 1, label: "2월" },
    ]);
  });
});

describe("monthlyFrequency / seasonalPattern / rankPerfumes", () => {
  const logs = [
    { date: new Date("2026-01-05T03:00:00.000Z"), perfumeId: "a", perfumeName: "A", brand: "브랜드A" }, // KST 1월
    { date: new Date("2026-01-05T03:00:00.000Z"), perfumeId: "a", perfumeName: "A", brand: "브랜드A" },
    { date: new Date("2026-07-01T03:00:00.000Z"), perfumeId: "b", perfumeName: "B", brand: "브랜드B" }, // KST 7월(여름)
  ];

  it("월별 빈도는 요청한 개월 라벨 순서대로, 없는 달은 0으로 채운다", () => {
    const months = lastNMonths(3, 2026, 6); // 5,6,7월
    const freq = monthlyFrequency(logs, months);
    expect(freq).toEqual([
      { label: "5월", count: 0 },
      { label: "6월", count: 0 },
      { label: "7월", count: 1 },
    ]);
  });

  it("계절 집계는 봄→여름→가을→겨울 순으로 반환되고, 여름 로그가 여름에 잡힌다", () => {
    const seasonal = seasonalPattern(logs);
    expect(seasonal.map((s) => s.label)).toEqual(["봄", "여름", "가을", "겨울"]);
    expect(seasonal.find((s) => s.label === "여름")!.count).toBe(1);
  });

  it("1월은 겨울로 집계된다", () => {
    const seasonal = seasonalPattern([logs[0]]);
    expect(seasonal.find((s) => s.label === "겨울")!.count).toBe(1);
  });

  it("향수 랭킹은 향수 단위로 집계되고 사용 횟수 내림차순이다", () => {
    const ranking = rankPerfumes(logs, 5);
    expect(ranking[0]).toMatchObject({ name: "A", count: 2 });
    expect(ranking[1]).toMatchObject({ name: "B", count: 1 });
  });

  it("limit을 넘는 개수는 잘린다", () => {
    const manyLogs = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(),
      perfumeId: `p${i}`,
      perfumeName: `P${i}`,
      brand: "브랜드",
    }));
    expect(rankPerfumes(manyLogs, 3)).toHaveLength(3);
  });
});
