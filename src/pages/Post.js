import { useMemo, useRef } from "react";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router-dom";
import { cachedPosts, getPosts } from "../api";
import { getPost, thumbnailUrl } from "../postApi";
import Icon from "../components/Icon";
import PostHeader, { PostCover } from "../components/PostHeader";
import PostList from "../components/PostList";
import Prose from "../components/Prose";
import { TocAside, TocBar, useActiveHeading, useHeadings } from "../components/Toc";
import { useDocumentTitle } from "../lib/hooks";
import { readingMinutes } from "../lib/reading";
import { neighborPosts, relatedPosts } from "../lib/related";
import "./Post.css";

export async function loader({ params }) {
  const cached = cachedPosts();
  const [post, all] = await Promise.all([
    getPost(params.postId),
    cached ? Promise.resolve(cached) : getPosts().catch(() => []),
  ]);
  if (!post) throw new Response("", { status: 404, statusText: "Not Found" });
  return { post, related: relatedPosts(post, all), ...neighborPosts(post, all) };
}

function Neighbor({ post, label, side }) {
  if (!post) return <span />;
  return (
    <Link className={`post-nav__link post-nav__link--${side}`} to={`/posts/${encodeURIComponent(post.id)}`}>
      <span className="post-nav__label">
        {side === "older" && <Icon name="left" size={16} />}
        {label}
        {side === "newer" && <Icon name="right" size={16} />}
      </span>
      <span className="post-nav__title">{post.title || "제목 없음"}</span>
    </Link>
  );
}

export function Component() {
  const { post, related, older, newer } = useLoaderData();
  const location = useLocation();
  const navigate = useNavigate();
  const bodyRef = useRef(null);
  const headings = useHeadings(bodyRef, `${post.id}:${post.text.length}`);
  const activeId = useActiveHeading(headings);
  const minutes = useMemo(() => readingMinutes(post.text), [post.text]);
  useDocumentTitle(post.title);

  // 목록에서 왔으면 뒤로 가기로 돌아가 보던 조건과 스크롤 위치를 그대로 살린다.
  const cameFromList = location.state && location.state.from === "home";
  const backToList = (event) => {
    if (cameFromList) {
      event.preventDefault();
      navigate(-1);
    }
  };

  const cover = thumbnailUrl(post);

  return (
    <>
      <article aria-labelledby="post-title">
        <header className="page-head on-field">
          <div className="wrap page-head__inner">
            <p className="post-back">
              <Link to="/" onClick={backToList}>
                <Icon name="left" size={16} />글 목록
              </Link>
            </p>
            <PostHeader post={post} titleId="post-title" minutes={minutes} />
          </div>
        </header>
        <div className="wrap split post">
          {/* 목차가 본문보다 먼저 포커스를 받도록 레일을 앞에 둔다. 놓이는 자리는 CSS 가 정한다. */}
          <div className="split__rail">
            <div className="split__sticky">
              <TocAside headings={headings} activeId={activeId} />
            </div>
          </div>
          <div className="split__main" ref={bodyRef}>
            <TocBar headings={headings} activeId={activeId} articleRef={bodyRef} />
            <PostCover key={cover || "none"} src={cover} />
            <Prose source={post.text} />
          </div>
        </div>
      </article>

      <div className="wrap split post-after">
        <div className="split__main">
          {(older || newer) && (
            <nav className="post-nav" aria-label="앞뒤 글">
              <Neighbor post={older} label="이전 글" side="older" />
              <Neighbor post={newer} label="다음 글" side="newer" />
            </nav>
          )}
          {related.length > 0 && (
            <section className="related" aria-labelledby="related-title">
              <h2 id="related-title" className="related__title">
                같은 주제의 글
              </h2>
              <PostList posts={related} />
            </section>
          )}
          <p className="post-after__back">
            <Link to="/" onClick={backToList} className="button">
              <Icon name="left" size={16} />글 목록
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
