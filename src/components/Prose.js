import { useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { codeLanguage, rehypeHeadings, rehypeYoutube } from "../lib/markdownTree";
import { rehypeCode } from "./highlight";
import "./Prose.css";

const HIDDEN_LANGS = new Set(["other", "text", "txt", "plain", "plaintext"]);

function CodeBlock({ node, children, ...rest }) {
  const preRef = useRef(null);
  const [status, setStatus] = useState("");
  const code = node && node.children && node.children[0];
  const lang = codeLanguage(code);

  const copy = async () => {
    const text = preRef.current ? preRef.current.innerText.replace(/\n$/, "") : "";
    try {
      await navigator.clipboard.writeText(text);
      setStatus("복사했습니다");
    } catch {
      setStatus("복사하지 못했습니다");
    }
    window.setTimeout(() => setStatus(""), 1800);
  };

  return (
    <div className="code">
      <div className="code__bar">
        <span className="code__lang">{lang && !HIDDEN_LANGS.has(lang) ? lang : ""}</span>
        <button type="button" className="code__copy" onClick={copy}>
          {status || "복사"}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {status}
        </span>
      </div>
      {/* 가로로 넘치는 코드를 키보드로도 밀 수 있게 포커스를 받는다. */}
      <pre ref={preRef} tabIndex={0} {...rest}>
        {children}
      </pre>
    </div>
  );
}

function ProseImage({ node, alt, ...rest }) {
  return <img {...rest} alt={alt || ""} loading="lazy" decoding="async" />;
}

function ProseTable({ node, ...rest }) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table {...rest} />
    </div>
  );
}

const components = { pre: CodeBlock, img: ProseImage, table: ProseTable };
const remarkPlugins = [remarkGfm];

// 글 화면과 관리 화면 미리보기가 같은 렌더러를 쓴다. headingBase 는 본문에서 가장 큰 제목의 단계다.
export default function Prose({ source, headingBase = 2 }) {
  const rehypePlugins = useMemo(() => [rehypeYoutube, [rehypeHeadings, { base: headingBase }], rehypeCode], [
    headingBase,
  ]);
  return (
    <div className="prose">
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {source || ""}
      </Markdown>
    </div>
  );
}
