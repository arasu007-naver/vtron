#!/usr/bin/env node
'use strict';
/* FL4AX — Style ID resolver: node cli/resolve_style_id.js <EI> <TC> <SR> <DM>   (labels or letters, e.g. E C S M or EXPRESSIVE CLASSIC STRUCTURED MINIMAL)
   node cli/resolve_style_id.js --all   → the 16 canonical Style IDs. */
const path = require('path'); const S = require(path.join(__dirname, '..', 'src', 'fl4ax_style_id_v1.js'));
if (process.argv[2] === '--all') { console.log(S.STYLE_IDS.join('\n')); } else { try { console.log(S.resolveStyleId(...process.argv.slice(2, 6))); } catch (e) { console.log(e.message); process.exitCode = 2; } }
