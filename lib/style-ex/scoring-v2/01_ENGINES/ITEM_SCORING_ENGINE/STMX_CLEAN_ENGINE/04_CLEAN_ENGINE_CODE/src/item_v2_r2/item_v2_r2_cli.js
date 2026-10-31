'use strict';
/*
 * STMX INTEGRATED ITEM SCORING RUNTIME V2 — R2 MINIMAL CLI (demonstration interface only · not a customer UI) · CANDIDATE.
 * Approval Anchor — CEO Decision 2026-10-29 (… CEO-APPROVED SUIT RULE IMPLEMENTATION … §9 "a minimal, runnable interface demonstrating the selection-needed response
 * and resumption with a user-chosen target"). Affected Scope: this file (new).
 *
 * usage:
 *   node item_v2_r2_cli.js <input.json>                       score as given (an ambiguous image prints the selection request)
 *   node item_v2_r2_cli.js <input.json> --item <target_id>    resume: score the chosen garment
 *   node item_v2_r2_cli.js <input.json> --suit <jacket_id>,<bottom_id>   resume: score the chosen Suit
 * input.json = { vision_envelope, colour_observations?, user_selection?, merchandise_metadata?, image_reference? } (Item V2 input contract).
 * Prints { result_status, customer_output | selection_request } — the internal trace is omitted. ⛔ Reads only the given file; no network, no model call.
 */
const fs = require('fs');
const R2 = require('./item_v2_r2_entry');

function main(argv) {
  const file = argv[0]; if (!file) { console.error('usage: node item_v2_r2_cli.js <input.json> [--item <id> | --suit <jacket_id>,<bottom_id>]'); return 2; }
  const input = JSON.parse(fs.readFileSync(file, 'utf8'));
  const i = argv.indexOf('--item'), s = argv.indexOf('--suit');
  const r = i > 0 ? R2.resumeWithSelection(input, { merchandise_type: 'ITEM', primary_target_id: argv[i + 1] })
    : s > 0 ? R2.resumeWithSelection(input, { merchandise_type: 'SUIT', suit_component_target_ids: String(argv[s + 1] || '').split(',') }) : R2.scoreItemV2R2(input);
  const view = { result_status: r.result_status };
  if (r.selection_request) view.selection_request = r.selection_request; else if (r.customer_output) { view.customer_output = r.customer_output; if (r.incomplete_axes.length) view.incomplete_axes = r.incomplete_axes; } else view.input_issue = r.input_issue;
  console.log(JSON.stringify(view, null, 1)); return 0;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
