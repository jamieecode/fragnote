"use server";

import { auth } from "@/auth";
import { fetchWeather } from "@/lib/weather";
import { getRecommendations } from "@/lib/recommend";
import { toHomeRecItem, type HomeRecItem } from "@/lib/recommend-scoring";
import type { WeatherSnapshot } from "@/lib/weather-rules";

export type { HomeRecItem } from "@/lib/recommend-scoring";

// 클라이언트는 위치(위도/경도)만 넘기고, API 키를 쓰는 실제 호출은 서버에서만 실행한다.
// 날씨를 반영해 오늘의 추천을 다시 계산해서 돌려준다 — 키가 아직 없으면
// fetchWeather가 null을 반환하고, 그 경우 날씨 보너스 없이 기존과 동일하게 동작한다.
export async function getWeatherAdjustedDaily(
  lat: number,
  lon: number,
  limit = 5
): Promise<{ weather: WeatherSnapshot | null; items: HomeRecItem[] }> {
  const userId = (await auth())?.user?.id;
  if (!userId) throw new Error("로그인이 필요해요");

  const weather = await fetchWeather(lat, lon);
  const daily = await getRecommendations(userId, "daily", { limit, weather });

  return {
    weather,
    items: daily.items.map((it) => toHomeRecItem(it, daily.usedFallback)),
  };
}
