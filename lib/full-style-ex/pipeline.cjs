'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS 파일이고, 동결 엔진(CommonJS)을 런타임에 require 한다 */
/**
 * Full-Look Style ID 파이프라인 (오프라인 단계) — 모델 텍스트 → Evidence Packet → EI · TC · SR 방향.
 *
 *   1. 추출   : FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017 의 FLV_RC6_FINAL 런타임 (cli/run_offline.js 의 --model-text 경로와 같은 순서)
 *   2. 스코어링: 22_FULL_LOOK_STYLE_SCORING_ENGINES 의 FLSR · FLTC · FLEI 릴리스 (각 lib/release_paths.js 의 score)
 *
 * 엔진은 동결 릴리스를 원본 그대로 require 한다 — 로드 시 각 엔진이 자기 고정 파일의 SHA-256 을 검사한다(어긋나면 예외).
 * 모델 호출은 여기서 하지 않는다 (route.ts 가 한다). 네트워크 · 자격 증명 없음.
 */
const path = require('path');
const crypto = require('crypto');

const BL = path.join(process.cwd(), 'business_logic');
const FLV_SRC = path.join(BL, 'FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/01_RUNTIME/01_ENGINES/STYLE_VISION_EXTRACTOR/FLV_RC6_FINAL/src');
const PROMPT_FILE = path.join(BL, 'FULL_LOOK_VISION_EXTRACTOR_FINAL_20261017/STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_FINAL_V1/02_PROMPT/STMX_FULL_LOOK_INTEGRATED_EXTRACTION_PROMPT_CANDIDATE_V2.txt');
const ENGINES = {
  EI: path.join(BL, '22_FULL_LOOK_STYLE_SCORING_ENGINES/03_EI_DIRECTION_ENGINE_FINAL/FLEI_FINAL_V1/lib/release_paths.js'),
  TC: path.join(BL, '22_FULL_LOOK_STYLE_SCORING_ENGINES/02_TC_DIRECTION_ENGINE_FINAL/FLTC_FINAL_V1/lib/release_paths.js'),
  SR: path.join(BL, '22_FULL_LOOK_STYLE_SCORING_ENGINES/01_SR_DIRECTION_ENGINE_FINAL/FLSR_FINAL_V1/lib/release_paths.js'),
};

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

/** 패킷 + run_record → 축별 방향 기록. 축 하나가 실패해도 나머지는 돌려준다. */
function score(packet, runRecord) {
  const results = {};
  for (const [axis, entry] of Object.entries(ENGINES)) {
    try {
      results[axis] = require(entry).score(clone(packet), clone(runRecord));
    } catch (e) {
      results[axis] = { axis, status: 'ENGINE_ERROR', direction: null, error: e.message };
    }
  }
  return results;
}

module.exports = { prompt, extract, score, sha, normalize };
