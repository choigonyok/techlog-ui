import { ApiError, HOST, invalidateListCache, request } from "./api";
import { invalidatePostCache } from "./postApi";

// 관리 화면에서만 쓰는 요청. 첫 화면 묶음에 들어가지 않도록 따로 둔다.

function authHeaders(extra = {}) {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

function jsonBody(fields) {
  return JSON.stringify({ title: fields.title, subtitle: fields.subtitle, tags: fields.tags, text: fields.text });
}

// 썸네일은 파일을 본문 그대로 올린다(서버가 풀지 않고 저장소로 흘려 넣는다).
async function putThumbnail(id, file) {
  await request(`/api/posts/${encodeURIComponent(id)}/thumbnail`, {
    method: "PUT",
    body: file,
    headers: authHeaders({ "Content-Type": file.type || "application/octet-stream" }),
  });
}

function invalidate() {
  invalidateListCache();
  invalidatePostCache();
}

// 새 글을 만들고 id 를 돌려준다. 썸네일을 골랐으면 이어서 올린다.
export async function createPost(fields, file) {
  try {
    const { id } = await request("/api/posts", {
      method: "POST",
      body: jsonBody(fields),
      headers: authHeaders({ "Content-Type": "application/json" }),
    });
    if (file) await putThumbnail(id, file);
    return id;
  } finally {
    invalidate();
  }
}

export async function updatePost(id, fields, file) {
  try {
    await request(`/api/posts/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: jsonBody(fields),
      headers: authHeaders({ "Content-Type": "application/json" }),
    });
    if (file) await putThumbnail(id, file);
  } finally {
    invalidate();
  }
}

export async function deletePost(id) {
  try {
    await request(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() });
  } finally {
    invalidate();
  }
}

// 관리자 로그인
const TOKEN_KEY = "jwt_token";

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 로그인 상태가 유지되지 않는다.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 지울 수 없으면 다음 확인에서 다시 401 을 받는다.
  }
}

export const loginUrl = `${HOST}/api/login`;

// 200 이면 통과, 401 은 만료·잘못된 토큰, 403 은 허가되지 않은 계정이다.
export async function validateToken(token) {
  try {
    const res = await fetch(`${HOST}/api/token`, {
      method: "POST",
      body: JSON.stringify({ token }),
      credentials: "include",
    });
    // 본문을 읽어 요청을 닫는다(읽지 않으면 브라우저에 열린 채 남는다).
    await res.text().catch(() => "");
    return res.status;
  } catch {
    return 0;
  }
}

export async function exchangeCode(code, state) {
  const query = new URLSearchParams({ code, state }).toString();
  const data = await request(`/api/github/callback?${query}`);
  if (!data || !data.token) throw new ApiError(502, "로그인 토큰을 받지 못했습니다.");
  return data.token;
}
