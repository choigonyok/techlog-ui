import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router-dom";
import { cachedPosts, getPosts } from "../api";
import PostList from "../components/PostList";
import TopicChips from "../components/TopicChips";
import TopicMesh from "../components/TopicMesh";
import profile from "../assets/profile.jpg";
import { compareByDateDesc } from "../lib/dates";
import { useDocumentTitle } from "../lib/hooks";
import { buildTopicGraph, topicKey } from "../lib/topics";
import "./Home.css";

// 받아 둔 목록이 있으면 기다리지 않는다. 글을 보고 돌아왔을 때 목록이 같은 높이로 바로 그려져야
// 스크롤 위치가 그대로 돌아온다.
export function homeLoader() {
  const cached = cachedPosts();
  if (cached) return { posts: cached };
  return getPosts().then((posts) => ({ posts }));
}

function Intro() {
  return (
    <section className="intro home__intro" aria-labelledby="intro-title">
      <img className="intro__photo" src={profile} alt="" width="64" height="64" />
      <div className="intro__text">
        <h1 id="intro-title" className="intro__title">
          꾸준함이란 도구로 성장하기를 즐기는 DevSecOps 엔지니어 최윤석입니다.
        </h1>
        <dl className="intro__history">
          <div>
            <dt className="tnum">2017.03 – 2025.02</dt>
            <dd>Kyunghee Univ. Computer Engineering</dd>
          </div>
          <div>
            <dt className="tnum">2024.03 – 2024.08</dt>
            <dd>SLEXN, inc. Internship (Infrastructure Engineer)</dd>
          </div>
        </dl>
        <ul className="intro__links">
          <li>
            <a href="https://github.com/choigonyok">GitHub</a>
          </li>
          <li>
            <a href="https://www.instagram.com/choigonyok">Instagram</a>
          </li>
          <li>
            <a href="https://www.youtube.com/channel/UCjcaraxwh4Fz6KYJwfE0-Hg">YouTube</a>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default function Home() {
  const { posts } = useLoaderData();
  const [params] = useSearchParams();
  const selected = topicKey(params.get("tag")) || null;

  const graph = useMemo(() => buildTopicGraph(posts), [posts]);
  const sorted = useMemo(() => [...posts].sort(compareByDateDesc), [posts]);
  const visible = useMemo(
    () => (selected ? sorted.filter((p) => p.topics.includes(selected)) : sorted),
    [sorted, selected]
  );
  const [activePost, setActivePost] = useState(null);

  useDocumentTitle(selected ? `${selected} 주제의 글` : null);

  // 필터가 바뀌면 결과 수를 화면 낭독기에 읽어 준다. 처음 열 때는 읽지 않는다.
  const [announcement, setAnnouncement] = useState("");
  const firstFilter = useRef(true);
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    setAnnouncement(
      selected ? `${selected} 주제의 글 ${visible.length}편을 보여 줍니다.` : `전체 글 ${visible.length}편을 보여 줍니다.`
    );
  }, [selected, visible.length]);

  const unknownTopic = selected && !graph.neighbors.has(selected);

  return (
    <div className="home">
      <Intro />
      <div className="home__mesh">
        <TopicMesh graph={graph} selected={selected} highlight={activePost ? activePost.topics : null} />
      </div>
      <section className="home__list" aria-labelledby="list-title">
        <div className="list-head">
          <h2 id="list-title" className="list-head__title">
            {selected ? `${selected} 주제의 글` : "글"}
          </h2>
          <p className="list-head__count tnum">{visible.length}편</p>
        </div>
        <TopicChips topics={graph.topics} total={posts.length} selected={selected} />
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        {visible.length > 0 ? (
          <PostList posts={visible} selected={selected} onActivePost={setActivePost} from="home" />
        ) : (
          <div className="home__empty">
            <p>
              {unknownTopic ? `‘${selected}’ 주제로 쓴 글이 없습니다.` : "아직 올린 글이 없습니다."}
            </p>
            {selected && (
              <Link to="/" replace className="button">
                전체 글 보기
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
