import { compareByDateDesc } from "./dates";

// 같은 주제를 많이 공유하는 글부터, 같으면 최근 글부터 고른다.
export function relatedPosts(post, all, limit = 4) {
  const mine = new Set(post.topics);
  if (!mine.size) return [];
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({ post: p, shared: p.topics.filter((t) => mine.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((x, y) => y.shared - x.shared || y.post.date.localeCompare(x.post.date))
    .slice(0, limit)
    .map((x) => x.post);
}

// 쓴 순서로 바로 앞(older)과 바로 뒤(newer)의 글. 목록과 같은 차례를 쓴다.
// 날짜가 없는 글은 차례를 알 수 없어 잇지 않는다.
export function neighborPosts(post, all) {
  const ordered = all.filter((p) => p.date).sort(compareByDateDesc);
  const at = ordered.findIndex((p) => p.id === post.id);
  if (at < 0) return { older: null, newer: null };
  return { older: ordered[at + 1] || null, newer: ordered[at - 1] || null };
}
