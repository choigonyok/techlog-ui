import { codeLanguage, rehypeHeadings, rehypeYoutube, youtubeId } from "./markdownTree";

const h = (tagName, text) => ({ type: "element", tagName, properties: {}, children: [{ type: "text", value: text }] });
const levels = (tree) => tree.children.map((n) => `${n.tagName}#${n.properties.id}`);

test("본문의 가장 큰 제목을 h2 로 맞추고 단계를 같이 옮긴다", () => {
  const tree = { type: "root", children: [h("h1", "개요"), h("h2", "설치"), h("h1", "정리")] };
  rehypeHeadings()(tree);
  expect(levels(tree)).toEqual(["h2#개요", "h3#설치", "h2#정리"]);
});

test("## 로 시작하는 글은 그대로 h2·h3", () => {
  const tree = { type: "root", children: [h("h2", "1. Preamble"), h("h3", "세부"), h("h2", "Summary")] };
  rehypeHeadings()(tree);
  expect(levels(tree)).toEqual(["h2#1-preamble", "h3#세부", "h2#summary"]);
});

test("미리보기처럼 h2 아래에 놓이면 h3 부터 시작한다", () => {
  const tree = { type: "root", children: [h("h2", "A"), h("h3", "B")] };
  rehypeHeadings({ base: 3 })(tree);
  expect(levels(tree)).toEqual(["h3#a", "h4#b"]);
});

test("유튜브 주소에서 영상 id 를 읽는다", () => {
  expect(youtubeId("https://youtu.be/eciM1M9p2E4?si=nu58")).toBe("eciM1M9p2E4");
  expect(youtubeId("https://www.youtube.com/watch?v=eciM1M9p2E4")).toBe("eciM1M9p2E4");
  expect(youtubeId("https://www.youtube.com/embed/eciM1M9p2E4")).toBe("eciM1M9p2E4");
  expect(youtubeId("https://example.com/watch?v=eciM1M9p2E4")).toBe(null);
  expect(youtubeId("not a url")).toBe(null);
});

test("유튜브 iframe 원문만 영상 틀로 바꾸고 다른 HTML 원문은 그대로 둔다", () => {
  const tree = {
    type: "root",
    children: [
      { type: "raw", value: '<iframe width="900" src="https://youtu.be/eciM1M9p2E4?si=x" title="시연"></iframe>' },
      { type: "raw", value: "<Protocol>" },
      { type: "raw", value: '<iframe src="https://evil.example/x"></iframe>' },
    ],
  };
  rehypeYoutube()(tree);
  const [video, kept, other] = tree.children;
  expect(video.tagName).toBe("div");
  expect(video.children[0].properties.src).toBe("https://www.youtube-nocookie.com/embed/eciM1M9p2E4");
  expect(video.children[0].properties.title).toBe("시연");
  expect(kept).toEqual({ type: "raw", value: "<Protocol>" });
  expect(other.type).toBe("raw");
});

test("코드 블록 언어를 class 에서 읽는다", () => {
  expect(codeLanguage({ properties: { className: ["language-YAML"] } })).toBe("yaml");
  expect(codeLanguage({ properties: {} })).toBe(null);
});
