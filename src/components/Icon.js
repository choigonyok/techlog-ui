// 선으로 그린 아이콘 한 벌(20칸 격자, 선 굵기 1.6, 둥근 끝).
// 장식으로만 쓰므로 화면 낭독기에는 숨긴다. 버튼의 이름은 버튼이 aria-label 로 갖는다.
const PATHS = {
  moon: "M16.5 11.6A6.6 6.6 0 0 1 8.4 3.5a6.6 6.6 0 1 0 8.1 8.1Z",
  sun: "M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3M13.3 10a3.3 3.3 0 1 1-6.6 0 3.3 3.3 0 0 1 6.6 0Z",
  search: "M13.2 13.2 17 17M15 8.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z",
  close: "M5 5l10 10M15 5 5 15",
  down: "M5 7.5l5 5 5-5",
  left: "M12 5l-5 5 5 5",
  right: "M8 5l5 5-5 5",
  copy: "M7.5 7.5v-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M5.5 7.5h5a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z",
  check: "M4.5 10.5l3.5 3.5 7.5-8",
};

export default function Icon({ name, size = 20, className }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
