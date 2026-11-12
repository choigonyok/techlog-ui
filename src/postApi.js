import { ApiError, HOST, normalizePost, request } from "./api";

// 글 한 편과 그림 주소. 글 화면·관리 화면에서만 쓰여 첫 화면 묶음 밖에 둔다.
const postCache = new Map();

export function invalidatePostCache() {
  postCache.clear();
}

export async function getPost(id, { fresh = false } = {}) {
  if (!fresh && postCache.has(id)) return postCache.get(id);
  let raw;
  try {
    raw = await request(`/api/posts/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
  if (!raw || !raw.id) return null;
  const post = normalizePost(raw);
  postCache.set(id, post);
  return post;
}

export function imageUrl(key) {
  return `${HOST}/api/images/${encodeURIComponent(key)}`;
}

// 썸네일이 없는 글은 null 이라 표지를 그리지 않는다(없는 그림을 부르지 않는다).
export function thumbnailUrl(post) {
  return post && post.thumbnail ? imageUrl(post.thumbnail) : null;
}
