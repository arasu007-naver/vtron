/**
 * 마크다운 뷰어 본문 DOM 을 A4 다중 페이지 PDF 로 변환해 즉시 다운로드한다.
 *
 * `lib/style-ex/report-pdf.ts` 와 같은 방식으로 화면 밖 A4 컨테이너(794×1123px)에 블록(atom)들을
 * 세워 높이를 잰 뒤 페이지 단위로 나누어 `html-to-image` + `jspdf` 로 저장한다.
 * - 브라우저 시스템 한글 글꼴을 그대로 그려 한글 깨짐이 없고 별도 수 MB 폰트 번들이 필요 없다.
 * - 긴 코드 블록 · 긴 표 · 긴 목록이 한 페이지를 넘어가면 줄/행/항목 단위로 쪼개어 잘림을 막는다.
 * - 제목(H1~H6)만 페이지 맨 아래에 홀로 남지 않도록 다음 블록과 함께 넘긴다.
 */

const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN_X = 44;
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 40;
const FOOTER_H = 22;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const CONTENT_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - FOOTER_H;

const PDF_SANS =
  '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", "Noto Sans KR", sans-serif';
const PDF_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "D2Coding", monospace';

interface AtomEntry {
  node: HTMLElement;
  isHeading: boolean;
}

function makeEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration>,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 클론된 블록에서 버튼(복사 등)을 제거하고 가로 스크롤 잘림이 없도록 줄바꿈 스타일을 보정한다 */
function sanitizeCloneForPdf(root: HTMLElement): void {
  root.querySelectorAll("button").forEach((btn) => btn.remove());

  root.querySelectorAll("pre, code").forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.whiteSpace = "pre-wrap";
    htmlEl.style.wordBreak = "break-word";
    htmlEl.style.overflowX = "visible";
    htmlEl.style.fontFamily = PDF_MONO;
  });

  root.querySelectorAll("table").forEach((tbl) => {
    const htmlTbl = tbl as HTMLElement;
    htmlTbl.style.width = "100%";
    htmlTbl.style.tableLayout = "auto";
    if (htmlTbl.parentElement) {
      htmlTbl.parentElement.style.overflowX = "visible";
    }
  });

  root.querySelectorAll("th, td").forEach((cell) => {
    const htmlCell = cell as HTMLElement;
    htmlCell.style.wordBreak = "break-word";
  });

  root.querySelectorAll("img").forEach((img) => {
    img.style.maxWidth = "100%";
    img.style.maxHeight = `${Math.floor(CONTENT_H * 0.65)}px`;
    img.style.objectFit = "contain";
  });
}

/** margin 대신 padding 으로 아래 간격을 주어 getBoundingClientRect().height 에 간격이 포함되게 감싼다 */
function wrapAtom(child: HTMLElement, gapBottom = 10, gapTop = 0): HTMLElement {
  child.style.marginTop = "0";
  child.style.marginBottom = "0";
  const box = makeEl("div", {
    paddingTop: `${gapTop}px`,
    paddingBottom: `${gapBottom}px`,
    width: "100%",
    boxSizing: "border-box",
  });
  box.append(child);
  return box;
}

/** 한 페이지를 넘는 코드 블록을 줄 단위 atom 들로 분해한다 */
function splitOversizedCodeBlock(codeEl: HTMLElement, langLabel: string): AtomEntry[] {
  const lines = (codeEl.textContent ?? "").split("\n");
  const out: AtomEntry[] = [];

  if (langLabel) {
    const header = makeEl(
      "div",
      {
        background: "#2a2825",
        color: "rgba(255,255,255,0.78)",
        fontFamily: PDF_MONO,
        fontSize: "11px",
        padding: "5px 12px",
        borderTopLeftRadius: "6px",
        borderTopRightRadius: "6px",
        borderTop: "4px solid #ffffff",
      },
      langLabel
    );
    out.push({ node: header, isHeading: true });
  }

  lines.forEach((line, idx) => {
    const isFirst = idx === 0 && !langLabel;
    const isLast = idx === lines.length - 1;
    const row = makeEl(
      "div",
      {
        background: "#1f1e1c",
        color: "#f5f2eb",
        fontFamily: PDF_MONO,
        fontSize: "11.5px",
        lineHeight: "1.55",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        padding: `${idx === 0 ? 7 : 0}px 12px ${isLast ? 8 : 0}px`,
        borderTopLeftRadius: isFirst ? "6px" : "0",
        borderTopRightRadius: isFirst ? "6px" : "0",
        borderBottomLeftRadius: isLast ? "6px" : "0",
        borderBottomRightRadius: isLast ? "6px" : "0",
      },
      line || " "
    );
    out.push({ node: isLast ? wrapAtom(row, 10) : row, isHeading: false });
  });

  return out;
}

/** 한 페이지를 넘는 표를 행 묶음(각 페이지마다 thead 반복)으로 분해한다 */
function splitOversizedTable(tableWrapper: HTMLElement, measureHost: HTMLElement): AtomEntry[] {
  const table = tableWrapper.querySelector("table");
  if (!table) return [{ node: tableWrapper, isHeading: false }];

  const thead = table.querySelector("thead");
  const rows = Array.from(table.querySelectorAll("tbody > tr"));
  if (rows.length <= 1) return [{ node: tableWrapper, isHeading: false }];

  const makeTableShell = () => {
    const inner = makeEl("div", {
      width: "100%",
      border: "1px solid rgba(32,31,29,0.16)",
      borderRadius: "6px",
      overflow: "hidden",
    });
    const t = table.cloneNode(false) as HTMLTableElement;
    t.style.width = "100%";
    t.style.borderCollapse = "collapse";
    if (thead) t.append(thead.cloneNode(true));
    const tb = document.createElement("tbody");
    tb.className = table.querySelector("tbody")?.className ?? "";
    t.append(tb);
    inner.append(t);
    const wrap = wrapAtom(inner, 10);
    return { wrap, tb };
  };

  const chunks: AtomEntry[] = [];
  let current = makeTableShell();
  measureHost.append(current.wrap);

  for (const row of rows) {
    const rowClone = row.cloneNode(true) as HTMLTableRowElement;
    current.tb.append(rowClone);
    const h = current.wrap.getBoundingClientRect().height;
    if (h > CONTENT_H && current.tb.children.length > 1) {
      rowClone.remove();
      current.wrap.remove();
      chunks.push({ node: current.wrap, isHeading: false });

      current = makeTableShell();
      measureHost.append(current.wrap);
      current.tb.append(row.cloneNode(true));
    }
  }

  current.wrap.remove();
  if (current.tb.children.length > 0) {
    chunks.push({ node: current.wrap, isHeading: false });
  }
  return chunks;
}

/** 한 페이지를 넘는 목록(UL/OL)을 항목(LI) 단위로 분해한다 */
function splitOversizedList(listEl: HTMLElement): AtomEntry[] {
  const isOrdered = listEl.tagName === "OL";
  const baseStart = isOrdered ? Number((listEl as HTMLOListElement).start || 1) : 1;
  const items = Array.from(listEl.children).filter((c) => c.tagName === "LI") as HTMLLIElement[];
  if (items.length <= 1) return [{ node: wrapAtom(listEl, 8), isHeading: false }];

  return items.map((li, idx) => {
    const singleList = document.createElement(isOrdered ? "ol" : "ul");
    singleList.className = listEl.className;
    if (isOrdered) (singleList as HTMLOListElement).start = baseStart + idx;
    singleList.style.marginTop = "0";
    singleList.style.marginBottom = "0";
    singleList.append(li.cloneNode(true));
    return { node: wrapAtom(singleList, idx === items.length - 1 ? 10 : 4), isHeading: false };
  });
}

export async function downloadMarkdownPdf(articleEl: HTMLElement, sourceFileName: string): Promise<void> {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const baseName = sourceFileName.replace(/\.(md|markdown|mdx|txt)$/i, "").trim() || "document";
  const pdfFileName = `${baseName}.pdf`;

  const host = makeEl("div", {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${PAGE_W}px`,
    fontFamily: PDF_SANS,
    color: "#000000",
    background: "#ffffff",
    lineHeight: "1.6",
  });
  host.className = "light-scope";
  document.body.append(host);

  try {
    const measureCol = makeEl("div", { width: `${CONTENT_W}px` });
    host.append(measureCol);

    // 1) 원본 뷰어 아티클의 직계 자식 블록들을 복제해 1차 높이를 측정한다
    const rawChildren = Array.from(articleEl.children) as HTMLElement[];
    const initialAtoms: { rawClone: HTMLElement; wrapped: HTMLElement; isHeading: boolean }[] = rawChildren.map(
      (child) => {
        const clone = child.cloneNode(true) as HTMLElement;
        sanitizeCloneForPdf(clone);
        const tag = clone.tagName;
        const isHeading = /^H[1-6]$/.test(tag);
        const gapTop = tag === "H1" || tag === "H2" ? 14 : isHeading ? 10 : 0;
        const gapBottom = isHeading ? 6 : 10;
        const wrapped = wrapAtom(clone, gapBottom, gapTop);
        return { rawClone: clone, wrapped, isHeading };
      }
    );

    initialAtoms.forEach((a) => measureCol.append(a.wrapped));
    await Promise.all(
      Array.from(measureCol.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined))
    );

    const firstHeights = initialAtoms.map((a) => a.wrapped.getBoundingClientRect().height);
    measureCol.innerHTML = "";

    // 2) 한 페이지(CONTENT_H)를 초과하는 대형 블록(코드 · 표 · 목록)을 세분화한다
    const finalAtoms: AtomEntry[] = [];
    for (let i = 0; i < initialAtoms.length; i++) {
      const { rawClone, wrapped, isHeading } = initialAtoms[i];
      const h = firstHeights[i];

      if (h <= CONTENT_H) {
        finalAtoms.push({ node: wrapped, isHeading });
        continue;
      }

      const codeEl = rawClone.querySelector("pre > code") as HTMLElement | null;
      const tableEl = rawClone.querySelector("table");
      if (codeEl && !tableEl && rawClone.tagName !== "UL" && rawClone.tagName !== "OL") {
        const langSpan = rawClone.querySelector("div > span");
        finalAtoms.push(...splitOversizedCodeBlock(codeEl, langSpan?.textContent?.trim() ?? ""));
      } else if (tableEl) {
        finalAtoms.push(...splitOversizedTable(rawClone, measureCol));
      } else if (rawClone.tagName === "UL" || rawClone.tagName === "OL") {
        finalAtoms.push(...splitOversizedList(rawClone));
      } else {
        // 매우 긴 단일 문단/인용문은 페이지 높이에 맞춰 최대 높이 제한
        wrapped.style.maxHeight = `${CONTENT_H}px`;
        wrapped.style.overflow = "hidden";
        finalAtoms.push({ node: wrapped, isHeading });
      }
    }

    // 세분화된 최종 atom 높이 측정
    finalAtoms.forEach((a) => measureCol.append(a.node));
    const heights = finalAtoms.map((a) => a.node.getBoundingClientRect().height);
    measureCol.remove();

    // 3) A4 페이지에 순서대로 배치
    const pages: HTMLElement[] = [];
    let currentBody: HTMLElement | null = null;
    let used = 0;

    const openNewPage = () => {
      const page = makeEl("div", {
        position: "relative",
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        padding: `${MARGIN_TOP}px ${MARGIN_X}px ${MARGIN_BOTTOM + FOOTER_H}px`,
        boxSizing: "border-box",
        background: "#ffffff",
        overflow: "hidden",
      });
      currentBody = makeEl("div", {
        width: `${CONTENT_W}px`,
        height: `${CONTENT_H}px`,
        overflow: "hidden",
      });
      page.append(currentBody);
      pages.push(page);
      used = 0;
    };

    if (finalAtoms.length === 0) {
      openNewPage();
    } else {
      for (let i = 0; i < finalAtoms.length; i++) {
        const { node, isHeading } = finalAtoms[i];
        const h = heights[i];
        const nextH = i + 1 < finalAtoms.length ? heights[i + 1] : 0;

        // 제목이 페이지 끝에 홀로 남는 경우(다음 조각과 합쳐 새 페이지에 들어갈 수 있으면) 미리 넘긴다
        const orphanHeading =
          isHeading && used > 0 && used + h + nextH > CONTENT_H && h + nextH <= CONTENT_H;

        if (!currentBody || (used > 0 && (used + h > CONTENT_H || orphanHeading))) {
          openNewPage();
        }
        currentBody!.append(node);
        used += h;
      }
    }

    pages.forEach((page, idx) => {
      const footer = makeEl("div", {
        position: "absolute",
        left: `${MARGIN_X}px`,
        right: `${MARGIN_X}px`,
        bottom: `${MARGIN_BOTTOM - 12}px`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "10px",
        color: "#888888",
        borderTop: "1px solid rgba(32,31,29,0.1)",
        paddingTop: "6px",
      });
      footer.append(makeEl("span", { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }, sourceFileName));
      footer.append(makeEl("span", { fontFamily: PDF_MONO }, `${idx + 1} / ${pages.length}`));
      page.append(footer);
      host.append(page);
    });

    // 4) 페이지별 JPEG 캡처 후 PDF 파일 저장
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    for (let i = 0; i < pages.length; i++) {
      const jpeg = await toJpeg(pages[i], {
        quality: 0.92,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: PAGE_W,
        height: PAGE_H,
        skipFonts: true,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(jpeg, "JPEG", 0, 0, 210, 297);
    }

    pdf.save(pdfFileName);
  } finally {
    host.remove();
  }
}
