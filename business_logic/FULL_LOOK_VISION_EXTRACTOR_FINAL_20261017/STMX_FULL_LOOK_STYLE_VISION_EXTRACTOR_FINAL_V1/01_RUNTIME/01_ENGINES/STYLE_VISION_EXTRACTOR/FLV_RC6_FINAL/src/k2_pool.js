'use strict';
/**
 * K-2 demand-driven component evidence pool + request cache (orders §17, §37; V1.1 §45) — INTEGRATED V1 successor of the V1.4 pool.
 *   · request(requester, component_ref, fact_family) is the ONLY way a fact enters the pool;
 *   · only the 26 requestable Item facts exist (contracts.REQUESTABLE_FACTS); anything else throws;
 *   · one entry per (component_ref, fact); a second request from any axis is a cache hit — the observation is read ONCE and reused
 *     (this is how "one shoulder reading, many consumers" is enforced on the consumption side);
 *   · NOT_APPLICABLE is returned, never stored.
 * V1.1 applicability (decision B — garment applicability is NOT inherited) unchanged; V1.1 ownership (decision C) unchanged.
 * INTEGRATED V1 additions (every one reuses a frozen Item V1_3 rule; see src/integrated.js):
 *   · NESTED (CA#29): pocket_construction / pocket_projection are never stored — when the pocket is OBSERVED Present they live inside
 *     pocket.pockets[] (ledger `nested`); otherwise NOT_APPLICABLE (Item conditional on pocket = Present);
 *   · CONDITIONAL TRIGGERS (frozen CONDITIONAL_TRIGGER, consumption side): sleeve_volume · closure_type (tops / Dress / Jumpsuit) ·
 *     waist_definition (Two-Gate) are NOT_APPLICABLE when the parent fact shows the gate closed (ledger `not_applicable_by_trigger`);
 *     the parent is read first when it is not yet in the pool (ledger `parent_gate_reads`). N/A ≠ UNKNOWN: an unreadable parent leaves
 *     the child applicable (readability is a state, not an applicability condition — CA#28);
 *   · every stored fact is tagged with its logical observation group (integrated.GROUP_OF_FACT) — provenance only.
 */
const C = require('./contracts');
const I = require('./integrated');
const R = require('./registry');
const { dedupAttachment } = require('./ownership');

class ComponentFactPool {
  constructor(provider, registry, ownership) { this.provider = provider; this.registry = registry; this.pool = new Map(); this.ledger = []; this.suppressed = (ownership && ownership.suppressed) || {}; }

  applicability(entry, factName) {
    if (R.isGarment(entry)) {
      const cat = R.category(entry);
      if (!C.applicableFacts(cat).has(factName)) return C.NOT_APPLICABLE;
      if (factName === 'trouser_distinction' && cat !== 'Trouser') return C.NOT_APPLICABLE;
      return 'OK';
    }
    if (R.isUnknownIdentity(entry)) return C.ACCESSORY_APPEARANCE_FACTS.includes(factName) ? 'OK' : 'UNKNOWN_IDENTITY';
    return C.ACCESSORY_APPEARANCE_FACTS.includes(factName) ? 'OK' : C.NOT_APPLICABLE;   // non-garment: accessory appearance facts only
  }

  /** Read (and store) a parent fact needed to evaluate a conditional gate; returns the stored envelope. */
  _parent(entry, ref, parent, res) {
    const key = ref + '.' + parent;
    if (this.pool.has(key)) return this.pool.get(key);
    if (this.applicability(entry, parent) !== 'OK') return null;
    const env = this.provider.componentFact(ref, parent);
    this.pool.set(key, { component_ref: ref, fact: parent, ...env, component_ref: ref, observation_group: I.GROUP_OF_FACT[parent] });
    (res.parent_gate_reads = res.parent_gate_reads || []).push(parent);
    return this.pool.get(key);
  }

  /** @returns {{stored:string[], cached:string[], not_applicable:string[], unknown_identity:string[], nested:string[]}} */
  request(requester, ref, family) {
    const facts = C.FACT_FAMILIES[family] || I.INTEGRATED_FACT_FAMILIES[family];   // RC2: INTEGRATED_FACT_FAMILIES is empty (RC1 dm_readability withdrawn)
    if (!facts) throw new Error('K2_UNKNOWN_FACT_FAMILY: ' + family);
    const entry = R.byRef(this.registry, ref);
    if (!entry) throw new Error('K2_COMPONENT_NOT_IN_REGISTRY: ' + ref);
    const res = { requester, component_ref: ref, family, stored: [], cached: [], not_applicable: [], unknown_identity: [], nested: [] };
    for (const f of facts) {
      if (!C.REQUESTABLE_FACTS.includes(f)) throw new Error('K2_NOT_A_REQUESTABLE_FACT: ' + f);
      const key = ref + '.' + f;
      if (this.pool.has(key)) { res.cached.push(f); continue; }
      const app = this.applicability(entry, f);
      if (app === C.NOT_APPLICABLE) { res.not_applicable.push(f); continue; }
      if (app === 'UNKNOWN_IDENTITY') { res.unknown_identity.push(f); continue; }     // category-dependent fact on an unidentified object: not produced
      if (I.NESTED_FACTS[f]) {                                                         // CA#29: morphology is carried inside pocket.pockets[]; the scalar is never stored
        const p = this._parent(entry, ref, 'pocket', res);
        if (p && p.state === 'OBSERVED' && p.value === 'Present') { res.nested.push(f); (res.nested_in = res.nested_in || {})[f] = I.NESTED_FACTS[f]; }
        else res.not_applicable.push(f);                                               // Item conditional: pocket must be Present
        continue;
      }
      const gate = I.CONDITIONAL_GATES[f];
      if (gate && (!gate.categories || gate.categories.includes(R.category(entry)))) {
        const p = this._parent(entry, ref, gate.parent, res);
        if (p && gate.na_when(p)) { res.not_applicable.push(f); (res.not_applicable_by_trigger = res.not_applicable_by_trigger || {})[f] = gate.parent + '=' + p.value; continue; }
      }
      let env = this.provider.componentFact(ref, f);
      if (f === 'attachment' && this.suppressed[ref]) {
        const d = dedupAttachment(env, this.suppressed[ref]);
        env = d.env; if (d.removed.length) res.ownership_dedup = d.removed.slice();
      }
      this.pool.set(key, { component_ref: ref, fact: f, ...env, component_ref: ref, observation_group: I.GROUP_OF_FACT[f] });
      res.stored.push(f);
    }
    this.ledger.push(res);
    return res;
  }

  get(ref, f) { return this.pool.get(ref + '.' + f) || null; }
  entries() { return [...this.pool.values()]; }
  entriesFor(ref) { return this.entries().filter((e) => e.component_ref === ref); }
}

module.exports = { ComponentFactPool };
