import { useRef } from "react";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router-dom";
import { cachedPosts, getPosts } from "../api";
import { getPost, thumbnailUrl } from "../postApi";
import PostHeader from "../components/PostHeader";
import PostList from "../components/PostList";
import Prose from "../components/Prose";
import { TocAside, TocBar, useActiveHeading, useHeadings } from "../components/Toc";
import { useDocumentTitle } from "../lib/hooks";
import { relatedPosts } from "../lib/related";
import "./Post.css";

export async function loader({ params }) {
  const cached = cachedPosts();
  const [post, all] = await Promise.all([
    getPost(params.postId),
    cached ? Promise.resolve(cached) : getPosts().catch(() => []),
  ]);
  if (!post) throw new Response("", { status: 404, statusText: "Not Found" });
  return { post, related: relatedPosts(post, all) };
}

export function Component() {
  const { post, related } = useLoaderData();
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);
  const headings = useHeadings(articleRef, `${post.id}:${post.text.length}`);
  const activeId = useActiveHeading(headings);
  useDocumentTitle(post.title);

  // 목록에서 왔으면 뒤로 가기로 돌아가 보던 필터와 스크롤 위치를 그대로 살린다.
  const cameFromList = location.state && location.state.from === "home";
  const backToList = (event) => {
    if (cameFromList) {
      event.preventDefault();
      navigate(-1);
    }
  };

  return (
    <div className="post-page">
      <div className="post-page__main">
        <p className="post-page__back">
          <Link to="/" onClick={backToList}>
            글 목록
          </Link>
        </p>
        <article ref={articleRef} className="article" aria-labelledby="post-title">
          <PostHeader post={post} titleId="post-title" coverSrc={thumbnailUrl(post.id)} />
          <TocBar headings={headings} activeId={activeId} />
          <Prose source={post.text} />
        </article>
        {related.length > 0 && (
          <section className="related" aria-labelledby="related-title">
            <h2 id="related-title" className="related__title">
              같은 주제의 글
            </h2>
            <PostList posts={related} />
          </section>
        )}
      </div>
      <aside className="post-page__aside">
        <TocAside headings={headings} activeId={activeId} />
      </aside>
    </div>
  );
}
