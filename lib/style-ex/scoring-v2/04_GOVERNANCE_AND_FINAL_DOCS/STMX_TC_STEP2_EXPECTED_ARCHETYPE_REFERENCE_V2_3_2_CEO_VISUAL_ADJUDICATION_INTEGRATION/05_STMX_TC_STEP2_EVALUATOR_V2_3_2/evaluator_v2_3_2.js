'use strict';
// STMX_TC_STEP2_EVALUATOR_V2_3_2 — additive revision over the sealed V2.2.1 evaluator (95f23462…) wrapping the sealed V2.2 base (4cdc88f5…).
// Integrates the CEO visual adjudications (V2.3.2 order §2–§9) as ONE doctrine: FEATURE PRESENCE ≠ FEATURE / MATERIAL / COMPONENT AS A STRUCTURAL BODY SYSTEM.
// Consumes canonical observation surfaces only: D-4 locations[] (component-level vs Panel / Edge), coverage on admitted classes, pocket instances + multiplicity metadata,
// silhouette (lower geometry), fit, waist_definition, shoulder_connection. No evidence text, no descriptor, no GT, no stored score, no fixture expectation is read here.
const B221 = require('./evaluator_v2_2_1.js'); const BASE = require('./evaluator_v2_2_base.js');
const EVALUATOR_VERSION = 'STMX_TC_STEP2_EVALUATOR_V2_3_2 · r1 (CEO visual adjudication integration · structural-role doctrine)';
const { f, V, asymmetry, asymmetrySource, direction, tierEvidence, pairDirection, pairTier, prop } = B221;
const TOPS = ['tshirt', 'shirt', 'sweater', 'sweatshirt']; const LOWER_KEYS = ['trouser', 'jumpsuit']; const ONE_PIECE = ['dress', 'jumpsuit'];
const SUBSTANTIAL_BODY = ['Body', 'Bodice', 'Skirt Body', 'Leg', 'Sleeve']; const MINOR_BODY = ['Hood', 'Shoulder']; const BODY_COMPONENTS = SUBSTANTIAL_BODY.concat(MINOR_BODY);
const TRIM_COMPONENTS = ['Collar', 'Lapel', 'Cuff', 'Hem', 'Waistband', 'Pocket', 'Strap']; const ATTACH_ADJUST_COMPONENTS = ['Hood', 'Waistband', 'Cuff', 'Hem', 'Collar', 'Pocket', 'Strap', 'Lapel'];
const FILL_MATERIAL = ['Padding']; const OPENWORK_CONSTRUCTION = ['Lace', 'Mesh']; const TRANSPARENCY = ['Transparent', 'Semi Transparent'];
const ATT_UNIVERSAL_FUNCTIONAL = ['Belt', 'Metal Hardware']; const ATT_GRAMMAR_FUNCTIONAL = ['Epaulette', 'Storm Flap']; const GRAMMAR_FUNCTIONAL_KEYS = ['JACKET:Utility', 'COAT:Utility']; const ATT_DECORATIVE = ['Jewelry Attachment', 'Fringe', 'Feather', 'Ribbon', 'Fur Trim'];
const CARGO_NATIVE_KEYS = ['JACKET:Utility', 'COAT:Utility']; const POCKET_BODY_LOCATIONS = ['Leg', 'Lower Front', 'Chest']; const BODICE_SUSPENSION = ['Halter', 'Strapless'];

function multi(o, p) {
  const x = o && o[p]; if (!x || x.state !== 'OBSERVED') return [];
  const norm = (d) => ({ value: d && d.value != null ? String(d.value) : null, descriptor: (d && d.descriptor) || null, coverage: (d && d.coverage) || null, locations: (d && Array.isArray(d.locations) && d.locations.length) ? d.locations.map((l) => ({ component: l.component || null, descriptor: l.descriptor || null })) : null, d4_source: (d && d.d4_source) || null });
  if (Array.isArray(x.values_detail) && x.values_detail.length) return x.values_detail.map(norm).filter((d) => d.value);
  if (Array.isArray(x.values) && x.values.length && typeof x.values[0] === 'object') return x.values.filter(Boolean).map(norm).filter((d) => d.value);
  if (Array.isArray(x.values) && x.values.length) return x.values.filter(Boolean).map((v) => norm({ value: v }));
  if (x.value != null) return String(x.value).split('+').filter(Boolean).map((v) => norm({ value: v }));
  return [];
}
// bind — canonical D-4 classification: TRIM · PANEL(parents) · BODY(zone · substantial) · UNBOUND. Panel entries never form a zone. Component-level binding = the value REALISES that component.
function bind(d, forAttachment) {
  if (!d.locations) return { cls: 'UNBOUND', zone: [], source: 'D4_NOT_OBSERVED', detail: null };
  const comps = d.locations.map((l) => l.component).filter(Boolean); const descs = d.locations.map((l) => l.descriptor).filter(Boolean); const src = d.d4_source || 'D4_OBSERVED'; const allowed = forAttachment ? ATTACH_ADJUST_COMPONENTS : TRIM_COMPONENTS;
  if (!comps.length && descs.includes('Edge')) return { cls: 'TRIM', zone: [], source: src, detail: 'Edge' };
  if (comps.length && comps.every((c) => allowed.includes(c) || (forAttachment && c === 'Hood'))) return { cls: 'TRIM', zone: [], source: src, detail: comps.join('+') + (descs.length ? '(' + descs.join('/') + ')' : '') };
  if (d.locations.every((l) => l.descriptor === 'Panel' && l.component)) return { cls: 'PANEL', zone: [], parents: comps, source: src, detail: comps.map((c) => c + '/Panel').join('+') };
  const zone = [...new Set(d.locations.filter((l) => l.descriptor !== 'Panel').map((l) => l.component).filter((c) => BODY_COMPONENTS.includes(c)))];
  if (zone.length) return { cls: 'BODY', zone, substantial: zone.filter((c) => SUBSTANTIAL_BODY.includes(c)), source: src, detail: comps.join('+') + (descs.length ? '(' + descs.join('/') + ')' : '') };
  return { cls: 'UNBOUND', zone: [], source: 'D4_OBSERVED_NO_CLASS', detail: comps.concat(descs).join('+') };
}
const shares = (a, b) => a.some((x) => b.includes(x));
// ── F1 · material systems → BODY-zone hybrid (CEO §1 V2.3.1 + §2 sectional body + §7 layered body) ──
function resolveMaterial(o, key) {
  const raw = multi(o, 'material'); if (raw.length < 2) return null;
  const byValue = new Map(); for (const d of raw) { const k = byValue.get(d.value); if (!k) byValue.set(d.value, { ...d, locations: d.locations ? d.locations.slice() : null }); else if (d.locations) { k.locations = (k.locations || []).concat(d.locations); } }
  const mats = [...byValue.values()]; const trace = []; const R = (outcome, rule, why, extra) => Object.assign({ outcome, rule, family: 'F1', why, trace, carrier: 'material', strong: false }, extra || {});
  if (mats.length < 2) return R('CLEARED', 'REL-F1-SINGLE-MATERIAL', 'one material value on several components = one material system (colour blocking has no TC carrier)');
  const items = mats.map((d) => ({ ...d, fill: FILL_MATERIAL.includes(d.value), b: bind(d, false) })); for (const i of items) trace.push(i.value + (i.fill ? ' [fill]' : '') + ' → ' + i.b.cls + (i.b.detail ? '@' + i.b.detail : '') + ' (' + i.b.source + ')');
  const fills = items.filter((i) => i.fill), nf = items.filter((i) => !i.fill);
  const bodyNF = nf.filter((m) => m.b.cls === 'BODY'); const realised = new Set(bodyNF.flatMap((m) => m.b.zone)); const panels = nf.filter((m) => m.b.cls === 'PANEL'); const orphan = panels.filter((m) => !m.b.parents.some((p) => realised.has(p))); const unbound = nf.filter((m) => m.b.cls === 'UNBOUND'); const bodyish = bodyNF.concat(unbound, orphan);
  if (bodyish.length >= 2 && unbound.length) return R('UNRESOLVED', 'CON-UNRES-D4-LOCATION-NOT-OBSERVED', 'two or more body-realising material candidates (' + bodyish.map((x) => x.value).join(', ') + ') and at least one carries no canonical D-4 binding — the material-to-component relationship is not observed');
  if (orphan.length) return R('UNRESOLVED', 'CON-UNRES-C3-PANEL-PARENT-NOT-OBSERVED', orphan.map((x) => x.value + '@' + x.b.detail).join(', ') + ' is bound as a Panel of a component that no other material realises — substantial section vs local panel not decidable from this binding');
  const trims = nf.filter((m) => m.b.cls === 'TRIM');
  const systems = bodyNF.concat(unbound).map((m) => ({ materials: [m.value], zones: m.b.zone.slice(), substantial: (m.b.substantial || []).slice() }));
  for (const fl of fills) { if (fl.b.cls === 'BODY') { const hosts = systems.filter((s) => shares(s.zones, fl.b.zone)); if (hosts.length) hosts.forEach((h) => h.materials.push(fl.value + '[fill]')); else systems.push({ materials: [fl.value + '[padded system]'], zones: fl.b.zone.slice(), substantial: fl.b.substantial.slice(), padded: true }); } else if (systems.length >= 2 && fl.b.cls === 'UNBOUND') return R('UNRESOLVED', 'CON-UNRES-D4-LOCATION-NOT-OBSERVED', 'fill (' + fl.value + ') carries no canonical D-4 binding while two body-realising materials exist — whether it forms its own padded zone is not observed'); else if (systems.length === 1) systems[0].materials.push(fl.value + '[fill]'); }
  const sub = systems.filter((s) => s.substantial.length);
  if (sub.length >= 2) {
    // layered body: two systems SHARE a substantial zone and an openwork / transparency surface is bound to that zone (or present unbound as whole-realisation) → transparent outer + inner body
    const surf = multi(o, 'surface').filter((d) => OPENWORK_CONSTRUCTION.includes(d.value) || TRANSPARENCY.includes(d.value));
    const sharedZones = [...new Set(sub.flatMap((s) => s.substantial))].filter((z) => sub.filter((s) => s.substantial.includes(z)).length >= 2);
    const layered = sharedZones.length && surf.some((d) => !d.locations || d.locations.some((l) => sharedZones.includes(l.component)));
    const desc = sub.map((s) => '{' + s.materials.join('+') + '}@' + s.zones.join('+')).join(' × ');
    if (layered) return R('TRUE', 'CON-TRUE-R1-LAYERED-STRUCTURAL-BODY', 'two material systems share a substantial BODY zone (' + sharedZones.join('+') + ') with an openwork / transparent outer surface on it — independent outer body + independent inner body both realising the garment (CEO §7 Layered Structural Body doctrine): ' + desc, { layered_zones: sharedZones });
    return R('TRUE', 'CON-TRUE-C3-BODY-ZONE-HYBRID', 'materially distinct systems each realising substantial BODY zones — ' + desc + ' — sectional / zoned body construction (CEO §1 V2.3.1 · §2 V2.3.2 sectional body doctrine; C-3 Material-Construction System × System); not STRONG');
  }
  const parts = []; if (fills.length) parts.push('REL-F1-FILL: ' + fills.map((x) => x.value).join('+') + ' = fill of the shell it shares a zone with'); if (trims.length) parts.push('REL-F1-TRIM: ' + trims.map((x) => x.value + '@' + x.b.detail).join(', ') + ' bound only to trim-class components'); const pn = panels.filter((m) => !orphan.includes(m)); if (pn.length) parts.push('REL-F1-PANEL: ' + pn.map((x) => x.value + '@' + x.b.detail).join(', ') + ' = local panel of a component another material realises'); const minor = systems.filter((s) => !s.substantial.length && s.zones.length); if (minor.length) parts.push('REL-F1-COMPONENT-SCALE: ' + minor.map((x) => x.materials.join('+') + '@' + x.zones.join('+')).join(', ') + ' bound only to component-scale parts');
  return R('CLEARED', parts.length ? [...new Set(parts.map((p) => p.split(':')[0]))].join('+') : 'REL-F1-FILL', (parts.join(' · ') || 'one body-realising system') + ' ⇒ multi-material = conventional coexistence (count and presence are not the test)');
}
// ── F2 · openwork construction → structural role (CEO §3) ──
function resolveSurface(o, key) {
  const vals = multi(o, 'surface').filter((d) => OPENWORK_CONSTRUCTION.includes(d.value) || TRANSPARENCY.includes(d.value)); if (!vals.length) return null;
  const trace = []; let departure = null, residual = null; const cleared = [];
  for (const d of vals) { if (TRANSPARENCY.includes(d.value)) { cleared.push('REL-F2-TRANSPARENCY-EI: ' + d.value + ' — transparency alone is EI-owned; never a TC carrier by itself'); trace.push(d.value + ' → TRANSPARENCY (EI)'); continue; }
    const b = bind(d, false); trace.push(d.value + ' → ' + b.cls + (b.detail ? '@' + b.detail : '') + ' (' + b.source + ')');
    if (b.cls === 'BODY' && b.substantial.length) departure = departure || { rule: 'CON-TRUE-R1-OPENWORK-BODY-CONSTRUCTION', why: d.value + ' openwork construction realises substantial BODY zone(s) ' + b.substantial.join('+') + ' rather than decorating them — the archetype\'s primary construction grammar is changed (CEO §3); not transparency' };
    else if (b.cls === 'UNBOUND') residual = residual || { rule: 'CON-UNRES-OPENWORK-ROLE-NOT-OBSERVED', why: d.value + ' carries no canonical D-4 binding — whole-body construction vs trim / insert is not observed' };
    else cleared.push('REL-F2-OPENWORK-LOCAL: ' + d.value + '@' + b.detail + ' = trim / local insert / panel / component-scale (decorative role)'); }
  if (departure) return { outcome: 'TRUE', rule: departure.rule, family: 'F2', why: departure.why, trace, carrier: 'surface', strong: false };
  if (residual) return { outcome: 'UNRESOLVED', rule: residual.rule, family: 'F2', why: residual.why, trace, carrier: 'surface' };
  return { outcome: 'CLEARED', rule: [...new Set(cleared.map((c) => c.split(':')[0]))].join('+'), family: 'F2', why: cleared.join(' · '), trace, carrier: 'surface' };
}
// ── F3 · attachment → structural role (CEO §6 structural fringe / body system; functional classes unchanged) ──
function resolveAttachment(o, key) {
  const atts = multi(o, 'attachment'); if (!atts.length) return null; const out = [], trace = []; let residual = null, departure = null;
  for (const d of atts) {
    if (ATT_UNIVERSAL_FUNCTIONAL.includes(d.value)) { out.push('REL-F3-UNIVERSAL-FUNCTIONAL: ' + d.value + ' = waist / fastening hardware'); trace.push(d.value + ' → UNIVERSAL_FUNCTIONAL'); continue; }
    if (ATT_GRAMMAR_FUNCTIONAL.includes(d.value)) { if (GRAMMAR_FUNCTIONAL_KEYS.includes(key)) { out.push('REL-F3-GRAMMAR-FUNCTIONAL: ' + d.value + ' conventional on `' + key + '`'); trace.push(d.value + ' → GRAMMAR_FUNCTIONAL'); } else { residual = residual || { rule: 'CON-UNRES-C2-TRANSPLANT-CANDIDATE', why: d.value + ' on `' + key + '` — utility grammar element outside its grammar: C-2 candidate' }; trace.push(d.value + ' → C-2 candidate'); } continue; }
    if (ATT_DECORATIVE.includes(d.value)) { const b = bind(d, false); trace.push(d.value + ' → ' + b.cls + (b.detail ? '@' + b.detail : '') + (d.coverage ? '#' + d.coverage : '') + ' (' + b.source + ')');
      if (b.cls === 'BODY' && b.substantial.length && d.coverage === 'Dominant') departure = departure || { rule: 'CON-TRUE-R1-STRUCTURAL-ATTACHMENT-BODY-SYSTEM', why: d.value + ' realises substantial BODY zone(s) ' + b.substantial.join('+') + ' with coverage Dominant — the attachment system constitutes the garment body / envelope rather than decorating it (CEO §6); structural role overrides the generic decorative class' };
      else if (b.cls === 'UNBOUND') residual = residual || { rule: 'CON-UNRES-ATTACHMENT-ROLE-NOT-OBSERVED', why: d.value + ' carries no canonical D-4 binding — decorative trim vs body-constituting system is not observed' };
      else out.push('REL-F3-DECORATIVE: ' + d.value + '@' + b.detail + (d.coverage ? '#' + d.coverage : '') + ' = decorative attachment (DM / EI owned magnitude)'); continue; }
    const b = bind(d, true); trace.push(d.value + ' → ' + b.cls + (b.detail ? '@' + b.detail : '') + ' (' + b.source + ')');
    if (b.cls === 'TRIM') out.push('REL-F3-OTHER-BOUND: ' + d.value + (d.descriptor ? ' (' + d.descriptor + ')' : '') + ' bound to ' + b.detail + ' = component adjustment / trim');
    else residual = residual || { rule: 'CON-UNRES-ATTACHMENT-OTHER-UNBOUND', why: d.value + (d.descriptor ? ' (' + d.descriptor + ')' : '') + ' carries no governed component binding — its body / assembly role is not representable' };
  }
  if (departure) return { outcome: 'TRUE', rule: departure.rule, family: 'F3', why: departure.why + (out.length ? ' · cleared alongside: ' + out.join(' · ') : ''), trace, carrier: 'attachment', strong: false };
  if (residual) return { outcome: 'UNRESOLVED', rule: residual.rule, family: 'F3', why: residual.why + (out.length ? ' · cleared alongside: ' + out.join(' · ') : ''), trace, carrier: 'attachment' };
  return { outcome: 'CLEARED', rule: [...new Set(out.map((x) => x.split(':')[0]))].join('+'), family: 'F3', why: out.join(' · '), trace, carrier: 'attachment' };
}
// ── Pocket system (CEO B · §4.2 · §5 · §9) — canonical carrier = pocket.pockets[] instances + multiplicity metadata (count / density) ──
function pocketInstances(o) { const p = o && o.pocket; if (!p || p.state !== 'OBSERVED' || p.value !== 'Present') return { present: false, inst: [], density: null, count: null }; const inst = Array.isArray(p.pockets) ? p.pockets.filter(Boolean).map((i) => ({ location: i.location || null, construction: i.construction || null, projection: i.projection || null })) : []; if (!inst.length) { const pc = f(o, 'pocket_construction'), pp = f(o, 'pocket_projection'); if (pc.observed || pp.observed) inst.push({ location: null, construction: pc.observed ? pc.value : null, projection: pp.observed ? pp.value : null, scalar_fallback: true }); } return { present: true, inst, density: p.density || null, count: p.count != null ? p.count : null }; }
function resolvePocketSystem(o, key) {
  const P = pocketInstances(o); if (!P.present || !P.inst.length) return null;
  const cargo = P.inst.filter((i) => i.projection === 'Volumetric' && (i.construction === 'Applied' || i.construction == null) && (i.location === null || POCKET_BODY_LOCATIONS.includes(i.location)));   // a volumetric pocket group on a body location (construction Applied, or unknown on the historical scalar carrier)
  const frontApplied = P.inst.filter((i) => i.location === 'Lower Front' && i.construction === 'Applied');
  const hw = multi(o, 'attachment').filter((d) => d.value === 'Metal Hardware'); const hwAtPocket = hw.some((d) => d.locations && d.locations.some((l) => l.component === 'Pocket'));
  const trace = P.inst.map((i) => (i.location || 'scalar') + '/' + i.construction + '/' + i.projection) .concat(['density=' + P.density, 'count=' + P.count, 'hardware@Pocket=' + hwAtPocket]);
  if (!cargo.length && !frontApplied.length) return null;   // ordinary pocket organisation — not a candidate
  const R = (outcome, rule, why) => ({ outcome, rule, family: 'B', why, trace, carrier: 'pocket', strong: false });
  if (cargo.length) {
    if (CARGO_NATIVE_KEYS.includes(key)) return R('CLEARED', 'REL-B-CARGO-GRAMMAR-NATIVE', 'volumetric applied pocket system on `' + key + '` — cargo-native utility grammar (S5 §4 · S7 §6)');
    if (P.density === 'dense') return R('TRUE', 'CON-TRUE-R1-POCKET-SYSTEM', 'applied volumetric pocket instances on body locations (' + cargo.map((i) => i.location || 'scalar').join('+') + ') with governed multiplicity density = dense — large · repeated · projecting pocket system materially reorganising the body (CEO B · §5 · §9 pocket-system doctrine); not pocket count alone');
    if (LOWER_KEYS.includes(key) && !frontApplied.length) return R('CLEARED', 'REL-B-CARGO-PAIR-CONVENTIONAL', 'volumetric applied pocket group without dense multiplicity on the trouser / jumpsuit leg = the conventional cargo pair (S7 §6 frozen guardrail); presence alone is not a departure');
    if (!LOWER_KEYS.includes(key)) return R('UNRESOLVED', 'CON-UNRES-POCKET-SYSTEM-NOT-ADJUDICATED', 'volumetric applied pocket on `' + key + '` without dense multiplicity — off-grammar pocket system not adjudicated (CEO B); unchanged from V2.1');
  }
  if (frontApplied.length && LOWER_KEYS.includes(key)) { if (hwAtPocket) return R('TRUE', 'CON-TRUE-R1-FRONT-CLOSURE-POCKET-SYSTEM', 'applied / out-pocket construction at the trouser front (native front organisation = inset) with closure hardware integrated into the pockets — an organised closure / pocket system reorganising the front / waist construction (CEO §4.2); not hardware presence'); return R('UNRESOLVED', 'CON-UNRES-FRONT-POCKET-ORGANISATION-NOT-ADJUDICATED', 'applied front pocket construction on the trouser without an integrated closure system — front reorganisation not adjudicated'); }
  return R('CLEARED', 'REL-B-POCKET-CONVENTIONAL', 'pocket organisation within the key\'s conventional range');
}
// ── shoulder connection (F4 tshirt Strap · CEO A sweater Off Shoulder · CEO §8 jumpsuit archetypal hybrid) ──
function resolveShoulder(o, key) {
  const sc = f(o, 'shoulder_connection'); if (!(sc.observed && sc.value !== 'Standard')) return null;
  if (key === 'jumpsuit' && BODICE_SUSPENSION.includes(sc.value)) { const wd = f(o, 'waist_definition'); if (wd.observed && ['Defined', 'Cinched'].includes(wd.value)) return { outcome: 'TRUE', rule: 'CON-TRUE-C3-ARCHETYPAL-HYBRID-BODICE-TROUSER', family: 'H', why: 'jumpsuit upper realised as a bodice-type suspension construction (shoulder_connection = ' + sc.value + ') articulated at a ' + wd.value + ' waist to the trouser lower body — dress / bodice upper × trouser lower archetypal construction-system hybrid (CEO §8); not Halter presence', trace: [sc.value + ' + waist ' + wd.value], carrier: 'shoulder_connection+waist_definition', strong: false }; return { outcome: 'CLEARED', rule: 'REL-H-SUSPENSION-VARIATION', family: 'H', why: sc.value + ' upper without an articulated waist (waist ' + (wd.observed ? wd.value : 'not observed') + ') = conventional neckline / suspension variation of the one-piece', trace: [sc.value + ' + waist ' + (wd.observed ? wd.value : 'n/a')], carrier: 'shoulder_connection' }; }
  if (!TOPS.includes(key)) return null;
  if (key === 'tshirt' && sc.value === 'Strap') return { outcome: 'CLEARED', rule: 'REL-F4-STRAP', family: 'F4', why: 'Strap on the tshirt key = archetype-native conventional variation (CEO F4 · scope confirmed §6)', trace: ['Strap → conventional (tshirt)'], carrier: 'shoulder_connection' };
  if (key === 'sweater' && sc.value === 'Off Shoulder') return { outcome: 'TRUE', rule: 'CON-TRUE-CEO-A-OFF-SHOULDER', family: 'A', why: 'Off Shoulder on the sweater key — conventional shoulder / neck connection replaced (CEO decision A; vocabulary V1_4)', trace: ['Off Shoulder → replacement (sweater)'], carrier: 'shoulder_connection', strong: false };
  return { outcome: 'UNRESOLVED', rule: 'CON-UNRES-SHOULDER-CONNECTION-NOT-ADJUDICATED', family: 'F4', why: 'shoulder_connection = ' + sc.value + ' on `' + key + '` — not adjudicated (V2 G-2; Strap rule is tshirt-only; Off Shoulder rule is sweater-only)', trace: [sc.value + ' → not adjudicated'], carrier: 'shoulder_connection' };
}
function relational(o, key) { const R = [resolveMaterial(o, key), resolveSurface(o, key), resolveAttachment(o, key), resolvePocketSystem(o, key), resolveShoulder(o, key)].filter(Boolean); return { candidates: R, departures: R.filter((r) => r.outcome === 'TRUE'), cleared: R.filter((r) => r.outcome === 'CLEARED'), residual: R.filter((r) => r.outcome === 'UNRESOLVED') }; }
// constr — sealed base first (constitutive TRUE wins); relational resolvers run whenever a candidate is present, on the representation-gap branch AND on the base-FALSE branch (pocket instances / bound values are candidates the V2.1 base could not see)
function constr(o, key) {
  const base = BASE.constr(o, key); if (base.v === 'TRUE') return base;
  const R = relational(o, key);
  if (R.departures.length) { const d = R.departures[0]; return { v: 'TRUE', rule: d.rule, why: d.why + (R.departures.length > 1 ? ' · also: ' + R.departures.slice(1).map((x) => x.rule).join(', ') : '') + (R.cleared.length ? ' · cleared: ' + R.cleared.map((c) => c.rule).join(', ') : '') + (R.residual.length ? ' · residual alongside: ' + R.residual.map((c) => c.rule).join(', ') : ''), carrier: d.carrier, strong: false, relational: R, base_rule: base.rule }; }
  if (R.residual.length) return { v: 'UNRESOLVED', rule: R.residual[0].rule, why: R.residual.map((r) => r.why).join(' · ') + (R.cleared.length ? ' · cleared alongside: ' + R.cleared.map((c) => c.rule + ' (' + c.carrier + ')').join(', ') : ''), carrier: R.residual.map((r) => r.carrier).join('+'), relational: R, base_rule: base.rule };
  if (base.rule === 'CON-UNRES-REPRESENTATION-GAP') return { v: 'FALSE', rule: 'CON-FALSE-C1-RELATIONAL', why: 'every relational candidate resolved to a named conventional relationship — ' + R.cleared.map((c) => c.rule + ' (' + c.carrier + ')').join(' · ') + '; every other observed carrier a conventional option OF THIS KEY ⇒ C-1 FALSE', carrier: 'all', relational: R, base_rule: base.rule };
  return R.candidates.length ? Object.assign({}, base, { relational: R, why: base.why + ' · relational candidates cleared: ' + R.cleared.map((c) => c.rule).join(', ') }) : base;
}
// silh — sealed V2.2 ladder first; CEO §4.1 lower-geometry contrast on two-leg keys: Flared lower-leg geometry with a Slim upper leg = the bootcut / flare reinterpretation (rise is a CEO-accepted residual gap and is not consumed)
function silh(o, key) { const base = B221.silh(o, key); if (base.v === 'TRUE') return base; if (LOWER_KEYS.includes(key)) { const s = f(o, 'silhouette'), fit = f(o, 'fit'); if (s.observed && s.value === 'Flared' && fit.observed && fit.value === 'Slim') return { v: 'TRUE', rule: 'SIL-TRUE-FLARE-CONTRAST', why: 'silhouette = Flared lower-leg geometry with fit = Slim upper leg — a directional change of the lower body form (bootcut / flare) that reinterprets the trouser archetype (CEO §4.1); Flared alone and Slim alone remain FALSE', carrier: 'silhouette+fit', strong: false, base_rule: base.rule }; } return base; }
module.exports = { EVALUATOR_VERSION, f, V, multi, bind, relational, pocketInstances, silh, prop, constr, asymmetry, asymmetrySource, direction, tierEvidence, pairDirection, pairTier, ENVELOPE: BASE.ENVELOPE, TAILORED: BASE.TAILORED, INDEPENDENT_TERMS: B221.INDEPENDENT_TERMS, SLIT_TERMS: B221.SLIT_TERMS, CLASSES: { SUBSTANTIAL_BODY, MINOR_BODY, TRIM_COMPONENTS, ATTACH_ADJUST_COMPONENTS, FILL_MATERIAL, OPENWORK_CONSTRUCTION, TRANSPARENCY, ATT_UNIVERSAL_FUNCTIONAL, ATT_GRAMMAR_FUNCTIONAL, GRAMMAR_FUNCTIONAL_KEYS, ATT_DECORATIVE, CARGO_NATIVE_KEYS, POCKET_BODY_LOCATIONS, BODICE_SUSPENSION, LOWER_KEYS, TOPS } };
