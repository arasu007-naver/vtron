#!/usr/bin/env node
/**
 * Portrait Studio (/mov) 검증 스위트
 *
 *   npm run dev                     # 다른 탭에서 서버를 띄워 둔다
 *   cd test/mov && npm install && npm test
 *
 * style-ID-movie-studio/test/run.mjs 를 옮긴 것. 원본은 file:// 로 단일 HTML 을
 * 열었지만, 여기서는 Next 서버의 /mov 를 연다. 검사 내용은 그대로다 —
 * 배경 24종의 루프 이음매·움직임, 등장 20종의 끝 포즈, 효과 12종, 부분 효과
 * 마스킹, 미리보기 == 내보내기 픽셀 일치, 설정 저장/복원, 실제 webm 생성.
 *
 * 옵션:
 *   --url=...   대상 주소 (기본 http://localhost:8920/mov, env MOV_URL 로도 지정)
 *   --headed    브라우저를 띄워서 검사
 *   --only=bg   특정 그룹만 (bg | pose | fx | region | same | settings | guide | record | markup)
 *
 * 왜 이렇게 검사하는가는 각 그룹의 주석 참고. 특히 배경 "움직임" 검사에서
 * 위상 한 쌍만 비교하면 안 되는 이유는 group_bg() 주석에 적어 두었다.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");          // vtron 프로젝트 루트
const args = process.argv.slice(2);
const headed = args.includes("--headed");
const only = (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "";

const TARGET =
  (args.find((a) => a.startsWith("--url=")) || "").split("=").slice(1).join("=") ||
  process.env.MOV_URL ||
  "http://localhost:8920/mov";

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? "  " + detail : ""}`); }
  else { fail++; failures.push(name); console.log(`  \x1b[31m✗ ${name}\x1b[0m${detail ? "  " + detail : ""}`); }
}
const group = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

/* playwright 번들 크로미움이 없으면 시스템 Chrome 으로 떨어진다 */
async function launch() {
  const opts = { headless: !headed };
  try { return await chromium.launch(opts); }
  catch (e) {
    console.log("  (번들 크로미움 없음 → 시스템 Chrome 사용)");
    return await chromium.launch({ ...opts, channel: "chrome" });
  }
}

/* 캐릭터 픽스처를 브라우저로 만들어 파일로 떨군다 (외부 이미지 의존 없음) */
async function makeFixture(page) {
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800; c.height = 1000;
    const x = c.getContext("2d");
    x.fillStyle = "#f0f0f0"; x.fillRect(0, 0, 800, 1000);      // 제거될 배경
    x.fillStyle = "#dc5078"; x.beginPath(); x.arc(400, 300, 200, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#3c5ac8"; x.fillRect(280, 480, 240, 460);
    return c.toDataURL("image/png");
  });
  const f = path.join(HERE, ".fixture-char.png");
  fs.writeFileSync(f, Buffer.from(png.split(",")[1], "base64"));
  return f;
}

const run = (page, fn, arg) => page.evaluate(fn, arg);

/* 원본은 스크립트가 최상위에서 돌아 DOMContentLoaded 면 준비가 끝났지만,
   /mov 는 React 가 마운트한 뒤 initPortraitStudio() 가 붙는다. 그 시점을 기다린다. */
const ready = (page) =>
  page.waitForFunction(() => !!window.__portraitStudio, null, { timeout: 30000 });

async function reload(page) {
  await page.reload();
  await ready(page);
  await page.waitForTimeout(300);
}

/* ---------------------------------------------------------------- 배경 */
async function group_bg(page) {
  group("배경 24종 — 이음매 없는 루프 + 실제 움직임");
  const r = await run(page, () => {
    const W = 120, H = 210;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    const grab = (id, ph) => { paintBg(x, id, ph, W, H); return Uint8ClampedArray.from(x.getImageData(0, 0, W, H).data); };
    const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4)
      s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (W * H * 3); };
    state.tint = 0; state.bgImage = null; state.fx = {}; state.fxScope = "all";
    return BACKGROUNDS.filter((b) => b.id !== "none").map((bg) => {
      // 이음매: t 와 t+1, t+3 은 같은 그림이어야 한다 (위상 주기 = 1)
      const seam = Math.max(diff(grab(bg.id, 0.37), grab(bg.id, 1.37)),
                            diff(grab(bg.id, 0.8), grab(bg.id, 3.8)));
      // 움직임: 여러 위상과 비교해 최댓값을 쓴다.
      //  t=0 vs t=0.5 한 쌍만 보면 sin 이 우연히 같아지거나(선셋·더스크)
      //  하위 주기를 가진 배경(링펄스 1/4, 신스웨이브 1/2)이 "정지"로 오판된다.
      const base = grab(bg.id, 0);
      let move = 0;
      for (const ph of [0.08, 0.17, 0.25, 0.33, 0.5, 0.62, 0.75, 0.9])
        move = Math.max(move, diff(base, grab(bg.id, ph)));
      return { id: bg.id, name: bg.name, seam: +seam.toFixed(2), move: +move.toFixed(2) };
    });
  });
  for (const b of r) check(`${b.name}`, b.seam < 1 && b.move > 1, `이음매 ${b.seam} / 움직임 ${b.move}`);
}

/* ------------------------------------------------------------ 등장 포즈 */
async function group_pose(page) {
  group("등장 애니메이션 20종 — 끝 포즈가 정지 포즈와 일치");
  const r = await run(page, () => {
    setXY(50, 60); setScale(1.1); setRot(18);
    const near = (u, v) => Math.abs(u - v) < 1e-6;
    return IN_ANIMS.map((a) => {
      const e = poseAt(1, a.id), m = poseAt(0.4, a.id);
      return {
        id: a.id, name: a.name,
        endOk: near(e.x, state.x) && near(e.y, state.y) && near(e.s, 1) && near(e.rot, state.rot)
            && near(e.ry, 0) && near(e.rx, 0) && near(e.skew, 0) && near(e.blur, 0) && near(e.opacity, 1),
        moves: JSON.stringify(m) !== JSON.stringify(e),
      };
    });
  });
  for (const a of r) check(a.name, a.endOk && a.moves, a.endOk ? "" : "끝 포즈 불일치 → 애니메이션 끝에 튄다");
}

/* -------------------------------------------------------------- 화면효과 */
async function group_fx(page) {
  group("화면 효과 12종 — 화면을 바꾸고 시간에 따라 변한다");
  const r = await run(page, () => {
    const W = 180, H = 320;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    const base = () => { paintBg(x, "halftone", 0.3, W, H); drawCharacter(x, poseAt(1, state.inAnim), W, H); };
    const sig = () => { const d = x.getImageData(0, 0, W, H).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; return s; };
    const mean = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4)
      s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (W * H * 3); };
    state.fxScope = "all"; state.fx = {}; state.bg = "halftone";
    base(); const clean = Uint8ClampedArray.from(x.getImageData(0, 0, W, H).data);
    const out = EFFECTS.map((e) => {
      state.fx = { [e.id]: true };
      base(); applyEffects(x, W, H, 0.3);
      const delta = mean(clean, x.getImageData(0, 0, W, H).data);
      base(); applyEffects(x, W, H, 0.3); const s1 = sig();
      base(); applyEffects(x, W, H, 0.72); const s2 = sig();
      return { name: e.name, delta: +delta.toFixed(2), animated: s1 !== s2 };
    });
    state.fx = {};
    return out;
  });
  for (const e of r) check(e.name, e.delta > 0.3, `변화 ${e.delta}${e.animated ? " · 시간에 따라 변함" : " · 정적(의도된 경우 있음)"}`);
}

/* ---------------------------------------------------------------- 영역 */
async function group_region(page) {
  group("부분 효과 — 영역 안만 바뀌고 밖은 그대로");
  const r = await run(page, () => {
    const W = 180, H = 320;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d", { willReadFrequently: true });
    const base = () => { paintBg(x, "halftone", 0.3, W, H); drawCharacter(x, poseAt(1, state.inAnim), W, H); };
    const out = {};
    for (const fxid of ["pixel", "wave", "bloom", "vignette"]) {
      state.fxScope = "region"; state.fx = {}; state.bg = "halftone";
      state.spots = [{ id: 1, fx: fxid, x: 50, y: 25, w: 50, h: 25, shape: "rect", feather: 0, amt: 150 }];
      state.activeSpot = 1;
      base(); const clean = Uint8ClampedArray.from(x.getImageData(0, 0, W, H).data);
      base(); applyEffects(x, W, H, 0.3);
      const after = x.getImageData(0, 0, W, H).data;
      let inC = 0, inT = 0, outC = 0, outT = 0;
      for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
        const o = (y * W + xx) * 4;
        const d = Math.abs(after[o] - clean[o]) + Math.abs(after[o + 1] - clean[o + 1]) + Math.abs(after[o + 2] - clean[o + 2]);
        const inside = xx >= 45 && xx <= 135 && y >= 40 && y <= 120;
        if (inside) { inT++; if (d > 3) inC++; } else if (y > 200) { outT++; if (d > 0) outC++; }
      }
      out[fxid] = { inside: +(inC / inT * 100).toFixed(1), outside: +(outC / outT * 100).toFixed(1) };
    }
    // 40x40 격자 스냅
    state.spots = [{ id: 1, fx: "pixel", x: 50, y: 50, w: 30, h: 20, shape: "rect", feather: 8, amt: 100 }];
    state.activeSpot = 1;
    setRegion("x", 37.3); setRegion("y", 61.9); setRegion("w", 28.1);
    const sp = state.spots[0];
    out._snap = { x: sp.x, y: sp.y, w: sp.w,
      onGrid: [sp.x, sp.y, sp.w].every((v) => Math.abs(v / 2.5 - Math.round(v / 2.5)) < 1e-9) };
    state.fx = {}; state.fxScope = "all"; state.spots = [];
    return out;
  });
  for (const [k, v] of Object.entries(r)) {
    if (k === "_snap") check("격자 스냅 (37.3, 61.9, 28.1 → 2.5% 단위)", v.onGrid, `→ ${v.x}, ${v.y}, ${v.w}`);
    else check(`${k} — 영역 밖 불변`, v.outside === 0 && v.inside > 0, `안 ${v.inside}% / 밖 ${v.outside}%`);
  }
}

/* -------------------------------------------------------------- 설정 */
async function group_settings(page) {
  group("설정 저장 / 복원");
  await run(page, () => {
    state.W = 1080; state.H = 1920; applyCanvasSize();
    state.bg = "matrix"; state.bgReps = 5; applyReps();
    state.tint = 45; state.tintColor = "#3ee0c5"; state.tintMode = "color"; applyTint();
    state.inAnim = "spiralIn"; setXY(37.5, 72.5); setScale(1.4); setRot(-30);
    state.fxScope = "region"; state.fxPick = "bloom"; state.fxAmt = { bloom: 170 };
    state.spots = [{ id: 1, fx: "bloom", x: 25, y: 30, w: 35, h: 25, shape: "ellipse", feather: 14, amt: 170 }];
    state.activeSpot = 1; syncFxUI();
    document.getElementById("dur").value = "7";
    saveLocal();
  });
  const before = await run(page, () => JSON.stringify(collectSettings()));
  await reload(page);
  const after = await run(page, () => JSON.stringify(collectSettings()));
  check("새로고침 후 설정이 그대로", before === after);

  const round = await run(page, () => {
    const snap = collectSettings();
    state.bg = "aurora"; state.spots = []; state.tint = 0; setRot(0); syncFxUI();
    applySettings(snap);
    return JSON.stringify(collectSettings()) === JSON.stringify(snap);
  });
  check("설정 객체 왕복(collect → apply → collect) 일치", round);
}

/* ------------------------------------------------------- 미리보기==내보내기 */
async function group_same(page) {
  group("미리보기와 내보내기가 같은 그림");
  const r = await run(page, () => {
    // 두 경로 모두 paintBg → drawCharacter → applyEffects 를 쓴다.
    // 같은 위상·같은 크기로 그리면 픽셀이 완전히 같아야 한다.
    const W = 180, H = 320;
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H;
      return c.getContext("2d", { willReadFrequently: true }); };
    const draw = (x, ph) => { paintBg(x, state.bg, ph, W, H); drawCharacter(x, poseAt(0.6, state.inAnim), W, H); applyEffects(x, W, H, ph); };
    const out = {};
    for (const cfg of [{ fx: {}, scope: "all" },
                       { fx: { wave: true, chroma: true }, scope: "all" },
                       { fx: {}, scope: "region" }]) {
      state.fx = cfg.fx; state.fxScope = cfg.scope; state.tint = 35; state.tintColor = "#ff8a3d"; state.tintMode = "screen";
      if (cfg.scope === "region") {
        state.spots = [{ id: 9, fx: "pixel", x: 50, y: 40, w: 40, h: 30, shape: "ellipse", feather: 6, amt: 120 }];
        state.activeSpot = 9;
      }
      const a = mk(), b = mk();
      draw(a, 0.42); draw(b, 0.42);
      const da = a.getImageData(0, 0, W, H).data, db = b.getImageData(0, 0, W, H).data;
      let d = 0; for (let i = 0; i < da.length; i++) d += Math.abs(da[i] - db[i]);
      out[cfg.scope + ":" + (Object.keys(cfg.fx).join("+") || "효과없음")] = d;
    }
    state.fx = {}; state.fxScope = "all"; state.spots = []; state.tint = 0;
    return out;
  });
  for (const [k, v] of Object.entries(r)) check(`${k} — 픽셀 차이 0`, v === 0, `차이 ${v}`);
}

/* -------------------------------------------------------------- 녹화 */
async function group_record(page) {
  group("영상 저장 (짧은 클립 스모크)");
  await run(page, () => {
    window.__u = null;
    const o = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__u = this.href; return; } return o.call(this); };
    state.W = 480; state.H = 854; applyCanvasSize();
    state.bg = "star"; state.fx = {}; state.fxScope = "all"; state.spots = [];
    document.getElementById("dur").value = "1.5";
    document.getElementById("inDur").value = "0.5";
  });
  await page.click("#record");
  await page.waitForFunction(() => !!window.__u, null, { timeout: 60000 });
  await page.waitForTimeout(400);
  const info = await run(page, async () => {
    const r = await fetch(window.__u); const buf = await r.arrayBuffer();
    return { bytes: buf.byteLength, status: document.getElementById("status").textContent };
  });
  const fps = Number((info.status.match(/(\d+)fps/) || [])[1] || 0);
  check("webm 생성", info.bytes > 5000, `${(info.bytes / 1024).toFixed(0)}KB`);
  check("프레임률 확보 (≥15fps)", fps >= 15, `${fps}fps`);
  check("완료 상태 표시", /저장 완료/.test(info.status), info.status.slice(0, 60));

  // 녹화 중 '중지' 버튼
  await reload(page);
  await run(page, () => {
    window.__u = null;
    const o = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__u = this.href; return; } return o.call(this); };
    state.W = 480; state.H = 854; applyCanvasSize();
    document.getElementById("dur").value = "10";      // 길게 걸어두고 중간에 멈춘다
  });
  const idle = await run(page, () => document.getElementById("record").textContent);
  await page.click("#record");
  await page.waitForTimeout(900);
  const during = await run(page, () => {
    const b = document.getElementById("record");
    return { text: b.textContent, stop: b.classList.contains("stop"), disabled: b.disabled };
  });
  check("녹화 중 버튼이 '중지' 로 바뀜", during.text.includes("중지") && during.stop && !during.disabled, `"${idle}" → "${during.text}"`);

  const t0 = Date.now();
  await page.click("#record");                        // 중지
  await page.waitForFunction(() => !!window.__u, null, { timeout: 30000 });
  const ms = Date.now() - t0;
  await page.waitForTimeout(400);
  const st2 = await page.textContent("#status");
  const back = await run(page, () => document.getElementById("record").textContent);
  check("중지하면 10초를 기다리지 않고 즉시 끝남", ms < 5000, `${ms}ms`);
  check("중지 시점까지 저장", /중지 · [\d.]+초 저장/.test(st2), st2.slice(0, 60));
  check("버튼이 '영상 저장' 으로 복귀", back.trim() === "영상 저장", `"${back}"`);

  // 캐릭터 없이도 저장되는가
  await reload(page);
  await run(page, () => {
    window.__u = null;
    const o = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__u = this.href; return; } return o.call(this); };
    state.W = 480; state.H = 854; applyCanvasSize();
    document.getElementById("dur").value = "1";
  });
  await page.click("#record");
  await page.waitForFunction(() => !!window.__u, null, { timeout: 60000 });
  const st = await page.textContent("#status");
  check("캐릭터 없이도 저장", /저장 완료/.test(st), st.slice(0, 70));
}

/* ---------------------------------------------------------------- 가이드 */
async function group_guide(page) {
  group("대화식 가이드");
  await reload(page);

  const g = () => run(page, () => ({
    hidden: document.getElementById("guide").hidden,
    q: document.getElementById("guideQ").textContent,
    choices: [...document.getElementById("guideChoices").children].map((b) => b.textContent),
    hot: [...document.querySelectorAll(".guide-hot")].map((e) => e.id),
    hotVisible: [...document.querySelectorAll(".guide-hot")].every((e) => getComputedStyle(e).display !== "none"),
    waiting: !document.getElementById("guideWait").hidden,
  }));

  check("시작 전에는 숨어 있음", (await g()).hidden);
  await page.click("#guideStart"); await page.waitForTimeout(400);
  let s = await g();
  check("첫 질문이 '배경 이미지가 있나요?'", s.q.includes("배경 이미지가 있나요"), s.q);
  check("선택지 2개", s.choices.length === 2, s.choices.join(" / "));
  check("배경 이미지 버튼이 강조됨", s.hot.includes("bgFileLabel"), s.hot.join(","));
  check("강조 대상이 화면에 보임", s.hotVisible, "display:none 인 요소를 강조하면 테두리가 안 보인다");

  // 강조 링과 튀는 움직임이 실제로 돌고 있는가
  const anim = await run(page, () => {
    const e = document.querySelector(".guide-hot");
    const cs = getComputedStyle(e), af = getComputedStyle(e, "::after");
    return { el: cs.animationName, ring: af.animationName, grad: af.backgroundImage.includes("gradient") };
  });
  check("튀는 애니메이션", anim.el === "mov-guideBounce", anim.el);
  check("흐르는 그라디언트 테두리", anim.ring === "mov-guideFlow" && anim.grad, anim.ring);

  // 분기 A: 없어요 → 배경 애니메이션
  await page.click("#guideChoices button:nth-child(2)"); await page.waitForTimeout(250);
  s = await g();
  check("'없어요' → 배경 애니메이션 고르기", s.q.includes("배경 애니메이션") && s.hot.includes("bgList"), s.q);

  // 분기 B: 처음으로 돌아가 '있어요' → 이미지 선택을 기다린다
  await page.click("#guideClose"); await page.waitForTimeout(200);
  check("끝내면 강조가 사라짐", (await g()).hot.length === 0);
  await page.click("#guideStart"); await page.waitForTimeout(300);
  await page.click("#guideChoices button:nth-child(1)"); await page.waitForTimeout(250);
  s = await g();
  check("'있어요' → 이미지 선택 대기", s.q.includes("배경 이미지를 골라") && s.waiting, s.q);

  // 실제로 고르면 자동으로 다음 단계
  const bg = await run(page, () => {
    const c = document.createElement("canvas"); c.width = 600; c.height = 400;
    const x = c.getContext("2d"); x.fillStyle = "#2060a0"; x.fillRect(0, 0, 600, 400);
    return c.toDataURL("image/png");
  });
  const f = path.join(HERE, ".fixture-bg.png");
  fs.writeFileSync(f, Buffer.from(bg.split(",")[1], "base64"));
  await page.setInputFiles("#bgFile", f);
  await page.waitForFunction(() => document.getElementById("guideQ").textContent.includes("움직임"), null, { timeout: 10000 })
    .then(() => check("이미지를 고르면 자동으로 다음 단계", true))
    .catch(() => check("이미지를 고르면 자동으로 다음 단계", false));
  fs.rmSync(f, { force: true });

  // '사진만' 을 고르면 배경 애니메이션이 꺼진다
  await page.click("#guideChoices button:nth-child(2)"); await page.waitForTimeout(250);
  check("'사진만' → 배경 애니메이션 없음으로 설정", await run(page, () => state.bg === "none"));

  // 접힌 섹션이 자동으로 펼쳐지는가
  await run(page, () => document.querySelectorAll(".panel section").forEach((x) => x.classList.add("collapsed")));
  await page.click("#guideChoices button:nth-child(2)"); await page.waitForTimeout(400);
  check("강조 대상이 접힌 섹션이면 펼쳐 준다", await run(page, () => {
    const h = document.querySelector(".guide-hot");
    const sec = h && h.closest("section");
    return !!sec && !sec.classList.contains("collapsed");
  }));

  await page.click("#guideClose"); await page.waitForTimeout(200);
}

/* --------------------------------------------------- 마크업 동기화 (이식 전용) */
/* 로직은 lib/mov/portrait-studio.js, 마크업은 app/mov/page.tsx 로 갈라져 있다.
   JSX 로 옮기며 엘리먼트 하나를 빠뜨리면 그 기능만 조용히 죽는다 —
   모듈이 `$("id")` 로 찾는 모든 id 가 실제 페이지에 있는지 확인한다. */
async function group_markup(page) {
  group("마크업 동기화 — 모듈이 찾는 엘리먼트가 페이지에 다 있는가");
  const js = fs.readFileSync(path.join(ROOT, "lib", "mov", "portrait-studio.js"), "utf8");
  const ids = [...new Set([...js.matchAll(/\$\("([\w-]+)"\)/g)].map((m) => m[1]))].sort();
  const missing = await run(page, (list) => list.filter((id) => !document.getElementById(id)), ids);
  check(`${ids.length}개 id 모두 존재`, missing.length === 0, missing.length ? "빠짐: " + missing.join(", ") : "");

  /* 스코프된 CSS 가 실제로 먹었는지 — Tailwind preflight 에 밀리면 레이아웃이 무너진다 */
  const css = await run(page, () => {
    const app = document.querySelector(".mov-app");
    const panel = document.querySelector(".mov-app .panel");
    const cs = getComputedStyle(app);
    return {
      grid: cs.display,
      cols: cs.gridTemplateColumns.split(" ").length,
      panelScrolls: getComputedStyle(panel).overflow,
      stageW: cs.getPropertyValue("--stage-w").trim(),
      chip: getComputedStyle(document.querySelector(".mov-app .chip")).borderRadius,
    };
  });
  check("루트가 2단 그리드", css.grid === "grid" && css.cols === 2, `${css.grid} / ${css.cols}열`);
  check("패널이 스크롤됨", css.panelScrolls === "auto", css.panelScrolls);
  check("--stage-w 가 JS 값으로 덮였음", /px$/.test(css.stageW) && css.stageW !== "360px", css.stageW);
  check("칩 스타일이 Tailwind preflight 를 이김", css.chip === "10px", css.chip);
}

/* ---------------------------------------------------------------- main */
(async () => {
  console.log(`대상: ${TARGET}`);
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  /* 스튜디오와 무관한 잡음은 버린다.
     "Failed to load resource" 는 메시지 본문에 URL 이 없으므로 location 으로 걸러낸다 —
     favicon 은 이 프로젝트에 아직 없고(전 페이지 공통), HMR 소켓은 브라우저를 닫을 때 끊긴다. */
  const noise = (m) => {
    const url = (m.location() || {}).url || "";
    return /favicon|\.map$|_next\/webpack-hmr|hot-reloader|__nextjs/.test(url);
  };
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !noise(m)) errs.push(`${m.text().slice(0, 100)} <- ${(m.location() || {}).url || "?"}`);
  });

  try {
    await page.goto(TARGET, { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (e) {
    console.error(`\n${TARGET} 를 열 수 없습니다 — \`npm run dev\` 로 서버를 띄우고 다시 실행하세요.\n`);
    throw e;
  }
  if (new URL(page.url()).pathname !== new URL(TARGET).pathname) {
    console.error(`\n${page.url()} 로 리다이렉트되었습니다 — 로그인 세션이 필요합니다 (proxy.ts 세션 가드).\n`);
    process.exit(1);
  }
  await ready(page);
  await page.waitForTimeout(300);
  const fixture = await makeFixture(page);
  await page.setInputFiles("#file", fixture);
  await page.waitForFunction(() => !!state.cutCanvas, null, { timeout: 25000 });
  await page.waitForTimeout(400);

  const groups = {
    bg: () => group_bg(page), pose: () => group_pose(page), fx: () => group_fx(page),
    region: () => group_region(page), same: () => group_same(page),
    settings: () => group_settings(page), guide: () => group_guide(page),
    record: () => group_record(page), markup: () => group_markup(page),
  };
  for (const [k, fn] of Object.entries(groups)) {
    if (only && only !== k) continue;
    await fn();
  }

  group("콘솔 오류");
  check("페이지 오류 없음", errs.length === 0, errs.slice(0, 3).join(" | "));

  fs.rmSync(fixture, { force: true });
  await browser.close();

  console.log(`\n${fail === 0 ? "\x1b[32m" : "\x1b[31m"}${pass} 통과, ${fail} 실패\x1b[0m`);
  if (fail) { console.log("실패:", failures.join(", ")); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
