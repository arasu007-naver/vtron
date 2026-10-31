# STMX COLOUR V1 — TARGET-AWARE ACQUISITION CONTRACT V1 (CANDIDATE)

> Status: **CANDIDATE** · offline-verified only · not production · not frozen · **live extraction accuracy NOT_DEMONSTRATED** (G53 ACTIVE).
> Approval Anchor — CEO Decision 2026-10-29 (STMX ITEM SCORING V2 — TARGET-AWARE COLOUR EXTRACTION SUCCESSOR … COL-C · §4–§7). Reason: the locked standalone Colour V1 call observes only "the single most prominent garment" and returns no target identity. Affected Scope: this directory (new). Unchanged: Colour V1 (`run/color_recovery/color_contract_v1.js`, sha256 `ccda8495…`), Item Vision V1.3, all scoring engines.

## 1. What is frozen and reused unchanged

| Reused | Identity | How |
|---|---|---|
| Colour V1 module (fields · enums · validator · tolerant parser) | `run/color_recovery/color_contract_v1.js` · sha256 `ccda8495fcf202da…` | `require` after a sha256 pin check (`src/tac_frozen_colour_pin.js`) |
| Colour V1 field rules (prompt text) | `COLOR_PROMPT` sha256 `f444d261…` | the body between the scope sentence and the return line is carried **byte-for-byte**; the per-object JSON template is carried verbatim |
| Colour V1 validator | `validateColorObservation` | every observation is validated by it; `contract_errors` ⇒ REJECTED; `inconsistencies` / `warnings` kept as reported |

Not carried: the scope sentence "the single most prominent garment" (the limitation being replaced) and the single-object return line (replaced by one object per requested target). No colour meaning is restated or changed.

## 2. Target manifest (input)

Built from the current Item Vision V1.3 envelope **after** the scoring unit is resolved:

- `image` — `image_sha256` (computed by the caller from the image bytes) · `image_id` (envelope)
- `scoring_unit` — `ITEM` (1 target) · `SUIT` (Jacket + Trouser, or Jacket + Skirt) · `REQUESTED_TARGETS` (several individually requested garments); deterministic `unit_id`
- per target — V1.3 `target_id` · OBSERVED V1.3 `category` · V1.3 `descriptor` · `member_role` (Suit only = the member's own V1.3 category) · `identification` (`CATEGORY_UNIQUE` / `DESCRIPTOR`; `AMBIGUOUS` is refused) · `descriptor_colour_terms` (audit only)
- `manifest_sha256` binds a packet to exactly this envelope and unit.

Refused: target not in the envelope · not eligible · no OBSERVED category · duplicate · Suit components other than the two frozen EI V2 sets · ambiguous identification · missing / malformed image sha256.

## 3. Request (built, never sent by this code)

`ONE_CALL` = one request naming every requested target of the image · `PER_TARGET` = one request per requested target (the manifest is already de-duplicated). The descriptor is included **only** when the category alone cannot identify the garment. The model is told not to transfer colour from outer / inner layers, adjacent garments, accessories, skin or background, and (Suit) not to assume that members share a colour.

Response shape: `{"request_id": "...", "targets": [{"target_id": "...", "colour_visible": true|false, "color_observation": <Colour V1 object> | null}]}`.

## 4. Governance (per target, independently)

| Status | When |
|---|---|
| `OBSERVED` | `colour_visible` true and the frozen validator reports no contract error |
| `NOT_VISIBLE` | `colour_visible` false and `color_observation` null |
| `REJECTED` | contract errors · `MALFORMED_ENTRY` · `DUPLICATE_TARGET_ENTRY` (contradictory ownership: none kept) |
| `NOT_RETURNED` | absent · whole response unusable (`UNPARSEABLE_RESPONSE` · `REQUEST_ID_MISMATCH` · `MISSING_TARGETS_ARRAY` · `TRANSPORT_FAILURE`) |

Unrequested ids are ignored and recorded. Nothing is repaired, defaulted, copied between targets or keyed by array position.

## 5. Packet (output) — `TARGET_AWARE_COLOUR_PACKET_V1`

Every observation carries: image sha256 + image_id · target_id · scoring_unit_id · member_role · category · status · the colour evidence verbatim · validator result · provenance (`TARGET_AWARE_ACQUISITION` with request_id + prompt sha256 + mode + model · `HISTORICAL_STORED_ASSOCIATED` with basis · `LEGACY_SINGLE_UNKEYED`). The packet also carries the Colour V1 module + prompt sha256, the successor id and seal aggregate, and a `packet_sha256`. `verifyPacket()` checks the version, successor id, Colour V1 identity, manifest hash, image identity, observation set/order and packet hash.

## 6. Existing colour (no new AI)

- **Stored per-target colour** — `SAME_RECORD` (ids of this very record; the stored category must match) or `CROSS_PRODUCER` (another producer's ids: only the same image sha256 **and** a category that is unique both in the stored colour and in the V1.3 image). A shared `target_1` string is never identity.
- **Legacy single unkeyed colour** (the locked standalone runner): attributable only to the unique eligible target of the image; otherwise rejected for every requested target (never given to a Suit member or a non-dominant selection).

## 7. Transport and G53

This code contains no network or credential access. The default transport **refuses** (`G53_ACTIVE_NO_TRANSPORT`). A live run requires a separately authorised runner that injects a transport under a current CEO G53 exception. Retry only on a thrown transport error; default `maxAttempts` = 1.

## 8. Candidate vocabulary (for the §13 Dictionary review — not registered)

`TARGET_AWARE_COLOUR_PACKET_V1` · `ONE_CALL` / `PER_TARGET` · `REQUESTED_TARGETS` · `OBSERVED` / `NOT_VISIBLE` / `NOT_RETURNED` / `REJECTED` (packet status) · `colour_visible` · `member_role` · `identification` · `TARGET_AWARE_ACQUISITION` / `HISTORICAL_STORED_ASSOCIATED` / `LEGACY_SINGLE_UNKEYED` · `SAME_RECORD` / `CROSS_PRODUCER` · the codes in `src/tac_contracts.js`.
