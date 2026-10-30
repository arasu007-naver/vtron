# Style ID contract — FL4AX_FINAL_V1

Authority: Direction-Code contract `01_ENGINES/ITEM_SCORING_ENGINE/STMX_DIRECTION_CODE_INTEGRATION_V1_CANDIDATE/src/direction_code_contract_v1.js` (CEO 2026-09-28) — axis order EI → TC → SR → DM; letters EI E / I · TC T / C · SR S / R · DM D / M. 16 IDs, nested in that order:

ETSD · ETSM · ETRD · ETRM · ECSD · ECSM · ECRD · ECRM · ITSD · ITSM · ITRD · ITRM · ICSD · ICSM · ICRD · ICRM

Input: four binary Directions (labels or letters). Any other value (Neutral, UNKNOWN, UNRESOLVED, N, null, lowercase, axis-swapped letter, missing axis) → `INVALID_DIRECTION_ENUM`. No consumer name / description registry exists; codes only.
