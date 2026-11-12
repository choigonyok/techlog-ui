// 태그를 '주제'로 다룬다. 저장된 태그는 대소문자가 섞여 있어(ISTIO, istio) 소문자 키로 묶고,
// 화면에도 쿠버네티스 레이블처럼 소문자로 보인다.

export function topicKey(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// 한 글의 태그 배열을 중복 없는 주제 키 목록으로 바꾼다. 쉼표로 한 칸에 여럿 적힌 태그도 나눈다.
export function topicsOf(tags) {
  const seen = new Set();
  const out = [];
  for (const tag of Array.isArray(tags) ? tags : []) {
    for (const part of String(tag ?? "").split(",")) {
      const key = topicKey(part);
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return out;
}

// 주제마다 글이 몇 편인지 센다. 글이 많은 주제부터, 같으면 이름 순이다.
export function countTopics(posts) {
  const counts = new Map();
  for (const post of posts) {
    for (const key of new Set(post.topics)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
