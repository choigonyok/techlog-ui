import {
  compareByDateDesc,
  formatDay,
  formatDots,
  formatLong,
  formatMonth,
  groupByMonth,
  normalizeDate,
} from "./dates";

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

test("정렬된 글을 달마다 묶고, 날짜 없는 글은 따로 모은다", () => {
  const posts = ["2024-01-28", "2024-01-03", "2023-12-27", "", ""].map((date, i) => ({ id: i, date }));
  const groups = groupByMonth(posts);
  expect(groups.map((g) => [g.key, g.posts.map((p) => p.id)])).toEqual([
    ["2024-01", [0, 1]],
    ["2023-12", [2]],
    ["", [3, 4]],
  ]);
  expect(groupByMonth([])).toEqual([]);
});

test("날짜를 화면에 쓰는 모양으로 바꾼다", () => {
  expect(formatMonth("2024-01")).toBe("2024년 1월");
  expect(formatMonth("")).toBe("날짜 없음");
  expect(formatDay("2024-01-08")).toBe("8일");
  expect(formatDay("")).toBe("");
  expect(formatLong("2023-08-20")).toBe("2023년 8월 20일");
  expect(formatDots("2023-08-20")).toBe("2023.08.20");
  expect(formatDots("")).toBe("");
});
