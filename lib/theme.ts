// 다크모드는 React state가 아니라 <html data-theme>/localStorage에 있는 "바깥" 상태라,
// useEffect+setState 대신 useSyncExternalStore로 안전하게 구독한다(SSR 스냅샷과
// 하이드레이션 이후 실제 값이 달라도 깜빡임/불일치 경고 없이 처리됨).

const listeners = new Set<() => void>();

export function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function getThemeSnapshot(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function getThemeServerSnapshot(): boolean {
  return false;
}

export function setDarkMode(dark: boolean) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    // 프라이빗 브라우징 등으로 localStorage를 못 쓰면 이번 세션에서만 적용되고 끝난다.
  }
  listeners.forEach((l) => l());
}
