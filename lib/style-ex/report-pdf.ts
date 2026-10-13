/**
 * Style ID 추출 보고서 PDF — 브라우저에서 만들어 곧바로 내려받는다.
 *
 * 글자를 PDF 글꼴로 쓰지 않고 **A4 한 장씩 그림으로 찍어** 붙인다. jsPDF 에 한글 글꼴을 넣으면
 * 수 MB 가 따라오는데, 이 방식은 브라우저가 가진 글꼴로 그대로 그린다. 대신 PDF 안의 글자는
 * 선택 · 검색이 안 된다.
 *
 * 쪽 나누기는 **덩이(atom) 단위**다. 내용을 덩이로 잘라 한 줄로 세워 높이를 잰 다음, 쪽에 들어가는
 * 만큼씩 담는다. 호출 결과 JSON 은 한 줄이 한 덩이라 줄 가운데서 잘리지 않는다.
 *
 * 무거운 두 라이브러리(jspdf · html-to-image)는 단추를 누를 때 불러온다.
 */

/** 보고서를 이루는 조각. 위에서 아래로 그대로 놓인다. */
export type ReportBlock =
  | { kind: "title"; text: string; sub?: string }
  | { kind: "heading"; text: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "rows"; rows: [label: string, value: string][] }
  | { kind: "text"; text: string; tone?: "normal" | "muted" | "danger" | "accent" }
  | { kind: "code"; text: string }
  /** 다음 조각을 새 쪽에서 시작한다. */
  | { kind: "pageBreak" };

/** A4 를 96dpi 로 본 크기(px). */
const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 48;
const FOOTER = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_H = PAGE_H - MARGIN * 2 - FOOTER;

const SANS = '-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
const MONO = 'Menlo, Consolas, "D2Coding", monospace';

const TONE: Record<NonNullable<Extract<ReportBlock, { kind: "text" }>["tone"]>, string> = {
  normal: "#000",
  muted: "#555",
  danger: "#8a3a2a",
  accent: "#7d5411",
};

function el(tag: string, style: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 한 조각을 덩이로 자른다. 덩이 하나는 쪽을 넘겨 잘리지 않는다. 간격은 padding 으로 둔다(margin 은 높이에 안 잡힌다). */
function atomsOf(block: ReportBlock): HTMLElement[] {
  switch (block.kind) {
    case "pageBreak":
      return [el("div", { height: "0" })];
    case "title": {
      const box = el("div", { paddingBottom: "12px", borderBottom: "2px solid #000" });
      box.append(el("div", { fontSize: "22px", fontWeight: "700" }, block.text));
      if (block.sub) box.append(el("div", { fontSize: "12px", color: "#555", marginTop: "4px" }, block.sub));
      return [box];
    }
    case "heading":
      return [
        el(
          "div",
          { paddingTop: "22px", paddingBottom: "6px", fontSize: "15px", fontWeight: "700", borderBottom: "1px solid #ccc" },
          block.text
        ),
      ];
    case "image": {
      const box = el("div", { paddingTop: "16px", display: "flex", justifyContent: "center" });
      const img = document.createElement("img");
      img.src = block.src;
      img.alt = block.alt;
      Object.assign(img.style, { maxWidth: "100%", maxHeight: "520px", objectFit: "contain", border: "1px solid #ddd" });
      box.append(img);
      return [box];
    }
    case "rows":
      return block.rows.map(([label, value]) => {
        const row = el("div", { display: "flex", gap: "12px", paddingTop: "6px", fontSize: "12px", lineHeight: "1.5" });
        row.append(el("div", { flex: "none", width: "96px", color: "#555" }, label));
        row.append(el("div", { flex: "1", minWidth: "0", wordBreak: "break-all", whiteSpace: "pre-wrap" }, value));
        return row;
      });
    case "text":
      return [
        el(
          "div",
          {
            paddingTop: "6px",
            fontSize: block.tone === "accent" ? "26px" : "12px",
            fontWeight: block.tone === "accent" ? "700" : "400",
            letterSpacing: block.tone === "accent" ? "0.2em" : "normal",
            lineHeight: "1.5",
            color: TONE[block.tone ?? "normal"],
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          },
          block.text
        ),
      ];
    case "code": {
      const lines = block.text.split("\n");
      return lines.map((line, i) =>
        el(
          "div",
          {
            fontFamily: MONO,
            fontSize: "9.5px",
            lineHeight: "13px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            background: "#f6f6f6",
            padding: `${i === 0 ? 8 : 0}px 8px ${i === lines.length - 1 ? 8 : 0}px`,
            // 위 간격 — margin 은 잰 높이에 안 들어가므로 흰 테두리로 띄운다
            borderTop: i === 0 ? "8px solid #fff" : "0",
            // 아주 긴 한 줄이 쪽을 넘기면 넘친 만큼은 버린다
            maxHeight: `${CONTENT_H}px`,
            overflow: "hidden",
          },
          line || " "
        )
      );
    }
  }
}

/**
 * 조각들로 PDF 를 만들어 `filename` 으로 내려받게 한다.
 *
 * 화면 밖에 A4 쪽들을 실제로 세운 다음 한 장씩 찍는다. 다 찍으면 지운다.
 */
export async function downloadReportPdf(blocks: ReportBlock[], filename: string): Promise<void> {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);

  const host = el("div", {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${PAGE_W}px`,
    fontFamily: SANS,
    color: "#000",
    background: "#fff",
  });
  document.body.append(host);

  try {
    // 1) 한 줄로 세워 높이를 잰다
    const column = el("div", { width: `${CONTENT_W}px` });
    host.append(column);
    const atoms: HTMLElement[] = [];
    /** 쪽 나누기 덩이 — 이것부터 새 쪽이다. */
    const breaks = new Set<HTMLElement>();
    for (const block of blocks) {
      const made = atomsOf(block);
      if (block.kind === "pageBreak") made.forEach((atom) => breaks.add(atom));
      atoms.push(...made);
    }
    column.append(...atoms);
    await Promise.all(
      Array.from(column.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined))
    );
    const heights = atoms.map((atom) => atom.getBoundingClientRect().height);

    // 2) 쪽에 들어가는 만큼씩 담는다
    const pages: HTMLElement[] = [];
    let body: HTMLElement | null = null;
    let used = 0;
    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const h = heights[i];
      if (!body || (used > 0 && (breaks.has(atom) || used + h > CONTENT_H))) {
        const page = el("div", {
          position: "relative",
          width: `${PAGE_W}px`,
          height: `${PAGE_H}px`,
          padding: `${MARGIN}px`,
          boxSizing: "border-box",
          background: "#fff",
          overflow: "hidden",
        });
        body = el("div", { width: `${CONTENT_W}px`, height: `${CONTENT_H}px`, overflow: "hidden" });
        page.append(body);
        pages.push(page);
        used = 0;
      }
      body.append(atom);
      used += h;
    }
    column.remove();
    pages.forEach((page, i) => {
      page.append(
        el(
          "div",
          { position: "absolute", left: "0", right: "0", bottom: `${MARGIN - 8}px`, textAlign: "center", fontSize: "10px", color: "#888" },
          `${i + 1} / ${pages.length}`
        )
      );
      host.append(page);
    });

    // 3) 한 장씩 찍어 붙인다
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
    pdf.save(filename);
  } finally {
    host.remove();
  }
}
