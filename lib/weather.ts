import { mapOwmCondition, CONDITION_LABELS, type WeatherSnapshot } from "@/lib/weather-rules";

// OPENWEATHER_API_KEY를 쓰는 서버 전용 파일 — 클라이언트 컴포넌트에서 import하지 말 것
// (순수 로직만 필요하면 lib/weather-rules.ts를 쓸 것).

// 키가 아직 없거나 호출이 실패하면 null을 반환한다 — 호출부는 날씨 없이도
// 정상 동작해야 하고(가중치 0), 이 함수의 실패가 추천 자체를 막아선 안 된다.
export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    // API가 응답을 안 주고 멈추는 경우까지 대비해 타임아웃을 건다 — 그래도 실패하면
    // catch에서 null을 돌려줘 추천 자체는 날씨 없이 계속 동작한다.
    const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const conditionId = data?.weather?.[0]?.id;
    const tempC = data?.main?.temp;
    if (typeof conditionId !== "number" || typeof tempC !== "number") return null;

    const condition = mapOwmCondition(conditionId);
    return { tempC: Math.round(tempC), condition, label: CONDITION_LABELS[condition] };
  } catch {
    return null;
  }
}
