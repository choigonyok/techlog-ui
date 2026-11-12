import { useSearchParams } from "react-router-dom";
import { loginUrl } from "../adminApi";
import "./Auth.css";
import { useDocumentTitle } from "../lib/hooks";

export function Component() {
  const [params] = useSearchParams();
  useDocumentTitle("관리자 로그인");
  const expired = params.get("expired") === "1";

  return (
    <div className="narrow">
      <h1>관리자 로그인</h1>
      {expired && (
        <p className="notice" role="status">
          로그인한 지 오래되어 다시 확인해야 합니다. 다시 로그인하세요.
        </p>
      )}
      <p>글을 쓰고 고치려면 GitHub 계정으로 로그인합니다. 허가된 계정만 관리 화면에 들어갈 수 있습니다.</p>
      <a className="button button--primary" href={loginUrl}>
        GitHub으로 로그인
      </a>
    </div>
  );
}
