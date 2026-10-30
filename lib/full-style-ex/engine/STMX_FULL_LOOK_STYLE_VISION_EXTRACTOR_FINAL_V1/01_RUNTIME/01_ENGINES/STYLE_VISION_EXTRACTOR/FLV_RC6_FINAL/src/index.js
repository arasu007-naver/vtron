'use strict';
/** STMX FULL-LOOK STYLE VISION EXTRACTOR V1.3 — COMPLETION CANDIDATE (offline). Public surface. Predecessor: V1.2 (sealed, unchanged). */
module.exports = {
  run_record: require('./run_record'),
  contracts: require('./contracts'),
  integrated: require('./integrated'),               // INTEGRATED V1: observation groups · CA#29 pocket carrier · conditional gates · DMP-3 mapping table
  integrated_pocket: require('./integrated_pocket'),
  dm_projection: require('./dm_projection'),         // INTEGRATED V1: A1 frozen-DM output assembly (no reading)
  envelope: require('./envelope'),
  registry: require('./registry'),
  ownership: require('./ownership'),
  providers: require('./providers'),
  k2: require('./k2_pool'),
  g1: require('./g1_colour'),
  sr: require('./sr_realization'),
  relations: require('./relations'),
  exposure: require('./exposure'),
  dm: require('./dm_adapter'),                        // frozen V1 adapter (unchanged; V1 compatibility)
  dm_transport: require('./dm_transport_v2'),         // RC4: DM Evidence Transport V2
  routers: require('./routers'),
  validator: require('./validator'),
  transport: require('./transport'),                 // V1.3: model response → canonical case (isolated; CDM-15 pending)
  diagnostics: require('./diagnostics'),             // V1.3: TC product-evidence view (derived, non-canonical, no scoring)
  extract: require('./extractor').extract,
  isolation: require('./isolation'),                 // RC5: local failure isolation around the unchanged orchestrator (model-output inputs)
};
