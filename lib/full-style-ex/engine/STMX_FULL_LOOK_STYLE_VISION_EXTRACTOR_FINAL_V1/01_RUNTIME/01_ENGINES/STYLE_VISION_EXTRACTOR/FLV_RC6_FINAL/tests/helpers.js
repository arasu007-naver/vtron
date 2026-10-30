'use strict';
/** Test helpers: fixture loading, deterministic fixture gate authority, assertions. No network, no credentials. */
const path = require('path');
const X = require('../src');
const CASES = require('../fixtures/cases.json');
const RECORDS = require('../fixtures/item_records.json');
const POCKET_OVERLAY = require('../fixtures/pocket_instances_overlay_candidate.json');   // INTEGRATED V1: CA#29 bridge for the nine legacy scalar pocket readings (cases.json unchanged)

/** Deterministic fixture gate authority: signals come from the fixture, never from any computation over evidence. */
class FixtureGate extends X.routers.GateAuthority {
  constructor(signals) { super(); this.s = signals || {}; this.calls = []; }
  eiColour(colour) { this.calls.push('eiColour'); return this.s.ei_colour === true; }
  eiExposure(exposure) { this.calls.push('eiExposure'); return this.s.ei_exposure === true; }
  tcProduct(ref, batch) { this.calls.push('tcProduct:' + ref + ':' + batch); const t = this.s.tc_product; return !!t && t.ref === ref && t.batch === batch; }
  tcProductSettledWithSufficientEvidence() { this.calls.push('tcSettled'); return this.s.tc_settled === true; }
}

function fixture(id) { const f = CASES[id]; if (!f) throw new Error('no fixture ' + id); return JSON.parse(JSON.stringify(f)); }
function providerB(id) { return new X.providers.FixtureProvider(fixture(id), POCKET_OVERLAY[id] || null); }
function providerA(id, records) { return new X.providers.ItemReuseProvider(providerB(id), records || JSON.parse(JSON.stringify(RECORDS[id]))); }
function run(id, opts) {
  const o = opts || {};
  const provider = o.provider || (o.modeA ? providerA(id, o.records) : providerB(id));
  const gate = new FixtureGate(o.signals || fixture(id).gate_signals);
  const r = X.extract({ provider, requestedAxes: o.axes, gateAuthority: gate });
  return { ...r, gate, provider };
}
function assert(cond, msg) { if (!cond) throw new Error('ASSERT: ' + msg); }
function throws(fn, re) { try { fn(); } catch (e) { if (!re || re.test(e.message)) return e.message; throw new Error('wrong error: ' + e.message); } throw new Error('expected throw: ' + re); }
const ledger = (r, requester, ref) => r.packet.request_trace.k2_ledger.filter((l) => l.requester === requester && (!ref || l.component_ref === ref));
const storedFor = (r, requester) => ledger(r, requester).reduce((a, l) => a + l.stored.length, 0);

/** V1.3: recursive read of every src file (src now has transport/ and diagnostics/ sub-directories). */
function srcText() { const fs = require('fs'); const out = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name)) out.push(fs.readFileSync(p, 'utf8')); } })(path.join(__dirname, '..', 'src')); return out.join('\n'); }

module.exports = { X, CASES, RECORDS, POCKET_OVERLAY, FixtureGate, fixture, providerA, providerB, run, assert, throws, ledger, storedFor, srcText };
