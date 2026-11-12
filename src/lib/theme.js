// 밝은 화면·어두운 화면. 고르지 않았으면 시스템 설정을 따르고, 고르면 이 브라우저에 기억한다.
// 첫 그림 전에 html 의 data-theme 을 붙이는 일은 public/index.html 의 머리 스크립트가 한다.
// 키와 판 색은 그 스크립트와 같아야 한다.
const KEY = "techlog:theme";
const BAR = { light: "#0e3b2c", dark: "#103a2c" };

function systemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function stored() {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  // 폰 브라우저의 주소창 색을 머리 막대의 판 색에 맞춘다.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", BAR[theme]);
}

export function setTheme(theme) {
  apply(theme);
  try {
    // 시스템 설정과 같은 쪽을 고르면 기억을 지워, 뒤에 시스템 설정이 바뀔 때 다시 따라가게 한다.
    if (theme === systemTheme()) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 바뀐다.
  }
}

// 고른 적이 없으면 시스템 설정이 바뀔 때 따라간다. 바뀐 테마를 onChange 로 알린다.
export function followSystemTheme(onChange) {
  if (!window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => {
    if (stored()) return;
    const theme = systemTheme();
    apply(theme);
    onChange(theme);
  };
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
