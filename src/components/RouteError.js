import { Component, Suspense, lazy } from "react";
import { useRouteError } from "react-router-dom";

const ProblemView = lazy(() => import("./ErrorView"));

const reload = () => window.location.reload();

// 안내 화면 묶음조차 받지 못하면(연결이 끊겼거나 새 버전이 올라와 옛 파일이 사라진 경우)
// 이 최소 안내를 보인다. 어떤 경우에도 빈 화면으로 남지 않는다.
class LoadGuard extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="wrap">
        <div className="problem">
          <h1 className="problem__title">화면을 불러오지 못했습니다</h1>
          <p className="problem__body">연결을 확인한 뒤 다시 불러오세요.</p>
          <div className="problem__actions">
            <button type="button" className="button button--primary" onClick={reload}>
              다시 불러오기
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function RouteError() {
  const error = useRouteError();
  return (
    <LoadGuard>
      <Suspense fallback={null}>
        <ProblemView error={error} />
      </Suspense>
    </LoadGuard>
  );
}
