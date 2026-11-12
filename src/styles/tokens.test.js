import fs from "fs";
import path from "path";

// 색 토큰의 명도 대비를 지킨다(WCAG 2.x). 글자는 4.5:1, 글자가 아닌 표시(테두리·막대·그림의 칸)는 3:1.
// tokens.css 의 색을 바꾸면 이 시험이 어느 짝이 모자란지 알려 준다.

const css = fs.readFileSync(path.join(__dirname, "tokens.css"), "utf8");

function colorsIn(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = new RegExp(`(?:^|\\n)${escaped}\\s*{([^}]*)}`).exec(css);
  if (!block) throw new Error(`${selector} 블록을 찾지 못했습니다.`);
  const out = {};
  for (const m of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2];
  return out;
}

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = colorsIn(":root");
const dark = { ...light, ...colorsIn(':root[data-theme="dark"]') };

// [앞색, 바탕색]
const TEXT = [
  ["ink", "paper"],
  ["ink", "surface"],
  ["ink", "tint"],
  ["ink", "select"],
  ["ink-soft", "paper"],
  ["ink-soft", "surface"],
  ["ink-soft", "tint"],
  ["ink-faint", "paper"],
  ["ink-faint", "surface"],
  ["ink-faint", "tint"],
  ["accent-ink", "paper"],
  ["accent-ink", "surface"],
  ["danger", "paper"],
  ["danger", "surface"],
  ["on-danger", "danger"],
  ["field-ink", "field"],
  ["field-ink", "field-raised"],
  ["field-soft", "field"],
  ["field-soft", "field-raised"],
  ["field-dim", "field"],
  ["signal", "field"],
  ["field", "field-ink"],
  ["field", "signal"],
  ["code-ink", "code"],
  ["code-dim", "code"],
  ["syn-keyword", "code"],
  ["syn-string", "code"],
  ["syn-number", "code"],
  ["syn-title", "code"],
  ["syn-attr", "code"],
  ["syn-comment", "code"],
  ["syn-meta", "code"],
  ["syn-deletion", "code"],
];

const MARKS = [
  ["line-strong", "paper"],
  ["line-strong", "surface"],
  ["mark", "paper"],
  ["mark", "surface"],
  ["mark", "tint"],
  ["signal", "field"],
  ["cell-1", "field"],
  ["cell-2", "field"],
  ["cell-3", "field"],
];

describe.each([
  ["밝은 화면", light],
  ["어두운 화면", dark],
])("%s", (_, theme) => {
  test.each(TEXT)("글자 %s / %s 는 4.5:1 이상", (fg, bg) => {
    expect(theme[fg]).toBeDefined();
    expect(theme[bg]).toBeDefined();
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(MARKS)("표시 %s / %s 는 3:1 이상", (fg, bg) => {
    expect(theme[fg]).toBeDefined();
    expect(theme[bg]).toBeDefined();
    expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(3);
  });

  test("주 칸은 글이 많을수록 밝다", () => {
    const levels = ["cell-0", "cell-1", "cell-2", "cell-3"].map((name) => luminance(theme[name]));
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });
});
