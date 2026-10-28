# STMX TC WHOLE-GARMENT DIRECTION CONTRACT — FREEZE V1

> **Status:** 🔒 FROZEN (CEO D-83-1 APPROVED · 2026-09-27 · STMX TC MAINLINE V2.3.84 Phase A)
> **Scope:** TC Direction semantics for garments whose observations are recorded per region (e.g. Dress / Jumpsuit `fit` upper / lower). Nothing else.

> **Approval Anchor** — CEO Decision 2026-09-27 (STMX TC MAINLINE V2.3.84 §2 D-83-1 APPROVED; D-83A TC Whole-Garment Principle, V2.3.83). Reason: the TC canonical scoring object is the whole garment; regional observations localize evidence and are not TC Direction components; the V2.3.81 "regional-fit aggregation" framing is retired. Affected Scope: this file (new) · the Step 2 successor V3 input contract that implements it (`01_ENGINES/ITEM_SCORING_ENGINE/STMX_TC_STEP2_SEMANTIC_SUCCESSOR_V3_CANDIDATE/`). No frozen Departure statement, vocabulary, enum, Atomic, Vision field or Departure family is changed.

## 1. Contract (frozen verbatim from V2.3.83 `20_DRAFT_CANONICAL_WHOLE_GARMENT_CONTRACT.md`, sha256 `8046372128084c7d70d61b4bb1a6284544dd6a8649da6ce50089ce163279b6bb`)

| id | topic | wording |
|---|---|---|
| WG-1 | Scoring object | TC evaluates one lawful scoring unit (GARMENT or MATCHING_PAIR) as one complete garment realization. |
| WG-2 | Regional observations | Regional observations of that garment (e.g. Dress / Jumpsuit fit upper / lower) are observations of the one garment. They may locate departure evidence. They carry no TC Direction. |
| WG-3 | Reading | Every observed value of a governed carrier — scalar or regional — is read against the same frozen statements of the garment's archetype key. A value that meets a frozen TRUE gate is a departure of the garment, located where it was observed. |
| WG-4 | Conventional / unresolved | A channel may read FALSE only when every required value of its carriers is observed and conventional under the key's frozen statements and no eligible-but-undecided evidence remains. An unobserved or unreadable region leaves the channel UNRESOLVED. |
| WG-5 | No aggregation | No regional Direction exists; there is no composition, averaging, voting, priority, majority or synthetic whole-garment fit. A valid departure is never averaged away by conventional regions, and a region never creates validity by its location. |
| WG-6 | Direction-First unchanged | Valid Transformative Departure anywhere in the garment → TRANSFORMATIVE; none, with the required evidence resolved → CLASSIC; otherwise UNRESOLVED. |
| WG-7 | Adapters | An adapter carries the regional form of an observation (byRegion) as observation, never as provenance, and never collapses it. |
| WG-8 | SR boundary | TC does not inherit SR's per-half Direction resolution or half composition. |

Why this is a clarification, not new physics: WG-3 / WG-4 are the per-channel evidence reading frozen TC already applies to several carriers of one garment (e.g. the tailored constitutive table: any carrier meeting a TRUE gate → TRUE; all conventional → FALSE; unobserved carriers do not prove conventionality). No region is ever a Direction.

## 2. CEO principles preserved (order V2.3.84 §5, verbatim)

| principle | CEO wording | preserved by |
|---|---|---|
| A | TC evaluates one governed scoring garment as one garment. | WG-1 |
| B | Regional observations are lawful observations when Vision needs them to describe where a garment property occurs. | WG-2 · WG-7 |
| C | Regional observations may provide evidence for a valid TC Departure. | WG-2 · WG-3 |
| D | Regional observations do not themselves become regional TC Directions. | WG-2 · WG-5 |
| E | No upper/lower Direction aggregation is performed. | WG-5 · WG-8 |
| F | A valid Transformative Departure anywhere in the governed garment realization places the garment on the Transformative side. | WG-3 · WG-6 |
| G | A conventional region elsewhere does not cancel a valid departure. | WG-5 |
| H | Absence of a valid departure may support Classic only when required evidence is sufficiently resolved; missing required evidence remains UNRESOLVED. | WG-4 · WG-6 |

## 3. Reading notes (clarifications of scope, not rules)

- WG-1 names the existing lawful scoring-unit types. A MATCHING_PAIR remains two garments resolved by the frozen Step 2 §7 pair rule; this contract applies inside each garment and does not change pair semantics.
- "Every observed value … read against the same frozen statements" (WG-3) is a Departure reading of evidence. It produces a garment-level channel verdict; it never produces a regional Direction and never composes regional Directions.
- Regional TC Direction = NONE. Regional aggregation = NONE.

## 4. Prohibited (D-83A)

either-region rule · both-region rule · strongest / dominant / priority region · averaging · voting · majority · C+T=T · C+C=C · synthetic whole-garment fit · SR-style upper / lower Direction composition.
