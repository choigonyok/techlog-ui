import { Outlet, redirect } from "react-router-dom";
import { clearToken, readToken, validateToken } from "../../adminApi";
import { ApiError } from "../../api";
import "./Admin.css";

// 관리 화면에 들어올 때 토큰을 서버에 확인한다.
export async function loader() {
  const token = readToken();
  if (!token) return redirect("/login");
  const status = await validateToken(token);
  if (status === 200) return null;
  if (status === 403) throw new Response("", { status: 403 });
  if (status === 0) throw new ApiError(0, "서버에 연결하지 못했습니다.");
  if (status === 401 || status === 400) {
    clearToken();
    return redirect("/login?expired=1");
  }
  throw new Response("", { status });
}

// 서버가 내주는 토큰은 5분이면 만료된다. 관리 화면 안에서 오갈 때마다 다시 확인하면 글을 쓰다
// 로그인 화면으로 튕기므로, 바깥에서 들어올 때만 확인한다.
export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }) {
  if (currentUrl.pathname.startsWith("/admin") && nextUrl.pathname.startsWith("/admin")) return false;
  return defaultShouldRevalidate;
}

export function Component() {
  return <Outlet />;
}
