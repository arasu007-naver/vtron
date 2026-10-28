# D6 — 43-Packet Golden Replay and GT Audit

> STMX FULL-LOOK EI V1 — CONTROLLED FINAL FREEZE, KNOWN LIMITATION ACCEPTANCE & VERIFIED LOCAL / GOOGLE DRIVE BACKUP · 2026-10-26 · order `AUTHORIZATION/CEO_ORDER_VERBATIM.md` §6 · release `FLEI_FINAL_V1` · seal FLEI-FINAL-FREEZE-V1-2026-10-26 · 0 API calls (G53 active).

```text
VALID_PACKET_COVERAGE = 43/43
EXPRESSIVE = 36 · INTROVERT = 7
CEO_GT_AGREEMENT = 3/4
KNOWN_MISMATCH = F228 (accepted known limitation FL-EI-LIM-F228-001)
```

Coverage ≠ accuracy: 43 / 43 is binary coverage. Accuracy is measured only on the four CEO whole-look GT looks.

| look | packet sha256 (= seal) | V1_R3 direction | rule | resolved by | bases | release golden = candidate | CEO GT |
|---|---|---|---|---|---|---|---|
| F012 | ad3f8a796677… ✓ | EXPRESSIVE | EI-E |  | 5 | identical | — |
| F033 | eabb7de53674… ✓ | INTROVERT | EI-I |  | 0 | identical | — |
| F054 | 0a75034dae0d… ✓ | EXPRESSIVE | EI-E |  | 7 | identical | — |
| F065 | b610d1b2dddd… ✓ | EXPRESSIVE | EI-E |  | 2 | identical | — |
| F074 | ae1a31d53222… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| F109 | e3564b4400d9… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| F134 | 8ae2817d82df… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| F146 | 1e223684791f… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| F147 | 71c211463e3d… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| F187 | 7959788fd42c… ✓ | EXPRESSIVE | EI-E |  | 2 | identical | — |
| F225 | 9c0165983d60… ✓ | EXPRESSIVE | EI-E |  | 6 | identical | — |
| F228 | 2bafc01e8d80… ✓ | INTROVERT | EI-I |  | 0 | identical | EXPRESSIVE ✗ (FL-EI-LIM-F228-001) |
| F254 | 276794793a88… ✓ | EXPRESSIVE | EI-E |  | 5 | identical | — |
| F258 | 32a7e1e54c88… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| F260 | 101a0f8ddda4… ✓ | EXPRESSIVE | EI-E |  | 2 | identical | — |
| F267 | a43c2c6e58e1… ✓ | INTROVERT | EI-I |  | 0 | identical | — |
| F288 | f9eb6c0ec682… ✓ | INTROVERT | EI-I |  | 0 | identical | — |
| F293 | 07e1f32fc3f9… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| F298 | 659b90bdd4df… ✓ | EXPRESSIVE | EI-E |  | 4 | identical | — |
| F372 | 37ab9c7a9d46… ✓ | EXPRESSIVE | EI-E |  | 5 | identical | — |
| F390 | 8b7aa66998b7… ✓ | EXPRESSIVE | EI-E |  | 5 | identical | — |
| F391 | 828741ce357c… ✓ | EXPRESSIVE | EI-E |  | 6 | identical | — |
| F392 | 11ca5ec58751… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| F418 | 32bc4d5b5a26… ✓ | EXPRESSIVE | EI-E |  | 4 | identical | — |
| F444 | fffc92a71199… ✓ | EXPRESSIVE | EI-E |  | 10 | identical | — |
| F472 | 4065ecb506db… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| F563 | 1796c17181a9… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| M011 | 18fcc9e72530… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| M120 | 3488472033f7… ✓ | INTROVERT | EI-I |  | 0 | identical | — |
| M134 | d2bd29b89447… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| M165 | 923c0d7fa413… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| M178 | e57cd9de933a… ✓ | INTROVERT | EI-I |  | 0 | identical | INTROVERT ✓ |
| M210 | 257af7f79c6e… ✓ | INTROVERT | EI-I |  | 0 | identical | — |
| M214 | b4401429cd5c… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| M269 | 08591307fb90… ✓ | EXPRESSIVE | EI-E |  | 6 | identical | — |
| M270 | edfc2ee03190… ✓ | EXPRESSIVE | EI-E |  | 7 | identical | — |
| M303 | 89a692c14b1b… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |
| M308 | 810c13b336d3… ✓ | EXPRESSIVE | EI-E |  | 2 | identical | EXPRESSIVE ✓ |
| M309 | d7326b9131b2… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| M317 | 1dc4d9422a81… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| M320 | 008526ebec70… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | EXPRESSIVE ✓ |
| M323 | 8b34f75727e3… ✓ | EXPRESSIVE | EI-E |  | 1 | identical | — |
| REF_000622 | e3970f1d1c93… ✓ | EXPRESSIVE | EI-E |  | 3 | identical | — |

## GT audit

| look | CEO GT | runtime | agreement |
|---|---|---|---|
| M178 | INTROVERT | INTROVERT | ✓ |
| M320 | EXPRESSIVE | EXPRESSIVE | ✓ |
| M308 | EXPRESSIVE | EXPRESSIVE | ✓ |
| F228 | EXPRESSIVE | INTROVERT | ✗ — known incorrect prediction (accepted for V1) |

Evidence-path adjudications (not whole-look GT): M210 · F065 · F258 hold.
