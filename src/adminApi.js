import { ApiError, HOST, invalidateListCache, request } from "./api";
import { invalidatePostCache } from "./postApi";

// 관리 화면에서만 쓰는 요청. 첫 화면 묶음에 들어가지 않도록 따로 둔다.

// 글 쓰기·고치기. 서버는 실패해도 200 을 보낼 때가 있어, 결과 확인은 부르는 쪽에서 다시 읽어 한다.
function postForm(fields, file) {
  const form = new FormData();
  if (file) form.append("file", file);
  form.append(
    "data",
    JSON.stringify({
      title: fields.title,
      subtitle: fields.subtitle,
      tags: fields.tags,
      text: fields.text,
      thumbnail_name: file ? file.name : "",
    })
  );
  return form;
}

export async function createPost(fields, file) {
  try {
    await request("/api/post", { method: "POST", body: postForm(fields, file) });
  } finally {
    invalidateListCache();
    invalidatePostCache();
  }
}

export async function updatePost(id, fields, file) {
  try {
    await request(`/api/posts/${encodeURIComponent(id)}`, { method: "PUT", body: postForm(fields, file) });
  } finally {
    invalidateListCache();
    invalidatePostCache();
  }
}

export async function deletePost(id) {
  try {
    await request(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  } finally {
    invalidateListCache();
    invalidatePostCache();
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
