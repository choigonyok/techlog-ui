import { normalizeDate } from "./lib/dates";
import { topicsOf } from "./lib/topics";

export const HOST = (process.env.REACT_APP_HOST || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function request(path, { method = "GET", body, signal } = {}) {
  let res;
  try {
    res = await fetch(HOST + path, { method, body, signal, credentials: "include" });
  } catch (error) {
    if (error && error.name === "AbortError") throw error;
    throw new ApiError(0, "서버에 연결하지 못했습니다.");
  }
  if (!res.ok) throw new ApiError(res.status, `서버가 ${res.status} 응답을 보냈습니다.`);
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function normalizePost(raw) {
  return {
    id: raw && raw.id != null ? String(raw.id) : "",
    title: (raw && raw.title) || "",
    subtitle: (raw && raw.subtitle) || "",
    date: normalizeDate(raw && raw.writeTime),
    tags: Array.isArray(raw && raw.tags) ? raw.tags.filter((t) => typeof t === "string") : [],
    topics: topicsOf(raw && raw.tags),
    text: (raw && raw.text) || "",
  };
}

// 글 목록은 한 번 받아 두고 돌려쓴다. 글을 보고 돌아왔을 때 목록이 바로 그려져야
// 스크롤 위치를 되살릴 수 있다.
const LIST_TTL = 5 * 60 * 1000;
let listCache = null; // { at, promise, data }

export function getPosts({ fresh = false } = {}) {
  if (!fresh && listCache && Date.now() - listCache.at < LIST_TTL) {
    return listCache.data ? Promise.resolve(listCache.data) : listCache.promise;
  }
  const entry = { at: Date.now(), data: null, promise: null };
  entry.promise = request("/api/posts")
    .then((list) => {
      const posts = (Array.isArray(list) ? list : []).map(normalizePost).filter((p) => p.id);
      entry.data = posts;
      return posts;
    })
    .catch((error) => {
      if (listCache === entry) listCache = null;
      throw error;
    });
  listCache = entry;
  return entry.promise;
}

// 받아 둔 목록이 있으면 기다리지 않고 바로 돌려준다.
export function cachedPosts() {
  return listCache && listCache.data && Date.now() - listCache.at < LIST_TTL ? listCache.data : null;
}

// 서버는 이 요청을 받을 때마다 오늘 방문 수를 하나 올린다. 한 번 불러온 화면에서는 한 번만 보낸다.
let visitorPromise = null;
export function getVisitors() {
  if (!visitorPromise) {
    visitorPromise = request("/api/visitor").catch((error) => {
      visitorPromise = null;
      throw error;
    });
  }
  return visitorPromise;
}

export function invalidateListCache() {
  listCache = null;
}
