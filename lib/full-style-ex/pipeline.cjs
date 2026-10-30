'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS 파일이고, 동결 엔진(CommonJS)을 런타임에 require 한다 */
/**
 * Full-Look Style ID 파이프라인 (오프라인 단계) — 모델 텍스트 → Evidence Packet → 4축 방향 → 스타일 아이디.
 *
 *   1. 추출   : Frozen Full-Look Vision Extractor (FLV-FINAL-FREEZE-V1) 의 FLV_RC6_FINAL 런타임
 *              (cli/run_offline.js 의 --model-text 경로와 같은 순서)
 *   2. 판정   : Full-Look 4축 통합 Runtime FL4AX_FINAL_V1 (FL4AX-FINAL-FREEZE-V1-2026-10-29) 의 scoreFullLook —
 *              EI · TC · SR · DM 동결 엔진(FLEI · FLTC · FLSR · FLDM)에 같은 증거를 넘기고 네 방향 → 스타일 아이디.
 *              한 축이라도 판정 불가면 스타일 아이디는 null — 글자를 채우거나 뒤집지 않는다.
 *
 * 엔진은 lib/full-style-ex/engine/ 에 동결 릴리스 원본 그대로 둔다(골든 표본 golden/ 만 뺐다 — 런타임이 읽지 않는다).
 * 원본: /stmx/engine/business_logic/FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017 ·
 *       /stmx/engine/22_FULL_LOOK_STYLE_SCORING_ENGINES/05_FULL_LOOK_4_AXIS_INTEGRATED_FINAL/ENGINES.
 * 로드 시 각 엔진이 자기 봉인 · manifest · 런타임 파일의 SHA-256 을 검사한다(어긋나면 예외).
 * 모델 호출은 여기서 하지 않는다 (route.ts 가 한다). 네트워크 · 자격 증명 없음.
 */
const path = require('path');
const crypto = require('crypto');

const ENGINE_ROOT = path.join(process.cwd(), 'lib/full-style-ex/engine');
const FLV = path.join(ENGINE_ROOT, 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1');
const FLV_SRC = path.join(FLV, '01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL/src');
const PROMPT_FILE = path.join(FLV, '02_PROMPT/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt');
/** 4축 통합 Runtime — 네 축 릴리스가 같은 부모(ENGINES/)에 있어야 한다 */
const FL4AX_ENTRY = path.join(ENGINE_ROOT, 'ENGINES/FL4AX_FINAL_V1/lib/release_entry.js');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clone = (o) => JSON.parse(JSON.stringify(o));

/** 승인 프롬프트 V2 원문 · 해시 */
function prompt() {
  const text = require('fs').readFileSync(PROMPT_FILE, 'utf8');
  return { text, sha256: sha(text), version: 'V2' };
}

/**
 * 동결 변환기에 넘기기 전의 기계적 정리 (개선 #13 — 프롬프트 대신 코드가 맡는 계약).
 * 관찰값은 바꾸지 않고 키 모양만 맞추며, 바꾼 것은 모두 로그로 남긴다.
 *   · detail_systems (프롬프트 v1.1 의 중립 키, 개선 #10) → dm_subsystem.look_detail_systems (동결 계약 키)
 *   · facts 안의 participation · admitted · eligible · excluded → 지움 (개선 #1)
 *   · facts 의 pocket_construction · pocket_projection 단독 사실 → 지움 (pockets[] 만 계약)
 *   · dm_subsystem 안의 look_components · dm_evidence_visibility → 지움 (코드가 조립하는 필드)
 */
const FORBIDDEN_FACT_KEYS = ['participation', 'participates', 'admitted', 'eligible', 'excluded', 'pocket_construction', 'pocket_projection'];
function normalize(obj) {
  const log = [];
  if (!obj || typeof obj !== 'object') return { obj, log };
  const o = clone(obj);
  if (Array.isArray(o.detail_systems)) {
    if (o.dm_subsystem) log.push({ action: 'DROP_DUPLICATE', key: 'dm_subsystem', note: 'detail_systems 와 dm_subsystem 이 함께 와서 detail_systems 를 썼다' });
    o.dm_subsystem = { look_detail_systems: o.detail_systems };
    delete o.detail_systems;
    log.push({ action: 'RENAME', from: 'detail_systems', to: 'dm_subsystem.look_detail_systems', count: o.dm_subsystem.look_detail_systems.length });
  }
  if (o.dm_subsystem && typeof o.dm_subsystem === 'object') {
    for (const k of ['look_components', 'dm_evidence_visibility']) {
      if (k in o.dm_subsystem) { delete o.dm_subsystem[k]; log.push({ action: 'DROP', key: 'dm_subsystem.' + k }); }
    }
  }
  if (o.facts && typeof o.facts === 'object') {
    for (const [ref, facts] of Object.entries(o.facts)) {
      if (!facts || typeof facts !== 'object') continue;
      for (const k of FORBIDDEN_FACT_KEYS) {
        if (k in facts) { delete facts[k]; log.push({ action: 'DROP', key: 'facts.' + ref + '.' + k }); }
      }
    }
  }
  return { obj: o, log };
}

/**
 * 모델 텍스트 → 패킷 · 검증 · run_record. 실패 단계는 status 로 돌려준다 (예외를 던지지 않는다).
 *   status: PACKET_VALID | PACKET_INVALID | TRANSPORT_FAILURE | EXTRACT_FAILURE
 */
function extract(modelText, identity) {
  const X = require(FLV_SRC);
  const RR = require(path.join(FLV_SRC, 'run_record'));
  const out = { status: null, model_output: null, normalized: [], transport: null, native: null, packet: null, validation: null, run_record: null, error: null };
  let transport; let normalizedText = modelText;
  try {
    const parsed = X.transport.parseModelText(modelText);
    out.model_output = parsed.obj;
    const n = normalize(parsed.obj);
    out.normalized = n.log;
    if (n.log.length) normalizedText = JSON.stringify(n.obj);
    transport = X.transport.convertModelOutput(clone(n.obj));
    out.transport = { shape_variant: transport.shape_variant, counts: transport.counts, fences_stripped: parsed.fences_stripped, unconvertible: transport.unconvertible, not_emitted: transport.not_emitted };
  } catch (e) {
    out.status = 'TRANSPORT_FAILURE'; out.error = e.message; return out;
  }
  try {
    // 형식(펜스 · 설명 · 객체 하나)은 모델이 낸 원문으로, 모양 · 어휘는 정리한 뒤의 JSON 으로 본다
    const strict = X.transport.parseStrictNative(modelText);
    const nc = X.transport.checkNative(strict.ok ? normalizedText : modelText);
    out.native = { strict_json_as_emitted: nc.strict_json_as_emitted, native_conformant: nc.native_conformant, shape_and_vocabulary_conformant: nc.shape_and_vocabulary_conformant, counts: nc.counts };
  } catch (e) {
    out.native = { error: e.message };
  }
  const caseObj = transport.case;
  delete caseObj.gate_signals; delete caseObj._reading;                     // run_offline.js 와 같다 — 참조 쪽 값은 넘기지 않는다
  let result;
  try {
    result = X.isolation.extractIsolated({ caseObj, makeProvider: (c) => new X.providers.FixtureProvider(c, null), requestedAxes: undefined, gateAuthority: new X.routers.GateAuthority() });
  } catch (e) {
    out.status = 'EXTRACT_FAILURE'; out.error = e.message; if (e.isolation) out.local_isolation = e.isolation; return out;
  }
  if (result.isolation) out.local_isolation = result.isolation;
  out.packet = result.packet;
  out.validation = { ok: result.validation.ok, errors: result.validation.errors };
  if (result.validation.ok) {
    out.run_record = RR.buildRunRecord({ packet: result.packet, validation: result.validation, ...identity });
  }
  out.status = result.validation.ok ? 'PACKET_VALID' : 'PACKET_INVALID';
  return out;
}

/**
 * 패킷 + run_record → 4축 통합 판정 (STMX_FULL_LOOK_FOUR_AXIS_RESULT_V1).
 *   { status: COMPLETE | INPUT_FAILURE | CONTRACT_VIOLATION, style_id, directions: { EI, TC, SR, DM },
 *     axes: { 축: { status, direction, direction_label, rule, input_failure, contract_violation, reason_ko, engine } },
 *     reason_ko, provenance, diagnostics, engine_records }
 * 엔진 결합(봉인 검사)이 실패하면 예외 — 판정을 지어내지 않는다.
 */
function score(packet, runRecord) {
  return require(FL4AX_ENTRY).scoreFullLook({ packet: clone(packet), run_record: clone(runRecord) });
}

module.exports = { prompt, extract, score, sha, normalize, ENGINE_ROOT };
