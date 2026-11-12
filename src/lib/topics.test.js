import { neighborPosts, relatedPosts } from "./related";
import { countTopics, topicKey, topicsOf } from "./topics";

const post = (id, topics, date = "2024-01-01") => ({ id, title: id, date, topics });

test("대소문자·공백만 다른 태그를 한 주제로 묶는다", () => {
  expect(topicKey("  ISTIO ")).toBe("istio");
  expect(topicsOf(["ISTIO", "istio", "Kubernetes", ""])).toEqual(["istio", "kubernetes"]);
});

test("한 칸에 쉼표로 적힌 태그도 나눈다", () => {
  expect(topicsOf(["TERRAFORM, AWS", "KUBERNETES"])).toEqual(["terraform", "aws", "kubernetes"]);
  expect(topicsOf(null)).toEqual([]);
});

test("주제마다 글 수를 세고, 많은 주제부터 이름 순으로 늘어놓는다", () => {
  const topics = countTopics([
    post("a", ["istio", "kubernetes"]),
    post("b", ["istio", "kubernetes", "network"]),
    post("c", ["golang"]),
  ]);
  expect(topics.map((t) => [t.key, t.count])).toEqual([
    ["istio", 2],
    ["kubernetes", 2],
    ["golang", 1],
    ["network", 1],
  ]);
  expect(countTopics([])).toEqual([]);
});

test("관련 글은 공유 주제가 많은 순, 같으면 최근 순", () => {
  const me = post("me", ["istio", "kubernetes"]);
  const all = [
    me,
    post("one-old", ["istio"], "2023-01-01"),
    post("two", ["istio", "kubernetes"], "2022-01-01"),
    post("one-new", ["kubernetes"], "2024-05-01"),
    post("none", ["golang"]),
  ];
  expect(relatedPosts(me, all).map((p) => p.id)).toEqual(["two", "one-new", "one-old"]);
});

test("앞뒤 글은 쓴 순서로 바로 이웃한 글이다", () => {
  const all = [
    post("b", [], "2024-01-02"),
    post("c", [], "2024-01-03"),
    post("a", [], "2024-01-01"),
    post("x", [], ""),
  ];
  expect(neighborPosts(all[0], all)).toEqual({ older: all[2], newer: all[1] });
  expect(neighborPosts(all[2], all)).toEqual({ older: null, newer: all[0] });
  expect(neighborPosts(all[1], all)).toEqual({ older: all[0], newer: null });
  // 날짜가 없는 글은 차례를 알 수 없어 이웃을 잇지 않는다.
  expect(neighborPosts(all[3], all)).toEqual({ older: null, newer: null });
  expect(neighborPosts(post("gone", [], "2024-01-02"), all)).toEqual({ older: null, newer: null });
});
