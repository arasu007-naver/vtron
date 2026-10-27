'use strict';
/**
 * RC5 — EX-04 DEFECT CORRECTION (CEO 2026-10-16) · R1–R18.
 * Read-only inputs: the 12 sealed EX-04 raw responses (EX-04 package 04_RAW_OUTPUTS) and the sealed RC4 CLI (for the RC4 → RC5 differential).
 * Outputs go to os.tmpdir() only. No model, no network, no credential.
 */
const fs = require('fs'); const path = require('path'); const os = require('os'); const cp = require('child_' + 'process'); const crypto = require('crypto');   // spawned only to run the RC4 / RC5 CLIs offline (same convention as test_rc4_transport.js; G53-1 still scans every file)
const { X, C, assert, mo } = require('./v14_helpers');
const ROOT = C.ROOT; const EXT = path.join(ROOT, '01_ENGINES', 'STYLE_VISION_EXTRACTOR');
const RC4_CLI = path.join(EXT, 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4', 'cli', 'run_offline.js'); const RC5_CLI = path.join(__dirname, '..', 'cli', 'run_offline.js');
const RAW = path.join(ROOT, '04_GOVERNANCE_AND_FINAL_DOCS', 'STMX_FULL_LOOK_VISION_EX04_FINAL_LIVE_VALIDATION_V1', '04_RAW_OUTPUTS');
const RUNS = fs.readdirSync(RAW).filter((f) => /^RUN-EX04-\d{4}_attempt\d+\.json$/.test(f)).sort();
const IMG = { '0001': 'F147', '0002': 'M269', '0003': 'F298', '0004': 'F390', '0005': 'M323', '0006': 'M178', '0007': 'M270', '0008': 'F187', '0009': 'F444', '0010': 'M303', '0011': 'M320', '0012': 'REF_000622' };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'stmx_rc5_tests_'));
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const cache = {};
function cli(which, file, tag) { const k = which + '|' + file + '|' + (tag || ''); if (cache[k]) return cache[k]; const od = path.join(TMP, which + '_' + file.replace('.json', '') + (tag ? '_' + tag : '')); const r = cp.spawnSync(process.execPath, [which === 'RC4' ? RC4_CLI : RC5_CLI, '--raw-response', path.join(RAW, file), '--frozen-tc-diagnostic', '--out', od], { encoding: 'utf8' }); const o = { exit: r.status, summary: J(path.join(od, 'summary.json')), dir: od }; if (fs.existsSync(path.join(od, 'packet.json'))) { o.packetText = fs.readFileSync(path.join(od, 'packet.json'), 'utf8'); o.packet = JSON.parse(o.packetText); o.prov = J(path.join(od, 'provenance.json')); } return (cache[k] = o); }
const fileOf = (img) => RUNS.find((f) => IMG[f.slice(9, 13)] === img);
const modelObj = (file) => X.transport.parseModelText(X.transport.textFromRawResponse(J(path.join(RAW, file))).text).obj;
const pipe5 = (obj) => { const cv = X.transport.convertModelOutput(JSON.parse(JSON.stringify(obj))); const r = X.isolation.extractIsolated({ caseObj: cv.case, gateAuthority: new X.routers.GateAuthority() }); return { cv, ...r }; };
const VIS = ['adjudicable', 'partially_observable:{feet_not_visible}', 'partially_observable:{lower_body_cropped}', 'partially_observable:{small_detail_unresolvable}', 'partially_observable:{occlusion}', 'not_adjudicable:{crop}', 'not_adjudicable:{occlusion}', 'not_adjudicable:{image_failure}', 'not_adjudicable:{not_a_worn_look}'];
const admittedAll = (p) => p.dm_evidence.look_detail_systems.every((s) => VIS.every((v) => { try { X.dm.adaptFrozenDM({ look_components: p.dm_evidence.look_components, look_detail_systems: [JSON.parse(JSON.stringify(s))], dm_evidence_visibility: v }, p.component_registry); return true; } catch (e) { return false; } }));
const twoTone = (extra) => mo({ objects: [{ ref: 'c1', identity: 'Jacket', participates: true }], colour_areas: [{ carrier: 'c1', family: 'navy', lightness: 'dark', effect: 'none', role: 'field' }, { carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field', part: { carrier_kind: 'generic_descriptor', carrier_ref: 'Sleeve' }, ...(extra || {}) }], facts: { c1: { length: 'Hip Length', grammar: 'Tailored', closure_type: 'Double Breasted Button', collar: 'Notched Lapel', fit: 'Regular', shoulder_structure: 'Strong' } } });
const withShoes = (shoe, extraObj) => mo({ objects: [{ ref: 'c1', identity: 'Coat', participates: true }, { ref: 'c2', identity: 'footwear', participates: true, ...shoe }].concat(extraObj || []), colour_areas: [{ carrier: 'c1', family: 'brown', lightness: 'normal', effect: 'none', role: 'field' }, { carrier: 'c2', family: 'black', lightness: 'dark', effect: 'none', role: 'point', contrast: 'Distinct' }].concat((extraObj || []).map((o) => ({ carrier: o.ref, family: 'black', lightness: 'dark', effect: 'none', role: 'point', contrast: 'Distinct' }))) });
const BAD = /^(score|scores|dm_score|ei_score|tc_score|sr_score|direction|strength|rank|style_id|eligible|eligibility|scoring_ready|can_score|sufficient|sufficiency|evidence_sufficient|verdict|tier)$/i;
const keys = (o, out) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) out.push(k); keys(v, out); } return out; };

module.exports = [
  { name: 'R1 M323 exact raw response: sealed RC4 → EXTRACT_FAILURE G1_PART_ON_FIELD (reproduced) · RC5 → PACKET_VALID with 3 components, both DM systems, navy body field and the black sleeve colour kept (point + part Sleeve, contrast UNRESOLVED — not guessed)', fn: () => {
    const f = fileOf('M323'); const a = cli('RC4', f), b = cli('RC5', f);
    assert(a.exit === 2 && a.summary.status === 'EXTRACT_FAILURE' && /^G1_PART_ON_FIELD/.test(a.summary.error) && !a.packet, 'RC4 failure reproduced');
    assert(b.exit === 0 && b.summary.status === 'PACKET_VALID', 'RC5 valid'); const p = b.packet; const g = p.colour_composition;
    assert(p.component_registry.length === 3 && p.dm_evidence && p.dm_evidence.look_detail_systems.length === 2, 'components + DM');
    assert(g.field.some((f2) => f2.color_family === 'navy' && f2.carrier_refs.includes('c1')), 'navy body field');
    const blk = (g.partial || []).find((q) => q.carrier_ref === 'c1' && q.color_family === 'black');
    assert(blk && blk.role === 'point' && blk.color_lightness === 'dark' && blk.color_effect === 'none' && blk.carrier_part.carrier_ref === 'Sleeve' && blk.carrier_part.carrier_kind === 'generic_descriptor' && JSON.stringify(blk.unresolved) === '["contrast_with_field"]' && blk.contrast_with_field === undefined, 'black sleeve kept, contrast unresolved');
    assert(b.prov.transport.log.some((l) => l.kind === 'COLOUR_PART_ON_FIELD_NORMALIZED_TO_POINT' && l.raw && l.raw.role === 'field'), 'normalisation logged with the emitted standing');
  } },
  { name: 'R2 M270 exact raw response: sealed RC4 → EXTRACT_FAILURE FOOTWEAR_USES_PRODUCT_FIELDS_NOT_SUBTYPE (reproduced) · RC5 → PACKET_VALID with 9 components, all 10 DM systems, footwear family sneaker + subtype running_sneaker (one record, no object_subtype)', fn: () => {
    const f = fileOf('M270'); const a = cli('RC4', f), b = cli('RC5', f);
    assert(a.exit === 2 && /^FOOTWEAR_USES_PRODUCT_FIELDS_NOT_SUBTYPE/.test(a.summary.error), 'RC4 failure reproduced');
    assert(b.exit === 0 && b.summary.status === 'PACKET_VALID' && b.packet.component_registry.length === 9 && b.packet.dm_evidence.look_detail_systems.length === 10, 'RC5 valid');
    const e = b.packet.component_registry.find((x) => x.component_ref === 'c9');
    assert(e.footwear_product_family.value === 'sneaker' && e.footwear_product_subtype.value === 'running_sneaker' && e.footwear_product_subtype.state === 'OBSERVED' && e.object_subtype === undefined, 'subtype normalised');
    assert(b.prov.transport.log.some((l) => l.kind === 'FOOTWEAR_SUBTYPE_NORMALIZED' && l.raw === 'running_sneaker'), 'normalisation logged with the source value');
  } },
  { name: 'R3 component-part colour normalisation: a two-tone garment (field body + field-with-part sleeves) keeps BOTH colours; a part colour with an emitted contrast becomes a full point; a mapped free-text part token on a field follows the same rule', fn: () => {
    const r = pipe5(twoTone()); const g = r.packet.colour_composition; assert(r.validation.ok, JSON.stringify(r.validation.errors));
    assert(g.field.length === 1 && g.field[0].color_family === 'navy' && g.partial.length === 1 && g.partial[0].color_family === 'black' && g.partial[0].carrier_part.carrier_ref === 'Sleeve', 'navy field + black sleeve point');
    const r2 = pipe5(twoTone({ contrast: 'Distinct' })); const g2 = r2.packet.colour_composition; assert(r2.validation.ok && !g2.partial && g2.points.length === 1 && g2.points[0].contrast_with_field === 'Distinct' && g2.points[0].carrier_part.carrier_ref === 'Sleeve', 'contrast as emitted');
    const r3 = pipe5(twoTone({ part: 'Strap' })); const g3 = r3.packet.colour_composition; assert(r3.validation.ok && g3.partial[0].carrier_part.carrier_ref === 'Strap', 'string token');
    assert(r.isolation.length === 0 && r2.isolation.length === 0, 'normalisation, not isolation');
  } },
  { name: 'R4 no meaningful colour evidence loss: every (carrier, family) the model emitted for M323, M270 and the synthetic two-tone garment is present in the packet (field · point · partial · unreadable)', fn: () => {
    const check = (obj, p, prov) => { const want = new Set((obj.colour_areas || []).filter((a) => a.family).map((a) => a.carrier + '|' + a.family)); const g = p.colour_composition; const sup = new Set(((prov && prov.transport && prov.transport.log) || []).filter((l) => l.kind === 'COLOUR_V1_STITCHING_SUPPRESSED' && l.raw).map((l) => l.where.replace(/^colour_areas\[|\]$/g, '') + '|' + l.raw.family).filter((k) => g.suppressed.some((x) => x.carrier_ref === k.split('|')[0]))); const have = new Set([...g.field.flatMap((f) => f.carrier_refs.map((r) => r + '|' + f.color_family)), ...g.points.map((q) => (q.carrier_ref.value || '?') + '|' + q.color_family), ...(g.partial || []).map((q) => q.carrier_ref + '|' + q.color_family), ...sup]); for (const w of want) assert(have.has(w), 'lost ' + w); };   /* RC6 version scope: a Colour V1 L89 stitching area is preserved as colour_composition.suppressed + family in the transport log */
    for (const img of ['M323', 'M270']) { const f = fileOf(img); const o5 = cli('RC5', f); check(modelObj(f), o5.packet, o5.prov); }
    check(twoTone(), pipe5(twoTone()).packet);
  } },
  { name: 'R5 footwear subtype compatibility — every approved branch (contracts.FOOTWEAR_PRODUCT_SUBTYPES) through `subtype`, through a refinement envelope and through `product_subtype`; no subtype → unchanged; non-footwear subtype unchanged (object_subtype); an unapproved subtype value is isolated locally (family stands)', fn: () => {
    for (const [fam, subs] of Object.entries(C.FOOTWEAR_PRODUCT_SUBTYPES)) for (const s of subs) {
      for (const shoe of [{ product_family: fam, subtype: s }, { refinement: { state: 'OBSERVED', product_family: fam, subtype: s } }, { product_family: fam, product_subtype: s }]) {
        const r = pipe5(withShoes(shoe)); const e = r.packet.component_registry.find((x) => x.component_ref === 'c2');
        assert(r.validation.ok && e.footwear_product_family.value === fam && e.footwear_product_subtype.value === s && r.isolation.length === 0, fam + '/' + s + ' via ' + Object.keys(shoe).join('+'));
      }
    }
    const plain = pipe5(withShoes({ product_family: 'boot' })); const e0 = plain.packet.component_registry.find((x) => x.component_ref === 'c2'); assert(e0.footwear_product_family.value === 'boot' && e0.footwear_product_subtype === undefined, 'no subtype');
    const bag = pipe5(withShoes({ product_family: 'shoe' }, [{ ref: 'c3', identity: 'bag', participates: true, subtype: 'shoulder_bag' }])); assert(bag.packet.component_registry.find((x) => x.component_ref === 'c3').object_subtype.value === 'shoulder_bag', 'non-footwear subtype');
    const bad = pipe5(withShoes({ product_family: 'boot', subtype: 'chelsea_boot' })); const e1 = bad.packet.component_registry.find((x) => x.component_ref === 'c2');
    assert(bad.validation.ok && e1.footwear_product_family.value === 'boot' && e1.footwear_product_subtype === undefined && bad.isolation.length === 1 && bad.isolation[0].error_class === 'FOOTWEAR_PRODUCT_SUBTYPE_ILLEGAL' && bad.isolation[0].scope === 'ANNOTATION' && bad.packet.component_registry.length === 2, 'illegal subtype isolated');
  } },
  { name: 'R6 conflicting `subtype` vs `product_subtype` → neither chosen (UNCONVERTIBLE with both raw values, family stands); equal values → one record', fn: () => {
    const r = pipe5(withShoes({ product_family: 'sneaker', subtype: 'running_sneaker', product_subtype: 'court_sneaker' })); const e = r.packet.component_registry.find((x) => x.component_ref === 'c2');
    assert(r.validation.ok && e.footwear_product_family.value === 'sneaker' && e.footwear_product_subtype === undefined, 'neither chosen');
    const u = r.cv.unconvertible.find((x) => /FOOTWEAR_SUBTYPE_CONFLICT/.test(x.reason)); assert(u && u.raw.subtype === 'running_sneaker' && u.raw.product_subtype === 'court_sneaker', 'conflict recorded');
    const q = pipe5(withShoes({ product_family: 'sneaker', subtype: 'court_sneaker', product_subtype: 'court_sneaker' })); assert(q.packet.component_registry.find((x) => x.component_ref === 'c2').footwear_product_subtype.value === 'court_sneaker' && q.cv.log.some((l) => l.kind === 'FOOTWEAR_SUBTYPE_DEDUPLICATED'), 'equal → one');
  } },
  { name: 'R7 local field-error isolation: an invalid colour part kind, an invalid pocket instance and a self-relation each remove ONLY that element (colour + relation by RC5 isolation; the pocket fact one layer earlier by the existing converter field check); the jacket, the shoes, their colours, every other fact and the DM systems survive', fn: () => {
    const base = withShoes({ product_family: 'shoe' }); base.dm_subsystem = { look_detail_systems: [{ carrier_refs: ['c2'], look_detail_family: 'H', relational_form: 'accent', size_in_look: { state: 'OBSERVED', value: 'small' }, contrast_in_look: { state: 'OBSERVED', value: 'high' }, position_in_look: { state: 'OBSERVED', value: 'localized' }, repeated_units: 'no' }] };
    const clean = pipe5(base); assert(clean.validation.ok && clean.isolation.length === 0, 'clean');
    const inj = JSON.parse(JSON.stringify(base)); inj.colour_areas.push({ carrier: 'c2', family: 'silver', lightness: 'normal', effect: 'metallic', role: 'point', contrast: 'Distinct', part: { carrier_kind: 'not_a_kind', carrier_ref: 'Buckle' } }); inj.facts.c1.pocket = { state: 'OBSERVED', value: 'Present', pockets: [{ location: 'Nowhere', construction: { state: 'OBSERVED', value: 'Inset' } }] }; inj.layer_relations = [{ over: 'c1', under: 'c1', revealed: [], state: 'OBSERVED' }];
    const r = pipe5(inj); assert(r.validation.ok, JSON.stringify(r.validation.errors));
    const locs = r.isolation.map((x) => x.location).sort(); assert(r.isolation.length === 2 && locs.some((l) => /^colour_areas\[/.test(l)) && locs.some((l) => /^layer_relations\[/.test(l)), 'two narrow RC5 isolations: ' + JSON.stringify(locs));
    assert(r.cv.unconvertible.some((u) => u.where === 'facts[c1].pocket' && /^POCKET_INSTANCE_BAD_LOCATION/.test(u.reason)), 'the bad pocket instance is isolated one layer earlier by the existing converter field check (UNCONVERTIBLE, raw kept)');
    assert(r.packet.component_registry.length === 2 && r.packet.dm_evidence.look_detail_systems.length === 1, 'components + DM kept');
    const strip = (p) => JSON.stringify(p.component_fact_pool.filter((f) => !(f.component_ref === 'c1' && /^pocket/.test(f.fact))).map((f) => [f.component_ref, f.fact, f.state, f.value]));
    assert(strip(r.packet) === strip(clean.packet), 'every other fact identical to the clean run');
    assert(JSON.stringify(r.packet.colour_composition.field) === JSON.stringify(clean.packet.colour_composition.field), 'field colours identical');
    const pk = r.packet.component_fact_pool.find((f) => f.component_ref === 'c1' && f.fact === 'pocket'); assert(!pk || pk.state === 'UNKNOWN', 'isolated pocket reads UNKNOWN, never ABSENT');
  } },
  { name: 'R8 component dependency integrity: isolating a component removes every dependant (colour, facts, front state, relations, attachments, exposure, SR governing ref, DM systems that name it) — no orphan reference, no DM system with an invalid carrier, packet valid', fn: () => {
    const o = withShoes({ product_family: 'shoe' }, [{ ref: 'c3', identity: 'jewellery', participates: true, subtype: 'necklace' }]); o.layer_relations = [{ over: 'c1', under: 'c2', revealed: [], state: 'OBSERVED' }]; o.dm_subsystem = { look_detail_systems: [{ carrier_refs: ['c2'], look_detail_family: 'H', relational_form: 'accent', size_in_look: { state: 'OBSERVED', value: 'small' }, contrast_in_look: { state: 'OBSERVED', value: 'high' }, position_in_look: { state: 'OBSERVED', value: 'localized' }, repeated_units: 'no' }, { carrier_refs: ['c3'], look_detail_family: 'H', relational_form: 'accent', size_in_look: { state: 'OBSERVED', value: 'small' }, contrast_in_look: { state: 'OBSERVED', value: 'high' }, position_in_look: { state: 'OBSERVED', value: 'localized' }, repeated_units: 'no' }] };
    const cv = X.transport.convertModelOutput(o); const c = JSON.parse(JSON.stringify(cv.case)); const { affected, lost } = X.isolation.isolateComponent(c, 'c2');
    assert(affected.length >= 3 && lost.some((l) => /DM system/.test(l)), 'dependants listed');
    const s = JSON.stringify(c); assert(!/"c2"/.test(s), 'no reference to c2 left');
    const r = X.extract({ provider: new X.providers.FixtureProvider(c), gateAuthority: new X.routers.GateAuthority() }); assert(r.validation.ok && r.packet.dm_evidence.look_detail_systems.length === 1 && r.packet.dm_evidence.look_detail_systems[0].carrier_refs[0] === 'c3', 'valid, DM on c3 only');
  } },
  { name: 'R9 whole-look boundary: genuine structural corruption still fails (duplicate component ref → REGISTRY_DUPLICATE_REF; a case-level participant with no colour entry → G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY, CEO §25 rule kept); the error carries the (empty) isolation log', fn: () => {
    const dup = mo({ objects: [{ ref: 'c1', identity: 'Coat', participates: true }, { ref: 'c1', identity: 'Coat', participates: true }] }); let e = null; try { pipe5(dup); } catch (x) { e = x; } assert(e && /^REGISTRY_DUPLICATE_REF/.test(e.message) && Array.isArray(e.isolation), 'duplicate ref fails');
    const nocol = X.transport.convertModelOutput(mo({ objects: [{ ref: 'c1', identity: 'Coat', participates: true }, { ref: 'c2', identity: 'footwear', participates: true, product_family: 'shoe' }] })).case; nocol.colour_areas = nocol.colour_areas.filter((a) => a.carrier !== 'c2'); e = null; try { X.isolation.extractIsolated({ caseObj: nocol }); } catch (x) { e = x; } assert(e && /^G1_COMPONENT_WITHOUT_COLOUR_OPPORTUNITY/.test(e.message), 'a case-level participant with no colour entry still fails closed (§25; from a model output the converter already records it as colour NOT_EMITTED → UNKNOWN, pre-existing V1.3 behaviour)');
  } },
  { name: 'R10 no false ABSENT, no fabricated OBSERVED: in M323 / M270 every ABSENT in the pool was emitted as ABSENT by the model; isolated facts read UNKNOWN; an isolated last colour area becomes colour state UNKNOWN (no value); the partial sleeve colour carries no contrast value', fn: () => {
    for (const img of ['M323', 'M270']) { const f = fileOf(img); const obj = modelObj(f); const p = cli('RC5', f).packet; for (const x of p.component_fact_pool.filter((q) => q.state === 'ABSENT')) { const m = ((obj.facts || {})[x.component_ref] || {})[x.fact]; const raw = m && typeof m === 'object' && !Array.isArray(m) ? m.state || m.value : m; assert(raw === 'ABSENT' || raw === 'None' || (Array.isArray(raw) && !raw.length), img + ' ' + x.component_ref + '.' + x.fact + ' ABSENT not emitted (' + JSON.stringify(m) + ')'); } }
    const o = withShoes({ product_family: 'shoe' }); o.colour_areas = o.colour_areas.filter((a) => a.carrier !== 'c2').concat([{ carrier: 'c2', family: 'black', lightness: 'dark', effect: 'none', role: 'point', contrast: 'Distinct', part: { carrier_kind: 'not_a_kind', carrier_ref: 'Sole' } }]);
    const r = pipe5(o); assert(r.validation.ok, JSON.stringify(r.validation.errors)); const u = r.packet.colour_composition.unreadable.find((x) => x.carrier_ref === 'c2'); assert(u && u.state === 'UNKNOWN' && r.isolation.some((x) => x.scope === 'CONSEQUENCE'), 'colour UNKNOWN after isolation');
  } },
  { name: 'R11 DM Evidence Transport V2: in M323 / M270 every model DM system is serialised verbatim, admitted by the frozen adapter under all 9 DMP-3 tokens, DMP-3 derived from the frame or UNKNOWN', fn: () => {
    for (const img of ['M323', 'M270']) { const f = fileOf(img); const obj = modelObj(f); const p = cli('RC5', f).packet;
      assert(JSON.stringify(p.dm_evidence.look_detail_systems) === JSON.stringify(obj.dm_subsystem.look_detail_systems), img + ' verbatim'); assert(admittedAll(p), img + ' admitted');
      assert((X.dm_projection.mapVisibility(p.look_frame).value || null) === (p.dm_evidence.dm_evidence_visibility.value || null), img + ' DMP-3'); assert(p.dm_transport.output_fingerprint === X.dm.fingerprint(p.dm_evidence), img + ' fingerprint'); }
  } },
  { name: 'R12 EI / TC / SR preservation: for the 10 looks RC4 already delivered, the RC5 packet is BYTE-IDENTICAL to the sealed RC4 packet; M323 / M270 now carry colour, upper realization, relations and facts for every component', fn: () => {
    for (const f of RUNS) { const img = IMG[f.slice(9, 13)]; if (img === 'M323' || img === 'M270' || img === 'M178') continue; const a = cli('RC4', f), b = cli('RC5', f); assert(a.packetText && a.packetText === b.packetText, img + ' packet differs'); }   /* RC6 version scope: M178 colour_composition changes by design (stitching suppression) — covered by test_rc6_scoring_material S2 / S6 */
    for (const img of ['M323', 'M270']) { const p = cli('RC5', fileOf(img)).packet; assert(p.colour_composition && p.upper_realization && p.relations && p.component_registry.every((e) => p.component_fact_pool.some((f) => f.component_ref === e.component_ref)), img + ' evidence present'); }
  } },
  { name: 'R13 G65: no DM proxy, distribution count or duplicated physical system — DM keys are exactly the model\'s, no count-like key anywhere in dm_evidence, no two identical systems (12 responses)', fn: () => {
    for (const f of RUNS) { const p = cli('RC5', f).packet; const sys = p.dm_evidence.look_detail_systems; assert(!keys(p.dm_evidence, []).some((k) => /count|number|total|ratio|percent|distribution/i.test(k)), f + ' count key'); assert(new Set(sys.map((s) => JSON.stringify(s))).size === sys.length, f + ' duplicate system'); }
  } },
  { name: 'R14 original 12-response replay ledger: 12 / 12 PACKET_VALID · 78 components · 46 / 46 DM systems delivered and admitted · no isolation needed (both defects resolved by tier-1 normalisation)', fn: () => {
    let comps = 0, dm = 0, iso = 0; for (const f of RUNS) { const b = cli('RC5', f); assert(b.exit === 0 && b.summary.status === 'PACKET_VALID', f); comps += b.packet.component_registry.length; dm += b.packet.dm_evidence.look_detail_systems.length; iso += b.summary.local_isolation.actions; assert(admittedAll(b.packet), f + ' admitted'); }
    assert(RUNS.length === 12 && comps === 78 && dm === 46 && iso === 0, comps + ' / ' + dm + ' / ' + iso);
  } },
  { name: 'R15 frozen compatibility: V1 Final Freeze + Transport V2 authorities verified; the V1 projection through the unchanged frozen adapter works where DMP-3 is OBSERVED (F187) and is refused where it is UNKNOWN (M323); sealed RC4 code unchanged', fn: () => {
    X.dm_transport.verifyAuthorities(); const f187 = cli('RC5', fileOf('F187')).packet; assert(f187.dm_evidence.dm_evidence_visibility.state === 'OBSERVED' && X.dm_transport.toFrozenV1Block(f187.dm_evidence, f187.component_registry).dm_subsystem, 'V1 projection');
    const m = cli('RC5', fileOf('M323')).packet; let e = null; try { X.dm_transport.toFrozenV1Block(m.dm_evidence, m.component_registry); } catch (x) { e = x; } assert(e && /DM_OUTPUT_SHAPE_ILLEGAL/.test(e.message), 'refused without DMP-3');
    const S = J(path.join(EXT, 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4', 'CODE_IDENTITY_SEAL_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4.json')); const D = path.join(EXT, 'STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4'); const files = {}; (function w(d) { for (const x of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const p = path.join(d, x.name); if (x.isDirectory()) { if (x.name !== 'node_modules') w(p); } else if (!/^CODE_IDENTITY_SEAL_/.test(x.name) && x.name !== '_last_results.json') files['STMX_FULL_LOOK_STYLE_VISION_EXTRACTOR_V1_RELEASE_CANDIDATE_RC4/' + path.relative(D, p).split(path.sep).join('/')] = sha(fs.readFileSync(p)); } })(D);
    assert(sha(Object.keys(files).sort().map((k) => k + ' ' + files[k]).join('\n')) === S.aggregate_sha256, 'RC4 seal intact');
  } },
  { name: 'R16 determinism: the RC5 CLI twice on M323 and M270 gives byte-identical packets; extractIsolated twice on an injected case gives identical packets and isolation logs', fn: () => {
    for (const img of ['M323', 'M270']) { const f = fileOf(img); assert(cli('RC5', f).packetText === cli('RC5', f, 'again').packetText, img); }
    const o = withShoes({ product_family: 'boot', subtype: 'chelsea_boot' }); const a = pipe5(o), b = pipe5(o); assert(JSON.stringify(a.packet) === JSON.stringify(b.packet) && JSON.stringify(a.isolation) === JSON.stringify(b.isolation), 'isolation deterministic');
  } },
  { name: 'R17 no silent swallowing: every isolation record names error class, error, location, original value, action, dependencies, preserved and lost evidence; records reach the packet (request_trace.provider_notes) and the CLI provenance; an unclassifiable error is re-thrown unchanged', fn: () => {
    const o = withShoes({ product_family: 'boot', subtype: 'chelsea_boot' }); const r = pipe5(o); const rec = r.isolation[0];
    for (const k of ['step', 'scope', 'error_class', 'error', 'location', 'original', 'action', 'affected_dependencies', 'preserved', 'lost']) assert(k in rec, 'record key ' + k);
    assert(rec.original.product_subtype === 'chelsea_boot' && r.packet.request_trace.provider_notes.some((n) => n.note === 'RC5_LOCAL_ISOLATION' && n.error_class === 'FOOTWEAR_PRODUCT_SUBTYPE_ILLEGAL'), 'record in the packet');
    let e = null; const cv = X.transport.convertModelOutput(mo({})); try { X.isolation.extractIsolated({ caseObj: cv.case, makeProvider: () => { throw new Error('SYNTHETIC_UNCLASSIFIED'); } }); } catch (x) { e = x; } assert(e && e.message === 'SYNTHETIC_UNCLASSIFIED', 'rethrown');
    const b = cli('RC5', fileOf('M270')); assert(Array.isArray(b.prov.local_isolation) && b.summary.local_isolation.actions === 0, 'provenance carries the (empty) log');
  } },
  { name: 'R18 no scoring logic: no score / direction / strength / verdict / eligibility key in any of the 12 RC5 packets; isolation.js and the RC5 converter changes contain no scoring vocabulary', fn: () => {
    for (const f of RUNS) assert(!keys(cli('RC5', f).packet, []).some((k) => BAD.test(k)), f);
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'isolation.js'), 'utf8'); assert(!/\b(score|scoring_ready|direction|strength|verdict|eligib|style_id)\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'isolation.js');
  } },
];
