import { readingMinutes } from "./reading";

test("빈 글은 0분, 짧은 글도 1분으로 친다", () => {
  expect(readingMinutes("")).toBe(0);
  expect(readingMinutes(undefined)).toBe(0);
  expect(readingMinutes("짧은 글")).toBe(1);
});

test("1분에 500자쯤 읽는다고 본다", () => {
  expect(readingMinutes("가".repeat(1500))).toBe(3);
  expect(readingMinutes("가".repeat(5200))).toBe(10);
});

test("그림·링크 주소와 마크다운 기호는 세지 않는다", () => {
  const image = `![그림](https://example.com/${"a".repeat(3000)}.png)`;
  const link = `[문서](https://example.com/${"b".repeat(3000)})`;
  expect(readingMinutes(`## 제목\n\n${image}\n\n${link}\n\n${"가".repeat(400)}`)).toBe(1);
});
