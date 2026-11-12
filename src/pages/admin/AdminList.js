import { useMemo, useState } from "react";
import { Link, useLoaderData, useLocation, useRevalidator } from "react-router-dom";
import { deletePost } from "../../adminApi";
import { getPosts } from "../../api";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatClock } from "../../lib/clock";
import { compareByDateDesc, formatDots } from "../../lib/dates";
import { isEmptyDraft, loadDraft } from "../../lib/draft";
import { useDocumentTitle } from "../../lib/hooks";

export async function loader() {
  return { posts: await getPosts({ fresh: true }) };
}

// 관리 화면에 들어오면 바로 글 목록이 보인다. 고치기·삭제는 각 글 줄에서 한다.
export function Component() {
  const { posts } = useLoaderData();
  const location = useLocation();
  const revalidator = useRevalidator();
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState((location.state && location.state.message) || "");
  const [error, setError] = useState("");
  const [draft] = useState(() => {
    const d = loadDraft();
    return d && !isEmptyDraft(d) ? d : null;
  });
  const sorted = useMemo(() => [...posts].sort(compareByDateDesc), [posts]);
  useDocumentTitle("글 관리");

  const confirmDelete = async () => {
    const post = target;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await deletePost(post.id);
      // 서버는 삭제에 실패해도 200 을 보낼 때가 있어 목록을 다시 받아 확인한다.
      const fresh = await getPosts({ fresh: true });
      if (fresh.some((p) => p.id === post.id)) {
        setError(`‘${post.title}’ 글이 아직 남아 있습니다. 서버 기록을 확인해 주세요.`);
      } else {
        setMessage(`‘${post.title}’ 글을 삭제했습니다.`);
      }
      revalidator.revalidate();
    } catch (e) {
      setError(`‘${post.title}’ 글을 삭제하지 못했습니다. ${e.message}`);
    } finally {
      setBusy(false);
      setTarget(null);
    }
  };

  return (
    <>
      <div className="page-head on-field">
        <div className="wrap page-head__inner page-head__row">
          <h1 className="page-head__title">글 관리</h1>
          <Link className="button button--light" to="/admin/write">
            새 글 쓰기
          </Link>
        </div>
      </div>

      <div className="wrap admin">
        {draft && (
          <p className="notice">
            <span>{formatClock(draft.savedAt)}에 임시 저장한 새 글이 있습니다.</span>
            <Link to="/admin/write">이어 쓰기</Link>
          </p>
        )}
        <p className="admin-status" role="status">
          {message}
        </p>
        {error && (
          <p className="notice" data-tone="danger" role="alert">
            {error}
          </p>
        )}

        <p className="admin-count tnum">글 {sorted.length}편</p>
        <ul className="admin-list">
          {sorted.map((post) => (
            <li key={post.id} className="admin-row">
              <time className="admin-row__date tnum" dateTime={post.date || undefined}>
                {formatDots(post.date) || "날짜 없음"}
              </time>
              <div className="admin-row__main">
                <p className="admin-row__title">
                  <Link to={`/posts/${encodeURIComponent(post.id)}`}>{post.title || "제목 없음"}</Link>
                </p>
                {post.subtitle && <p className="admin-row__subtitle">{post.subtitle}</p>}
                {post.topics.length > 0 && <p className="admin-row__topics">{post.topics.join(", ")}</p>}
              </div>
              <div className="admin-row__actions">
                <Link
                  className="button"
                  to={`/admin/posts/${encodeURIComponent(post.id)}`}
                  aria-label={`‘${post.title}’ 수정`}
                >
                  수정
                </Link>
                <button
                  type="button"
                  className="button button--quiet admin-row__delete"
                  onClick={() => setTarget(post)}
                  aria-label={`‘${post.title}’ 삭제`}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        title="이 글을 삭제할까요?"
        confirmLabel={busy ? "삭제하는 중" : "삭제"}
        tone="danger"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      >
        <p>‘{target ? target.title : ""}’ 글과 그 이미지를 지웁니다. 삭제한 글은 되살릴 수 없습니다.</p>
      </ConfirmDialog>
    </>
  );
}
