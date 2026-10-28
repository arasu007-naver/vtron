'use strict';
/** V1.1 accessory coverage — scarf / tie (order §57), headwear / hair (§58), hosiery / gloves (§59), eyewear, participation (§41–§44). Raw evidence only. */
const { X, run, fixture, assert, throws } = require('./helpers');
const C = X.contracts;
const reg = (r, ref) => r.packet.component_registry.find((e) => e.component_ref === ref);
const pool = (r, ref, fact) => r.packet.component_fact_pool.find((f) => f.component_ref === ref && f.fact === fact);
const points = (r, ref) => r.packet.colour_composition.points.filter((p) => p.carrier_ref.value === ref);

const scarfTie = [
  { name: 'ST-1 scarf worn at the neck (M214) and worn on the head (F418) both register as `scarf`; the worn role never changes the identity (no worn_role field emitted; no `headwear` re-labelling)', fn: () => {
    for (const [id, ref] of [['M214', 'c4'], ['F418', 'c2'], ['F390', 'c3']]) { const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.value === 'scarf', id + ' scarf'); assert(e.worn_role === undefined && e.object_subtype === undefined, id + ' no role field'); } } },
  { name: 'ST-2 a scarf merely held in the hand (F074 x1) is not a component although its identity is scarf; the held object leaves no trace', fn: () => {
    const f = fixture('F074'); assert(f.objects.some((o) => o.ref === 'x1' && o.identity === 'scarf' && o.participates === false), 'fixture holds the case'); const r = run('F074'); assert(!reg(r, 'x1') && !JSON.stringify(r.packet).includes('"x1"'), 'no trace'); } },
  { name: 'ST-3 tie family (M165 / M269 / F390 necktie subtype); tie is not merged into scarf; bow_tie is a legal subtype, `cravat` is not', fn: () => {
    for (const [id, ref] of [['M165', 'c4'], ['M269', 'c4'], ['F390', 'c2']]) { const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.value === 'tie' && e.object_subtype.value === 'necktie', id); }
    assert(X.registry.buildRegistry([{ ref: 'c1', identity: 'tie', participates: true, subtype: 'bow_tie' }])[0].object_subtype.value === 'bow_tie', 'bow_tie'); throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'tie', participates: true, subtype: 'cravat' }]), /OBJECT_SUBTYPE_ILLEGAL/); } },
  { name: 'ST-4 scarf / tie pattern + colour evidence: M165 tie Linear navy; M269 printed tie graphic Dominant + two colour points; F392 neckerchief Repeat + yellow pattern colour part; M214 scarf Repeat + Textured Knit', fn: () => {
    const a = run('M165'); assert(pool(a, 'c4', 'pattern').value === 'Linear' && points(a, 'c4')[0].color_family === 'navy', 'M165');
    const b = run('M269'); assert(pool(b, 'c4', 'graphic').value === 'Dominant' && points(b, 'c4').length === 2, 'M269');
    const c = run('F392'); assert(pool(c, 'c4', 'pattern').value === 'Repeat' && points(c, 'c4').some((p) => p.carrier_part && p.carrier_part.carrier_kind === 'pattern'), 'F392');
    const d = run('M214'); assert(pool(d, 'c4', 'pattern').value === 'Repeat' && pool(d, 'c4', 'surface').value.includes('Textured Knit'), 'M214'); } },
  { name: 'ST-5 pocket square under scarf (M269 / M270 subtype pocket_square); scarf subtypes are optional (F418 has none)', fn: () => {
    assert(reg(run('M269', { axes: ['EI'] }), 'c7').object_subtype.value === 'pocket_square' && reg(run('M270', { axes: ['EI'] }), 'c6').object_subtype.value === 'pocket_square', 'pocket_square'); assert(reg(run('F418', { axes: ['EI'] }), 'c2').object_subtype === undefined, 'optional'); } },
];

const headwear = [
  { name: 'HW-1 hat / cap register as `headwear` with optional subtype (F012 hat · F074 hat · M269 / M270 cap); F472 head band = headwear (hair accessory in the broad family, not a retail "hat")', fn: () => {
    for (const [id, ref, st] of [['F012', 'c3', 'hat'], ['F074', 'c5', 'hat'], ['M269', 'c6', 'cap'], ['M270', 'c5', 'cap'], ['F472', 'c5', undefined]]) { const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.value === 'headwear', id); assert(st ? e.object_subtype.value === st : e.object_subtype === undefined, id + ' subtype'); }
    assert(C.OBJECT_SUBTYPES.headwear.includes('hairband') && C.OBJECT_SUBTYPES.headwear.includes('hair_ornament'), 'hair accessory subtypes exist'); } },
  { name: 'HW-2 headwear colour (F012 black Tonal; M270 navy + white graphic part); pattern / decoration (M269 / M270 graphic Localized; F074 badge → attachment Metal Hardware + gold part)', fn: () => {
    assert(points(run('F012', { axes: ['EI'] }), 'c3')[0].color_family === 'black', 'F012'); const m = run('M270'); assert(points(m, 'c5').some((p) => p.carrier_part && p.carrier_part.carrier_kind === 'graphic') && pool(m, 'c5', 'graphic').value === 'Localized', 'M270');
    const f = run('F074'); assert(pool(f, 'c5', 'attachment').value === 'Metal Hardware' && points(f, 'c5').some((p) => p.color_family === 'gold' && p.carrier_part), 'F074 badge'); } },
  { name: 'HW-3 held hat / cap excluded (F225 x1 headwear held; M137-type): participates=false → no component, no colour carrier', fn: () => {
    const f = fixture('F225'); assert(f.objects.some((o) => o.ref === 'x1' && o.identity === 'headwear' && o.participates === false), 'case present'); const r = run('F225'); assert(!reg(r, 'x1') && !JSON.stringify(r.packet).includes('"x1"'), 'no trace'); } },
  { name: 'HW-4 head scarf keeps scarf identity (F418 c2 = scarf, not headwear); UNKNOWN head object is not forced to headwear', fn: () => {
    assert(reg(run('F418', { axes: ['EI'] }), 'c2').object_identity.value === 'scarf', 'scarf');
    const r = X.extract({ provider: new X.providers.FixtureProvider({ objects: [{ ref: 'c1', identity: 'Jacket', participates: true }, { ref: 'c2', identity: 'UNKNOWN', participates: true }], colour_areas: [{ carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field' }, { carrier: 'c2', family: 'red', lightness: 'normal', effect: 'none', role: 'point', contrast: 'Distinct' }] }), requestedAxes: ['EI'] });
    assert(reg(r, 'c2').object_identity.state === 'UNKNOWN' && points(r, 'c2')[0].color_family === 'red', 'UNKNOWN with colour'); } },
  { name: 'HW-5 tiny / unreadable hair or jewellery objects are not hallucinated: nothing is registered from styling expectation; a declared-but-unreadable object uses the unreadable colour state', fn: () => {
    const r = run('F134'); assert(!r.packet.component_registry.some((e) => e.object_identity.value === 'headwear'), 'no inferred hair accessory on F134');
    const q = X.extract({ provider: new X.providers.FixtureProvider({ objects: [{ ref: 'c1', identity: 'Dress', participates: true }, { ref: 'c2', identity: 'headwear', participates: true }], colour_areas: [{ carrier: 'c1', family: 'black', lightness: 'dark', effect: 'none', role: 'field' }, { carrier: 'c2', state: 'NOT_VISIBLE', limitation: ['FRAGMENTARY_VISIBILITY'] }] }), requestedAxes: ['EI'] });
    assert(q.validation.ok && q.packet.colour_composition.unreadable[0].state === 'NOT_VISIBLE' && q.packet.colour_composition.unreadable[0].limitation[0] === 'FRAGMENTARY_VISIBILITY', 'unreadable with limitation'); } },
];

const hosieryGloves = [
  { name: 'HG-1 socks / hosiery colour (F472 white; M270 white + yellow stripe part; F054 / F074 black) on the hosiery component', fn: () => {
    assert(points(run('F472', { axes: ['EI'] }), 'c4')[0].color_family === 'white_family', 'F472'); assert(points(run('M270', { axes: ['EI'] }), 'c8').length === 2, 'M270 two colours'); assert(points(run('F054', { axes: ['EI'] }), 'c6')[0].color_family === 'black', 'F054'); } },
  { name: 'HG-2 patterned hosiery: M270 socks pattern Linear + stripe colour carrier_part {pattern, Linear}', fn: () => { const r = run('M270'); assert(pool(r, 'c8', 'pattern').value === 'Linear' && points(r, 'c8').some((p) => p.carrier_part && p.carrier_part.carrier_ref === 'Linear'), 'M270'); } },
  { name: 'HG-3 sheer hosiery ≠ automatic exposure: F298 tights surface Semi Transparent; no canonical exposure event carries a hosiery ref; a hosiery exposure carrier is rejected by the validator', fn: () => {
    const r = run('F298'); assert(pool(r, 'c5', 'surface').value.includes('Semi Transparent'), 'sheer fact'); if (r.packet.canonical_exposure) assert(!r.packet.canonical_exposure.events.some((e) => e.carrier_refs.includes('c5')), 'no hosiery exposure');
    throws(() => X.exposure.mergeCanonicalExposure({ itemSources: [], supplements: [{ region: 'Upper Thigh', carriers: ['c5'], attribution: 'realized_state' }], registry: r.packet.component_registry }) && (() => { const p = JSON.parse(JSON.stringify(r.packet)); p.canonical_exposure = { events: [{ region: 'Upper Thigh', carrier_refs: ['c5'], attribution: { state: 'UNKNOWN' }, sources: [{ route: 'observed' }], state: 'OBSERVED' }], hidden: [] }; const v = X.validator.validatePacket(p); if (!v.ok) throw new Error(v.errors.join('|')); })(), /EXPOSURE_CARRIER_NON_GARMENT/); } },
  { name: 'HG-4 worn gloves register as `gloves` (F187 grey leather Tonal; F298 wine leather Distinct) with material Leather on request', fn: () => {
    for (const [id, ref, c] of [['F187', 'c3', 'Tonal'], ['F298', 'c3', 'Distinct']]) { const r = run(id); assert(reg(r, ref).object_identity.value === 'gloves' && points(r, ref)[0].contrast_with_field === c && pool(r, ref, 'material').value === 'Leather', id); } } },
  { name: 'HG-5 held glove / held object distinction: an object held in the hand is not a glove component (participation), and a worn glove holding something stays worn', fn: () => {
    const f = fixture('F187'); f.objects.push({ ref: 'x9', identity: 'gloves', participates: false, why: 'a second pair held in the hand (contract case)' }); const r = X.extract({ provider: new X.providers.FixtureProvider(f) }); assert(!reg(r, 'x9') && reg(r, 'c3').object_identity.value === 'gloves', 'held excluded, worn kept'); } },
];

const eyewear = [
  { name: 'EW-1 eyewear registers with optional subtype (F392 / M214 / M011 sunglasses; F109 / F563 none); glasses / sunglasses only', fn: () => {
    for (const [id, ref, st] of [['F392', 'c3', 'sunglasses'], ['M214', 'c5', 'sunglasses'], ['M011', 'c3', 'sunglasses'], ['F109', 'c5', undefined]]) { const e = reg(run(id, { axes: ['EI'] }), ref); assert(e.object_identity.value === 'eyewear' && (st ? e.object_subtype.value === st : e.object_subtype === undefined), id); }
    throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'eyewear', participates: true, subtype: 'aviator' }]), /OBJECT_SUBTYPE_ILLEGAL/); } },
  { name: 'EW-2 no separate lens / frame colour parameter: M011 gold frame + orange lens = two colour points on ONE eyewear component; no key named lens / frame exists in the packet', fn: () => {
    const r = run('M011', { axes: ['EI'] }); assert(points(r, 'c3').length === 2 && points(r, 'c3').every((p) => p.carrier_part === undefined), 'two points, no part'); assert(!/"(lens|frame)[a-z_]*"\s*:/i.test(JSON.stringify(r.packet)), 'no lens / frame key'); } },
  { name: 'EW-3 mirror lens: F392 gold metallic colour point + surface Reflective; F391 silver metallic point (predecessor reading, unchanged)', fn: () => {
    const r = run('F392'); assert(points(r, 'c3')[0].color_effect === 'metallic' && pool(r, 'c3', 'surface').value.includes('Reflective'), 'F392'); assert(points(run('F391', { axes: ['EI'] }), 'c6')[0].color_family === 'silver', 'F391'); } },
];

const participation = [
  { name: 'PT-1 non-fashion / background objects never become components: F472 headphones + phone, F254 mannequin + props, M165 chair, F065 caption text, audiences — the semantic participation filter, no blacklist in src', fn: () => {
    for (const [id, refs] of [['F472', ['x1', 'x2']], ['F254', ['x1']], ['M165', ['x1']], ['F065', ['x1']], ['F392', ['x1']]]) { const s = JSON.stringify(run(id).packet); for (const x of refs) assert(!s.includes('"' + x + '"'), id + ' ' + x); }
    const fs = require('fs'), path = require('path'); const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'registry.js'), 'utf8'); assert(!/phone|drink|camera|headphone|furniture|lanyard/i.test(src), 'no blacklist'); } },
  { name: 'PT-2 carried non-worn garments excluded (F260 / F267 coats over the arm; M178 coat in the hand) — identity Coat does not admit them', fn: () => {
    for (const id of ['F260', 'F267', 'M178']) { const f = fixture(id); assert(f.objects.some((o) => o.identity === 'Coat' && o.participates === false), id + ' case'); assert(!run(id).packet.component_registry.some((e) => e.object_identity.value === 'Coat'), id + ' excluded'); } } },
  { name: 'PT-3 `other` is a confident participating fashion accessory outside the families (M309 eye band), never a low-confidence fallback: the registry keeps other ≠ UNKNOWN and the validator rejects the string UNKNOWN as a value', fn: () => {
    const e = reg(run('M309', { axes: ['EI'] }), 'c3'); assert(e.object_identity.value === 'other' && e.object_identity.state === 'OBSERVED', 'other'); throws(() => X.registry.buildRegistry([{ ref: 'c1', identity: 'other', participates: true, subtype: 'band' }]), /SUBTYPE_ON_UNIDENTIFIED/);
    const p = run('M309').packet; const q = JSON.parse(JSON.stringify(p)); q.component_registry[2].object_identity = { value: 'UNKNOWN', state: 'OBSERVED' }; assert(/IDENTITY_UNKNOWN_AS_VALUE|IDENTITY_VALUE/.test(X.validator.validatePacket(q).errors.join('|')), 'UNKNOWN as value rejected'); } },
  { name: 'PT-4 every approved family is exercised by at least one fixture and the family domain is exactly the approved set (10 + other)', fn: () => {
    assert(C.NON_GARMENT_KINDS.join(',') === 'footwear,bag,headwear,scarf,jewellery,belt,eyewear,hosiery,tie,gloves,other', 'domain'); const seen = new Set();
    for (const id of Object.keys(require('../fixtures/cases.json')).filter((k) => !k.startsWith('_'))) for (const e of run(id, { axes: ['EI'] }).packet.component_registry) if (e.object_identity.state === 'OBSERVED' && C.NON_GARMENT_KINDS.includes(e.object_identity.value)) seen.add(e.object_identity.value);
    const missing = C.NON_GARMENT_KINDS.filter((k) => !seen.has(k)); assert(missing.length === 0, 'families without a fixture: ' + missing.join(',')); } },
];

module.exports = [...scarfTie, ...headwear, ...hosieryGloves, ...eyewear, ...participation];
