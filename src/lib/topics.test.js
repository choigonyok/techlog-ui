import { relatedPosts } from "./related";
import { buildTopicGraph, topicKey, topicsOf } from "./topics";

const post = (id, topics, date = "2024-01-01") => ({ id, title: id, date, topics });

test("대소문자·공백만 다른 태그를 한 주제로 묶는다", () => {
  expect(topicKey("  ISTIO ")).toBe("istio");
  expect(topicsOf(["ISTIO", "istio", "Kubernetes", ""])).toEqual(["istio", "kubernetes"]);
});

test("한 칸에 쉼표로 적힌 태그도 나눈다", () => {
  expect(topicsOf(["TERRAFORM, AWS", "KUBERNETES"])).toEqual(["terraform", "aws", "kubernetes"]);
  expect(topicsOf(null)).toEqual([]);
});

test("같은 글에 함께 붙은 주제를 선으로 잇고, 함께 쓰인 횟수를 센다", () => {
  const graph = buildTopicGraph([
    post("a", ["istio", "kubernetes"]),
    post("b", ["istio", "kubernetes", "network"]),
    post("c", ["golang"]),
  ]);
  expect(graph.topics.map((t) => [t.key, t.count])).toEqual([
    ["istio", 2],
    ["kubernetes", 2],
    ["golang", 1],
    ["network", 1],
  ]);
  expect(graph.edges).toContainEqual({ a: "istio", b: "kubernetes", weight: 2 });
  expect(graph.edges).toContainEqual({ a: "istio", b: "network", weight: 1 });
  expect(graph.edges).toHaveLength(3);
  // 함께 쓰인 횟수가 많은 이웃부터
  expect(graph.neighbors.get("istio")).toEqual(["kubernetes", "network"]);
  expect(graph.neighbors.get("golang")).toEqual([]);
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
