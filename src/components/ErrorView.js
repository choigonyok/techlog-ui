import { useEffect } from "react";
import { isRouteErrorResponse } from "react-router-dom";
import { useDocumentTitle } from "../lib/hooks";

const reload = () => window.location.reload();

// 무슨 일이 났는지와 어떻게 하면 되는지를 함께 적는다.
const COPY = {
  notfound: ["찾는 화면이 없습니다", "주소가 바뀌었거나 삭제한 글일 수 있습니다."],
  forbidden: ["이 계정으로는 관리 화면에 들어갈 수 없습니다", "허가된 GitHub 계정으로 다시 로그인하세요."],
  offline: ["서버에 연결하지 못했습니다", "인터넷 연결을 확인한 뒤 다시 불러오세요."],
  server: ["글을 불러오지 못했습니다", "서버에서 오류가 났습니다. 잠시 뒤 다시 불러오세요."],
  stale: ["새 버전이 올라왔습니다", "화면을 다시 불러오면 이어서 볼 수 있습니다."],
  render: ["화면을 그리다 멈췄습니다", "다시 불러와도 같으면 처음 화면에서 다시 들어와 주세요."],
};

function classify(error) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return "notfound";
    return error.status === 403 ? "forbidden" : "server";
  }
  if (error && (error.name === "ChunkLoadError" || error.code === "CSS_CHUNK_LOAD_FAILED")) return "stale";
  if (error && error.name === "ApiError") return error.status === 0 ? "offline" : "server";
  return "render";
}

export function Problem({ kind }) {
  const [title, body] = COPY[kind];
  useDocumentTitle(title);
  return (
    <div className="problem">
      <h1 className="problem__title">{title}</h1>
      <p className="problem__body">{body}</p>
      <div className="problem__actions">
        {kind === "forbidden" ? (
          <a className="button button--primary" href="/login">
            다른 계정으로 로그인
          </a>
        ) : kind !== "notfound" ? (
          <button type="button" className="button button--primary" onClick={reload}>
            다시 불러오기
          </button>
        ) : null}
        {kind !== "stale" && (
          <a className={`button${kind === "notfound" ? " button--primary" : ""}`} href="/">
            처음 화면으로
          </a>
        )}
      </div>
    </div>
  );
}

export function NotFound() {
  return <Problem kind="notfound" />;
}

// 라우트에서 난 오류(데이터를 못 받았거나 화면을 그리다 멈춘 경우)를 빈 화면 대신 안내로 보여 준다.
// 오류는 드물어서 이 안내 화면은 처음 묶음에 넣지 않고 필요할 때 받는다(RouteError 가 감싼다).
export default function ProblemView({ error }) {
  const kind = classify(error);
  useEffect(() => {
    if (kind === "render" || kind === "server") console.error(error);
  }, [kind, error]);
  return <Problem kind={kind} />;
}
