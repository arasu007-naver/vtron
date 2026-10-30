# 43-case integration ledger (development set — not an independent holdout)

| look | packet | status | EI | TC | SR | DM | Style ID | engine match (direct = integrated = golden) | CEO GT where a frozen release carries it | known limitation / note |
|---|---|---|---|---|---|---|---|---|---|---|
| F012 | V1_RC4 | COMPLETE | E | C | S | M | ECSM | 4 / 4 | DM D ✗ | FLDM-LIM-001 (CEO D · runtime M) |
| F033 | V1_RC4 | INPUT_FAILURE | I | — | R | D | — | 4 / 4 | DM D ✓ | engine input failure TC:NO_TC_PRODUCT_EVIDENCE |
| F054 | V1_RC4 | COMPLETE | E | T | S | D | ETSD | 4 / 4 | DM D ✓ | — |
| F065 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| F074 | V1_RC4 | COMPLETE | E | T | S | D | ETSD | 4 / 4 | DM D ✓ | — |
| F109 | V1_RC4 | COMPLETE | E | C | R | M | ECRM | 4 / 4 | DM M ✓ | — |
| F134 | V1_RC4 | COMPLETE | E | C | S | M | ECSM | 4 / 4 | DM M ✓ | — |
| F146 | V1_RC4 | COMPLETE | E | T | R | M | ETRM | 4 / 4 | DM M ✓ | — |
| F147 | V1_RC4 | COMPLETE | E | C | R | M | ECRM | 4 / 4 | DM M ✓ | — |
| F187 | V1_RC4 | COMPLETE | E | C | S | M | ECSM | 4 / 4 | DM M ✓ | — |
| F225 | V1_RC4 | COMPLETE | E | C | R | M | ECRM | 4 / 4 | DM M ✓ | — |
| F228 | V1_RC4 | COMPLETE | I | C | R | D | ICRD | 4 / 4 | EI E ✗ · DM D ✓ | FL-EI-LIM-F228-001 (CEO E · runtime I) |
| F254 | V1_RC4 | COMPLETE | E | T | S | D | ETSD | 4 / 4 | DM D ✓ | — |
| F258 | V1_RC4 | COMPLETE | E | C | S | D | ECSD | 4 / 4 | DM D ✓ | — |
| F260 | V1_RC4 | COMPLETE | E | T | R | M | ETRM | 4 / 4 | DM M ✓ | — |
| F267 | V1_RC4 | COMPLETE | I | C | R | M | ICRM | 4 / 4 | DM N ✗ | FLDM-HIST-001 (historical N · binary M) |
| F288 | V1_RC4 | COMPLETE | I | T | S | M | ITSM | 4 / 4 | DM M ✓ | — |
| F293 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| F298 | V1_RC4 | COMPLETE | E | T | R | M | ETRM | 4 / 4 | DM M ✓ | — |
| F372 | V1_RC4 | COMPLETE | E | C | S | D | ECSD | 4 / 4 | DM D ✓ | — |
| F390 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| F391 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| F392 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| F418 | V1_RC4 | COMPLETE | E | C | R | D | ECRD | 4 / 4 | DM D ✓ | — |
| F444 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| F472 | V1_RC4 | COMPLETE | E | C | R | M | ECRM | 4 / 4 | DM D ✗ | FLDM-LIM-002 (CEO D · runtime M) |
| F563 | V1_RC4 | COMPLETE | E | C | R | M | ECRM | 4 / 4 | DM M ✓ | — |
| M011 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| M120 | V1_RC4 | COMPLETE | I | C | S | D | ICSD | 4 / 4 | DM D ✓ | — |
| M134 | V1_RC4 | COMPLETE | E | T | S | D | ETSD | 4 / 4 | DM D ✓ | — |
| M165 | V1_RC4 | COMPLETE | E | T | R | M | ETRM | 4 / 4 | DM M ✓ | — |
| M178 | V1_RC4 | COMPLETE | I | T | R | D | ITRD | 4 / 4 | EI I ✓ · DM D ✓ | — |
| M210 | V1_RC4 | COMPLETE | I | C | S | M | ICSM | 4 / 4 | DM M ✓ | — |
| M214 | V1_RC4 | COMPLETE | E | C | S | D | ECSD | 4 / 4 | DM D ✓ | — |
| M269 | V1_RC4 | COMPLETE | E | C | R | D | ECRD | 4 / 4 | DM D ✓ | — |
| M270 | V1_RC4 | COMPLETE | E | C | R | D | ECRD | 4 / 4 | DM D ✓ | — |
| M303 | V1_RC4 | COMPLETE | E | C | S | D | ECSD | 4 / 4 | DM D ✓ | — |
| M308 | V1_RC4 | COMPLETE | E | C | S | M | ECSM | 4 / 4 | EI E ✓ · DM M ✓ | — |
| M309 | V1_RC4 | COMPLETE | E | T | R | M | ETRM | 4 / 4 | DM M ✓ | — |
| M317 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | DM D ✓ | — |
| M320 | V1_RC4 | COMPLETE | E | T | R | D | ETRD | 4 / 4 | EI E ✓ · SR S ✗ · DM D ✓ | FLSR known limitation (CEO S · runtime R; same lawful input as M317) |
| M323 | V1_RC4 | COMPLETE | E | T | S | D | ETSD | 4 / 4 | DM D ✓ | — |
| REF_000622 | V1_RC4 | INPUT_FAILURE | E | C | — | M | — | 4 / 4 | DM M ✓ | engine input failure SR:NO_UPPER_SR_EVIDENCE |

COMPLETE 41 · INPUT_FAILURE 2 · CONTRACT_VIOLATION 0 · engine parity EI 43 / 43 · TC 43 / 43 · SR 43 / 43 · DM 43 / 43. GT columns are documentation; no runtime file reads them.
