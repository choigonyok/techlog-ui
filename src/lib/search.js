// 글 목록에서 찾기. 띄어 쓴 낱말이 제목·부제·주제 어디엔가 모두 들어 있는 글을 고른다.
// 대소문자는 가리지 않는다.

export function searchTerms(query) {
  return String(query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchesSearch(post, terms) {
  if (!terms.length) return true;
  const haystack = `${post.title} ${post.subtitle} ${post.topics.join(" ")}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
