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

// 정렬된 글을 달마다 묶는다. 차례는 그대로 두고, 날짜가 없는 글은 key 가 빈 묶음에 모인다.
export function groupByMonth(posts) {
  const groups = [];
  for (const post of posts) {
    const key = post.date ? post.date.slice(0, 7) : "";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.posts.push(post);
    else groups.push({ key, posts: [post] });
  }
  return groups;
}

// "2024-01" → "2024년 1월"
export function formatMonth(key) {
  return key ? `${key.slice(0, 4)}년 ${Number(key.slice(5, 7))}월` : "날짜 없음";
}

// "2024-01-28" → "28일"
export function formatDay(iso) {
  return iso ? `${Number(iso.slice(8, 10))}일` : "";
}

// "2024-01-28" → "2024년 1월 28일"
export function formatLong(iso) {
  return iso ? `${iso.slice(0, 4)}년 ${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일` : "";
}

// "2024-01-28" → "2024.01.28"
export function formatDots(iso) {
  return iso ? iso.replace(/-/g, ".") : "";
}
