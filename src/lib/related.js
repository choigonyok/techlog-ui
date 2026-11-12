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
