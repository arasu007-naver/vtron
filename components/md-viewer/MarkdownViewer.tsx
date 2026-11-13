"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Copy, Info, Lightbulb, OctagonAlert, ShieldAlert } from "lucide-react";

/**
 * 외부 패키지 없이 동작하는 GitHub-Flavored Markdown (GFM) 뷰어.
 *
 * 지원 문법:
 * - 제목 (# ~ ######, Setext === / ---) 및 앵커 id 자동 부여
 * - 코드 블록 (``` / ```` / ~~~, 언어 배지 + 복사 버튼)
 * - 표 (GFM 파이프 테이블, 정렬 :--- / :---: / ---, 셀 내 `\|` 및 인라인 코드 보호)
 * - 인용문 (> 중첩 및 GitHub Alert [!NOTE] · [!TIP] · [!IMPORTANT] · [!WARNING] · [!CAUTION])
 * - 순서/비순서 목록, 중첩 목록, 체크박스 (- [ ] / - [x])
 * - 수식 블록($$...$$) · 인라인 수식($...$) 표시
 * - 인라인 코드, 굵게, 기울임(단어 내부 `_` 보존), 취소선, 링크, 이미지, 줄바꿈(<br>)
 */

type Align = "left" | "center" | "right" | null;
type AlertKind = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

type ListItemNode = {
  checked: boolean | null;
  blocks: BlockNode[];
};

type BlockNode =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string; id: string }
  | { type: "code"; lang: string; code: string }
  | { type: "math"; expr: string }
  | { type: "hr" }
  | { type: "blockquote"; alert: AlertKind | null; blocks: BlockNode[] }
  | { type: "table"; headers: string[]; aligns: Align[]; rows: string[][] }
  | { type: "list"; ordered: boolean; start: number; items: ListItemNode[] }
  | { type: "paragraph"; text: string };

const slugify = (raw: string, seen: Map<string, number>): string => {
  const plain = raw
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim()
    .toLowerCase();
  const base =
    plain
      .replace(/[^\w가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};

/** 셀 내 인라인 백틱(`...`)이나 이스케이프(`\|`) 안의 파이프는 열 구분자로 쓰지 않는다 */
function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let cur = "";
  let inCode = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "\\" && i + 1 < trimmed.length) {
      cur += ch + trimmed[i + 1];
      i++;
      continue;
    }
    if (ch === "`") {
      inCode = !inCode;
      cur += ch;
      continue;
    }
    if (ch === "|" && !inCode) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function parseTableDelimiter(line: string, expectedCols: number): Align[] | null {
  if (!line.includes("|") && !line.trim().startsWith(":")) return null;
  const cells = splitTableRow(line);
  if (cells.length === 0 || (expectedCols > 0 && cells.length !== expectedCols)) return null;

  const aligns: Align[] = [];
  for (const cell of cells) {
    const c = cell.trim();
    if (!/^:?-{1,}:?$/.test(c)) return null;
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    aligns.push(left && right ? "center" : right ? "right" : left ? "left" : null);
  }
  return aligns;
}

const isHrLine = (line: string) =>
  /^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line);

const matchFenceOpen = (line: string) => line.match(/^\s{0,3}(`{3,}|~{3,})([^`~]*)$/);

const matchHeading = (line: string) => line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);

const matchListItem = (line: string): { indent: number; ordered: boolean; start: number; rest: string } | null => {
  const ul = line.match(/^(\s*)([-*+])\s+(.*)$/);
  if (ul) {
    return { indent: ul[1].replace(/\t/g, "    ").length, ordered: false, start: 1, rest: ul[3] };
  }
  const ol = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
  if (ol) {
    return {
      indent: ol[1].replace(/\t/g, "    ").length,
      ordered: true,
      start: Number.parseInt(ol[2], 10) || 1,
      rest: ol[3],
    };
  }
  return null;
};

function parseBlocks(lines: string[], seenIds: Map<string, number>): BlockNode[] {
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄 건너뛰기
    if (line.trim() === "") {
      i++;
      continue;
    }

    // 1) 코드 펜스 (``` 또는 ~~~, 열린 길이 이상으로 닫힘)
    const fence = matchFenceOpen(line);
    if (fence) {
      const markerChar = fence[1][0];
      const markerLen = fence[1].length;
      const lang = fence[2].trim().split(/\s+/)[0] ?? "";
      const codeLines: string[] = [];
      i++;
      const closeRe = new RegExp(`^\\s{0,3}${markerChar}{${markerLen},}\\s*$`);
      while (i < lines.length && !closeRe.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    // 2) 수식 블록 ($$ ... $$)
    if (line.trim().startsWith("$$")) {
      const trimmed = line.trim();
      if (trimmed.length > 4 && trimmed.endsWith("$$")) {
        blocks.push({ type: "math", expr: trimmed.slice(2, -2).trim() });
        i++;
        continue;
      }
      const exprLines: string[] = [];
      const firstRest = trimmed.slice(2).trim();
      if (firstRest) exprLines.push(firstRest);
      i++;
      while (i < lines.length && !lines[i].trim().endsWith("$$")) {
        exprLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        const lastPart = lines[i].trim().slice(0, -2).trim();
        if (lastPart) exprLines.push(lastPart);
        i++;
      }
      blocks.push({ type: "math", expr: exprLines.join("\n") });
      continue;
    }

    // 3) ATX 제목 (# ~ ######)
    const heading = matchHeading(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = heading[2];
      blocks.push({ type: "heading", level, text, id: slugify(text, seenIds) });
      i++;
      continue;
    }

    // 4) 구분선 (---, ***, ___)
    if (isHrLine(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 5) 인용문 (> ...) 및 GitHub Alert
    if (/^\s{0,3}>/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && (/^\s{0,3}>/.test(lines[i]) || (lines[i].trim() !== "" && quoteLines.length > 0 && !matchHeading(lines[i]) && !matchFenceOpen(lines[i]) && !isHrLine(lines[i])))) {
        if (/^\s{0,3}>/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
          i++;
        } else {
          break;
        }
      }
      let alert: AlertKind | null = null;
      if (quoteLines.length > 0) {
        const alertMatch = quoteLines[0].match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
        if (alertMatch) {
          alert = alertMatch[1].toUpperCase() as AlertKind;
          if (alertMatch[2]) {
            quoteLines[0] = alertMatch[2];
          } else {
            quoteLines.shift();
          }
        }
      }
      blocks.push({ type: "blockquote", alert, blocks: parseBlocks(quoteLines, seenIds) });
      continue;
    }

    // 6) GFM 테이블
    if (line.includes("|") && i + 1 < lines.length) {
      const headers = splitTableRow(line);
      const aligns = parseTableDelimiter(lines[i + 1], headers.length);
      if (aligns) {
        i += 2;
        const rows: string[][] = [];
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          lines[i].includes("|") &&
          !matchFenceOpen(lines[i]) &&
          !matchHeading(lines[i])
        ) {
          const cells = splitTableRow(lines[i]);
          while (cells.length < headers.length) cells.push("");
          rows.push(cells.slice(0, headers.length));
          i++;
        }
        blocks.push({ type: "table", headers, aligns, rows });
        continue;
      }
    }

    // 7) 목록 (순서 / 비순서 / 체크박스 / 중첩)
    const firstItem = matchListItem(line);
    if (firstItem) {
      const baseIndent = firstItem.indent;
      const ordered = firstItem.ordered;
      const start = firstItem.start;
      const items: ListItemNode[] = [];

      while (i < lines.length) {
        if (lines[i].trim() === "") {
          // 빈 줄 뒤에 같은 목록이 이어지는지 확인
          let look = i + 1;
          while (look < lines.length && lines[look].trim() === "") look++;
          if (look >= lines.length) break;
          const nextItem = matchListItem(lines[look]);
          const nextIndent = lines[look].match(/^(\s*)/)?.[1].replace(/\t/g, "    ").length ?? 0;
          if (nextItem && nextItem.indent === baseIndent && nextItem.ordered === ordered) {
            i = look;
          } else if (nextIndent > baseIndent) {
            i = look;
          } else {
            break;
          }
        }

        const itemMatch = matchListItem(lines[i]);
        if (!itemMatch || itemMatch.indent !== baseIndent || itemMatch.ordered !== ordered) break;

        let firstText = itemMatch.rest;
        let checked: boolean | null = null;
        const taskMatch = firstText.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          checked = taskMatch[1].toLowerCase() === "x";
          firstText = taskMatch[2];
        }

        const itemLines: string[] = [firstText];
        i++;

        while (i < lines.length) {
          const cur = lines[i];
          if (cur.trim() === "") {
            itemLines.push("");
            i++;
            continue;
          }
          if (isHrLine(cur) || matchHeading(cur)) break;
          const subMatch = matchListItem(cur);
          if (subMatch && subMatch.indent <= baseIndent) break;

          const rawIndent = cur.match(/^(\s*)/)?.[1].replace(/\t/g, "    ").length ?? 0;
          if (rawIndent > baseIndent) {
            const stripLen = Math.min(rawIndent, baseIndent + 2);
            let removed = 0;
            let pos = 0;
            while (pos < cur.length && removed < stripLen) {
              if (cur[pos] === "\t") removed += 4;
              else removed += 1;
              pos++;
            }
            itemLines.push(cur.slice(pos));
            i++;
          } else {
            break;
          }
        }

        // 끝쪽 빈 줄 정리
        while (itemLines.length > 1 && itemLines[itemLines.length - 1].trim() === "") {
          itemLines.pop();
        }

        items.push({ checked, blocks: parseBlocks(itemLines, seenIds) });
      }

      blocks.push({ type: "list", ordered, start, items });
      continue;
    }

    // 8) Setext 제목 (다음 줄이 === 또는 ---)
    if (i + 1 < lines.length && /^\s{0,3}(=+|-+)\s*$/.test(lines[i + 1]) && line.trim() !== "") {
      const level = lines[i + 1].trim().startsWith("=") ? 1 : 2;
      const text = line.trim();
      blocks.push({ type: "heading", level, text, id: slugify(text, seenIds) });
      i += 2;
      continue;
    }

    // 9) 일반 문단
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const cur = lines[i];
      if (
        cur.trim() === "" ||
        matchFenceOpen(cur) ||
        cur.trim().startsWith("$$") ||
        matchHeading(cur) ||
        isHrLine(cur) ||
        /^\s{0,3}>/.test(cur) ||
        matchListItem(cur)
      ) {
        break;
      }
      if (cur.includes("|") && i + 1 < lines.length) {
        const hdr = splitTableRow(cur);
        if (parseTableDelimiter(lines[i + 1], hdr.length)) break;
      }
      paraLines.push(cur);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

const isSafeHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (!trimmed) return false;
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) {
    return !trimmed.startsWith("//");
  }
  const protocol = `${schemeMatch[1].toLowerCase()}:`;
  return protocol === "http:" || protocol === "https:" || protocol === "mailto:";
};

const openInNewTab = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  e.preventDefault();
  window.open(href, "_blank", "noopener,noreferrer");
};

/** 인라인 마크다운 토큰을 React 노드로 변환 */
function renderInline(text: string, keyPrefix = "in"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  let plain = "";

  const flushPlain = () => {
    if (plain) {
      nodes.push(plain);
      plain = "";
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // 1) 이스케이프 문자 (\*, \|, \$, ...)
    if (text[i] === "\\" && i + 1 < text.length && /[\\`*_{}[\]()#+\-.!|$~<>]/.test(text[i + 1])) {
      plain += text[i + 1];
      i += 2;
      continue;
    }

    // 2) 줄바꿈: <br>, <br/>, 또는 줄 끝 공백 2개 + \n
    const brTag = rest.match(/^<br\s*\/?>/i);
    if (brTag) {
      flushPlain();
      nodes.push(<br key={`${keyPrefix}-br-${k++}`} />);
      i += brTag[0].length;
      continue;
    }
    const hardBreak = rest.match(/^ {2,}\n/);
    if (hardBreak) {
      flushPlain();
      nodes.push(<br key={`${keyPrefix}-hb-${k++}`} />);
      i += hardBreak[0].length;
      continue;
    }

    // 3) 인라인 코드 (`...` 또는 ``...``)
    if (text[i] === "`") {
      const tickMatch = rest.match(/^(`+)([\s\S]*?[^`])\1(?!`)/) ?? rest.match(/^(`+)([^`]*)\1(?!`)/);
      if (tickMatch) {
        flushPlain();
        const codeContent = tickMatch[2].replace(/^ (.*) $/, "$1");
        nodes.push(
          <code
            key={`${keyPrefix}-c-${k++}`}
            className="px-1.5 py-0.5 rounded bg-[rgba(32,31,29,0.07)] border border-[rgba(32,31,29,0.12)] font-[family-name:var(--font-mono)] text-[0.88em] text-[#5a3b0a] break-words"
          >
            {codeContent}
          </code>
        );
        i += tickMatch[0].length;
        continue;
      }
    }

    // 4) 인라인 수식 ($...$) — 통화 기호($100, $1,999)와 겹치지 않도록 공백·숫자 경계 검사
    if (text[i] === "$" && text[i + 1] !== "$") {
      const mathMatch = rest.match(/^\$(?!\s|\d+[,.\s]|$)([^$\n]+?)(?<!\s)\$(?!\d)/);
      if (mathMatch) {
        flushPlain();
        nodes.push(
          <span
            key={`${keyPrefix}-m-${k++}`}
            className="px-1 py-0.5 rounded bg-amber-50/80 font-[family-name:var(--font-mono)] text-[0.9em] text-black/90 italic"
          >
            {mathMatch[1]}
          </span>
        );
        i += mathMatch[0].length;
        continue;
      }
    }

    // 5) 이미지 ![alt](url "title")
    if (text[i] === "!" && text[i + 1] === "[") {
      const imgMatch = rest.match(/^!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)/);
      if (imgMatch) {
        flushPlain();
        const [, alt, src, title] = imgMatch;
        if (isSafeHref(src) || src.startsWith("data:image/")) {
          nodes.push(
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${keyPrefix}-img-${k++}`}
              src={src}
              alt={alt}
              title={title}
              className="max-w-full h-auto rounded-lg border border-[var(--color-divider)] my-2 inline-block"
            />
          );
        } else {
          nodes.push(<span key={`${keyPrefix}-imgtxt-${k++}`}>{alt || src}</span>);
        }
        i += imgMatch[0].length;
        continue;
      }
    }

    // 6) 링크 [label](href "title")
    if (text[i] === "[") {
      const linkMatch = rest.match(/^\[((?:[^[\]]|\[[^\]]*\])+)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)/);
      if (linkMatch) {
        flushPlain();
        const [, label, href, title] = linkMatch;
        const inner = renderInline(label, `${keyPrefix}-lk-${k}`);
        if (href.startsWith("#")) {
          nodes.push(
            <a
              key={`${keyPrefix}-a-${k++}`}
              href={href}
              title={title}
              onClick={(e) => {
                e.preventDefault();
                const id = decodeURIComponent(href.slice(1));
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-[var(--color-accent-700)] underline decoration-[rgba(125,84,17,0.45)] underline-offset-2 hover:text-[var(--color-accent-800)] cursor-pointer"
            >
              {inner}
            </a>
          );
        } else if (isSafeHref(href)) {
          nodes.push(
            <a
              key={`${keyPrefix}-a-${k++}`}
              href={href}
              title={title}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => openInNewTab(e, href)}
              className="text-[var(--color-accent-700)] underline decoration-[rgba(125,84,17,0.45)] underline-offset-2 hover:text-[var(--color-accent-800)] break-words cursor-pointer"
            >
              {inner}
            </a>
          );
        } else {
          nodes.push(
            <span key={`${keyPrefix}-sp-${k++}`} className="text-black/80" title={href}>
              {inner}
            </span>
          );
        }
        i += linkMatch[0].length;
        continue;
      }
    }

    // 7) 자동 URL 링크 (<https://...> 또는 맨몸 https://...)
    const autoAngle = rest.match(/^<(https?:\/\/[^\s>]+)>/);
    if (autoAngle) {
      flushPlain();
      const url = autoAngle[1];
      nodes.push(
        <a
          key={`${keyPrefix}-au-${k++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => openInNewTab(e, url)}
          className="text-[var(--color-accent-700)] underline break-all cursor-pointer"
        >
          {url}
        </a>
      );
      i += autoAngle[0].length;
      continue;
    }
    if ((i === 0 || /[\s(]/.test(text[i - 1])) && /^https?:\/\/[^\s<>()]+/.test(rest)) {
      const bareMatch = rest.match(/^https?:\/\/[^\s<>()]+/)!;
      let url = bareMatch[0];
      while (/[.,;:!?]$/.test(url)) url = url.slice(0, -1);
      flushPlain();
      nodes.push(
        <a
          key={`${keyPrefix}-bu-${k++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => openInNewTab(e, url)}
          className="text-[var(--color-accent-700)] underline break-all cursor-pointer"
        >
          {url}
        </a>
      );
      i += url.length;
      continue;
    }

    // 8) 굵게 + 기울임 (***...***)
    const boldItalic = rest.match(/^\*\*\*(?=\S)([\s\S]+?\S)\*\*\*/);
    if (boldItalic) {
      flushPlain();
      nodes.push(
        <strong key={`${keyPrefix}-bi-${k++}`} className="font-bold italic">
          {renderInline(boldItalic[1], `${keyPrefix}-bi-${k}`)}
        </strong>
      );
      i += boldItalic[0].length;
      continue;
    }

    // 9) 굵게 (**...** 또는 단어 경계 __...__)
    const boldStar = rest.match(/^\*\*(?=\S)([\s\S]+?\S|\S)\*\*/);
    if (boldStar) {
      flushPlain();
      nodes.push(
        <strong key={`${keyPrefix}-b-${k++}`} className="font-bold text-black">
          {renderInline(boldStar[1], `${keyPrefix}-b-${k}`)}
        </strong>
      );
      i += boldStar[0].length;
      continue;
    }
    if (i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1])) {
      const boldUnder = rest.match(/^__(?=\S)([\s\S]+?\S|\S)__(?![A-Za-z0-9_])/);
      if (boldUnder) {
        flushPlain();
        nodes.push(
          <strong key={`${keyPrefix}-bu2-${k++}`} className="font-bold text-black">
            {renderInline(boldUnder[1], `${keyPrefix}-bu2-${k}`)}
          </strong>
        );
        i += boldUnder[0].length;
        continue;
      }
    }

    // 10) 취소선 (~~...~~)
    const strike = rest.match(/^~~(?=\S)([\s\S]+?\S|\S)~~/);
    if (strike) {
      flushPlain();
      nodes.push(
        <del key={`${keyPrefix}-s-${k++}`} className="line-through text-black/60">
          {renderInline(strike[1], `${keyPrefix}-s-${k}`)}
        </del>
      );
      i += strike[0].length;
      continue;
    }

    // 11) 기울임 (*...* 또는 단어 경계 _..._ — style_id_job 같은 식별자 보호)
    const italicStar = rest.match(/^\*(?!\*|\s)([^*\n]+?\S|[^*\s])\*(?!\*)/);
    if (italicStar) {
      flushPlain();
      nodes.push(
        <em key={`${keyPrefix}-i-${k++}`} className="italic">
          {renderInline(italicStar[1], `${keyPrefix}-i-${k}`)}
        </em>
      );
      i += italicStar[0].length;
      continue;
    }
    if (i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1])) {
      const italicUnder = rest.match(/^_(?!_|\s)([^_\n]+?\S|[^_\s])_(?![A-Za-z0-9_])/);
      if (italicUnder) {
        flushPlain();
        nodes.push(
          <em key={`${keyPrefix}-iu-${k++}`} className="italic">
            {renderInline(italicUnder[1], `${keyPrefix}-iu-${k}`)}
          </em>
        );
        i += italicUnder[0].length;
        continue;
      }
    }

    plain += text[i];
    i++;
  }

  flushPlain();
  return nodes;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드 권한이 없는 환경은 무시
    }
  };

  return (
    <div className="my-4 rounded-lg border border-[var(--color-divider)] bg-[#1f1e1c] text-[#f5f2eb] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2a2825] border-b border-white/10 text-[12px] font-[family-name:var(--font-mono)] text-white/70">
        <span>{lang || "text"}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
          title="코드 복사"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "복사됨" : "복사"}</span>
        </button>
      </div>
      <pre className="m-0 p-3.5 overflow-x-auto vt-scroll font-[family-name:var(--font-mono)] text-[13px] leading-[1.6]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const ALERT_STYLES: Record<
  AlertKind,
  { label: string; border: string; bg: string; titleColor: string; Icon: typeof Info }
> = {
  NOTE: {
    label: "참고 (NOTE)",
    border: "border-l-sky-600",
    bg: "bg-sky-50/70",
    titleColor: "text-sky-800",
    Icon: Info,
  },
  TIP: {
    label: "팁 (TIP)",
    border: "border-l-emerald-600",
    bg: "bg-emerald-50/70",
    titleColor: "text-emerald-800",
    Icon: Lightbulb,
  },
  IMPORTANT: {
    label: "중요 (IMPORTANT)",
    border: "border-l-[#b68235]",
    bg: "bg-amber-50/70",
    titleColor: "text-[#7d5411]",
    Icon: ShieldAlert,
  },
  WARNING: {
    label: "주의 (WARNING)",
    border: "border-l-amber-600",
    bg: "bg-amber-50/80",
    titleColor: "text-amber-800",
    Icon: AlertTriangle,
  },
  CAUTION: {
    label: "경고 (CAUTION)",
    border: "border-l-[#8a3a2a]",
    bg: "bg-red-50/70",
    titleColor: "text-[#8a3a2a]",
    Icon: OctagonAlert,
  },
};

function renderBlock(block: BlockNode, idx: number): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const children = renderInline(block.text, `h-${idx}`);
      const cls: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
        1: "text-[28px] font-bold mt-7 mb-4 pb-2 border-b border-[var(--color-divider)] leading-snug text-black",
        2: "text-[22px] font-bold mt-7 mb-3 pb-1.5 border-b border-[rgba(32,31,29,0.1)] leading-snug text-black",
        3: "text-[18px] font-semibold mt-5 mb-2 leading-snug text-black",
        4: "text-[16px] font-semibold mt-4 mb-1.5 leading-snug text-black",
        5: "text-[15px] font-semibold mt-3.5 mb-1 text-black/90",
        6: "text-[14px] font-semibold mt-3 mb-1 text-black/75 uppercase tracking-wide",
      };
      const Tag = `h${block.level}` as const;
      return (
        <Tag key={idx} id={block.id} className={`scroll-mt-4 ${cls[block.level]}`}>
          {children}
        </Tag>
      );
    }

    case "code":
      return <CodeBlock key={idx} lang={block.lang} code={block.code} />;

    case "math":
      return (
        <div
          key={idx}
          className="my-4 px-4 py-3 rounded-lg border border-[var(--color-divider)] bg-amber-50/50 overflow-x-auto vt-scroll font-[family-name:var(--font-mono)] text-[14px] text-center text-black/90"
        >
          {block.expr}
        </div>
      );

    case "hr":
      return <hr key={idx} className="my-6 border-0 border-t border-[var(--color-divider)]" />;

    case "blockquote": {
      if (block.alert) {
        const meta = ALERT_STYLES[block.alert];
        const Icon = meta.Icon;
        return (
          <div
            key={idx}
            className={`my-4 pl-4 pr-4 py-3 rounded-r-lg border border-[var(--color-divider)] border-l-4 ${meta.border} ${meta.bg}`}
          >
            <div className={`flex items-center gap-1.5 text-[13px] font-semibold mb-1 ${meta.titleColor}`}>
              <Icon className="w-4 h-4 flex-none" />
              <span>{meta.label}</span>
            </div>
            <div className="text-[15px] text-black/85 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {block.blocks.map((b, j) => renderBlock(b, j))}
            </div>
          </div>
        );
      }
      return (
        <blockquote
          key={idx}
          className="my-4 pl-4 pr-3 py-2 border-l-4 border-[var(--color-accent)] bg-[rgba(182,130,53,0.06)] rounded-r-lg text-black/80 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        >
          {block.blocks.map((b, j) => renderBlock(b, j))}
        </blockquote>
      );
    }

    case "table": {
      const alignClass = (a: Align) =>
        a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";
      return (
        <div key={idx} className="my-4 overflow-x-auto vt-scroll rounded-lg border border-[var(--color-divider)]">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-[var(--color-panel)] border-b border-[var(--color-divider)]">
                {block.headers.map((h, col) => (
                  <th
                    key={col}
                    className={`px-3 py-2 font-semibold text-black ${alignClass(block.aligns[col] ?? null)} border-r last:border-r-0 border-[rgba(32,31,29,0.08)]`}
                  >
                    {renderInline(h, `th-${idx}-${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(32,31,29,0.1)] bg-white">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[rgba(182,130,53,0.04)]">
                  {row.map((cell, col) => (
                    <td
                      key={col}
                      className={`px-3 py-2 align-top text-black/90 ${alignClass(block.aligns[col] ?? null)} border-r last:border-r-0 border-[rgba(32,31,29,0.06)]`}
                    >
                      {renderInline(cell, `td-${idx}-${rIdx}-${col}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      const hasTask = block.items.some((it) => it.checked !== null);
      return (
        <ListTag
          key={idx}
          start={block.ordered ? block.start : undefined}
          className={`my-2.5 ${hasTask ? "pl-1 list-none" : block.ordered ? "pl-6 list-decimal" : "pl-6 list-disc"} space-y-1.5 text-[15.5px]`}
        >
          {block.items.map((item, itemIdx) => {
            const singlePara =
              item.blocks.length === 1 && item.blocks[0].type === "paragraph" ? item.blocks[0].text : null;
            return (
              <li key={itemIdx} className={item.checked !== null ? "flex items-start gap-2" : "leading-relaxed"}>
                {item.checked !== null && (
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="mt-1.5 rounded accent-[#b68235] pointer-events-none flex-none"
                  />
                )}
                <div className="min-w-0 flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {singlePara !== null
                    ? renderInline(singlePara, `li-${idx}-${itemIdx}`)
                    : item.blocks.map((b, j) => renderBlock(b, j))}
                </div>
              </li>
            );
          })}
        </ListTag>
      );
    }

    case "paragraph":
      return (
        <p key={idx} className="my-3 text-[15.5px] leading-[1.75] text-black/90">
          {renderInline(block.text, `p-${idx}`)}
        </p>
      );
  }
}

export default function MarkdownViewer({ content }: { content: string }) {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");

  // 선택적 YAML Frontmatter (문서 맨 위 --- ... ---) 분리
  let frontmatter: string | null = null;
  let bodyLines = lines;
  if (lines[0]?.trim() === "---") {
    const endIdx = lines.findIndex((l, idx) => idx > 0 && (l.trim() === "---" || l.trim() === "..."));
    if (endIdx > 0 && endIdx <= 40) {
      const candidate = lines.slice(1, endIdx);
      if (candidate.every((l) => l.trim() === "" || l.startsWith("#") || /^[A-Za-z0-9_-]+\s*:/.test(l.trim()) || /^\s+/.test(l))) {
        frontmatter = candidate.join("\n");
        bodyLines = lines.slice(endIdx + 1);
      }
    }
  }

  const seenIds = new Map<string, number>();
  const blocks = parseBlocks(bodyLines, seenIds);

  return (
    <article className="md-viewer-body text-black break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {frontmatter && (
        <div className="mb-5 p-3 rounded-lg border border-[var(--color-divider)] bg-[var(--color-panel)] font-[family-name:var(--font-mono)] text-[12.5px] text-black/75 whitespace-pre-wrap">
          {frontmatter}
        </div>
      )}
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </article>
  );
}

