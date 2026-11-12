import { charLength, createSlugger, findUnfetchableImages, parseTopicInput } from "./text";

test("글자 수는 DB 처럼 코드 포인트로 센다", () => {
  expect(charLength("쿠버네티스")).toBe(5);
  expect(charLength("🙂a")).toBe(2);
  expect(charLength("")).toBe(0);
});

test("제목 id 는 한글을 살리고 겹치지 않게 만든다", () => {
  const slug = createSlugger();
  expect(slug("1. Preamble")).toBe("1-preamble");
  expect(slug("2. 블로그 프로젝트 배포 & 운영")).toBe("2-블로그-프로젝트-배포-운영");
  expect(slug("Summary")).toBe("summary");
  expect(slug("Summary")).toBe("summary-1");
  expect(slug("!!!")).toBe("section");
});

test("주제 입력은 쉼표로 나누고 빈 칸·대소문자 중복을 뺀다", () => {
  expect(parseTopicInput(" istio, Kubernetes,, ISTIO ,  service   mesh ")).toEqual(["istio", "Kubernetes", "service mesh"]);
  expect(parseTopicInput("")).toEqual([]);
});

test("서버가 내려받을 수 없는 본문 이미지 주소를 찾는다", () => {
  const md = "![a](https://x.io/a.png) ![b](data:image/png;base64,AA) ![c](/local.png) ![d](<http://y.io/d.png>)";
  expect(findUnfetchableImages(md)).toEqual(["data:image/png;base64,AA", "/local.png"]);
});
