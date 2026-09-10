/* Portrait Studio — style-ID-movie-studio/canvas-portrait-studio/app.js 를
   vtron 의 /mov 페이지로 옮긴 것.

   원본은 index.html 이 직접 읽어들이는 최상위 스크립트였다. 여기서는
   initPortraitStudio(root) 로 감싸서 React 가 마운트한 DOM 위에서 돌게 하고,
   엘리먼트 조회를 root 안으로 한정한다. 로직·렌더 파이프라인은 원본 그대로다.

   - $(id)            : document 전역이 아니라 root.querySelector("#id")
   - --stage-w/-h     : documentElement 대신 root 인라인 스타일
   - dispose()        : rAF 루프 · 자동저장 타이머 · beforeunload 회수 (StrictMode 재마운트 대비)
   - window 노출      : test/mov 검증 스위트가 state/paintBg 등을 페이지 스코프에서 부른다
*/

export function initPortraitStudio(root) {
  if (!root) throw new Error("initPortraitStudio: root 엘리먼트가 필요합니다");

  let disposed = false;
  let rafId = 0;
  const rafLoop = (fn) => {
    if (disposed) return;
    rafId = requestAnimationFrame(fn);
  };

  const CANVAS_SIZES = [
    { id: "720x1280",  name: "720 × 1280",  w: 720,  h: 1280 },
    { id: "1080x1920", name: "1080 × 1920", w: 1080, h: 1920 },
    { id: "1080x1350", name: "1080 × 1350", w: 1080, h: 1350 },
    { id: "1080x1080", name: "1080 × 1080", w: 1080, h: 1080 },
    { id: "1280x720",  name: "1280 × 720",  w: 1280, h: 720 },
    { id: "1920x1080", name: "1920 × 1080", w: 1920, h: 1080 },
  ];

  /* 미리보기 스테이지가 들어갈 최대 박스 (px) */
  const STAGE_MAX_W = 520;
  const STAGE_MAX_H = 660;

  const BACKGROUNDS = [
    { id: "aurora", name: "오로라", cls: "bg-aurora" },
    { id: "sunset", name: "선셋 글로우", cls: "bg-sunset" },
    { id: "mesh", name: "컬러 메시", cls: "bg-mesh" },
    { id: "bokeh", name: "보케", cls: "bg-bokeh" },
    { id: "neon", name: "네온 그리드", cls: "bg-neon" },
    { id: "wave", name: "웨이브", cls: "bg-wave" },
    { id: "spotlight", name: "스포트라이트", cls: "bg-spotlight" },
    { id: "bloom", name: "컬러 블룸", cls: "bg-bloom" },
    { id: "dusk", name: "더스크", cls: "bg-dusk" },
    { id: "pulse", name: "링 펄스", cls: "bg-pulse" },
    { id: "shine", name: "샤인 스윕", cls: "bg-shine" },
    { id: "star", name: "스타필드", cls: "bg-star" },
    { id: "rain", name: "빗줄기", cls: "bg-rain" },
    { id: "snow", name: "눈", cls: "bg-snow" },
    { id: "matrix", name: "디지털 레인", cls: "bg-matrix" },
    { id: "grid3d", name: "신스웨이브", cls: "bg-grid3d" },
    { id: "confetti", name: "컨페티", cls: "bg-confetti" },
    { id: "blob", name: "리퀴드 블롭", cls: "bg-blob" },
    { id: "stripes", name: "대각 스트라이프", cls: "bg-stripes" },
    { id: "ripple", name: "워터 리플", cls: "bg-ripple" },
    { id: "firefly", name: "반딧불", cls: "bg-firefly" },
    { id: "halftone", name: "하프톤 도트", cls: "bg-halftone" },
    { id: "beam", name: "라이트 빔", cls: "bg-beam" },
    { id: "film", name: "필름 그레인", cls: "bg-film" },
    { id: "none", name: "✕  배경 애니메이션 없음", full: true },
  ];

  const IN_ANIMS = [
    { id: "fadeScale", name: "페이드 스케일" },
    { id: "fromBottom", name: "아래에서 슬라이드" },
    { id: "fromLeft", name: "왼쪽에서" },
    { id: "fromRight", name: "오른쪽에서" },
    { id: "fromTop", name: "드롭 + 바운스" },
    { id: "pop", name: "팝 오버슈트" },
    { id: "spin", name: "스핀 인" },
    { id: "flip", name: "카드 플립" },
    { id: "zoomFar", name: "멀리서 줌" },
    { id: "backIn", name: "백 인" },
    { id: "bounceUp", name: "바운스 업" },
    { id: "lightSpeed", name: "라이트 스피드" },
    { id: "rollIn", name: "롤 인" },
    { id: "blurIn", name: "블러 인" },
    { id: "swingIn", name: "스윙 인" },
    { id: "jackBox", name: "잭 인 더 박스" },
    { id: "slitIn", name: "슬릿 오픈" },
    { id: "diagonal", name: "대각선 진입" },
    { id: "spiralIn", name: "스파이럴" },
    { id: "elastic", name: "일래스틱" },
  ];

  const state = {
    bg: "aurora",
    inAnim: "fadeScale",
    canvasSize: "720x1280",
    W: 720,
    H: 1280,
    x: 50,
    y: 62,
    size: 38,
    scale: 1,
    rot: 0,
    stagePx: 360,
    maxSide: 1024,
    keepOriginal: false,
    srcW: 0,
    srcH: 0,
    cutCanvas: null,
    playing: false,
    selected: false,
    grid: false,
    tintColor: "#4a7bff",
    tint: 0,                    // 0 = 끔
    tintMode: "screen",
    bgReps: 1,
    bgImage: null,      // 배경으로 깔 이미지 (HTMLImageElement)
    animMix: 100,       // 이미지 위에 얹는 애니메이션 강도 %
    fx: {},                                   // 전체 범위에서 켜진 효과 { id: true }
    fxAmt: {},                                // 효과별 세기 % { id: 100 }
    fxScope: "all",                           // all | region
    fxPick: "wave",                           // 영역 모드에서 고른 효과(새 지점에 쓰임)
    spots: [],                                // [{id, fx, x, y, w, h, shape, feather, amt}]
    activeSpot: null,                         // 편집 중인 지점 id
    regionEdit: false,
    recording: false,
    stopRequested: false,
  };

  /* CSS mix-blend-mode 와 canvas globalCompositeOperation 이 같은 이름을 쓰므로
     미리보기와 내보내기가 정확히 같은 합성을 한다. */
  const TINT_MODES = [
    { id: "screen", name: "밝게", hint: "어두운 부분을 선택한 색으로 끌어올립니다." },
    { id: "color", name: "색상만", hint: "명암은 그대로 두고 색만 바꿉니다. 질감이 살아남습니다." },
    { id: "soft-light", name: "부드럽게", hint: "은은하게 물들입니다. 원본 대비를 가장 많이 유지합니다." },
  ];

  /* 색조 프리셋 (어두운 배경을 밝히기 좋은 방향들) */
  const TINT_PRESETS = [
    "#ff8a3d", "#ff5d8f", "#7c5cff", "#4a7bff", "#3ee0c5", "#9fe870", "#ffd36e", "#e8eef7",
  ];

  const MIN_SCALE = 0.2;
  const MAX_SCALE = 3;

  /* 각도를 (-180, 180] 로 정규화 */
  function norm180(d) {
    d = ((d + 180) % 360 + 360) % 360 - 180;
    return d === -180 ? 180 : d;
  }

  /* 잘라낸 이미지의 세로/가로 비 */
  function cutAspect() {
    return state.cutCanvas ? state.cutCanvas.height / state.cutCanvas.width : 1;
  }

  /* 카드 세로% / 가로% (스테이지·캔버스 종횡비가 같으므로 캔버스에도 그대로 적용된다) */
  function heightPerWidth() {
    return cutAspect() * (state.W / state.H);
  }

  /* 결과물(회전 후 외접 사각형)이 캔버스를 넘지 않는 최대 배율.
     회전 R 일 때 외접 폭 = w|cosR| + h|sinR|, 외접 높이 = w|sinR| + h|cosR|. */
  function maxScaleFor(size, rotDeg) {
    const ar = cutAspect();
    const r = ((rotDeg === undefined ? state.rot : rotDeg) * Math.PI) / 180;
    const c = Math.abs(Math.cos(r));
    const sn = Math.abs(Math.sin(r));
    const k = size / 100;
    const byW = 1 / (k * (c + ar * sn));
    const byH = (state.H / state.W) / (k * (sn + ar * c));
    return Math.min(MAX_SCALE, byW, byH);
  }

  function clampScale(v) {
    const hi = maxScaleFor(state.size);
    const lo = Math.min(MIN_SCALE, hi);
    return Math.max(lo, Math.min(hi, v));
  }

  /* 크기·캔버스·이미지가 바뀌면 상한을 다시 계산하고 UI에 반영 */
  function refreshScaleLimit() {
    const hi = maxScaleFor(state.size);
    $("charScale").max = hi.toFixed(2);
    $("charScaleNum").max = hi.toFixed(2);
    $("scaleMax").textContent = `최대 ${hi.toFixed(2)}×`;
    if (state.scale > hi) setScale(hi);
  }

  const $ = (id) => root.querySelector("#" + id);
  const target = $("target");
  const stage = $("stage");
  const stageBox = $("stageBox");
  const cutPreview = $("cutPreview");
  const statusEl = $("status");
  const sel = $("sel");
  const grid = $("grid");
  const fx = $("fx");
  /* 미리보기 출력 캔버스.
     alpha:false = 알파 합성을 건너뛰는 불투명 서피스(GPU 가속에 유리).
     willReadFrequently 를 절대 켜지 말 것 — 켜면 Chrome 이 소프트웨어 캔버스로 내린다. */
  const fxCtx = fx.getContext("2d", { alpha: false });

  /* React 가 같은 DOM 위로 다시 마운트할 수 있다 (StrictMode · 라우팅 복귀).
     아래 컨테이너는 초기화에서 append 로 채우므로 먼저 비워 중복을 막는다.
     sizeList / bgList / inList / spotRows 는 각자의 렌더 함수가 이미 비운다. */
  ["tintModes", "tintSwatches", "fxList", "fxScope", "fxShape"].forEach((id) => {
    const el = $(id);
    if (el) el.innerHTML = "";
  });

  function setStatus(t) {
    statusEl.textContent = t || "";
  }

  function renderChips(root, items, key, onPick) {
    root.innerHTML = "";
    items.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (item.full ? " chip-full" : "") + (state[key] === item.id ? " on" : "");
      b.textContent = item.name;
      b.addEventListener("click", () => {
        state[key] = item.id;
        [...root.children].forEach((c) => c.classList.remove("on"));
        b.classList.add("on");
        onPick(item);
      });
      root.appendChild(b);
    });
  }

  renderChips($("sizeList"), CANVAS_SIZES, "canvasSize", (item) => {
    state.W = item.w;
    state.H = item.h;
    $("canvasW").value = item.w;
    $("canvasH").value = item.h;
    applyCanvasSize();
  });
  renderChips($("bgList"), BACKGROUNDS, "bg", () => {});
  renderChips($("inList"), IN_ANIMS, "inAnim", () => {});

  /* ---------- canvas dimension ---------- */
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  function ratioLabel(w, h) {
    const g = gcd(w, h) || 1;
    let rw = w / g, rh = h / g;
    if (rw > 40 || rh > 40) {
      const r = w / h;
      const known = [[9, 16], [16, 9], [4, 5], [5, 4], [1, 1], [3, 4], [4, 3], [2, 3], [3, 2]];
      let best = known[0], bd = Infinity;
      known.forEach(([a, b]) => {
        const d = Math.abs(a / b - r);
        if (d < bd) { bd = d; best = [a, b]; }
      });
      return `≈ ${best[0]}:${best[1]}`;
    }
    return `${rw}:${rh}`;
  }

  function applyCanvasSize() {
    const W = state.W, H = state.H;
    const k = Math.min(STAGE_MAX_W / W, STAGE_MAX_H / H);
    const sw = Math.round(W * k);
    const sh = Math.round(H * k);
    state.stagePx = sw;
    root.style.setProperty("--stage-w", sw + "px");
    root.style.setProperty("--stage-h", sh + "px");

    $("dimLabel").textContent = `${W} × ${H}`;
    $("dimRatio").textContent = ratioLabel(W, H);
    $("dimNote").textContent =
      `내보내기 ${W}×${H}px · 미리보기 ${sw}×${sh}px (${(k * 100).toFixed(0)}%)`;
    $("caption").textContent = `${W} × ${H} · 드래그 = 이동 · 모서리 = 크기 · 위쪽 = 회전`;

    // 프리셋과 일치하는 칩만 활성화
    const hit = CANVAS_SIZES.find((c) => c.w === W && c.h === H);
    state.canvasSize = hit ? hit.id : "";
    [...$("sizeList").children].forEach((c, i) => {
      c.classList.toggle("on", !!hit && CANVAS_SIZES[i].id === hit.id);
    });

    refreshScaleLimit();
    updateCharPx();
    restTransform();
    sizeFx();
    applyReps();
  }

  function updateCharPx() {
    const char = state.cutCanvas;
    if (!char) {                       // 캐릭터가 없으면 출력 크기도 없다
      $("charPx").value = "–";
      updateSrcNote();
      return;
    }
    const cw = (state.size / 100) * state.W * state.scale;
    const ch = cw * (char.height / char.width);
    $("charPx").value = `${Math.round(cw)} × ${Math.round(ch)} px`;
    updateSrcNote();
  }

  ["canvasW", "canvasH"].forEach((id) => {
    $(id).addEventListener("change", () => {
      const w = Math.max(120, Math.min(4096, Math.round(Number($("canvasW").value) || 720)));
      const h = Math.max(120, Math.min(4096, Math.round(Number($("canvasH").value) || 1280)));
      state.W = w; state.H = h;
      $("canvasW").value = w;
      $("canvasH").value = h;
      applyCanvasSize();
    });
  });

  function placeTarget() {
    target.style.left = state.x + "%";
    target.style.top = state.y + "%";
  }
  placeTarget();

  function cardBox() {
    const rect = stageBox.getBoundingClientRect();
    const w = (state.size / 100) * rect.width;
    return { w, h: w };
  }

  /* 캐릭터는 캔버스에 그리므로 여기서는 선택 UI만 맞춰준다 */
  function restTransform() {
    syncSel();
  }

  $("posX").addEventListener("input", () => setXY(Number($("posX").value), state.y));
  $("posY").addEventListener("input", () => setXY(state.x, Number($("posY").value)));

  $("cardSize").addEventListener("input", () => {
    state.size = Number($("cardSize").value);
    $("sizeVal").textContent = String(state.size);
    refreshScaleLimit();          // 크기를 키우면 배율 상한이 내려간다
    setScale(state.scale);        // 상한을 넘겼다면 즉시 끌어내림
    updateCharPx();
    restTransform();
  });

  ["charScale", "charScaleNum"].forEach((id) => {
    $(id).addEventListener("input", (e) => {
      const v = Number(e.target.value);
      setScale(isFinite(v) ? v : 1);
    });
  });

  /* ---------- direct manipulation (select / move / resize / rotate) ---------- */

  /* 카드의 회전 전 박스를 스테이지 대비 % 로 계산한다.
     스테이지 종횡비 = 캔버스 종횡비 이므로 px 을 거치지 않아도 정확하다. */
  function cardBoxPct() {
    const w = state.size * state.scale;                 // 스테이지 가로 대비 %
    const h = w * heightPerWidth();                     // 스테이지 세로 대비 %
    return { w, h, left: state.x - w / 2, top: state.y - h / 2 };
  }

  function syncSel() {
    if (!state.selected || !state.cutCanvas || state.playing) {
      sel.hidden = true;
      return;
    }
    const b = cardBoxPct();
    sel.hidden = false;
    sel.style.left = b.left + "%";
    sel.style.top = b.top + "%";
    sel.style.width = b.w + "%";
    sel.style.height = b.h + "%";
    sel.style.transform = `rotate(${state.rot}deg)`;    // 핸들도 카드와 같이 돈다
  }

  function setSelected(on) {
    state.selected = !!on && !!state.cutCanvas;
    syncSel();
  }

  /* ---- 회전이 들어가면 % 공간(가로·세로 스케일이 다름)에서는 회전 계산이
         성립하지 않으므로, 조작 계산은 모두 px 로 한다 ---- */
  function pxGeom(rect) {
    const w = ((state.size * state.scale) / 100) * rect.width;
    const h = w * cutAspect();
    const r = (state.rot * Math.PI) / 180;
    return {
      cx: (state.x / 100) * rect.width,
      cy: (state.y / 100) * rect.height,
      w, h,
      ux: Math.cos(r), uy: Math.sin(r),                 // 카드의 가로축
      vx: -Math.sin(r), vy: Math.cos(r),                // 카드의 세로축
    };
  }

  /* 월드 px 점 → 카드 로컬 좌표(중심 기준, 회전 해제) */
  function toLocal(g, px, py) {
    const dx = px - g.cx, dy = py - g.cy;
    return { x: dx * g.ux + dy * g.uy, y: dx * g.vx + dy * g.vy };
  }

  function hitCard(px, py, rect) {
    if (!state.cutCanvas) return false;
    const g = pxGeom(rect);
    const l = toLocal(g, px, py);
    return Math.abs(l.x) <= g.w / 2 && Math.abs(l.y) <= g.h / 2;
  }

  function setXY(x, y) {
    state.x = +Math.max(0, Math.min(100, x)).toFixed(1);
    state.y = +Math.max(0, Math.min(100, y)).toFixed(1);
    $("posX").value = state.x;
    $("posY").value = state.y;
    $("posXVal").textContent = state.x.toFixed(1);
    $("posYVal").textContent = state.y.toFixed(1);
    placeTarget();
    restTransform();
  }

  function setScale(v) {
    const sc = clampScale(v);
    state.scale = sc;
    $("charScale").value = sc;
    $("charScaleNum").value = sc.toFixed(2);
    $("scaleVal").textContent = sc.toFixed(2);
    updateCharPx();
    restTransform();
  }

  function setRot(deg) {
    state.rot = norm180(deg);
    drawDial();
    refreshScaleLimit();      // 기울면 외접 박스가 커지므로 배율 상한이 내려간다
    updateCharPx();
    restTransform();
  }

  let drag = null;

  function pxFromEvent(e, rect) {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function pctOf(rect, q) {
    return { x: (q.x / rect.width) * 100, y: (q.y / rect.height) * 100 };
  }
  /* 12시 방향 0°, 시계방향 + */
  function angleFromCenter(dx, dy) {
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }

  stageBox.addEventListener("pointerdown", (e) => {
    if (state.playing) return;
    const rect = stageBox.getBoundingClientRect();
    const q = pxFromEvent(e, rect);
    const handle = e.target instanceof HTMLElement ? e.target.dataset.h : null;
    const rHandle = e.target instanceof HTMLElement ? e.target.dataset.r : null;

    // ---- 화면 효과 영역 편집 모드 ----
    if (state.regionEdit) {
      const sp = activeSpot();
      if (!sp) return;
      const p0 = pctOf(rect, q);
      if (rHandle) {
        drag = {
          mode: "regionResize", rect, rHandle,
          anchor: {                                   // 잡은 모서리의 반대편을 고정
            x: rHandle.includes("w") ? sp.x + sp.w / 2 : sp.x - sp.w / 2,
            y: rHandle.includes("n") ? sp.y + sp.h / 2 : sp.y - sp.h / 2,
          },
        };
      } else {
        drag = { mode: "regionMove", rect, offX: p0.x - sp.x, offY: p0.y - sp.y };
      }
      stageBox.classList.add("dragging");
      stageBox.setPointerCapture(e.pointerId);
      stageBox.focus();
      e.preventDefault();
      return;
    }

    if (handle === "rot" && state.cutCanvas) {
      drag = { mode: "rotate", rect };
      stageBox.classList.add("rotating");
    } else if (handle && state.cutCanvas) {
      const g = pxGeom(rect);
      const sx = handle.includes("w") ? -1 : 1;
      const sy = handle.includes("n") ? -1 : 1;
      const ax = (-sx * g.w) / 2, ay = (-sy * g.h) / 2;  // 반대편 모서리(로컬)
      drag = {
        mode: "resize", handle, rect, sx, sy,
        anchor: { x: g.cx + ax * g.ux + ay * g.vx, y: g.cy + ax * g.uy + ay * g.vy },
        u: { x: g.ux, y: g.uy }, v: { x: g.vx, y: g.vy },
      };
      stageBox.classList.add("resizing");
    } else if (hitCard(q.x, q.y, rect)) {
      setSelected(true);
      const p = pctOf(rect, q);
      drag = { mode: "move", rect, offX: p.x - state.x, offY: p.y - state.y, moved: false, start: p };
      stageBox.classList.add("dragging");
    } else {
      setSelected(false);   // 빈 곳: 선택 해제 + 그 지점을 종착지로
      drag = { mode: "place", rect, moved: false, start: pctOf(rect, q) };
    }
    stageBox.setPointerCapture(e.pointerId);
    stageBox.focus();
    e.preventDefault();
  });

  stageBox.addEventListener("pointermove", (e) => {
    const rect = drag ? drag.rect : stageBox.getBoundingClientRect();
    const q = pxFromEvent(e, rect);
    const p = pctOf(rect, q);

    if (!drag) {
      stageBox.classList.toggle("over-card", !state.regionEdit && hitCard(q.x, q.y, rect));
      return;
    }

    if (drag.mode === "move") {
      let nx = p.x - drag.offX;
      let ny = p.y - drag.offY;
      if (e.shiftKey) {
        if (Math.abs(p.x - drag.start.x) > Math.abs(p.y - drag.start.y)) ny = state.y;
        else nx = state.x;
      }
      drag.moved = true;
      setXY(nx, ny);
      syncSel();

    } else if (drag.mode === "rotate") {
      const cx = (state.x / 100) * rect.width;
      const cy = (state.y / 100) * rect.height;
      let deg = angleFromCenter(q.x - cx, q.y - cy);
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      setRot(deg);
      syncSel();

    } else if (drag.mode === "resize") {
      // 고정점 기준 로컬 델타 → 비율 고정 크기
      const dx = q.x - drag.anchor.x, dy = q.y - drag.anchor.y;
      const lx = Math.abs(dx * drag.u.x + dy * drag.u.y);
      const ly = Math.abs(dx * drag.v.x + dy * drag.v.y);
      const wPx = Math.max(lx, ly / cutAspect());
      setScale(wPx / ((state.size / 100) * rect.width));

      if (e.shiftKey) { syncSel(); return; }             // Shift: 중심 고정

      // 반대편 모서리를 제자리에 둔 채 중심을 다시 잡는다
      const g = pxGeom(rect);
      const ox = (drag.sx * g.w) / 2, oy = (drag.sy * g.h) / 2;
      const cx = drag.anchor.x + ox * g.ux + oy * g.vx;
      const cy = drag.anchor.y + ox * g.uy + oy * g.vy;
      setXY((cx / rect.width) * 100, (cy / rect.height) * 100);
      syncSel();

    } else if (drag.mode === "regionMove") {
      setRegion("x", p.x - drag.offX);
      setRegion("y", p.y - drag.offY);

    } else if (drag.mode === "regionResize") {
      setRegion("w", Math.abs(p.x - drag.anchor.x));
      setRegion("h", Math.abs(p.y - drag.anchor.y));
      const sp = activeSpot();
      if (sp) {
        setRegion("x", drag.anchor.x + (drag.rHandle.includes("w") ? -sp.w / 2 : sp.w / 2));
        setRegion("y", drag.anchor.y + (drag.rHandle.includes("n") ? -sp.h / 2 : sp.h / 2));
      }

    } else if (drag.mode === "place") {
      drag.moved = true;
      setXY(p.x, p.y);
    }
  });

  function endDrag(e) {
    if (!drag) return;
    if (drag.mode === "place" && !drag.moved) setXY(drag.start.x, drag.start.y);
    drag = null;
    stageBox.classList.remove("dragging", "resizing", "rotating");
    if (e) stageBox.releasePointerCapture(e.pointerId);
    syncSel();
  }
  stageBox.addEventListener("pointerup", endDrag);
  stageBox.addEventListener("pointercancel", endDrag);
  stageBox.addEventListener("pointerleave", () => stageBox.classList.remove("over-card"));

  /* 키보드: 이동 / 크기 / 회전 / 선택 해제 */
  stageBox.setAttribute("tabindex", "0");
  stageBox.addEventListener("keydown", (e) => {
    if (!state.selected || state.playing) return;
    const step = e.shiftKey ? 5 : 0.5;
    const k = e.key;
    if (k === "ArrowLeft") setXY(state.x - step, state.y);
    else if (k === "ArrowRight") setXY(state.x + step, state.y);
    else if (k === "ArrowUp") setXY(state.x, state.y - step);
    else if (k === "ArrowDown") setXY(state.x, state.y + step);
    else if (k === "+" || k === "=") setScale(state.scale + (e.shiftKey ? 0.2 : 0.05));
    else if (k === "-" || k === "_") setScale(state.scale - (e.shiftKey ? 0.2 : 0.05));
    else if (k === "," || k === "<") setRot(state.rot - (e.shiftKey ? 15 : 1));
    else if (k === "." || k === ">") setRot(state.rot + (e.shiftKey ? 15 : 1));
    else if (k === "Escape") setSelected(false);
    else return;
    syncSel();
    e.preventDefault();
  });

  /* ---------- background tint (미리보기 = mix-blend-mode:screen, 녹화 = 동일 합성) ---------- */
  function applyTint() {
    // 색조는 paintBg() 안에서 합성되므로 미리보기·내보내기가 자동으로 같다
    $("tintVal").textContent = String(state.tint);
    $("bgColor").value = state.tintColor;
    $("bgTintAmt").value = state.tint;
    const m = TINT_MODES.find((x) => x.id === state.tintMode);
    $("tintHint").textContent = m ? m.hint : "";
    [...$("tintModes").children].forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.mode === state.tintMode);
    });
  }

  TINT_MODES.forEach((m) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.mode = m.id;
    b.textContent = m.name;
    b.addEventListener("click", () => {
      state.tintMode = m.id;
      if (state.tint === 0) state.tint = 45;
      applyTint();
    });
    $("tintModes").appendChild(b);
  });

  $("bgColor").addEventListener("input", () => {
    state.tintColor = $("bgColor").value;
    // 색만 고르고 강도가 0이면 아무 변화가 없으니 최소 강도를 켜 준다
    if (state.tint === 0) state.tint = 35;
    applyTint();
  });
  $("bgTintAmt").addEventListener("input", () => {
    state.tint = Number($("bgTintAmt").value);
    applyTint();
  });
  $("bgTintReset").addEventListener("click", () => {
    state.tint = 0;
    applyTint();
  });

  TINT_PRESETS.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.style.background = c;
    b.title = c;
    b.addEventListener("click", () => {
      state.tintColor = c;
      if (state.tint === 0) state.tint = 35;
      applyTint();
    });
    $("tintSwatches").appendChild(b);
  });

  /* ---------- background image ---------- */
  function syncBgImage() {
    const has = !!state.bgImage;
    $("bgThumb").hidden = !has;
    $("bgImgClear").hidden = !has;
    $("animMixRow").hidden = !has;
    $("bgImgHint").textContent = has
      ? "캔버스를 꽉 채웁니다(cover). 애니메이션은 screen 으로 그 위에 얹힙니다."
      : "캔버스를 꽉 채우고(cover), 그 위에서 배경 애니메이션이 돕니다.";

    if (has) {
      const c = $("bgThumb");
      const cx = c.getContext("2d");
      cx.clearRect(0, 0, c.width, c.height);
      drawCover(cx, state.bgImage, c.width, c.height);
    }
  }

  $("bgFile").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
      state.bgImage = img;
      syncBgImage();
    } catch (err) {
      setStatus("배경 이미지를 읽지 못했습니다.");
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  $("bgImgClear").addEventListener("click", () => {
    state.bgImage = null;
    $("bgFile").value = "";
    syncBgImage();
  });

  $("animMix").addEventListener("input", () => {
    state.animMix = Number($("animMix").value);
    $("animMixVal").textContent = String(state.animMix);
  });

  /* ---------- background repeat count ---------- */
  function totalSec() {
    const v = Number($("dur").value);
    return v > 0 ? v : 4;
  }

  /* 경과초 -> 루프 위상. 미리보기와 내보내기가 같은 식을 쓴다. */
  function bgPhase(sec) {
    return (sec / totalSec()) * state.bgReps;
  }

  function applyReps() {
    $("bgReps").value = state.bgReps;
    $("repsVal").textContent = String(state.bgReps);
    const per = totalSec() / state.bgReps;
    $("repsHint").textContent = `1바퀴 ${per.toFixed(2)}초`;
  }
  $("bgReps").addEventListener("input", () => {
    state.bgReps = Number($("bgReps").value);
    applyReps();
  });
  $("dur").addEventListener("input", applyReps);

  /* ---------- 미리보기 배경: 내보내기와 완전히 같은 페인터로 #fx 에 그린다 ---------- */
  function sizeFx() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round((state.stagePx || 360) * dpr));
    const h = Math.max(1, Math.round(w * (state.H / state.W)));
    if (fx.width !== w || fx.height !== h) {
      fx.width = w;
      fx.height = h;
    }
  }

  let bgT0 = performance.now();
  function resetBgClock() {
    bgT0 = performance.now();
  }

  let playT0 = null;          // null 이면 정지 상태(종착 포즈)

  /* 배경 → 캐릭터 → 화면효과. 내보내기와 완전히 같은 순서로 매 프레임 그린다. */
  function previewFrame(now) {
    if (disposed) return;
    if (state.recording) {          // 녹화 중에는 미리보기를 그리지 않는다 (프레임률 확보)
      rafLoop(previewFrame);
      return;
    }
    sizeFx();
    const W = fx.width, H = fx.height;
    const total = totalSec();
    const sec = ((now - bgT0) / 1000) % total;
    const phase = bgPhase(sec);

    paintBg(fxCtx, state.bg, phase, W, H);

    let pose;
    if (playT0 !== null) {
      const el = (now - playT0) / 1000;
      pose = poseAt(clamp01(el / (Number($("inDur").value) || 1)), state.inAnim);
      if (el >= total) {
        playT0 = null;
        state.playing = false;
        syncSel();
        syncGrid();
        syncRegion();
        setStatus("");
      }
    } else {
      pose = poseAt(1, state.inAnim);        // 종착 포즈
    }
    drawCharacter(fxCtx, pose, W, H);
    applyEffects(fxCtx, W, H, phase);

    rafLoop(previewFrame);
  }
  rafLoop(previewFrame);

  /* ---------- grid overlay (10% 간격, 미리보기 전용 가이드) ---------- */
  function syncGrid() {
    grid.hidden = !state.grid || state.playing;
    $("gridBtn").setAttribute("aria-pressed", String(state.grid));
  }
  $("gridBtn").addEventListener("click", () => {
    state.grid = !state.grid;
    syncGrid();
  });

  /* ---------- rotation dial (두께 있는 링 + 가운데 각도) ---------- */
  const dial = $("dial");
  const DIAL_C = 60, DIAL_R = 46;

  function polarPt(deg, r) {
    const a = ((deg - 90) * Math.PI) / 180;
    return [DIAL_C + r * Math.cos(a), DIAL_C + r * Math.sin(a)];
  }

  function drawDial() {
    const deg = state.rot;
    const [kx, ky] = polarPt(deg, DIAL_R);
    $("dialKnob").setAttribute("cx", kx.toFixed(2));
    $("dialKnob").setAttribute("cy", ky.toFixed(2));
    $("dialText").textContent = `${deg > 0 ? "+" : ""}${deg.toFixed(0)}°`;
    dial.setAttribute("aria-valuenow", deg.toFixed(0));

    if (Math.abs(deg) < 0.5) {
      $("dialArc").setAttribute("d", "");
      return;
    }
    const [x0, y0] = polarPt(0, DIAL_R);
    const [x1, y1] = polarPt(deg, DIAL_R);
    const large = Math.abs(deg) > 180 ? 1 : 0;
    const sweep = deg > 0 ? 1 : 0;
    $("dialArc").setAttribute("d", `M ${x0} ${y0} A ${DIAL_R} ${DIAL_R} 0 ${large} ${sweep} ${x1} ${y1}`);
  }

  let dialDrag = false;
  function dialAngle(e) {
    const r = dial.getBoundingClientRect();
    return angleFromCenter(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
  }
  function dialSet(e) {
    let d = dialAngle(e);
    if (e.shiftKey) d = Math.round(d / 15) * 15;
    setRot(d);
    syncSel();
  }
  dial.addEventListener("pointerdown", (e) => {
    dialDrag = true;
    dial.classList.add("grabbing");
    dial.setPointerCapture(e.pointerId);
    dialSet(e);
    e.preventDefault();
  });
  dial.addEventListener("pointermove", (e) => { if (dialDrag) dialSet(e); });
  ["pointerup", "pointercancel"].forEach((t) =>
    dial.addEventListener(t, (e) => {
      dialDrag = false;
      dial.classList.remove("grabbing");
      try { dial.releasePointerCapture(e.pointerId); } catch (_) {}
    })
  );
  dial.addEventListener("dblclick", () => { setRot(0); syncSel(); });

  $("rotL").addEventListener("click", () => { setRot(state.rot - 90); syncSel(); });
  $("rotR").addEventListener("click", () => { setRot(state.rot + 90); syncSel(); });
  $("rot0").addEventListener("click", () => { setRot(0); syncSel(); });

  /* ---------- background removal ---------- */
  function colorDist(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function sampleCorners(data, w, h) {
    const pts = [
      [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3],
      [w >> 1, 2], [w >> 1, h - 3], [2, h >> 1], [w - 3, h >> 1],
    ];
    let r = 0, g = 0, b = 0;
    pts.forEach(([x, y]) => {
      const i = (y * w + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    });
    return [r / pts.length, g / pts.length, b / pts.length];
  }

  const HARD_MAX_SIDE = 4096;

  function removeBackground(img, threshold, useFlood, useFeather, maxSide) {
    const c = document.createElement("canvas");
    const cap = state.keepOriginal
      ? Math.min(HARD_MAX_SIDE, Math.max(img.width, img.height))
      : Math.max(64, Math.min(HARD_MAX_SIDE, maxSide || 1024));
    // 원본보다 크게 늘리지 않음 (업스케일은 화질 이득이 없음)
    const scale = Math.min(1, cap / Math.max(img.width, img.height));
    c.width = Math.max(2, Math.round(img.width * scale));
    c.height = Math.max(2, Math.round(img.height * scale));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const image = ctx.getImageData(0, 0, c.width, c.height);
    const d = image.data;
    const w = c.width, h = c.height;
    const [br, bg, bb] = sampleCorners(d, w, h);
    const thr = threshold * 2.2;
    const keep = new Uint8Array(w * h);
    keep.fill(1);

    if (useFlood) {
      keep.fill(0);
      const q = [];
      const push = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const idx = y * w + x;
        if (keep[idx] === 2) return;
        const i = idx * 4;
        if (colorDist(d[i], d[i + 1], d[i + 2], br, bg, bb) <= thr) {
          keep[idx] = 2;
          q.push(idx);
        } else {
          keep[idx] = 1;
        }
      };
      for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
      for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
      for (let n = 0; n < q.length; n++) {
        const idx = q[n];
        const x = idx % w, y = (idx / w) | 0;
        push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
      }
      for (let i = 0; i < keep.length; i++) if (keep[i] === 2) keep[i] = 0;
      else keep[i] = 1;
    } else {
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        keep[p] = colorDist(d[i], d[i + 1], d[i + 2], br, bg, bb) > thr ? 1 : 0;
      }
    }

    for (let p = 0, i = 0; p < keep.length; p++, i += 4) {
      if (!keep[p]) d[i + 3] = 0;
    }

    if (useFeather) {
      const copy = new Uint8ClampedArray(d);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (copy[p * 4 + 3] === 0) continue;
          let empty = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              if (copy[((y + oy) * w + (x + ox)) * 4 + 3] === 0) empty++;
            }
          }
          if (empty) d[p * 4 + 3] = Math.max(0, 255 - empty * 28);
        }
      }
    }

    ctx.putImageData(image, 0, 0);
    return c;
  }

  function showCut(c) {
    const ctx = cutPreview.getContext("2d");
    ctx.clearRect(0, 0, 160, 160);
    const s = Math.min(160 / c.width, 160 / c.height);
    const dw = c.width * s, dh = c.height * s;
    ctx.drawImage(c, (160 - dw) / 2, (160 - dh) / 2, dw, dh);
    state.cutCanvas = c;
    refreshScaleLimit();          // 새 이미지의 종횡비로 상한 재계산
    updateCharPx();
    updateSrcNote();
    setSelected(true);
    restTransform();
  }

  async function processFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    setStatus("이미지 처리 중…");
    await img.decode();
    // 고해상도 처리는 수 초 걸릴 수 있으므로 상태 표시를 먼저 그린다
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    URL.revokeObjectURL(url);
    state.srcW = img.naturalWidth || img.width;
    state.srcH = img.naturalHeight || img.height;
    const c = removeBackground(
      img,
      Number($("threshold").value),
      $("edgeFlood").checked,
      $("feather").checked,
      state.maxSide
    );
    showCut(c);
    setStatus("");
  }

  /* 처리 해상도 vs 실제 출력 크기 비교 안내 */
  function updateSrcNote() {
    const note = $("srcNote");
    const c = state.cutCanvas;
    if (!c) {
      note.textContent = "이미지를 선택하면 원본/처리 해상도가 표시됩니다.";
      note.classList.remove("warn");
      return;
    }
    const outW = (state.size / 100) * state.W * state.scale;
    const ratio = outW / c.width;
    let msg = `원본 ${state.srcW}×${state.srcH} → 처리 ${c.width}×${c.height} · 출력 폭 ${Math.round(outW)}px`;
    if (ratio > 1.05) {
      msg += ` · ${ratio.toFixed(2)}배 확대됨 — 처리 해상도를 높이세요`;
      note.classList.add("warn");
    } else {
      note.classList.remove("warn");
    }
    note.textContent = msg;
  }

  $("file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) processFile(f);
  });

  ["threshold", "edgeFlood", "feather"].forEach((id) => {
    $(id).addEventListener("input", () => {
      $("thrVal").textContent = $("threshold").value;
    });
  });
  $("threshold").addEventListener("change", () => {
    if ($("file").files[0]) processFile($("file").files[0]);
  });
  ["edgeFlood", "feather"].forEach((id) => {
    $(id).addEventListener("change", () => {
      if ($("file").files[0]) processFile($("file").files[0]);
    });
  });

  /* ---------- source image resolution ---------- */
  function syncMaxSideUI(v) {
    state.maxSide = v;
    $("maxSide").value = v;
    $("maxSideNum").value = v;
    $("maxSideVal").textContent = String(v);
    const off = state.keepOriginal;
    $("maxSide").disabled = off;
    $("maxSideNum").disabled = off;
    $("maxSideVal").textContent = off ? "원본" : String(v);
  }

  ["maxSide", "maxSideNum"].forEach((id) => {
    $(id).addEventListener("input", (e) => {
      let v = Math.round(Number(e.target.value));
      if (!isFinite(v)) v = 1024;
      v = Math.max(256, Math.min(2048, v));
      syncMaxSideUI(v);
    });
    $(id).addEventListener("change", () => {
      if ($("file").files[0]) processFile($("file").files[0]);
    });
  });

  $("keepOriginal").addEventListener("change", () => {
    state.keepOriginal = $("keepOriginal").checked;
    syncMaxSideUI(state.maxSide);
    if ($("file").files[0]) processFile($("file").files[0]);
  });

  /* ---------- motion ---------- */
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }
  function easeOutBounce(t) {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }

  function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  function poseAt(p, anim) {
    // rx/skew/blur 는 새 애니메이션용. blur 는 카드 폭에 대한 비율.
    const o = { x: state.x, y: state.y, s: 1, rot: state.rot, ry: 0, rx: 0, skew: 0, blur: 0, opacity: 1 };
    switch (anim) {
      case "fadeScale":
        o.opacity = p;
        o.s = 0.62 + 0.38 * easeOutCubic(p);
        break;
      case "fromBottom":
        o.y = state.y + (118 - state.y) * (1 - easeOutCubic(p));
        o.opacity = clamp01(p * 1.4);
        break;
      case "fromLeft":
        o.x = state.x + (-20 - state.x) * (1 - easeOutCubic(p));
        o.opacity = clamp01(p * 1.4);
        break;
      case "fromRight":
        o.x = state.x + (120 - state.x) * (1 - easeOutCubic(p));
        o.opacity = clamp01(p * 1.4);
        break;
      case "fromTop":
        o.y = state.y + (-18 - state.y) * (1 - easeOutBounce(p));
        o.opacity = clamp01(p * 1.6);
        break;
      case "pop":
        o.s = 0.2 + 0.8 * easeOutBack(p);
        o.opacity = clamp01(p * 2);
        break;
      case "spin":
        o.rot = state.rot + (1 - easeOutCubic(p)) * -280;
        o.s = 0.5 + 0.5 * easeOutCubic(p);
        o.opacity = clamp01(p * 1.5);
        break;
      case "flip":
        o.ry = (1 - easeOutCubic(p)) * -90;
        o.opacity = clamp01(0.2 + p);
        break;
      case "zoomFar":
        o.s = 2.1 - 1.1 * easeOutCubic(p);
        o.opacity = clamp01(p * 1.3);
        break;
      case "backIn": {                       // 뒤로 물러난 채 올라와서 마지막에 커짐
        const a = clamp01(p / 0.72);
        const b = clamp01((p - 0.72) / 0.28);
        o.y = state.y + (125 - state.y) * (1 - easeOutCubic(a));
        o.s = 0.68 + 0.32 * easeOutCubic(b);
        o.opacity = clamp01(p * 3);
        break;
      }
      case "bounceUp":
        o.y = state.y + (118 - state.y) * (1 - easeOutBounce(p));
        o.opacity = clamp01(p * 2.4);
        break;
      case "lightSpeed":                     // 기울어진 채 오른쪽에서 쏘듯이
        o.x = state.x + (138 - state.x) * (1 - easeOutCubic(p));
        o.skew = -34 * (1 - easeOutCubic(p));
        o.opacity = clamp01(p * 2);
        break;
      case "rollIn": {                       // 왼쪽에서 굴러 들어옴
        const e = easeOutCubic(p);
        o.x = state.x + (-25 - state.x) * (1 - e);
        o.rot = state.rot + (1 - e) * -240;
        o.opacity = clamp01(p * 1.6);
        break;
      }
      case "blurIn":
        o.blur = 0.1 * (1 - easeOutCubic(p));
        o.s = 1.14 - 0.14 * easeOutCubic(p);
        o.opacity = clamp01(p * 1.5);
        break;
      case "swingIn": {                      // 위에서 진자처럼 흔들리며
        const e = easeOutCubic(p);
        o.y = state.y + (-14 - state.y) * (1 - e);
        o.rot = state.rot + Math.sin(p * Math.PI * 2.6) * 26 * (1 - p);
        o.opacity = clamp01(p * 2);
        break;
      }
      case "jackBox":                        // 작게 튀어나오며 좌우로 흔들림
        o.s = 0.1 + 0.9 * easeOutBack(p);
        o.rot = state.rot + (1 - easeOutCubic(p)) * 30 * Math.cos(p * Math.PI * 3);
        o.opacity = clamp01(p * 2.5);
        break;
      case "slitIn":                         // 가로 슬릿이 열리듯 (rotateX)
        o.rx = (1 - easeOutCubic(p)) * 88;
        o.s = 0.9 + 0.1 * easeOutCubic(p);
        o.opacity = clamp01(p * 2);
        break;
      case "diagonal": {                     // 좌상단 대각선에서
        const e = easeOutCubic(p);
        o.x = state.x + (-18 - state.x) * (1 - e);
        o.y = state.y + (-14 - state.y) * (1 - e);
        o.s = 0.7 + 0.3 * e;
        o.opacity = clamp01(p * 1.6);
        break;
      }
      case "spiralIn": {                     // 멀리서 회전하며 다가옴
        const e = easeOutCubic(p);
        o.s = 0.08 + 0.92 * e;
        o.rot = state.rot + (1 - e) * 540;
        o.opacity = clamp01(p * 2);
        break;
      }
      case "elastic":
        o.s = easeOutElastic(p);
        o.opacity = clamp01(p * 4);
        break;
    }
    return o;
  }

  /* 캐릭터 한 장을 캔버스에 그린다. 미리보기와 내보내기가 이 함수를 공유한다. */
  function drawCharacter(ctx, o, W, H) {
    const char = state.cutCanvas;
    if (!char) return;
    const cw = (state.size / 100) * W * state.scale;
    const ch = cw * (char.height / char.width);
    ctx.save();
    ctx.translate((o.x / 100) * W, (o.y / 100) * H);
    if (o.skew) ctx.transform(1, 0, Math.tan((o.skew * Math.PI) / 180), 1, 0, 0);
    ctx.rotate((o.rot * Math.PI) / 180);
    if (o.ry) ctx.scale(Math.cos((o.ry * Math.PI) / 180), 1);
    if (o.rx) ctx.scale(1, Math.cos((o.rx * Math.PI) / 180));
    ctx.scale(o.s, o.s);
    ctx.globalAlpha = o.opacity;
    if (o.blur) ctx.filter = `blur(${(o.blur * cw).toFixed(2)}px)`;
    ctx.drawImage(char, -cw / 2, -ch / 2, cw, ch);
    ctx.filter = "none";
    ctx.restore();
  }

  function playPreview() {
    // 캐릭터가 없으면 배경 + 화면 효과만 재생한다
    playT0 = performance.now();
    resetBgClock();            // 배경과 캐릭터가 같은 순간에 출발하도록
    state.playing = true;
    syncSel();
    syncGrid();
    syncRegion();
    setStatus(state.cutCanvas ? "미리보기 재생 중" : "미리보기 재생 중 — 캐릭터 없이 배경만");
  }

  $("play").addEventListener("click", playPreview);

  /* ---------- canvas backgrounds — 미리보기와 내보내기가 같은 코드로 그린다 ----------

     t 는 "루프 위상"이다. t=0 → 1 이 애니메이션 한 바퀴.
     전체 n초 동안 reps 번 반복하려면 t = (경과초 / 전체초) * reps 를 넘긴다.
     그래서 모든 배경은 t 에 대해 주기 1 로 정확히 반복되어야 한다:
       - 삼각함수는 Math.sin(t * TAU * 정수)
       - 스크롤·낙하는 (t * 정수 + offset) % 1
     ------------------------------------------------------------------------ */

  const TAU = Math.PI * 2;

  /* 프레임마다 같은 값이 나오도록 인덱스 기반 의사난수를 쓴다 */
  function rnd(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  const MATRIX_CHARS = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎABCDEFXYZ#$%&*+=<>";

  /* 0..1 로 감싼 위상 */
  function wrap(t) {
    return t - Math.floor(t);
  }

  /* 애니메이션을 이미지 위에 얹을 때 쓰는 재사용 오프스크린 레이어 */
  let _animLayer = null, _animLayerCtx = null;
  function animLayer(w, h) {
    if (!_animLayer) {
      _animLayer = document.createElement("canvas");
      _animLayerCtx = _animLayer.getContext("2d", { alpha: false });
    }
    if (_animLayer.width !== w || _animLayer.height !== h) {
      _animLayer.width = w;
      _animLayer.height = h;
    }
    return _animLayer;
  }

  /* 비율 유지하며 캔버스를 꽉 채우고 넘치는 부분은 잘라낸다 (CSS background-size: cover) */
  function drawCover(ctx, img, w, h) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const sc = Math.max(w / iw, h / ih);
    const dw = iw * sc, dh = ih * sc;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function paintBg(ctx, id, t, w, h) {
    const img = state.bgImage;
    const hasAnim = id !== "none";

    if (img) {
      ctx.clearRect(0, 0, w, h);
      drawCover(ctx, img, w, h);
      if (hasAnim && state.animMix > 0) {
        // 애니메이션을 따로 그린 뒤 screen 으로 얹는다.
        // 배경 애니메이션들은 어두운 바탕 위의 빛 효과라, screen 이면
        // 검은 바탕은 사라지고 빛나는 요소만 사진 위에 남는다.
        const lc = animLayer(w, h);
        paintBgBase(_animLayerCtx, id, t, w, h);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = state.animMix / 100;
        ctx.drawImage(lc, 0, 0);
        ctx.restore();
      }
    } else if (hasAnim) {
      paintBgBase(ctx, id, t, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0b0c10";      // 이미지도 애니메이션도 없을 때의 바탕
      ctx.fillRect(0, 0, w, h);
    }

    if (state.tint > 0) {
      ctx.save();
      ctx.globalCompositeOperation = state.tintMode;  // CSS 의 mix-blend-mode 와 같은 이름
      ctx.globalAlpha = state.tint / 100;             // CSS 의 opacity 와 동일
      ctx.fillStyle = state.tintColor;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  function paintBgBase(ctx, id, t, w, h) {
    const u = wrap(t);
    const a = t * TAU;                                 // 주기 1 인 각도
    const g = (x0, y0, x1, y1, stops) => {
      const grd = ctx.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([p, c]) => grd.addColorStop(p, c));
      return grd;
    };
    ctx.clearRect(0, 0, w, h);

    if (id === "sunset") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#1b1140"], [0.42, "#c14b3a"], [0.68, "#f0a05a"], [1, "#2a1830"]]);
      ctx.fillRect(0, 0, w, h);
      const pulse = 1 + Math.sin(a) * 0.16;
      const cy = h * (0.28 - Math.sin(a) * 0.05);
      const rg = ctx.createRadialGradient(w * 0.38, cy, 0, w * 0.38, cy, w * 0.3 * pulse);
      rg.addColorStop(0, "#ffe7a8");
      rg.addColorStop(0.45, "#ff9a4a");
      rg.addColorStop(1, "rgba(255,154,74,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (id === "aurora") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#06101c"], [0.4, "#112233"], [0.7, "#1b3a4a"], [1, "#0b1a16"]]);
      ctx.fillRect(0, 0, w, h);
      const blobs = [
        [0.3 + Math.sin(a) * 0.22, 0.38 + Math.cos(a) * 0.1, "rgba(80,255,200,.34)"],
        [0.7 + Math.cos(a) * 0.22, 0.3 + Math.sin(a * 2) * 0.12, "rgba(120,80,255,.38)"],
        [0.5 + Math.sin(a * 2) * 0.18, 0.68 + Math.sin(a) * 0.14, "rgba(255,120,180,.24)"],
      ];
      blobs.forEach(([x, y, c]) => {
        const rg = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, w * 0.45);
        rg.addColorStop(0, c);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, w, h);
      });
      return;
    }

    if (id === "mesh") {
      ctx.fillStyle = "#10121a";
      ctx.fillRect(0, 0, w, h);
      const ox = 0.5 + Math.sin(a) * 0.34;
      const oy = 0.5 + Math.cos(a) * 0.32;
      let rg = ctx.createRadialGradient(w * ox, h * (0.25 + Math.sin(a * 2) * 0.12), 0, w * ox, h * 0.25, w);
      rg.addColorStop(0, "rgba(124,92,255,.45)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      rg = ctx.createRadialGradient(w * (1 - ox), h * oy, 0, w * (1 - ox), h * oy, w);
      rg.addColorStop(0, "rgba(62,224,197,.32)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      return;
    }

    if (id === "bokeh") {
      ctx.fillStyle = g(0, h, 0, 0, [[0, "#2a1848"], [1, "#07070c"]]);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {
        const x = rnd(i) * w;
        const y = (wrap(rnd(i + 30) - t) * 1.25 - 0.12) * h;   // 위로 흘러 올라감
        const r = (8 + rnd(i + 60) * 26) * (w / 360);
        ctx.fillStyle = `hsla(${(200 + i * 27) % 360},70%,80%,${(0.1 + rnd(i + 90) * 0.16).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      return;
    }

    if (id === "neon") {
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, w, h);
      const cell = w / 14;
      ctx.lineWidth = Math.max(1, w / 600);
      ctx.strokeStyle = "rgba(0,255,220,.22)";
      const vx = u * cell;
      for (let x = -cell + vx; x < w + cell; x += cell) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(124,92,255,.3)";
      const vy = wrap(t * 2) * cell;
      for (let y = -cell + vy; y < h + cell; y += cell) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      return;
    }

    if (id === "wave") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#07131f"], [0.5, "#0d2a36"], [1, "#071018"]]);
      ctx.fillRect(0, 0, w, h);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        const amp = h * (0.05 - k * 0.012);
        const base = h * (0.66 + k * 0.09);
        for (let x = 0; x <= w; x += w / 40) {
          const y = base + Math.sin((x / w) * TAU * (2 + k) + a * (k + 1)) * amp;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.closePath();
        ctx.fillStyle = `rgba(80,200,255,${0.16 - k * 0.04})`;
        ctx.fill();
      }
      const rg = ctx.createRadialGradient(w / 2, h * 0.72, 0, w / 2, h * 0.72, w);
      rg.addColorStop(0, "rgba(80,200,255,.18)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      return;
    }

    if (id === "spotlight") {
      ctx.fillStyle = "#09090d";
      ctx.fillRect(0, 0, w, h);
      const R = Math.hypot(w, h) * 1.25;
      ctx.save();
      ctx.translate(w / 2, h * 0.3);
      ctx.rotate(a);
      const gg = ctx.createLinearGradient(0, 0, 0, R);
      gg.addColorStop(0, "rgba(255,255,255,.18)");
      gg.addColorStop(1, "transparent");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, Math.PI / 2 - 0.63, Math.PI / 2 + 0.63);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const rg = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.55);
      rg.addColorStop(0, "rgba(255,240,200,.22)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (id === "bloom") {
      ctx.fillStyle = "#140e1c";
      ctx.fillRect(0, 0, w, h);
      [["#7c5cff", 0.2 + Math.sin(a) * 0.2, 0.25 + Math.cos(a) * 0.16],
       ["#ff5d8f", 0.75 - Math.sin(a) * 0.2, 0.78 - Math.cos(a) * 0.16]].forEach(([c, x, y]) => {
        const rg = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, w * 0.6);
        rg.addColorStop(0, c);
        rg.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      });
      return;
    }

    if (id === "dusk") {
      const k = 0.5 + 0.5 * Math.sin(a);
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#1a2744"], [0.35 + k * 0.1, "#4a3a52"], [0.68 + k * 0.06, "#c9846a"], [1, "#1c1218"]]);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = `rgba(255,190,140,${(0.04 + 0.2 * k).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    if (id === "pulse") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#1c2440"], [1, "#07080d"]]);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {
        const k = wrap(t + i / 4);
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.42, k * w * 0.7, 0, TAU);
        ctx.strokeStyle = `rgba(124,92,255,${(0.42 * (1 - k)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, w * 0.03 * (1 - k));
        ctx.stroke();
      }
      return;
    }

    if (id === "shine") {
      ctx.fillStyle = g(0, 0, w, h, [[0, "#1a1030"], [0.4, "#0c0d14"], [1, "#15202b"]]);
      ctx.fillRect(0, 0, w, h);
      const x = u * 1.9 - 0.45;
      const grd = ctx.createLinearGradient(w * x, 0, w * (x + 0.35), h);
      grd.addColorStop(0, "transparent");
      grd.addColorStop(0.5, "rgba(255,255,255,.22)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
      return;
    }

    if (id === "star") {
      ctx.fillStyle = "#05060b";
      ctx.fillRect(0, 0, w, h);
      // 깊이 3층: 층마다 반짝임 속도와 크기가 달라 하늘이 살아 있게 보인다
      for (let layer = 0; layer < 3; layer++) {
        const n = 70 - layer * 14;
        const sz = (1.2 + layer * 1.1) * (w / 360);
        for (let i = 0; i < n; i++) {
          const k = i + layer * 500;
          const x = rnd(k) * w;
          const y = rnd(k + 77) * h;
          // 완전히 꺼졌다 켜지는 반짝임 (정수 배수라 루프마다 맞물림)
          const tw = Math.pow(0.5 + 0.5 * Math.sin(a * (1 + (i % 4)) + k), 2);
          ctx.fillStyle = `rgba(${220 + ((k % 3) * 12)},${235 + (k % 2) * 10},255,${tw.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, sz * (0.45 + tw * 0.75), 0, TAU);
          ctx.fill();
        }
      }
      // 루프마다 유성 3개가 시차를 두고 지나간다
      for (let m = 0; m < 3; m++) {
        const q = wrap(t + m / 3);
        if (q > 0.4) continue;
        const e = q / 0.4;
        const sx = w * (rnd(m + 11) * 0.5 - 0.05), sy = h * (rnd(m + 22) * 0.5);
        const mx = sx + e * w * 0.95, my = sy + e * h * 0.5;
        const tail = 0.16;
        const mg = ctx.createLinearGradient(mx, my, mx - w * tail, my - h * tail * 0.52);
        mg.addColorStop(0, `rgba(255,255,255,${(0.95 * Math.sin(e * Math.PI)).toFixed(3)})`);
        mg.addColorStop(1, "transparent");
        ctx.strokeStyle = mg;
        ctx.lineWidth = Math.max(1.5, w / 260);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - w * tail, my - h * tail * 0.52);
        ctx.stroke();
      }
      return;
    }

    if (id === "rain") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#070d18"], [0.5, "#0c1626"], [1, "#050810"]]);
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(150,205,255,.9)";
      ctx.lineWidth = Math.max(1, w / 500);
      const len = h * 0.05;
      for (let i = 0; i < 110; i++) {
        const x = rnd(i) * w;
        const sp = 4 + ((i * 7) % 3);                    // 정수 = 루프마다 정확히 맞물림
        const y = (wrap(t * sp + rnd(i + 90)) * 1.15 - 0.1) * h;
        ctx.globalAlpha = 0.18 + rnd(i + 7) * 0.45;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w * 0.012, y + len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (id === "snow") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#0c1626"], [0.6, "#16233a"], [1, "#070b14"]]);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (let i = 0; i < 130; i++) {
        const sp = 1 + ((i * 5) % 3);
        const y = (wrap(t * sp + rnd(i + 11)) * 1.1 - 0.05) * h;
        const x = (rnd(i + 33) + Math.sin(a * (1 + (i % 2)) + i) * 0.05) * w;
        const r = (1.3 + rnd(i + 55) * 3.2) * (w / 360);
        ctx.globalAlpha = 0.3 + rnd(i + 3) * 0.55;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (id === "matrix") {
      ctx.fillStyle = "#01060a";
      ctx.fillRect(0, 0, w, h);
      const cols = 22, colw = w / cols, fs = colw * 0.92;
      ctx.font = `${fs.toFixed(1)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      const mutate = Math.floor(u * 20);
      for (let c = 0; c < cols; c++) {
        const sp = 2 + ((c * 3) % 3);
        const head = wrap(t * sp + rnd(c + 20)) * 1.35 * h;
        for (let k = 0; k < 14; k++) {
          const y = head - k * fs * 1.15;
          if (y < -fs || y > h + fs) continue;
          const ch = MATRIX_CHARS[(c * 31 + k * 7 + mutate) % MATRIX_CHARS.length];
          ctx.fillStyle = k === 0 ? "#d9ffe9" : `rgba(0,255,140,${(0.6 * (1 - k / 14)).toFixed(3)})`;
          ctx.fillText(ch, c * colw + colw / 2, y);
        }
      }
      ctx.textAlign = "start";
      return;
    }

    if (id === "grid3d") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#160c2e"], [0.45, "#3a1250"], [0.58, "#12061e"], [1, "#05020a"]]);
      ctx.fillRect(0, 0, w, h);
      const hz = h * 0.52, sunR = w * 0.22, sunY = hz - w * 0.09;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, sunY, sunR, 0, TAU);
      ctx.clip();
      const sg = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sg.addColorStop(0, "#ffd36e");
      sg.addColorStop(0.55, "#ff5f9e");
      sg.addColorStop(1, "#c02d8a");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(20,6,30,.85)";
      const slit = w * 0.036;
      for (let i = -1; i < 9; i++) {
        ctx.fillRect(0, sunY - sunR * 0.2 + i * slit + wrap(t * 2) * slit, w, slit * 0.38);
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(0,240,255,.42)";
      ctx.lineWidth = Math.max(1, w / 520);
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * w * 0.045, hz);
        ctx.lineTo(w / 2 + i * w * 0.9, h);
        ctx.stroke();
      }
      for (let k = 0; k < 14; k++) {
        const q = (k + wrap(t * 2)) / 14;
        ctx.globalAlpha = Math.min(1, q * 2.4);
        const y = hz + (h - hz) * q * q;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (id === "confetti") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#151a2e"], [1, "#080a13"]]);
      ctx.fillRect(0, 0, w, h);
      const cols = ["#ff5d8f", "#7c5cff", "#3ee0c5", "#ffd36e", "#4f9dff"];
      for (let i = 0; i < 95; i++) {
        const sp = 1 + ((i * 3) % 3);
        const y = (wrap(t * sp + rnd(i + 5)) * 1.15 - 0.08) * h;
        const x = (rnd(i + 60) + Math.sin(a * 2 + i) * 0.05) * w;
        const sz = (6 + rnd(i + 17) * 8) * (w / 360);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a * (1 + (i % 3)) + i);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      return;
    }

    if (id === "blob") {
      ctx.fillStyle = "#0b0f1a";
      ctx.fillRect(0, 0, w, h);
      [[0.32, 0.3, "#7c5cff", 0.44], [0.7, 0.46, "#ff5d8f", 0.4], [0.45, 0.76, "#3ee0c5", 0.42]]
        .forEach(([bx, by, col, rr], i) => {
          const x = (bx + Math.sin(a + (i * TAU) / 3) * 0.2) * w;
          const y = (by + Math.cos(a + (i * TAU) / 3) * 0.16) * h;
          const r = w * rr * (1 + Math.sin(a * 2 + i) * 0.18);
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, col);
          rg.addColorStop(0.45, col + "88");
          rg.addColorStop(1, "transparent");
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = rg;
          ctx.fillRect(0, 0, w, h);
        });
      ctx.globalAlpha = 1;
      return;
    }

    if (id === "stripes") {
      ctx.fillStyle = g(0, 0, w, h, [[0, "#1d1440"], [1, "#0a1020"]]);
      ctx.fillRect(0, 0, w, h);
      const span = Math.hypot(w, h);
      const band = w * 0.11;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "rgba(255,255,255,.07)";
      const off = u * band * 2;
      for (let x = -span; x < span; x += band * 2) ctx.fillRect(x + off, -span, band, span * 2);
      ctx.restore();
      return;
    }

    if (id === "ripple") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#04121c"], [0.55, "#07293b"], [1, "#03101a"]]);
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.55;
      for (let i = 0; i < 5; i++) {
        const k = wrap(t + i / 5);
        ctx.beginPath();
        ctx.arc(cx, cy, k * w * 0.8, 0, TAU);
        ctx.strokeStyle = `rgba(120,220,255,${(0.45 * (1 - k)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1, w * 0.014 * (1 - k * 0.6));
        ctx.stroke();
      }
      return;
    }

    if (id === "firefly") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#071108"], [0.55, "#0c1a12"], [1, "#04080a"]]);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 34; i++) {
        const x = (rnd(i) + Math.sin(a * (1 + (i % 2)) + i) * 0.12) * w;
        const y = (rnd(i + 21) + Math.cos(a * (1 + ((i + 1) % 2)) + i * 1.3) * 0.1) * h;
        const al = 0.2 + 0.75 * (0.5 + 0.5 * Math.sin(a * (2 + (i % 3)) + i * 2));
        const r = (2 + rnd(i + 13) * 2.5) * (w / 360);
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
        rg.addColorStop(0, `rgba(220,255,150,${al.toFixed(3)})`);
        rg.addColorStop(0.35, `rgba(190,255,120,${(al * 0.35).toFixed(3)})`);
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
      }
      return;
    }

    if (id === "halftone") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#120d20"], [1, "#05060c"]]);
      ctx.fillRect(0, 0, w, h);
      const step = w / 22;
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          const k = 0.5 + 0.5 * Math.sin((x / w) * 5 + (y / h) * 7 - a);
          ctx.fillStyle = `rgba(124,92,255,${(0.22 + 0.42 * k).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, (0.12 + 0.34 * k) * step, 0, TAU);
          ctx.fill();
        }
      }
      return;
    }

    if (id === "beam") {
      ctx.fillStyle = "#06070d";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, -h * 0.06);
      for (let i = 0; i < 9; i++) {
        ctx.save();
        ctx.rotate(a / 9 + (i * TAU) / 9);              // 9갈래 → 1/9 바퀴면 같은 모양
        const gg = ctx.createLinearGradient(0, 0, 0, h * 1.3);
        gg.addColorStop(0, "rgba(180,210,255,.24)");
        gg.addColorStop(1, "transparent");
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-w * 0.12, h * 1.5);
        ctx.lineTo(w * 0.12, h * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      const rg = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 0.75);
      rg.addColorStop(0, "rgba(255,245,220,.3)");
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (id === "film") {
      ctx.fillStyle = g(0, 0, 0, h, [[0, "#2b2318"], [0.5, "#1a1710"], [1, "#0d0b07"]]);
      ctx.fillRect(0, 0, w, h);
      const frame = Math.floor(u * 24);                 // 루프당 24스텝 그레인
      const px = Math.max(1, w / 360);
      ctx.fillStyle = "rgba(255,240,210,.12)";
      for (let i = 0; i < 900; i++) {
        ctx.fillRect(rnd(i + frame * 13) * w, rnd(i + frame * 13 + 977) * h, px * 2, px * 2);
      }
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(a * 3));   // 깜빡임
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.9);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, "rgba(0,0,0,.78)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      return;
    }

    // fallback
    ctx.fillStyle = "#05060b";
    ctx.fillRect(0, 0, w, h);
  }

  /* ================= 화면 효과 (post-processing) =================
     미리보기와 내보내기가 같은 파이프라인을 쓴다:
       paintBg() -> drawCharacter() -> applyEffects()
     효과는 프레임 전체에 적용한 뒤, 범위가 '영역'이면 마스크로 오려서 되돌린다.
     ============================================================== */

  /* 재사용 스크래치 캔버스 (프레임마다 새로 만들지 않는다) */
  /* 항상 전체가 칠해지는 스크래치는 불투명으로 만든다.
     mask 는 destination-in 을 쓰므로 반드시 알파가 있어야 한다. */
  const OPAQUE_SCRATCH = { render: true, snap: true, work: true };

  const _scratch = {};
  function scratch(key, w, h) {
    // 크기를 키에 넣는다. 미리보기(작은 캔버스)와 내보내기(큰 캔버스)가 같은 스크래치를
    // 공유하면 프레임마다 서로 리사이즈해서(= 재할당) 녹화 프레임률이 폭락한다.
    const k = key + "@" + w + "x" + h;
    let o = _scratch[k];
    if (!o) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      o = _scratch[k] = { c, x: c.getContext("2d", { alpha: !OPAQUE_SCRATCH[key] }) };
    }
    return o;
  }

  /* 현재 캔버스를 복사해 온다 (변위 계열 효과는 원본이 필요하다) */
  function snap(ctx, w, h, key) {
    const s = scratch(key || "snap", w, h);
    s.x.clearRect(0, 0, w, h);
    s.x.drawImage(ctx.canvas, 0, 0);
    return s.c;
  }

  /* 40x40 격자 (2.5% 간격) 로 붙인다 */
  const SNAP = 100 / 40;
  function snap40(v) { return Math.round(v / SNAP) * SNAP; }
  function cellOf(v) { return Math.round(v / SNAP); }

  /* 현재 적용 중인 효과의 세기 배율 (applyEffects 가 매번 설정한다) */
  let _curAmt = 100;
  function fxK() { return _curAmt / 100; }

  /* 효과의 기본 세기 */
  function amtOf(id) {
    return state.fxAmt[id] === undefined ? 100 : state.fxAmt[id];
  }

  let _spotSeq = 1;

  const EFFECTS = [
    {
      id: "wave", name: "물결 왜곡",
      // 가로 띠를 sin 으로 밀어 화면이 울렁이게 한다
      apply(ctx, w, h, t) {
        const src = snap(ctx, w, h);
        const amp = w * 0.022 * fxK();
        const band = Math.max(2, Math.round(h / 220));
        ctx.clearRect(0, 0, w, h);
        for (let y = 0; y < h; y += band) {
          const dx = Math.sin((y / h) * Math.PI * 6 + t * TAU) * amp;
          ctx.drawImage(src, 0, y, w, band, dx, y, w, band);
        }
      },
    },
    {
      id: "haze", name: "아지랑이",
      // 잔주름처럼 촘촘하고 약한 왜곡 (열기 굴절)
      apply(ctx, w, h, t) {
        const src = snap(ctx, w, h);
        const amp = w * 0.006 * fxK();
        const band = 2;
        ctx.clearRect(0, 0, w, h);
        for (let y = 0; y < h; y += band) {
          const dx = (Math.sin((y / h) * Math.PI * 34 + t * TAU * 3) +
                      Math.sin((y / h) * Math.PI * 61 - t * TAU * 5) * 0.6) * amp;
          ctx.drawImage(src, 0, y, w, band, dx, y, w, band);
        }
      },
    },
    {
      id: "chroma", name: "색수차",
      // R/B 채널을 좌우로 벌린다
      apply(ctx, w, h, t) {
        const src = snap(ctx, w, h);
        const d = w * 0.006 * fxK() * (0.6 + 0.4 * Math.sin(t * TAU));
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // SVG feColorMatrix 로 채널을 drawImage 한 번에 분리한다 (기존은 채널당 4연산)
        ctx.filter = "url(#fxR)"; ctx.drawImage(src, -d, 0);
        ctx.filter = "url(#fxG)"; ctx.drawImage(src, 0, 0);
        ctx.filter = "url(#fxB)"; ctx.drawImage(src, d, 0);
        ctx.filter = "none";
        ctx.restore();
      },
    },
    {
      id: "glitch", name: "글리치",
      // 가로 블록이 무작위로 어긋나고 색이 밀린다
      apply(ctx, w, h, t) {
        const src = snap(ctx, w, h);
        const step = Math.floor(t * 24);          // 24스텝/루프
        for (let i = 0; i < 16; i++) {
          const r1 = rnd(step * 31 + i), r2 = rnd(step * 31 + i + 100), r3 = rnd(step * 31 + i + 200);
          if (r3 > 0.82) continue;
          const y = r1 * h;
          const bh = (0.012 + r2 * 0.075) * h;
          const dx = (r3 - 0.5) * w * 0.3 * fxK();
          ctx.clearRect(0, y, w, bh);
          ctx.drawImage(src, 0, y, w, bh, dx, y, w, bh);
          // 어긋난 띠에 색 번짐과 밝기 튐을 얹는다
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.35 * fxK();
          ctx.fillStyle = r2 > 0.5 ? "#f0306a" : "#28d8ff";
          ctx.fillRect(0, y, w, bh * 0.5);
          ctx.restore();
        }
      },
    },
    {
      id: "scan", name: "스캔라인",
      apply(ctx, w, h, t) {
        const line = Math.max(2, Math.round(h / 320));
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${(0.3 * fxK()).toFixed(3)})`;
        for (let y = 0; y < h; y += line * 2) ctx.fillRect(0, y, w, line);
        // 굴러가는 밝은 띠
        const by = wrap(t) * h;
        const gg = ctx.createLinearGradient(0, by - h * 0.12, 0, by + h * 0.12);
        gg.addColorStop(0, "transparent");
        gg.addColorStop(0.5, `rgba(255,255,255,${(0.07 * fxK()).toFixed(3)})`);
        gg.addColorStop(1, "transparent");
        ctx.fillStyle = gg;
        ctx.fillRect(0, by - h * 0.12, w, h * 0.24);
        ctx.restore();
      },
    },
    {
      id: "zoom", name: "줌 펄스",
      apply(ctx, w, h, t) {
        const src = snap(ctx, w, h);
        const k = 1 + 0.05 * fxK() * (0.5 + 0.5 * Math.sin(t * TAU * 2));
        ctx.clearRect(0, 0, w, h);
        const dw = w * k, dh = h * k;
        ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
      },
    },
    {
      id: "shake", name: "카메라 셰이크",
      apply(ctx, w, h, t) {
        const src = snap(ctx, w, h);
        const a = w * 0.012 * fxK();
        const dx = (Math.sin(t * TAU * 13) + Math.sin(t * TAU * 29) * 0.5) * a;
        const dy = (Math.cos(t * TAU * 17) + Math.cos(t * TAU * 23) * 0.5) * a;
        ctx.clearRect(0, 0, w, h);
        // 가장자리 빈틈이 생기지 않게 살짝 확대해서 그린다
        const pad = a * 2.2;
        ctx.drawImage(src, -pad + dx, -pad + dy, w + pad * 2, h + pad * 2);
      },
    },
    {
      id: "bloom", name: "블룸",
      apply(ctx, w, h) {
        // 1/4 해상도에서 블러 -> 픽셀 수 1/16. 블룸은 원래 흐린 효과라 차이가 없다.
        const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
        const s = scratch("bloom", qw, qh);
        s.x.clearRect(0, 0, qw, qh);
        s.x.filter = `blur(${(qw * 0.02).toFixed(1)}px) brightness(1.5)`;
        s.x.drawImage(ctx.canvas, 0, 0, qw, qh);
        s.x.filter = "none";
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.42 * fxK();
        ctx.drawImage(s.c, 0, 0, w, h);
        ctx.restore();
      },
    },
    {
      id: "pixel", name: "픽셀화",
      apply(ctx, w, h) {
        const n = Math.max(8, Math.round(90 / Math.max(0.2, fxK())));
        const s = scratch("pixel", n, Math.max(1, Math.round(n * h / w)));
        s.x.imageSmoothingEnabled = true;
        s.x.clearRect(0, 0, s.c.width, s.c.height);
        s.x.drawImage(ctx.canvas, 0, 0, s.c.width, s.c.height);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(s.c, 0, 0, w, h);
        ctx.restore();
      },
    },
    {
      id: "vignette", name: "비네트",
      apply(ctx, w, h) {
        const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.85);
        vg.addColorStop(0, "transparent");
        vg.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, 0.7 * fxK()).toFixed(3)})`);
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      },
    },
    {
      id: "grain", name: "필름 그레인",
      apply(ctx, w, h, t) {
        const step = Math.floor(wrap(t) * 24);
        const px = Math.max(1, w / 400);
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.16 * fxK());
        ctx.fillStyle = "#fff";
        for (let i = 0; i < 800; i++) {
          ctx.fillRect(rnd(i + step * 17) * w, rnd(i + step * 17 + 613) * h, px * 2, px * 2);
        }
        ctx.restore();
      },
    },
    {
      id: "fisheye", name: "볼록 렌즈",
      // 동심 링을 조금씩 다르게 확대해 어안 느낌을 낸다
      apply(ctx, w, h) {
        const src = snap(ctx, w, h);
        const cx = w / 2, cy = h / 2;
        const R = Math.hypot(w, h) / 2;
        const rings = 13;
        const str = 0.22 * fxK();
        ctx.clearRect(0, 0, w, h);
        for (let i = rings - 1; i >= 0; i--) {
          const r1 = ((i + 1) / rings) * R;
          const u = r1 / R;
          const k = 1 + str * (1 - u * u);      // 가운데일수록 크게
          // 링을 덮는 사각형만 그린다 (매번 전체를 그리면 링 수에 비례해 느려진다)
          const bx = Math.max(0, cx - r1), by = Math.max(0, cy - r1);
          const bw = Math.min(w, cx + r1) - bx, bh = Math.min(h, cy + r1) - by;
          if (bw <= 0 || bh <= 0) continue;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r1, 0, TAU);
          ctx.clip();
          ctx.translate(cx, cy);
          ctx.scale(k, k);
          ctx.translate(-cx, -cy);
          ctx.drawImage(src, bx, by, bw, bh, bx, by, bw, bh);
          ctx.restore();
        }
      },
    },
  ];

  /* ---- 지점 모양 경로 ---- */
  function spotPath(ctx, sp, w, h) {
    const x = (sp.x / 100) * w, y = (sp.y / 100) * h;
    const rw = (sp.w / 100) * w, rh = (sp.h / 100) * h;
    ctx.beginPath();
    if (sp.shape === "ellipse") ctx.ellipse(x, y, rw / 2, rh / 2, 0, 0, TAU);
    else ctx.rect(x - rw / 2, y - rh / 2, rw, rh);
  }

  function resetCtx(x) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
    x.filter = "none";
  }

  function applyEffects(ctx, w, h, t) {
    if (state.fxScope === "all") {
      const on = EFFECTS.filter((e) => state.fx[e.id]);
      if (!on.length) return;
      const work = scratch("work", w, h);
      resetCtx(work.x);
      work.x.clearRect(0, 0, w, h);
      work.x.drawImage(ctx.canvas, 0, 0);
      for (const e of on) { _curAmt = amtOf(e.id); e.apply(work.x, w, h, t); }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(work.c, 0, 0);
      return;
    }

    // 영역 모드: 지점마다 효과 1개를 전체에 적용한 뒤 그 지점 모양으로 오려 얹는다
    if (!state.spots.length) return;
    const work = scratch("work", w, h);
    const m = scratch("mask", w, h);
    for (const sp of state.spots) {
      const e = EFFECTS.find((x) => x.id === sp.fx);
      if (!e) continue;
      _curAmt = sp.amt;

      resetCtx(work.x);
      work.x.clearRect(0, 0, w, h);
      work.x.drawImage(ctx.canvas, 0, 0);
      e.apply(work.x, w, h, t);

      resetCtx(m.x);
      m.x.clearRect(0, 0, w, h);
      m.x.drawImage(work.c, 0, 0);
      m.x.globalCompositeOperation = "destination-in";
      const f = (sp.feather / 100) * Math.min(w, h) * 0.5;
      if (f > 0.5) m.x.filter = `blur(${f.toFixed(1)}px)`;
      m.x.fillStyle = "#fff";
      spotPath(m.x, sp, w, h);
      m.x.fill();
      resetCtx(m.x);

      ctx.drawImage(m.c, 0, 0);      // 이 지점 결과를 누적
    }
  }

  /* ---------- 화면 효과 UI ---------- */
  const fxRegionEl = $("fxRegion");

  function activeSpot() {
    return state.spots.find((sp) => sp.id === state.activeSpot) || null;
  }

  function syncFxUI() {
    const region = state.fxScope === "region";
    [...$("fxList").children].forEach((row) => {
      const id = row.dataset.fx;
      const btn = row.querySelector("button");
      const num = row.querySelector("input");
      // 전체 범위 = 여러 개 토글 / 영역 = 새 지점에 쓸 효과 하나 선택
      btn.classList.toggle("on", !region && !!state.fx[id]);
      btn.classList.toggle("sel", region && state.fxPick === id);
      const sp = activeSpot();
      num.value = region && sp && sp.fx === id ? sp.amt : amtOf(id);
    });
    [...$("fxScope").children].forEach((b) => b.classList.toggle("on", b.dataset.scope === state.fxScope));
    $("fxRegionBox").hidden = !region;
    $("spotPanel").hidden = !region;
    $("fxHint").textContent = region
      ? "지점마다 효과 1개. 왼쪽에서 효과를 고르고 지점을 추가하세요. 오른쪽 숫자는 세기(%)입니다."
      : "화면이 울렁이거나 흔들리는 후처리(post-processing) 효과. 왼쪽은 켜기/끄기, 오른쪽 숫자는 세기(%)입니다.";
    if (!region && state.regionEdit) state.regionEdit = false;
    $("fxRegionEdit").setAttribute("aria-pressed", String(state.regionEdit));
    $("fxRegionEdit").textContent = state.regionEdit
      ? "지점 편집 중 — 끄고 캐릭터 편집"
      : "미리보기에서 지점 편집";
    const sp = activeSpot();
    [...$("fxShape").children].forEach((b) =>
      b.classList.toggle("on", b.dataset.shape === (sp ? sp.shape : "rect")));
    syncSpotSliders();
    renderSpotTable();
    syncRegion();
  }

  /* 슬라이더 <-> 활성 지점 */
  function syncSpotSliders() {
    const sp = activeSpot();
    const dis = !sp;
    ["regX", "regY", "regW", "regH", "regFeather"].forEach((id) => { $(id).disabled = dis; });
    if (!sp) {
      $("rxVal").textContent = "–"; $("ryVal").textContent = "–";
      $("rwVal").textContent = "–"; $("rhVal").textContent = "–";
      $("rxCell").textContent = ""; $("ryCell").textContent = "";
      return;
    }
    $("regX").value = sp.x; $("rxVal").textContent = sp.x.toFixed(1);
    $("regY").value = sp.y; $("ryVal").textContent = sp.y.toFixed(1);
    $("regW").value = sp.w; $("rwVal").textContent = sp.w.toFixed(1);
    $("regH").value = sp.h; $("rhVal").textContent = sp.h.toFixed(1);
    $("regFeather").value = sp.feather; $("rfVal").textContent = String(sp.feather);
    $("rxCell").textContent = `격자 ${cellOf(sp.x)}/40`;
    $("ryCell").textContent = `격자 ${cellOf(sp.y)}/40`;
  }

  /* 미리보기 위의 지점 박스 */
  function syncRegion() {
    const sp = activeSpot();
    const show = state.fxScope === "region" && sp && !state.playing;
    fxRegionEl.hidden = !show;
    $("snapGrid").hidden = !(state.regionEdit && !state.playing);

    // 중심을 지나는 정렬 가이드는 편집 중에만
    const cross = $("fxCross");
    cross.hidden = !(show && state.regionEdit);
    if (!cross.hidden) {
      cross.querySelector(".vx").style.left = sp.x + "%";
      cross.querySelector(".hz").style.top = sp.y + "%";
    }
    if (!show) return;

    // 중심 좌표 라벨 (격자 칸 번호 + %)
    const lbl = $("fxCLabel");
    lbl.textContent = `${cellOf(sp.x)},${cellOf(sp.y)}  (${sp.x.toFixed(1)}, ${sp.y.toFixed(1)}%)`;
    // 스테이지 밖으로 나가면 반대쪽으로 접는다
    const stW = state.stagePx || 360;
    const stH = stW * (state.H / state.W);
    const lw = lbl.offsetWidth || 96, lh = lbl.offsetHeight || 14;
    const flipX = (sp.x / 100) * stW + 11 + lw > stW - 2;
    const flipY = (sp.y / 100) * stH + 5 + lh > stH - 2;
    lbl.style.transform =
      `translate(${flipX ? "calc(-100% - 11px)" : "11px"}, ${flipY ? "calc(-100% - 5px)" : "5px"})`;
    fxRegionEl.style.left = (sp.x - sp.w / 2) + "%";
    fxRegionEl.style.top = (sp.y - sp.h / 2) + "%";
    fxRegionEl.style.width = sp.w + "%";
    fxRegionEl.style.height = sp.h + "%";
    fxRegionEl.classList.toggle("ellipse", sp.shape === "ellipse");
    fxRegionEl.style.opacity = state.regionEdit ? "1" : "0.5";
    fxRegionEl.style.pointerEvents = "none";
    [...fxRegionEl.querySelectorAll(".h")].forEach((hh) => {
      hh.style.display = state.regionEdit ? "block" : "none";
    });
  }

  /* ---- 지점 목록 표 ---- */
  function renderSpotTable() {
    const tb = $("spotRows");
    tb.innerHTML = "";
    $("spotCount").textContent = state.spots.length ? `${state.spots.length}개` : "";
    $("spotEmpty").hidden = state.spots.length > 0;
    state.spots.forEach((sp) => {
      const e = EFFECTS.find((x) => x.id === sp.fx);
      const tr = document.createElement("tr");
      if (sp.id === state.activeSpot) tr.className = "on";
      tr.innerHTML =
        `<td>${e ? e.name : sp.fx}</td>` +
        `<td>${cellOf(sp.x)},${cellOf(sp.y)}</td>` +
        `<td>${Math.round(sp.w)}×${Math.round(sp.h)}</td>` +
        `<td>${sp.amt}%</td>`;
      const td = document.createElement("td");
      const del = document.createElement("button");
      del.type = "button";
      del.className = "del";
      del.textContent = "✕";
      del.title = "이 지점 삭제";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        state.spots = state.spots.filter((x) => x.id !== sp.id);
        if (state.activeSpot === sp.id) state.activeSpot = state.spots.length ? state.spots[0].id : null;
        syncFxUI();
      });
      td.appendChild(del);
      tr.appendChild(td);
      tr.addEventListener("click", () => {
        state.activeSpot = sp.id;
        state.fxPick = sp.fx;
        syncFxUI();
      });
      tb.appendChild(tr);
    });
  }

  /* 오버레이가 미리보기를 가릴 수 있으므로 헤더를 눌러 접을 수 있게 한다 */
  $("spotHead").addEventListener("click", () => {
    const panel = $("spotPanel");
    const c = panel.classList.toggle("collapsed");
    $("spotCaret").textContent = c ? "▸" : "▾";
  });

  /* ---- 효과 목록: 토글 버튼 | 세기 입력 ---- */
  EFFECTS.forEach((e) => {
    const row = document.createElement("div");
    row.className = "fx-row";
    row.dataset.fx = e.id;

    const b = document.createElement("button");
    b.type = "button";
    b.textContent = e.name;
    b.addEventListener("click", () => {
      if (state.fxScope === "region") state.fxPick = e.id;   // 새 지점에 쓸 효과
      else state.fx[e.id] = !state.fx[e.id];
      syncFxUI();
    });

    const n = document.createElement("input");
    n.type = "number";
    n.min = "10"; n.max = "300"; n.step = "5";
    n.value = "100";
    n.title = "효과 세기 %";
    n.addEventListener("input", () => {
      let v = Math.round(Number(n.value));
      if (!isFinite(v)) v = 100;
      v = Math.max(10, Math.min(300, v));
      const sp = activeSpot();
      if (state.fxScope === "region" && sp && sp.fx === e.id) sp.amt = v;   // 활성 지점의 세기
      else state.fxAmt[e.id] = v;
      renderSpotTable();
    });

    row.appendChild(b);
    row.appendChild(n);
    $("fxList").appendChild(row);
  });

  /* 적용 범위 */
  [["all", "화면 전체"], ["region", "영역만"]].forEach(([id, name]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.scope = id;
    b.textContent = name;
    b.addEventListener("click", () => { state.fxScope = id; syncFxUI(); });
    $("fxScope").appendChild(b);
  });

  /* 영역 모양 — 활성 지점에 적용 */
  [["rect", "사각형"], ["ellipse", "타원"]].forEach(([id, name]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.shape = id;
    b.textContent = name;
    b.addEventListener("click", () => {
      const sp = activeSpot();
      if (sp) sp.shape = id;
      syncFxUI();
    });
    $("fxShape").appendChild(b);
  });

  /* 지점 추가 — 격자점 위에 놓는다 */
  $("spotAdd").addEventListener("click", () => {
    const n = state.spots.length;
    const sp = {
      id: _spotSeq++,
      fx: state.fxPick,
      x: snap40(50 + ((n % 3) - 1) * 15),
      y: snap40(35 + Math.floor(n / 3) * 15),
      w: 30, h: 20,
      shape: "rect",
      feather: 8,
      amt: amtOf(state.fxPick),
    };
    state.spots.push(sp);
    state.activeSpot = sp.id;
    syncFxUI();
  });

  $("fxRegionEdit").addEventListener("click", () => {
    state.regionEdit = !state.regionEdit;
    if (state.regionEdit) setSelected(false);
    syncFxUI();
  });

  /* 지점 숫자 입력 — 중심은 격자점, 크기는 2.5% 단위 */
  function setRegion(part, v) {
    const sp = activeSpot();
    if (!sp) return;
    if (part === "x") sp.x = Math.max(0, Math.min(100, snap40(v)));
    if (part === "y") sp.y = Math.max(0, Math.min(100, snap40(v)));
    if (part === "w") sp.w = Math.max(SNAP, Math.min(100, snap40(v)));
    if (part === "h") sp.h = Math.max(SNAP, Math.min(100, snap40(v)));
    syncSpotSliders();
    renderSpotTable();
    syncRegion();
  }
  [["regX", "x"], ["regY", "y"], ["regW", "w"], ["regH", "h"]].forEach(([id, part]) => {
    $(id).addEventListener("input", () => setRegion(part, Number($(id).value)));
  });
  $("regFeather").addEventListener("input", () => {
    const sp = activeSpot();
    if (!sp) return;
    sp.feather = Number($("regFeather").value);
    $("rfVal").textContent = String(sp.feather);
  });

  /* ================= 설정 저장 / 불러오기 =================
     · localStorage 자동 저장은 "설정만" (이미지는 용량 때문에 제외)
     · JSON 내보내기는 캐릭터·배경 이미지까지 포함한 완전 스냅샷
     ======================================================= */

  const LS_KEY = "portrait-studio.settings.v1";
  const LS_UI = "portrait-studio.ui.v1";

  function collectSettings() {
    return {
      v: 1,
      W: state.W, H: state.H,
      bg: state.bg, bgReps: state.bgReps, animMix: state.animMix,
      tint: state.tint, tintColor: state.tintColor, tintMode: state.tintMode,
      inAnim: state.inAnim,
      x: state.x, y: state.y, size: state.size, scale: state.scale, rot: state.rot,
      grid: state.grid,
      fx: { ...state.fx }, fxAmt: { ...state.fxAmt },
      fxScope: state.fxScope, fxPick: state.fxPick,
      spots: state.spots.map((s) => ({ ...s })), activeSpot: state.activeSpot,
      dur: Number($("dur").value), inDur: Number($("inDur").value),
      // 캐릭터 배경 제거 옵션
      maxSide: state.maxSide, keepOriginal: state.keepOriginal,
      threshold: Number($("threshold").value),
      edgeFlood: $("edgeFlood").checked,
      softEdge: $("feather").checked,
    };
  }

  function applySettings(o) {
    if (!o || typeof o !== "object") return;
    const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);

    state.W = num(o.W, state.W); state.H = num(o.H, state.H);
    $("canvasW").value = state.W; $("canvasH").value = state.H;

    if (BACKGROUNDS.some((b) => b.id === o.bg)) state.bg = o.bg;
    state.bgReps = Math.max(1, Math.min(20, num(o.bgReps, 1)));
    state.animMix = Math.max(0, Math.min(100, num(o.animMix, 100)));
    $("animMix").value = state.animMix;
    $("animMixVal").textContent = String(state.animMix);

    state.tint = Math.max(0, Math.min(100, num(o.tint, 0)));
    if (typeof o.tintColor === "string") state.tintColor = o.tintColor;
    if (TINT_MODES.some((m) => m.id === o.tintMode)) state.tintMode = o.tintMode;

    if (IN_ANIMS.some((a) => a.id === o.inAnim)) state.inAnim = o.inAnim;

    state.size = Math.max(16, Math.min(80, num(o.size, 38)));
    $("cardSize").value = state.size; $("sizeVal").textContent = String(state.size);
    state.rot = norm180(num(o.rot, 0));
    state.scale = num(o.scale, 1);
    state.grid = !!o.grid;

    state.fx = o.fx && typeof o.fx === "object" ? { ...o.fx } : {};
    state.fxAmt = o.fxAmt && typeof o.fxAmt === "object" ? { ...o.fxAmt } : {};
    state.fxScope = o.fxScope === "region" ? "region" : "all";
    if (EFFECTS.some((e) => e.id === o.fxPick)) state.fxPick = o.fxPick;

    state.spots = Array.isArray(o.spots)
      ? o.spots.filter((s) => s && EFFECTS.some((e) => e.id === s.fx)).map((s) => ({
          id: num(s.id, _spotSeq++),
          fx: s.fx,
          x: snap40(Math.max(0, Math.min(100, num(s.x, 50)))),
          y: snap40(Math.max(0, Math.min(100, num(s.y, 50)))),
          w: Math.max(SNAP, Math.min(100, snap40(num(s.w, 30)))),
          h: Math.max(SNAP, Math.min(100, snap40(num(s.h, 20)))),
          shape: s.shape === "ellipse" ? "ellipse" : "rect",
          feather: Math.max(0, Math.min(40, num(s.feather, 8))),
          amt: Math.max(10, Math.min(300, num(s.amt, 100))),
        }))
      : [];
    _spotSeq = state.spots.reduce((m, s) => Math.max(m, s.id + 1), _spotSeq);
    state.activeSpot = state.spots.some((s) => s.id === o.activeSpot)
      ? o.activeSpot
      : (state.spots[0] ? state.spots[0].id : null);

    $("dur").value = num(o.dur, 4);
    $("inDur").value = num(o.inDur, 1.1);

    state.maxSide = Math.max(256, Math.min(2048, num(o.maxSide, 1024)));
    state.keepOriginal = !!o.keepOriginal;
    $("keepOriginal").checked = state.keepOriginal;
    $("threshold").value = num(o.threshold, 42);
    $("thrVal").textContent = $("threshold").value;
    $("edgeFlood").checked = o.edgeFlood !== false;
    $("feather").checked = o.softEdge !== false;

    // 화면 갱신
    renderChips($("bgList"), BACKGROUNDS, "bg", () => {});
    renderChips($("inList"), IN_ANIMS, "inAnim", () => {});
    syncMaxSideUI(state.maxSide);
    setXY(state.x !== undefined ? num(o.x, state.x) : state.x, num(o.y, state.y));
    setRot(state.rot);
    syncGrid();
    syncFxUI();
    applyTint();
    applyReps();
    applyCanvasSize();
    setScale(state.scale);
  }

  /* ---- localStorage 자동 저장 (설정만) ---- */
  let _lastSaved = "";
  function saveLocal() {
    try {
      const json = JSON.stringify(collectSettings());
      if (json === _lastSaved) return;
      localStorage.setItem(LS_KEY, json);
      _lastSaved = json;
    } catch (e) { /* 용량 초과 등은 무시 — 저장은 부가 기능 */ }
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      applySettings(JSON.parse(raw));
      _lastSaved = raw;
      return true;
    } catch (e) { return false; }
  }
  const autoSaveTimer = setInterval(saveLocal, 2000);
  window.addEventListener("beforeunload", saveLocal);

  /* ---- JSON 내보내기 (이미지 포함) ---- */
  $("setExport").addEventListener("click", () => {
    const o = collectSettings();
    if (state.cutCanvas) o.charImage = state.cutCanvas.toDataURL("image/png");
    if (state.bgImage) {
      const c = document.createElement("canvas");
      c.width = state.bgImage.naturalWidth || state.bgImage.width;
      c.height = state.bgImage.naturalHeight || state.bgImage.height;
      c.getContext("2d").drawImage(state.bgImage, 0, 0);
      o.bgImageData = c.toDataURL("image/png");
    }
    const blob = new Blob([JSON.stringify(o, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `portrait-settings-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    const kb = (blob.size / 1024).toFixed(0);
    setStatus(`설정 내보냄 · ${a.download} (${kb}KB${o.charImage ? ", 이미지 포함" : ""})`);
  });

  /* ---- JSON 가져오기 ---- */
  $("setImport").addEventListener("click", () => $("setFile").click());
  $("setFile").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      applySettings(o);
      const load = (src) => new Promise((res) => {
        const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
      });
      if (o.charImage) {
        const im = await load(o.charImage);
        if (im) {
          const c = document.createElement("canvas");
          c.width = im.naturalWidth; c.height = im.naturalHeight;
          c.getContext("2d").drawImage(im, 0, 0);
          showCut(c);
          setScale(typeof o.scale === "number" ? o.scale : state.scale);
        }
      }
      if (o.bgImageData) {
        const im = await load(o.bgImageData);
        if (im) { state.bgImage = im; syncBgImage(); }
      }
      setStatus(`설정 불러옴 · ${f.name}`);
    } catch (err) {
      setStatus("설정 파일을 읽지 못했습니다: " + (err && err.message ? err.message : String(err)));
    } finally {
      $("setFile").value = "";
    }
  });

  /* ---- 초기화 ---- */
  $("setReset").addEventListener("click", () => {
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_UI); } catch (e) {}
    _lastSaved = "x";              // 다음 자동 저장이 새 상태를 쓰도록
    location.reload();
  });

  /* ================= 섹션 접기 ================= */
  function initSections() {
    let open = {};
    try { open = JSON.parse(localStorage.getItem(LS_UI) || "{}"); } catch (e) {}
    [...root.querySelectorAll(".panel section")].forEach((sec, i) => {
      const h = sec.querySelector("h2");
      if (!h) return;
      /* 원본은 페이지가 한 번만 로드되므로 무조건 prepend 했다. 여기서는 React 가
         같은 DOM 위로 다시 마운트할 수 있으니(StrictMode) 이미 있으면 그것을 쓴다. */
      let caret = h.querySelector(":scope > .caret");
      if (!caret) {
        caret = document.createElement("span");
        caret.className = "caret";
        caret.textContent = "▼";
        h.prepend(caret);
      }
      if (open[i] === false) sec.classList.add("collapsed");
      /* 두 번 붙으면 토글이 서로를 상쇄해 섹션이 접히지 않는다 */
      if (h.dataset.movFold) return;
      h.dataset.movFold = "1";
      h.addEventListener("click", () => {
        const c = sec.classList.toggle("collapsed");
        open[i] = !c;
        try { localStorage.setItem(LS_UI, JSON.stringify(open)); } catch (e) {}
      });
    });
  }

  /* ================= 대화식 가이드 (flow guide) =================
     질문 → 선택 → 다음 단계. 지금 눌러야 할 컨트롤에 주황 그라디언트 테두리가
     흐르고 살짝 튀어오른다. `watch` 가 있는 단계는 사용자가 실제로 그 일을
     끝내면(이미지 선택 등) 자동으로 넘어간다.
     ============================================================== */

  const GUIDE = [
    {
      id: "start",
      q: "배경 이미지가 있나요?",
      hint: "사진을 깔고 그 위에 움직임을 얹을 수 있습니다.",
      hot: ["#bgFileLabel"],
      choices: [
        { t: "있어요", go: "pickBgImage", primary: true },
        { t: "없어요", go: "pickBgAnim" },
      ],
    },
    {
      id: "pickBgImage",
      q: "배경 이미지를 골라주세요.",
      hint: "테두리가 빛나는 버튼을 누르면 파일 선택창이 열립니다. 캔버스를 꽉 채우도록(cover) 들어갑니다.",
      hot: ["#bgFileLabel"],
      watch: () => !!state.bgImage,
      go: "bgAnimOnImage",
      choices: [{ t: "건너뛰기", go: "pickBgAnim" }],
    },
    {
      id: "bgAnimOnImage",
      q: "사진 위에 움직임을 더할까요?",
      hint: "빗줄기·반딧불 같은 빛 효과가 사진 위에 겹쳐집니다.",
      hot: ["#bgList"],
      choices: [
        { t: "네, 애니메이션도", go: "pickBgAnim", primary: true },
        { t: "아니요, 사진만", go: "char", act: () => pickBg("none") },
      ],
    },
    {
      id: "pickBgAnim",
      q: "배경 애니메이션을 골라주세요.",
      hint: "24종 중 하나를 누르면 바로 미리보기에 적용됩니다. 아래 반복 회수로 속도도 정할 수 있어요.",
      hot: ["#bgList"],
      choices: [{ t: "골랐어요", go: "char", primary: true }],
    },
    {
      id: "char",
      q: "캐릭터 이미지를 넣을까요?",
      hint: "넣으면 배경이 자동으로 제거됩니다. 넣지 않아도 배경만으로 영상이 됩니다.",
      hot: ["#fileLabel"],
      choices: [
        { t: "넣을게요", go: "pickChar", primary: true },
        { t: "배경만 만들래요", go: "fx" },
      ],
    },
    {
      id: "pickChar",
      q: "캐릭터 이미지를 골라주세요.",
      hint: "고르면 배경을 자동으로 지웁니다. 잘 안 지워지면 아래 '배경 제거 강도'를 조절하세요.",
      hot: ["#fileLabel"],
      watch: () => !!state.cutCanvas,
      go: "inAnim",
      choices: [{ t: "건너뛰기", go: "fx" }],
    },
    {
      id: "inAnim",
      q: "캐릭터가 어떻게 등장할까요?",
      hint: "20종 중 하나를 고르세요.",
      hot: ["#inList"],
      choices: [{ t: "골랐어요", go: "place", primary: true }],
    },
    {
      id: "place",
      q: "캐릭터를 놓을 자리를 잡아주세요.",
      hint: "미리보기에서 드래그하면 이동, 모서리 핸들로 크기, 위쪽 핸들로 회전입니다.",
      hot: ["#stageBox"],
      choices: [{ t: "다 잡았어요", go: "fx", primary: true }],
    },
    {
      id: "fx",
      q: "화면 효과를 넣을까요?",
      hint: "울렁임·글리치 같은 후처리 효과입니다.",
      hot: ["#fxList"],
      choices: [
        { t: "화면 전체에", go: "fxAll", act: () => { state.fxScope = "all"; syncFxUI(); }, primary: true },
        { t: "일부 영역에만", go: "fxRegion", act: () => { state.fxScope = "region"; syncFxUI(); } },
        { t: "안 넣을래요", go: "time" },
      ],
    },
    {
      id: "fxAll",
      q: "효과를 켜고 세기를 정하세요.",
      hint: "왼쪽은 켜기/끄기, 오른쪽 숫자는 세기(%)입니다. 여러 개 동시에 켤 수 있어요.",
      hot: ["#fxList"],
      choices: [{ t: "다 했어요", go: "time", primary: true }],
    },
    {
      id: "fxRegion",
      q: "효과를 하나 고르고 지점을 추가하세요.",
      hint: "지점마다 효과 1개입니다. 추가한 뒤 '지점 편집'을 켜면 40×40 격자에 맞춰 옮길 수 있어요.",
      hot: ["#fxList", "#spotAdd"],
      choices: [{ t: "다 했어요", go: "time", primary: true }],
    },
    {
      id: "time",
      q: "영상 길이를 정하세요.",
      hint: "전체 길이와, 캐릭터가 등장하는 데 걸리는 시간입니다.",
      hot: ["#dur", "#inDur"],
      choices: [{ t: "정했어요", go: "preview", primary: true }],
    },
    {
      id: "preview",
      q: "미리보기로 확인해 보세요.",
      hint: "보이는 그대로 저장됩니다.",
      hot: ["#play"],
      choices: [
        { t: "좋아요", go: "save", primary: true },
        { t: "효과를 더 손볼래요", go: "fx" },
      ],
    },
    {
      id: "save",
      q: "마지막입니다. 영상을 저장하세요.",
      hint: "실시간 녹화라 길이만큼 걸립니다. 도중에 멈추려면 같은 버튼(중지)을 누르세요.",
      hot: ["#record"],
      choices: [{ t: "끝!", go: null, primary: true }],
    },
  ];

  /* 배경 칩을 코드로 고른다 */
  function pickBg(id) {
    state.bg = id;
    [...$("bgList").children].forEach((c, i) => c.classList.toggle("on", BACKGROUNDS[i].id === id));
  }

  let guideCur = null;
  let guideCount = 0;
  let guideTimer = null;

  function guideClearHot() {
    root.querySelectorAll(".guide-hot").forEach((e) => e.classList.remove("guide-hot"));
  }

  function guideSetHot(sels) {
    guideClearHot();
    if (!sels || !sels.length) return;
    sels.forEach((sel, i) => {
      const el = root.querySelector(sel);
      if (!el) { console.warn("가이드: 대상 없음", sel); return; }
      if (getComputedStyle(el).display === "none") {
        console.warn("가이드: 대상이 보이지 않음(강조가 안 보인다)", sel);
      }
      el.classList.add("guide-hot");
      // 접힌 섹션 안이면 펼쳐 준다
      const sec = el.closest("section");
      if (sec && sec.classList.contains("collapsed")) sec.classList.remove("collapsed");
      if (i === 0) setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    });
  }

  function guideStop() {
    guideCur = null;
    guideCount = 0;
    clearInterval(guideTimer);
    guideTimer = null;
    guideClearHot();
    $("guide").hidden = true;
    $("guideStart").classList.remove("on");
    $("guideStart").textContent = "✦ 가이드로 만들기";
  }

  function guideGo(id) {
    if (!id) {                                    // 끝
      guideClearHot();
      $("guideQ").textContent = "완성했습니다 🎉";
      $("guideHint").textContent = "설정은 자동으로 저장되니, 다음에 열면 이어서 손볼 수 있어요.";
      $("guideChoices").innerHTML = "";
      $("guideWait").hidden = true;
      const b = document.createElement("button");
      b.type = "button"; b.className = "go"; b.textContent = "닫기";
      b.addEventListener("click", guideStop);
      $("guideChoices").appendChild(b);
      clearInterval(guideTimer); guideTimer = null;
      return;
    }
    const st = GUIDE.find((s) => s.id === id);
    if (!st) return guideStop();
    guideCur = st;
    guideCount++;

    $("guide").hidden = false;
    $("guideStep").textContent = `단계 ${guideCount}`;
    $("guideQ").textContent = st.q;
    $("guideHint").textContent = st.hint || "";
    guideSetHot(st.hot);

    const box = $("guideChoices");
    box.innerHTML = "";
    (st.choices || []).forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      if (c.primary) b.className = "go";
      b.textContent = c.t;
      b.addEventListener("click", () => {
        if (c.act) c.act();
        guideGo(c.go);
      });
      box.appendChild(b);
    });

    // 사용자가 실제로 끝내면 자동으로 넘어가는 단계
    clearInterval(guideTimer);
    guideTimer = null;
    $("guideWait").hidden = !st.watch;
    if (st.watch) {
      if (st.watch()) return guideGo(st.go);       // 이미 되어 있으면 바로
      guideTimer = setInterval(() => {
        if (guideCur === st && st.watch()) { clearInterval(guideTimer); guideTimer = null; guideGo(st.go); }
      }, 250);
    }
  }

  $("guideStart").addEventListener("click", () => {
    if (guideCur) return guideStop();
    $("guideStart").classList.add("on");
    $("guideStart").textContent = "✦ 가이드 진행 중 — 끝내기";
    guideCount = 0;
    guideGo("start");
  });
  $("guideClose").addEventListener("click", guideStop);

  async function recordVideo() {
    // 캐릭터가 없어도 현재 설정(배경 · 색조 · 화면 효과)만으로 녹화한다
    const W = state.W;
    const H = state.H;
    const canvas = document.createElement("canvas");   // 스트림 소스 (항상 출력 해상도)
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { alpha: false });   // 불투명 = 인코더에도 유리
    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const total = Number($("dur").value);
    const inn = Number($("inDur").value);
    const done = new Promise((res) => { rec.onstop = res; });

    /* --- 한 프레임 그리기: 필요하면 낮은 내부 해상도로 그린 뒤 출력 크기로 확대 --- */
    let rw = W, rh = H, rctx = ctx;
    const setRenderScale = (r) => {
      rw = Math.max(2, Math.round(W * r));
      rh = Math.max(2, Math.round(H * r));
      if (r >= 0.999) { rctx = ctx; return; }
      const rc = scratch("render", rw, rh);
      rctx = rc.x;
    };
    const drawFrame = (sec) => {
      paintBg(rctx, state.bg, bgPhase(sec), rw, rh);              // 미리보기와 동일한 위상
      drawCharacter(rctx, poseAt(clamp01(sec / inn), state.inAnim), rw, rh);
      applyEffects(rctx, rw, rh, bgPhase(sec));                   // 미리보기와 동일한 효과
      if (rctx !== ctx) ctx.drawImage(rctx.canvas, 0, 0, W, H);   // 출력 해상도로 확대
    };

    /* --- 워밍업 + 프레임 비용 측정 → 30fps 를 못 내면 내부 해상도를 자동으로 낮춘다 --- */
    setStatus("준비 중…");
    setRenderScale(1);
    drawFrame(0);                       // 스크래치 캔버스 생성 (첫 프레임 렉 방지)
    let cost = 0;
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      drawFrame(i * 0.05);
      cost = Math.max(cost, performance.now() - t);
    }
    // 인코더도 CPU를 쓰므로 예산을 34fps 로 잡아 여유를 둔다
    const BUDGET = 1000 / 34;
    let scale = 1;
    if (cost > BUDGET) {
      scale = Math.max(0.4, Math.min(1, Math.sqrt(BUDGET / cost)));
      setRenderScale(scale);
      drawFrame(0);                     // 새 크기로 워밍업
    }

    rec.start();
    const t0 = performance.now();
    let frames = 0;
    let checkAt = 0.4;                  // 녹화 중에도 뒤처지면 더 낮춘다
    let elapsed = 0;

    await new Promise((resolve) => {
      const frame = (now) => {
        const sec = (now - t0) / 1000;
        elapsed = sec;
        drawFrame(sec);
        frames++;

        if (sec > checkAt) {            // 실측 fps 기반 적응 (낮추기만 한다)
          const real = frames / sec;
          if (real < 26 && scale > 0.4) {
            scale = Math.max(0.4, scale * Math.sqrt(Math.max(0.5, real / 30)));
            setRenderScale(scale);
          }
          checkAt = sec + 0.5;
        }

        const pct = Math.min(100, Math.round((sec / total) * 100));
        setStatus(`녹화 중… ${pct}%  (${frames}프레임) · 중지하려면 버튼을 누르세요`);
        if (sec < total && !state.stopRequested && !disposed) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

    const stopped = state.stopRequested;

    setStatus(stopped ? "중지 — 지금까지 찍힌 만큼 저장 중…" : "영상 만드는 중…");
    rec.stop();
    await done;
    stream.getTracks().forEach((tr) => tr.stop());
    const blob = new Blob(chunks, { type: mime });

    if (!blob.size) {                                  // 너무 일찍 멈춰 담긴 게 없을 때
      setStatus("중지됨 — 저장할 프레임이 없습니다.");
      return;
    }

    const name = `portrait-${state.bg}-${W}x${H}-${Date.now()}.webm`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);

    const secs = stopped ? Math.max(0.1, elapsed) : total;
    const fps = frames / secs;
    const mb = (blob.size / 1048576).toFixed(1);
    const scaleNote = scale < 0.999 ? ` · 내부 렌더 ${Math.round(scale * 100)}%` : "";
    const bgOnly = state.cutCanvas ? "" : " · 배경만";
    const head = stopped ? `중지 · ${secs.toFixed(1)}초 저장` : "저장 완료";
    setStatus(`${head} · ${name}  (${mb}MB, ${fps.toFixed(0)}fps${scaleNote}${bgOnly})`
      + (fps < 18 ? " — 효과를 줄이거나 캔버스를 작게 하면 더 부드러워집니다" : ""));
  }

  $("record").addEventListener("click", async () => {
    const btn = $("record");

    // 녹화 중이면 이 버튼은 '중지' 다 — 지금까지 찍힌 만큼 저장하고 끝낸다
    if (state.recording) {
      state.stopRequested = true;
      btn.disabled = true;
      btn.textContent = "중지하는 중…";
      return;
    }

    state.recording = true;
    state.stopRequested = false;
    btn.textContent = "■ 중지";
    btn.classList.add("stop");
    btn.title = "녹화를 멈추고 지금까지 찍힌 만큼 저장합니다";
    $("play").disabled = true;
    try {
      await recordVideo();
    } catch (err) {
      setStatus("저장 실패: " + (err && err.message ? err.message : String(err)));
    } finally {
      state.recording = false;
      state.stopRequested = false;
      btn.disabled = false;
      btn.textContent = "영상 저장";
      btn.classList.remove("stop");
      btn.removeAttribute("title");
      $("play").disabled = false;
    }
  });

  syncMaxSideUI(state.maxSide);
  setXY(state.x, state.y);
  setRot(state.rot);
  syncGrid();
  syncFxUI();
  syncBgImage();
  initSections();
  if (loadLocal()) setStatus("이전 설정을 불러왔습니다.");
  applyTint();
  applyReps();
  applyCanvasSize();

  /* ---------- 정리 (React 언마운트 / StrictMode 재마운트) ---------- */
  const exposed = {
    state, paintBg, drawCharacter, poseAt, applyEffects,
    applyCanvasSize, applyReps, applyTint, setXY, setScale, setRot,
    syncFxUI, syncSel, syncGrid, syncRegion, setRegion, totalSec, bgPhase,
    BACKGROUNDS, IN_ANIMS, EFFECTS, CANVAS_SIZES,
    collectSettings, applySettings, saveLocal, loadLocal,
  };
  /* 검증 스위트가 페이지 스코프에서 `state.bg = ...` 처럼 직접 만지므로 전역에 올린다 */
  Object.assign(window, exposed);
  window.__portraitStudio = exposed;

  return function dispose() {
    disposed = true;
    state.stopRequested = true;          // 녹화 중이면 멈춘다
    cancelAnimationFrame(rafId);
    clearInterval(autoSaveTimer);
    clearInterval(guideTimer);
    window.removeEventListener("beforeunload", saveLocal);
    saveLocal();
    for (const k of Object.keys(exposed)) {
      if (window[k] === exposed[k]) delete window[k];
    }
    if (window.__portraitStudio === exposed) delete window.__portraitStudio;
  };
}
