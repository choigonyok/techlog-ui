import { matchesSearch, searchTerms } from "./search";

const post = {
  title: "리눅스 iptables에 대해",
  subtitle: "Envoy 사이드카가 트래픽을 인터셉트하는 원리",
  topics: ["istio", "network"],
};

test("찾는 말을 낱말로 나눈다", () => {
  expect(searchTerms("  Envoy   사이드카 ")).toEqual(["envoy", "사이드카"]);
  expect(searchTerms("")).toEqual([]);
  expect(searchTerms(null)).toEqual([]);
});

test("낱말이 제목·부제·주제 어디엔가 모두 있어야 한다", () => {
  expect(matchesSearch(post, [])).toBe(true);
  expect(matchesSearch(post, searchTerms("IPTABLES"))).toBe(true);
  expect(matchesSearch(post, searchTerms("envoy 리눅스"))).toBe(true);
  expect(matchesSearch(post, searchTerms("network"))).toBe(true);
  expect(matchesSearch(post, searchTerms("envoy kubernetes"))).toBe(false);
});
