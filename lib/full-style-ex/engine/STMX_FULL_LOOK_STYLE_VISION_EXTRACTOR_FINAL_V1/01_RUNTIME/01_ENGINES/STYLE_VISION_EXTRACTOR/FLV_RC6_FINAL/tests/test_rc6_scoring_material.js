'use strict';
/**
 * RC6 — SCORING-IMPACT-FIRST CORRECTION (CEO 2026-10-17) · S1–S9. Category A-1 only: frozen Colour V1 (run/color_recovery/color_contract_v1.js L89 —
 * "thread, stitching, buttonholes, seams … are NEVER additional colors") applied on the model-output path. An area whose part the model itself names
 * stitching / thread goes to the EXISTING G-1 suppression carrier (suppressed_by 'stitching'); it is never a colour point.
 * Read-only inputs: the 12 sealed EX-04 raw responses and the sealed RC5 CLI (RC5 → RC6 differential). Outputs go to os.tmpdir() only. No model, no network, no credential.
 */
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_' + 'process');   // spawned only to run the RC5 / RC6 CLIs offline (same convention as test_rc5_correction.js; G53-1 still scans every file)
const { X, C, assert, mo } = require('./v14_helpers');
const ROOT = C.ROOT; const EXT = path.join(ROOT, '01_ENGINES', 'STYLE_VISION_EXTRACTOR');
const RC5_CLI = path.join(EXT, 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC5', 'cli', 'run_offline.js'); const RC6_CLI = path.join(__dirname, '..', 'cli', 'run_offline.js');
const RAW = path.join(ROOT, '04_GOVERNANCE_AND_FINAL_DOCS', 'STMX_FULL_LOOK_VISION_EX04_FINAL_LIVE_VALIDATION_V1', '04_RAW_OUTPUTS');
const RUNS = fs.readdirSync(RAW).filter((f) => /^RUN-EX04-\d{4}_attempt\d+\.json$/.test(f)).sort();
const IMG = { '0001': 'F147', '0002': 'M269', '0003': 'F298', '0004': 'F390', '0005': 'M323', '0006': 'M178', '0007': 'M270', '0008': 'F187', '0009': 'F444', '0010': 'M303', '0011': 'M320', '0012': 'REF_000622' };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stmx_rc6_tests_'));
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const cache = {};
function cli(which, file) { const k = which + '|' + file; if (cache[k]) return cache[k]; const od = path.join(TMP, which + '_' + file.replace('.json', '')); const r = cp.spawnSync(process.execPath, [which === 'RC5' ? RC5_CLI : RC6_CLI, '--raw-response', path.join(RAW, file), '--frozen-tc-diagnostic', '--out', od], { encoding: 'utf8' }); const o = { exit: r.status, summary: J(path.join(od, 'summary.json')) }; if (fs.existsSync(path.join(od, 'packet.json'))) { o.packetText = fs.readFileSync(path.join(od, 'packet.json'), 'utf8'); o.packet = JSON.parse(o.packetText); o.prov = J(path.join(od, 'provenance.json')); } return (cache[k] = o); }
const fileOf = (img) => RUNS.find((f) => IMG[f.slice(9, 13)] === img);
const modelObj = (file) => X.transport.parseModelText(X.transport.textFromRawResponse(J(path.join(RAW, file))).text).obj;
const pipe = (obj) => { const cv = X.transport.convertModelOutput(JSON.parse(JSON.stringify(obj))); const r = X.isolation.extractIsolated({ caseObj: cv.case, gateAuthority: new X.routers.GateAuthority() }); return { cv, ...r }; };
const STITCH = /stitch|thread/i;
const partText = (a) => (a.part && typeof a.part === 'object' ? String(a.part.carrier_ref || '') : typeof a.part === 'string' ? a.part : '');
const stitchAreas = (obj) => (obj.colour_areas || []).filter((a) => STITCH.test(partText(a)));
const allPoints = (g) => [...g.points, ...(g.partial || [])];
const jacket = (areas) => mo({ objects: [{ ref: 'c1', identity: 'Jacket', participates: true }, { ref: 'c2', identity: 'footwear', participates: true, product_family: 'shoe' }], colour_areas: areas, facts: { c1: { length: 'Hip Length', grammar: 'Tailored', closure_type: 'Single Breasted Button', collar: 'Notched Lapel', fit: 'Regular', shoulder_structure: 'Mild' } } });
const navy = { carrier: 'c1', family: 'navy', lightness: 'dark', effect: 'none', role: 'field' }; const shoe = { carrier: 'c2', family: 'black', lightness: 'dark', effect: 'none', role: 'point', contrast: 'Distinct' };

module.exports = [
  { name: 'S1 M323 exact raw response: the red stitching area (part "Stitching", emitted as a Distinct point) is no longer a colour point — RC5 delivered it as an approved point, RC6 lists it under colour_composition.suppressed (COLOUR_V1_SUPPRESSION:stitching) and logs family / role / contrast / part', fn: () => {
    const f = fileOf('M323'); const obj = modelObj(f); const st = stitchAreas(obj); assert(st.length >= 1 && st.some((a) => a.family === 'red'), 'M323 response carries a red stitching area');
    const a = cli('RC5', f), b = cli('RC6', f); assert(a.exit === 0 && b.exit === 0 && b.summary.status === 'PACKET_VALID', 'both valid');
    assert(allPoints(a.packet.colour_composition).some((p) => p.color_family === 'red' && p.carrier_part && STITCH.test(p.carrier_part.carrier_ref)), 'RC5 red stitching point reproduced');
    const g = b.packet.colour_composition; assert(!allPoints(g).some((p) => p.carrier_part && STITCH.test(p.carrier_part.carrier_ref)), 'RC6: no stitching point');
    assert(g.suppressed.some((s) => s.carrier_ref === 'c1' && s.rule === 'COLOUR_V1_SUPPRESSION:stitching'), 'RC6: suppressed entry on c1');
    assert(b.prov.transport.log.some((l) => l.kind === 'COLOUR_V1_STITCHING_SUPPRESSED' && l.raw && l.raw.family === 'red'), 'observation kept in the transport log');
  } },
  { name: 'S2 M178 exact raw response: every stitching / thread area the model emitted is suppressed (none reaches field / points / partial); every other colour entry of M178 is identical to RC5', fn: () => {
    const f = fileOf('M178'); const st = stitchAreas(modelObj(f)); assert(st.length >= 1, 'M178 response carries a stitching area');
    const a = cli('RC5', f).packet.colour_composition, b = cli('RC6', f).packet.colour_composition;
    assert(!allPoints(b).some((p) => p.carrier_part && STITCH.test(p.carrier_part.carrier_ref)) && !b.field.some((x) => x.carrier_part), 'no stitching colour');
    assert(b.suppressed.filter((s) => s.rule === 'COLOUR_V1_SUPPRESSION:stitching').length >= 1, 'suppressed');
    const keep = (g) => JSON.stringify({ field: g.field, points: g.points.filter((p) => !(p.carrier_part && STITCH.test(p.carrier_part.carrier_ref))), partial: (g.partial || []).filter((p) => !(p.carrier_part && STITCH.test(p.carrier_part.carrier_ref))), unreadable: g.unreadable });
    assert(keep(a) === keep(b), 'non-stitching colour evidence unchanged');
  } },
  { name: 'S3 the 10 other EX-04 looks: RC6 packet BYTE-IDENTICAL to the sealed RC5 packet (the rule fires only where the model named stitching / thread)', fn: () => {
    let n = 0; for (const f of RUNS) { const img = IMG[f.slice(9, 13)]; const st = stitchAreas(modelObj(f)).length; if (img === 'M323' || img === 'M178') continue; assert(st === 0, img + ' unexpectedly has a stitching area'); const a = cli('RC5', f), b = cli('RC6', f); assert(a.packetText && a.packetText === b.packetText, img + ' packet differs'); n++; }
    assert(n === 10, 'ten looks compared: ' + n);
  } },
  { name: 'S4 rule boundary (synthetic): object part "Stitching" / "Contrast Thread", string part "topstitching" → suppressed; parts "Sleeve", "Collar", "Strap", "Lapel" unchanged (point or partial as before); a stitching field is suppressed too', fn: () => {
    for (const part of [{ carrier_kind: 'generic_descriptor', carrier_ref: 'Stitching' }, { carrier_kind: 'generic_descriptor', carrier_ref: 'Contrast Thread' }, 'topstitching']) {
      const r = pipe(jacket([navy, { carrier: 'c1', family: 'red', lightness: 'normal', effect: 'none', role: 'point', contrast: 'Distinct', part }, shoe])); const g = r.packet.colour_composition;
      assert(r.validation.ok && !allPoints(g).some((p) => p.color_family === 'red') && g.suppressed.length === 1 && g.suppressed[0].rule === 'COLOUR_V1_SUPPRESSION:stitching', JSON.stringify(part));
    }
    for (const ref of ['Sleeve', 'Collar', 'Strap', 'Lapel']) { const r = pipe(jacket([navy, { carrier: 'c1', family: 'red', lightness: 'normal', effect: 'none', role: 'point', contrast: 'Distinct', part: { carrier_kind: 'generic_descriptor', carrier_ref: ref } }, shoe])); const g = r.packet.colour_composition; assert(r.validation.ok && g.suppressed.length === 0 && g.points.some((p) => p.color_family === 'red' && p.carrier_part.carrier_ref === ref), ref); }
    const fr = pipe(jacket([navy, { carrier: 'c1', family: 'white_family', lightness: 'light', effect: 'none', role: 'field', part: { carrier_kind: 'generic_descriptor', carrier_ref: 'Stitching' } }, shoe])); assert(fr.validation.ok && fr.packet.colour_composition.suppressed.length === 1 && fr.packet.colour_composition.field.every((x) => x.color_family !== 'white_family'), 'stitching field suppressed');
  } },
  { name: 'S5 colour opportunity: a carrier whose ONLY colour area is stitching is not treated as coloured — it receives the converter\'s explicit NOT_EMITTED → colour UNKNOWN entry (never ABSENT, nothing invented); the packet stays valid', fn: () => {
    const r = pipe(jacket([{ carrier: 'c1', family: 'red', lightness: 'normal', effect: 'none', role: 'point', contrast: 'Distinct', part: { carrier_kind: 'generic_descriptor', carrier_ref: 'Stitching' } }, shoe])); const g = r.packet.colour_composition;
    assert(r.validation.ok, JSON.stringify(r.validation.errors)); assert(g.unreadable.some((u) => u.carrier_ref === 'c1' && u.state === 'UNKNOWN') && g.suppressed.some((s) => s.carrier_ref === 'c1'), 'c1 colour UNKNOWN + suppressed entry');
    assert(r.cv.not_emitted.some((n) => n.ref === 'c1' && n.fact === 'colour'), 'omission explicit');
  } },
  { name: 'S6 DM and structure: for M323 / M178 the component registry, the fact pool, the upper realization, the relations and dm_evidence are byte-identical to RC5 (only colour_composition and the transport log differ)', fn: () => {
    for (const img of ['M323', 'M178']) { const a = cli('RC5', fileOf(img)).packet, b = cli('RC6', fileOf(img)).packet; for (const k of Object.keys(a)) if (!['colour_composition', 'request_trace'].includes(k)) assert(JSON.stringify(a[k]) === JSON.stringify(b[k]), img + ' ' + k + ' differs'); assert(Object.keys(a).join() === Object.keys(b).join(), img + ' keys'); }
  } },
  { name: 'S7 no fabricated ABSENT / no new vocabulary: no ABSENT appears that RC5 did not have; the suppression rule token is the pre-existing COLOUR_V1_SUPPRESSION:stitching; no new packet key', fn: () => {
    for (const f of RUNS) { const a = cli('RC5', f).packet, b = cli('RC6', f).packet; const ab = (p) => p.component_fact_pool.filter((x) => x.state === 'ABSENT').map((x) => x.component_ref + '.' + x.fact).sort().join(); assert(ab(a) === ab(b), f + ' ABSENT set'); for (const s of b.colour_composition.suppressed) assert(s.rule === 'COLOUR_V1_SUPPRESSION:stitching' && Object.keys(s).join() === 'carrier_ref,rule', f + ' suppressed shape'); }
  } },
  { name: 'S8 replay ledger: 12 / 12 PACKET_VALID · 78 components · 46 / 46 DM systems · 0 local isolations (unchanged from RC5)', fn: () => {
    let comps = 0, dm = 0, iso = 0; for (const f of RUNS) { const b = cli('RC6', f); assert(b.exit === 0 && b.summary.status === 'PACKET_VALID', f); comps += b.packet.component_registry.length; dm += b.packet.dm_evidence.look_detail_systems.length; iso += b.summary.local_isolation.actions; }
    assert(RUNS.length === 12 && comps === 78 && dm === 46 && iso === 0, comps + ' / ' + dm + ' / ' + iso);
  } },
  { name: 'S9 no image-specific logic: the RC6 converter change names no image id, no colour family and no carrier ref (the rule reads only the model\'s own part text)', fn: () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'transport', 'convert.js'), 'utf8'); const lines = src.split('\n').filter((l) => /STITCH_PART_RE|COLOUR_V1_STITCHING_SUPPRESSED/.test(l)).map((l) => l.replace(/\/\/.*$/, ''));
    assert(lines.length >= 2, 'rule lines found'); for (const l of lines) assert(!/\b(F147|M269|F298|F390|M323|M178|M270|F187|F444|M303|M320|REF_000622|red|brown|olive|camel|'c\d+')\b/.test(l), 'image / value specific: ' + l.trim().slice(0, 80));
  } },
];
