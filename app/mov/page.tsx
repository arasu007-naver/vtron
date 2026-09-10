"use client";

/* Portrait Studio (/mov)
   style-ID-movie-studio/canvas-portrait-studio/index.html 의 마크업을 그대로 옮긴 것.

   이 페이지는 상태를 React 로 들고 있지 않다. 원본 스튜디오는 캔버스 렌더 루프와
   포인터 조작(드래그·핸들·회전)을 직접 DOM 으로 다루고, 미리보기와 내보내기가
   같은 페인터를 공유하는 것이 핵심이다. 그 파이프라인을 React 상태로 쪼개면
   "보이는 그대로 저장된다"는 보장이 깨지므로, 마크업만 JSX 로 옮기고 로직은
   lib/mov/portrait-studio.js 의 initPortraitStudio(root) 가 마운트 후에 붙는다. */

import { useEffect, useRef } from "react";
import { initPortraitStudio } from "@/lib/mov/portrait-studio";
import "./mov.css";

export default function MovPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    /* StrictMode 는 이 이펙트를 두 번 돌린다 — dispose 로 첫 인스턴스를 온전히 걷어낸다 */
    return initPortraitStudio(root);
  }, []);

  return (
    <div ref={rootRef} className="mov-app select-text">
      {/* 색수차용 채널 분리 필터 (canvas 의 ctx.filter 에서 참조) */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="fxR" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="fxG" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
        </filter>
        <filter id="fxB" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />
        </filter>
      </svg>

      <aside className="panel">
        <header className="brand">
          <h1>Portrait Studio</h1>
          <p>CSS 배경 + 캐릭터 등장 → 영상</p>
          <button id="guideStart" className="guide-start" type="button">
            ✦ 가이드로 만들기
          </button>
        </header>

        <section>
          <h2>0. 캔버스 크기</h2>
          <div className="dim-badge">
            <strong id="dimLabel">720 × 1280</strong>
            <span id="dimRatio">9:16</span>
          </div>
          <div id="sizeList" className="chip-grid" />
          <div className="xy" style={{ marginTop: 8 }}>
            <label>
              W{" "}
              <input id="canvasW" type="number" min="120" max="4096" step="2" defaultValue="720" />
            </label>
            <label>
              H{" "}
              <input id="canvasH" type="number" min="120" max="4096" step="2" defaultValue="1280" />
            </label>
          </div>
          <p className="hint" id="dimNote" />
        </section>

        <section>
          <h2>1. 배경 애니메이션</h2>
          <div id="bgList" className="chip-grid" />

          <div className="row" style={{ marginTop: 12 }}>
            <label>배경 이미지</label>
            <div className="bgimg-row">
              <label className="file file-sm" id="bgFileLabel">
                <input id="bgFile" type="file" accept="image/*" />
                이미지 선택
              </label>
              <canvas id="bgThumb" width={54} height={54} hidden />
              <button id="bgImgClear" className="tool" type="button" title="배경 이미지 제거" hidden>
                ✕
              </button>
            </div>
            <p className="hint" id="bgImgHint">
              캔버스를 꽉 채우고(cover), 그 위에서 배경 애니메이션이 돕니다.
            </p>
            <div id="animMixRow" hidden>
              <label>
                이미지 위 애니메이션 강도 <span id="animMixVal">100</span>%
              </label>
              <input id="animMix" type="range" min="0" max="100" step="1" defaultValue="100" />
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <label>
              배경 반복 <span id="repsVal">1</span>회 <span className="cap" id="repsHint" />
            </label>
            <input id="bgReps" type="range" min="1" max="20" step="1" defaultValue="1" />
            <p className="hint">
              전체 시간 동안 배경 애니메이션이 몇 바퀴 도는지. 끝과 시작이 이어지도록 만들어져
              있습니다.
            </p>
          </div>

          <div className="row">
            <label>
              배경 색조 <span id="tintVal">0</span>%
            </label>
            <div className="tint-row">
              <input id="bgColor" type="color" defaultValue="#4a7bff" title="배경에 입힐 색" />
              <input id="bgTintAmt" type="range" min="0" max="100" step="1" defaultValue="0" />
              <button id="bgTintReset" className="tool" type="button" title="색조 끄기">
                off
              </button>
            </div>
            <div id="tintSwatches" className="swatches" />
            <div id="tintModes" className="modes" />
            <p className="hint" id="tintHint">
              미리보기와 저장 영상에 똑같이 적용됩니다.
            </p>
          </div>
        </section>

        <section>
          <h2>
            2. 캐릭터 이미지 <span className="cap">선택 사항</span>
          </h2>
          <label className="file" id="fileLabel">
            <input id="file" type="file" accept="image/*" />
            이미지 선택
          </label>
          <div className="row">
            <label>
              배경 제거 강도 <span id="thrVal">42</span>
            </label>
            <input id="threshold" type="range" min="8" max="90" defaultValue="42" />
          </div>
          <div className="row checks">
            <label>
              <input id="edgeFlood" type="checkbox" defaultChecked /> 가장자리부터 제거
            </label>
            <label>
              <input id="feather" type="checkbox" defaultChecked /> 가장자리 부드럽게
            </label>
          </div>
          <div className="row">
            <label>
              처리 해상도 (긴 변) <span id="maxSideVal">1024</span>px
            </label>
            <input id="maxSide" type="range" min="256" max="2048" step="64" defaultValue="1024" />
            <div className="xy" style={{ marginTop: 6 }}>
              <label>
                직접 입력{" "}
                <input
                  id="maxSideNum"
                  type="number"
                  min="256"
                  max="2048"
                  step="64"
                  defaultValue="1024"
                />
              </label>
              <label className="chk">
                <input id="keepOriginal" type="checkbox" /> 원본 해상도 사용
              </label>
            </div>
          </div>
          <canvas id="cutPreview" width={160} height={160} />
          <p className="hint">
            이미지를 넣지 않아도 됩니다 — 배경과 화면 효과만으로 미리보기·영상 저장이 가능합니다.
          </p>
          <p className="hint" id="srcNote">
            이미지를 선택하면 원본/처리 해상도가 표시됩니다.
          </p>
        </section>

        <section>
          <h2>3. 등장 애니메이션</h2>
          <div id="inList" className="chip-grid" />
        </section>

        <section>
          <h2>4. 종착 위치</h2>
          <p className="hint">
            캐릭터를 <b>드래그</b>해 옮기고, 모서리 <b>핸들</b>로 크기를 조절하세요. 빈 곳을
            클릭하면 그 지점이 종착지가 됩니다.
            <br />
            선택 후 방향키 이동 · <kbd>Shift</kbd>+방향키 크게 이동 · <kbd>+</kbd>/<kbd>-</kbd>{" "}
            크기 · <kbd>,</kbd>/<kbd>.</kbd> 회전 · <kbd>Esc</kbd> 선택 해제
          </p>
          <div className="row">
            <label>
              X (좌 ↔ 우) <span id="posXVal">50.0</span>%
            </label>
            <input id="posX" type="range" min="0" max="100" step="0.1" defaultValue="50" />
          </div>
          <div className="row">
            <label>
              Y (상 ↕ 하) <span id="posYVal">62.0</span>%
            </label>
            <input id="posY" type="range" min="0" max="100" step="0.1" defaultValue="62" />
          </div>
          <div className="row">
            <label>
              카드 크기 <span id="sizeVal">38</span>% 가로폭
            </label>
            <input id="cardSize" type="range" min="16" max="80" defaultValue="38" />
          </div>
          <div className="row">
            <label>
              캐릭터 scale <span id="scaleVal">1.00</span>× <span id="scaleMax" className="cap" />
            </label>
            <input id="charScale" type="range" min="0.2" max="3" step="0.01" defaultValue="1" />
            <div className="xy" style={{ marginTop: 6 }}>
              <label>
                직접 입력{" "}
                <input
                  id="charScaleNum"
                  type="number"
                  min="0.2"
                  max="3"
                  step="0.01"
                  defaultValue="1"
                />
              </label>
              <label>
                출력 크기 <input id="charPx" type="text" defaultValue="" readOnly />
              </label>
            </div>
          </div>

          <div className="row">
            <label>회전</label>
            <div className="dial-row">
              <svg
                id="dial"
                className="dial"
                viewBox="0 0 120 120"
                role="slider"
                aria-label="캐릭터 회전"
                aria-valuemin={-180}
                aria-valuemax={180}
                aria-valuenow={0}
              >
                <circle className="dial-track" cx="60" cy="60" r="46" />
                <path id="dialArc" className="dial-arc" d="" />
                <circle id="dialKnob" className="dial-knob" cx="60" cy="14" r="7" />
                <text id="dialText" className="dial-num" x="60" y="58">
                  0°
                </text>
                <text className="dial-sub" x="60" y="76">
                  DEG
                </text>
              </svg>
              <div className="dial-side">
                <p className="hint">
                  원을 드래그해서 회전.
                  <br />
                  <kbd>Shift</kbd> 드래그 = 15° 단위
                  <br />
                  더블클릭 = 0°로
                </p>
                <div className="snap">
                  <button id="rotL" type="button">
                    −90°
                  </button>
                  <button id="rot0" type="button">
                    0°
                  </button>
                  <button id="rotR" type="button">
                    +90°
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>5. 화면 효과</h2>
          <p className="hint" id="fxHint">
            화면이 울렁이거나 흔들리는 후처리(post-processing) 효과. 왼쪽은 켜기/끄기, 오른쪽 숫자는
            세기(%)입니다.
          </p>
          <div id="fxList" className="fx-list" />

          <div className="row" style={{ marginTop: 12 }}>
            <label>적용 범위</label>
            <div id="fxScope" className="modes" />
          </div>

          <div id="fxRegionBox" hidden>
            <p className="hint">
              지점마다 효과 <b>1개</b>씩 지정합니다. 위 목록에서 효과를 고른 뒤 지점을 추가하세요.
              지점은 여러 개 만들 수 있습니다.
            </p>
            <div className="row">
              <button id="spotAdd" className="tool wide" type="button">
                + 이 효과로 지점 추가
              </button>
            </div>
            <div className="row">
              <label>영역 모양</label>
              <div id="fxShape" className="modes" />
            </div>
            <div className="row">
              <button id="fxRegionEdit" className="tool wide" type="button" aria-pressed="false">
                미리보기에서 지점 편집
              </button>
              <p className="hint">
                켜면 미리보기에 40×40 격자점이 표시되고, 지점을 드래그하면{" "}
                <b>중심이 격자점에 붙습니다</b>. 모서리로 크기를 조절합니다.
              </p>
            </div>
            <div className="row">
              <label>
                중심 X <span id="rxVal">50.0</span>% <span className="cap" id="rxCell" />
              </label>
              <input id="regX" type="range" min="0" max="100" step="2.5" defaultValue="50" />
            </div>
            <div className="row">
              <label>
                중심 Y <span id="ryVal">50.0</span>% <span className="cap" id="ryCell" />
              </label>
              <input id="regY" type="range" min="0" max="100" step="2.5" defaultValue="50" />
            </div>
            <div className="row">
              <label>
                너비 <span id="rwVal">30</span>%
              </label>
              <input id="regW" type="range" min="2.5" max="100" step="2.5" defaultValue="30" />
            </div>
            <div className="row">
              <label>
                높이 <span id="rhVal">20</span>%
              </label>
              <input id="regH" type="range" min="2.5" max="100" step="2.5" defaultValue="20" />
            </div>
            <div className="row">
              <label>
                경계 부드럽게 <span id="rfVal">8</span>%
              </label>
              <input id="regFeather" type="range" min="0" max="40" step="1" defaultValue="8" />
            </div>
          </div>
        </section>

        <section>
          <h2>6. 타임라인</h2>
          <div className="xy">
            <label>
              전체{" "}
              <input id="dur" type="number" min="1.5" max="12" step="0.5" defaultValue="4" />초
            </label>
            <label>
              등장{" "}
              <input id="inDur" type="number" min="0.3" max="4" step="0.1" defaultValue="1.1" />초
            </label>
          </div>
        </section>

        <div className="dock">
          <div className="toolbar">
            <button
              id="setExport"
              className="tool"
              type="button"
              title="현재 설정을 JSON 파일로 (이미지 포함)"
            >
              내보내기
            </button>
            <button id="setImport" className="tool" type="button" title="JSON 설정 파일 불러오기">
              가져오기
            </button>
            <button id="setReset" className="tool" type="button" title="모든 설정을 처음 상태로">
              초기화
            </button>
            <span className="spacer" />
            <button
              id="gridBtn"
              className="tool"
              type="button"
              aria-pressed="false"
              title="10% 간격 그리드 표시 (미리보기 전용)"
            >
              Grid
            </button>
          </div>

          <div className="actions">
            <button id="play" type="button">
              미리보기
            </button>
            <button id="record" type="button" className="primary">
              영상 저장
            </button>
          </div>
          <p id="status" className="status" />
        </div>
        <input id="setFile" type="file" accept="application/json,.json" hidden />
      </aside>

      <main className="stage-wrap">
        {/* 대화식 가이드 */}
        <aside id="guide" className="guide" hidden>
          <header>
            <strong>가이드</strong>
            <span id="guideStep" />
            <button id="guideClose" type="button" title="가이드 끝내기">
              ✕
            </button>
          </header>
          <p id="guideQ" className="q" />
          <p id="guideHint" className="hint" />
          <div id="guideChoices" className="guide-choices" />
          <p id="guideWait" className="waiting" hidden>
            기다리는 중…
          </p>
        </aside>

        {/* 지점 목록: 반투명 modeless 오버레이 */}
        <aside id="spotPanel" className="spot-panel" hidden>
          <header id="spotHead" title="접기 / 펼치기">
            <strong>
              <span id="spotCaret">▾</span> 효과 지점
            </strong>
            <span id="spotCount">0</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>효과</th>
                <th>중심</th>
                <th>크기</th>
                <th>세기</th>
                <th />
              </tr>
            </thead>
            <tbody id="spotRows" />
          </table>
          <p className="empty" id="spotEmpty">
            아직 지점이 없습니다.
            <br />
            효과를 고르고 <b>+ 지점 추가</b>를 누르세요.
          </p>
        </aside>

        <div className="phone">
          <div id="stageBox" className="stage-box">
            <div id="stage" className="stage">
              {/* 배경은 내보내기와 완전히 같은 페인터로 이 캔버스에 그린다 */}
              <canvas id="fx" />
              <div id="grid" className="grid" hidden />
              <div id="snapGrid" className="snap-grid" hidden />
              <div id="target" className="target" />
            </div>
            {/* 지점 중심을 가로지르는 정렬 가이드 (편집 중에만) */}
            <div id="fxCross" className="fx-cross" hidden>
              <span className="vx" />
              <span className="hz" />
            </div>
            {/* 화면 효과를 적용할 영역 */}
            <div id="fxRegion" className="fx-region" hidden>
              <span className="h" data-r="nw" />
              <span className="h" data-r="ne" />
              <span className="h" data-r="sw" />
              <span className="h" data-r="se" />
              <span className="cross" />
              <span className="cdot" />
              <span className="clabel" id="fxCLabel" />
            </div>
            {/* 선택 UI 는 스테이지 클리핑 밖에 둔다: 카드가 화면보다 커도 핸들을 잡을 수 있어야 함 */}
            <div id="sel" className="sel" hidden>
              <span className="h" data-h="nw" />
              <span className="h" data-h="ne" />
              <span className="h" data-h="sw" />
              <span className="h" data-h="se" />
              <span
                className="rot"
                data-h="rot"
                title="드래그해서 회전 (Shift = 15° 단위)"
              />
            </div>
          </div>
        </div>
        <p className="caption" id="caption">
          720 × 1280 · 드래그 = 이동 · 핸들 = 크기
        </p>
      </main>
    </div>
  );
}
