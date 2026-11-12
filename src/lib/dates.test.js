import { compareByDateDesc, normalizeDate } from "./dates";

test("섞인 작성일 형식을 YYYY-MM-DD 로 맞춘다", () => {
  expect(normalizeDate("2023/07/04")).toBe("2023-07-04");
  expect(normalizeDate("2024-01-03")).toBe("2024-01-03");
  expect(normalizeDate("2023.7.4")).toBe("2023-07-04");
  expect(normalizeDate("")).toBe("");
  expect(normalizeDate(undefined)).toBe("");
});

test("형식이 달라도 날짜순(최근 먼저)으로, 날짜 없는 글은 끝에", () => {
  // 문자열 그대로 비교하면 "2023-12-27" < "2023/07/04" 가 되어 순서가 틀어진다.
  const posts = ["2023/07/04", "", "2023-12-27", "2024-01-03", "2023/08/16"].map((raw, i) => ({
    title: `t${i}`,
    date: normalizeDate(raw),
  }));
  expect(posts.sort(compareByDateDesc).map((p) => p.date)).toEqual([
    "2024-01-03",
    "2023-12-27",
    "2023-08-16",
    "2023-07-04",
    "",
  ]);
});
