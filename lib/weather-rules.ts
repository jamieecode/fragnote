import type { NoteFamily } from "@prisma/client";

// Prisma 의존 없는 순수 로직만 모아둔 파일 — 클라이언트 컴포넌트에서 바로 import해도 안전.
// 실제 API 호출(lib/weather.ts)과 분리해둔 이유는 lib/recommend-scoring.ts와 같음:
// API 키를 쓰는 fetch 함수가 클라이언트 번들에 섞여 들어가면 안 되기 때문.

export type WeatherCondition = "clear" | "clouds" | "rain" | "snow" | "other";

export type WeatherSnapshot = {
  tempC: number;
  condition: WeatherCondition;
  label: string;
};

export const CONDITION_LABELS: Record<WeatherCondition, string> = {
  clear: "맑음",
  clouds: "흐림",
  rain: "비",
  snow: "눈",
  other: "흐림",
};

// 위치 접근을 거부한 유저를 위한 대표 도시 폴백 (홈 화면 도시 선택 드롭다운용)
export const CITIES = [
  { name: "서울", lat: 37.5665, lon: 126.978 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "제주", lat: 33.4996, lon: 126.5312 },
] as const;

// OpenWeatherMap의 condition id(https://openweathermap.org/weather-conditions)를
// 앱에서 쓰는 4가지 상태로 단순화한다.
export function mapOwmCondition(id: number): WeatherCondition {
  if (id >= 200 && id < 600) return "rain"; // 뇌우/이슬비/비
  if (id >= 600 && id < 700) return "snow";
  if (id === 800) return "clear";
  if (id > 800) return "clouds"; // 801~804 흐림 계열
  return "clouds"; // 7xx(안개 등) — 흐림과 비슷하게 취급
}

// 날씨-노트 매핑 룰. CLAUDE.md MVP 1순위("카탈로그 + 날씨-노트 매핑 룰")에서
// 카탈로그만 시딩하고 빠져있던 부분 — 온도대별 기본 성향 + 날씨 상태별 보정을 더한다.
// 값은 recommend 엔진의 다른 보너스(최근미사용 +20, 변질위험 +20)와 스케일을 맞춤.
export function weatherFamilyBonus(family: NoteFamily, weather: WeatherSnapshot): number {
  let bonus = 0;

  if (weather.tempC >= 27) {
    // 더운 날: 무겁고 단 향은 부담스럽고, 가벼운 향이 잘 어울림
    if (family === "CITRUS" || family === "FRESH") bonus += 15;
    if (family === "ORIENTAL_AMBER" || family === "GOURMAND") bonus -= 10;
  } else if (weather.tempC >= 18) {
    if (family === "CITRUS" || family === "FLORAL" || family === "FOUGERE") bonus += 10;
  } else if (weather.tempC >= 8) {
    if (family === "FLORAL" || family === "WOODY" || family === "CHYPRE") bonus += 10;
  } else {
    // 추운 날: 묵직하고 따뜻한 향이 잘 어울림
    if (family === "WOODY" || family === "ORIENTAL_AMBER" || family === "GOURMAND") bonus += 15;
  }

  if (weather.condition === "rain" || weather.condition === "snow") {
    // 습도 높은 날엔 가볍고 깨끗한 향이 오래 편안함
    if (family === "FRESH" || family === "CHYPRE") bonus += 10;
    if (family === "GOURMAND") bonus -= 5;
  } else if (weather.condition === "clear") {
    if (family === "CITRUS" || family === "FRESH") bonus += 5;
  } else if (weather.condition === "clouds") {
    if (family === "ORIENTAL_AMBER" || family === "WOODY") bonus += 5;
  }

  return bonus;
}
