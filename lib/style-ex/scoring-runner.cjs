'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Node 가 직접 실행하는 CommonJS 스크립트다 */
/**
 * style-ex 스코어링 러너 — 별도 Node 프로세스로 실행된다.
 *
 * STMX ITEM SCORING ENGINE V1(lib/style-ex/scoring/)은 자기 위치(__dirname) 기준으로 파일을 읽고
 * 로드할 때 SHA-256 을 다시 검사한다. Next 번들러 안에서는 __dirname 이 바뀌므로 번들하지 않고
 * 이 러너를 자식 프로세스로 띄워 원본 그대로 실행한다.
 *
 * stdin  : { requests: [ <Item Entry 요청> ... ] }
 * stdout : { results: [ <Item Entry 결과> ... ] }  — 실패 시 { error }
 */
const path = require('path');

const ITEM_ENTRY = path.join(
  __dirname, 'scoring', '01_ENGINES', 'ITEM_SCORING_ENGINE',
  'STMX_CLEAN_ENGINE', '04_CLEAN_ENGINE_CODE', 'src', 'item', 'item_entry_v1.js'
);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const { requests } = JSON.parse(input);
    const { scoreItem } = require(ITEM_ENTRY);
    process.stdout.write(JSON.stringify({ results: requests.map((r) => scoreItem(r)) }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: e && e.message ? e.message : String(e) }));
    process.exitCode = 1;
  }
});
