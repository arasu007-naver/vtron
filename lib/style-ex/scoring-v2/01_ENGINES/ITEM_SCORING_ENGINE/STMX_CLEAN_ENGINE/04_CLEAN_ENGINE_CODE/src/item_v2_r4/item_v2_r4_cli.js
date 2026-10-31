'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R4 MINIMAL CLI (demonstration interface only · not a customer UI) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… INTEGRATED RUNTIME R4 §9). Affected Scope: this file (new).
 *
 * usage:
 *   node item_v2_r4_cli.js <input.json>                                  score (input may carry image_sha256 + target_colour_packet)
 *   node item_v2_r4_cli.js <input.json> --plan                           the colour acquisition plan for the resolved unit (no call)
 *   node item_v2_r4_cli.js <input.json> --item <target_id>               resume: score the chosen garment
 *   node item_v2_r4_cli.js <input.json> --suit <jacket_id>,<bottom_id>   resume: score the chosen Suit
 * Prints { result_status, customer_output | selection_request | input_issue, colour } — ⛔ reads only the given file; no network, no model call.
 */
const fs = require('fs');
const R4 = require('./item_v2_r4_entry');

function main(argv) {
  const file = argv[0]; if (!file) { console.error('usage: node item_v2_r4_cli.js <input.json> [--plan | --item <id> | --suit <jacket_id>,<bottom_id>]'); return 2; }
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (argv.includes('--plan')) { const p = R4.planColourAcquisition(input); console.log(JSON.stringify(p.ok ? { scoring_unit: p.scoring_unit, targets: p.manifest.targets.map((t) => t.target_id + ' · ' + t.category), one_call: p.plans.ONE_CALL.external_calls, per_target: p.plans.PER_TARGET.external_calls } : p, null, 1)); return 0; }
  const i = argv.indexOf('--item'), s = argv.indexOf('--suit');
  const r = i > 0 ? R4.resumeWithSelection(input, { merchandise_type: 'ITEM', primary_target_id: argv[i + 1] })
    : s > 0 ? R4.resumeWithSelection(input, { merchandise_type: 'SUIT', suit_component_target_ids: String(argv[s + 1] || '').split(',') }) : R4.scoreItemV2R4(input);
  const view = { result_status: r.result_status };
  if (r.selection_request) view.selection_request = r.selection_request; else if (r.customer_output) { view.customer_output = r.customer_output; if (r.incomplete_axes.length) view.incomplete_axes = r.incomplete_axes; } else view.input_issue = r.input_issue;
  if (r.internal && r.internal.colour_association && r.internal.colour_association.per_target) view.colour = r.internal.colour_association.per_target.map((t) => t.target_id + ' ' + t.state + (t.primary_color_family ? ' ' + t.primary_color_family : ''));
  console.log(JSON.stringify(view, null, 1)); return 0;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
