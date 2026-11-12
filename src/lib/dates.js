// 저장된 작성일은 "2023/07/04", "2024-01-03" 처럼 형식이 섞여 있다.
// 문자열 그대로 비교하면 '-' 와 '/' 때문에 순서가 틀어지므로 YYYY-MM-DD 로 맞춘다.
export function normalizeDate(raw) {
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(String(raw ?? "").trim());
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

// 최근 글이 먼저 온다. 날짜가 같으면 제목 순, 날짜가 없는 글은 맨 뒤로 보낸다.
export function compareByDateDesc(a, b) {
  if (a.date !== b.date) {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date < b.date ? 1 : -1;
  }
  return a.title.localeCompare(b.title, "ko");
}
