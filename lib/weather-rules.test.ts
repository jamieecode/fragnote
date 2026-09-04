import { describe, it, expect } from "vitest";
import { mapOwmCondition, weatherFamilyBonus } from "./weather-rules";

describe("mapOwmCondition", () => {
  it("실제 OpenWeatherMap 코드 그룹을 올바르게 분류한다", () => {
    expect(mapOwmCondition(211)).toBe("rain"); // 뇌우
    expect(mapOwmCondition(301)).toBe("rain"); // 이슬비
    expect(mapOwmCondition(501)).toBe("rain"); // 비
    expect(mapOwmCondition(601)).toBe("snow");
    expect(mapOwmCondition(800)).toBe("clear");
    expect(mapOwmCondition(802)).toBe("clouds");
    expect(mapOwmCondition(741)).toBe("clouds"); // 안개(7xx) — clear/snow 어디에도 안 걸리고 흐림으로
  });
});

describe("weatherFamilyBonus", () => {
  it("덥고 맑은 날엔 시트러스/프레시가 오르고 오리엔탈/구르망은 내려간다", () => {
    const weather = { tempC: 30, condition: "clear" as const, label: "맑음" };
    expect(weatherFamilyBonus("CITRUS", weather)).toBeGreaterThan(0);
    expect(weatherFamilyBonus("FRESH", weather)).toBeGreaterThan(0);
    expect(weatherFamilyBonus("ORIENTAL_AMBER", weather)).toBeLessThan(0);
    expect(weatherFamilyBonus("GOURMAND", weather)).toBeLessThan(0);
  });

  it("춥고 눈 오는 날엔 우디/오리엔탈이 오른다", () => {
    const weather = { tempC: 2, condition: "snow" as const, label: "눈" };
    expect(weatherFamilyBonus("WOODY", weather)).toBeGreaterThan(0);
    expect(weatherFamilyBonus("ORIENTAL_AMBER", weather)).toBeGreaterThan(0);
    // 추운 날 기준으로는 시트러스에 온도 보너스가 없다 (중립)
    expect(weatherFamilyBonus("CITRUS", weather)).toBe(0);
  });

  it("비 오는 날엔 프레시/시프레가 오르고 구르망은 내려간다", () => {
    const weather = { tempC: 18, condition: "rain" as const, label: "비" };
    expect(weatherFamilyBonus("FRESH", weather)).toBeGreaterThan(0);
    expect(weatherFamilyBonus("CHYPRE", weather)).toBeGreaterThan(0);
    expect(weatherFamilyBonus("GOURMAND", weather)).toBeLessThan(0);
  });
});
