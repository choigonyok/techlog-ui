import { HOST, normalizePost, request } from "./api";

// 글 한 편과 썸네일 주소. 글 화면·관리 화면에서만 쓰여 첫 화면 묶음 밖에 둔다.
const postCache = new Map();

export function invalidatePostCache() {
  postCache.clear();
}

export async function getPost(id, { fresh = false } = {}) {
  if (!fresh && postCache.has(id)) return postCache.get(id);
  const raw = await request(`/api/posts/${encodeURIComponent(id)}`);
  // 없는 글이어도 서버는 200 과 빈 글을 보낸다.
  if (!raw || !raw.id) return null;
  const post = normalizePost(raw);
  postCache.set(id, post);
  return post;
}

export function thumbnailUrl(id) {
  return `${HOST}/api/posts/${encodeURIComponent(id)}/thumbnail`;
}

