// 읽는 데 걸리는 시간을 어림한다. 그림·링크의 주소와 마크다운 기호는 읽지 않으니 빼고,
// 한국어 기술 글을 1분에 500자쯤 읽는다고 본다.
const PER_MINUTE = 500;

export function readingMinutes(markdown) {
  const text = String(markdown ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/<[^>]+>/g, "")
    .replace(/[#>*_`~|[\]-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const length = Array.from(text).length;
  return length ? Math.max(1, Math.round(length / PER_MINUTE)) : 0;
}
