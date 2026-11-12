import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import makefile from "highlight.js/lib/languages/makefile";
import nginx from "highlight.js/lib/languages/nginx";
import plaintext from "highlight.js/lib/languages/plaintext";
import protobuf from "highlight.js/lib/languages/protobuf";
import python from "highlight.js/lib/languages/python";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { codeLanguage, textOf, walk } from "../lib/markdownTree";

// 글에 실제로 쓰인 언어(dockerfile·yaml·go·bash·nginx 설정 등)와 인프라 글에 흔한 언어만 싣는다.
// 모르는 언어는 색 없이 그대로 보인다.
const lowlight = createLowlight({
  bash,
  css,
  diff,
  dockerfile,
  go,
  ini,
  javascript,
  json,
  makefile,
  nginx,
  plaintext,
  protobuf,
  python,
  shell,
  sql,
  typescript,
  xml,
  yaml,
});
lowlight.registerAlias({ nginx: ["conf"], ini: ["toml", "properties"] });

export function rehypeCode() {
  return function transform(tree) {
    walk(tree, (node, parent) => {
      if (node.type !== "element" || node.tagName !== "code") return;
      if (!parent || parent.type !== "element" || parent.tagName !== "pre") return;
      const lang = codeLanguage(node);
      if (!lang || !lowlight.registered(lang)) return;
      try {
        const result = lowlight.highlight(lang, textOf(node));
        node.children = result.children;
        node.properties.className = [...(node.properties.className || []), "hljs"];
      } catch {
        // 문법을 읽지 못하면 색 없이 둔다.
      }
    });
  };
}
