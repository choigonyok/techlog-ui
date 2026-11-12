import { Link, redirect, useLoaderData } from "react-router-dom";
import { exchangeCode, saveToken } from "../adminApi";
import "./Auth.css";
import { useDocumentTitle } from "../lib/hooks";

// GitHub 가 돌려보낸 code 를 토큰으로 바꾼다. 로더에서 한 번만 바꾸므로 개발 모드의 이중 실행에도
// 같은 code 를 두 번 쓰지 않는다.
export async function loader({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return redirect("/login");
  try {
    saveToken(await exchangeCode(code, state));
    return redirect("/admin");
  } catch (error) {
    return { failure: error && error.status === 403 ? "forbidden" : "failed" };
  }
}

export function HydrateFallback() {
  return (
    <div className="narrow">
      <p role="status">로그인하는 중입니다.</p>
    </div>
  );
}

export function Component() {
  const { failure } = useLoaderData();
  const forbidden = failure === "forbidden";
  useDocumentTitle("로그인");

  return (
    <div className="narrow">
      <h1>{forbidden ? "허가되지 않은 계정입니다" : "로그인하지 못했습니다"}</h1>
      <p>
        {forbidden
          ? "이 GitHub 계정으로는 관리 화면에 들어갈 수 없습니다."
          : "GitHub 확인이 끝나지 않았습니다. 처음부터 다시 로그인하세요."}
      </p>
      <Link className="button button--primary" to={forbidden ? "/" : "/login"}>
        {forbidden ? "처음 화면으로" : "다시 로그인"}
      </Link>
    </div>
  );
}
