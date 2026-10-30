# STMX — BODY EXPOSURE TWO-CLASS ARCHITECTURE **FROZEN** V1

> **STATUS:** 🔒 **FROZEN** · **CEO Decision 2026-08-21 — Option A-Modified**
> **Freeze Tag:** `BODY_EXPOSURE_TWO_CLASS_FREEZE_V1`
> **Producer parameter count: EXACTLY 36 — PRESERVED. No #37 created.**
>
> ## ★ AMENDMENT 2026-09-03 — CATEGORY APPLICABILITY SUPERSEDED (CEO DIRECT PRODUCTION CORRECTION)
> **The clause "MANDATORY Dress/Jumpsuit · N/A elsewhere" in §2 is SUPERSEDED.** `exposure_opening` is now
> **UNIVERSAL — applicable to all ten canonical categories.** Body exposure is a property of the garment's
> own cut, not of its category: a cropped tee bares a midriff exactly as a cut-out dress does. The
> Dress/Jumpsuit scope was defensible for the 2026-08-15 consolidation, which carried only **Class B**
> designed openings; it became incorrect the moment this freeze added **Class A direct body-exposure
> regions** on 2026-08-21.
> ⛔ **Everything else in this freeze is UNCHANGED and still binding:** the two-class partition · the 9-value
> domain · Class A ≠ Class B · Class B never auto-derives Class A · EI consumes the REGION class only ·
> region count never auto-stacks EI · no #37 parameter · no new vocabulary.
> **Current authority:** `01_ENGINES/ITEM_VISION_EXTRACTOR/EXPOSURE_CATEGORY_APPLICABILITY_CORRECTION_V1/STMX_VISION_EXPOSURE_CATEGORY_APPLICABILITY_CORRECTION_V1.md`
>
> ```text
> Approval Anchor
> CEO Decision:   2026-09-03
> Reason:         Category was acting as an N/A gate on direct body-exposure observation. Corrected —
>                 category shall never gate `exposure_opening`.
> Affected Scope: producer_rules_v1.js (UNIVERSAL + MANDATORY Dress/Jumpsuit) · producer_prompt_v1.js
>                 · producer tests · derived raw input contract. ⛔ Scoring/EI physics change 0.
> ```

---

## 1. THE FIFTEEN FROZEN STATEMENTS

1. **Producer remains exactly 36 parameters.**
2. **`exposure_opening` remains MULTI** — one parameter, `whole_garment` carrier.
3. **`exposure_opening` contains TWO SEMANTIC CLASSES.**
4. **Region class:** `Shoulder` · `Chest / Décolletage` · `Midriff / Waist` · `Back` · `Upper Thigh`
5. **Designed-opening class:** `Open Back` · `Front Cutout` · `Side Cutout` · `Shoulder Cutout`
6. **Region and designed-opening semantics are INDEPENDENT.**
7. **Body Exposure is based on VISIBLE MEANINGFUL exposure.**
8. **Construction or category ALONE is insufficient.**
9. **`Upper Thigh` is intentionally narrower than legacy `Leg / Thigh`.**
10. **Ordinary shorts / skirts do NOT automatically produce `Upper Thigh`.**
11. **`Shoulder` and `Chest / Décolletage` are independent and may coexist.**
12. **EI consumes the REGION class ONLY for E01–E05.**
13. **Class-B values do NOT double-count EI Exposure.**
14. **Multiple Regions do NOT automatically stack EI magnitude.**
15. **Historical pre-update extraction remains IMMUTABLE.**

---

## 2. CANONICAL DOMAIN

```text
exposure_opening  (ONE parameter · MULTI · whole_garment ·
                   ~~MANDATORY Dress/Jumpsuit · N/A elsewhere~~
                   ★ SUPERSEDED 2026-09-03 → UNIVERSAL · applicable to ALL TEN categories)

  CLASS A — BODY EXPOSURE REGION        "which body region is meaningfully EXPOSED?"
      Shoulder
      Chest / Décolletage
      Midriff / Waist          (absorbs side-waist; NO separate Side Torso / Hip region)
      Back
      Upper Thigh              (narrow — NOT legacy Leg / Thigh)

  CLASS B — DESIGNED OPENING            "what designed opening construction exists?"
      Open Back
      Front Cutout
      Side Cutout
      Shoulder Cutout
```

The two classes **partition the domain exactly** — disjoint, and their union is the whole domain. Machine-readable as `EXPOSURE_REGION`, `EXPOSURE_DESIGNED_OPENING`, `exposureClassOf()`.

**Valid examples:** `[Shoulder]` · `[Shoulder, Chest / Décolletage]` · `[Back, Open Back]` · `[Midriff / Waist, Side Cutout]` · `[Shoulder, Shoulder Cutout]` · `[Upper Thigh]`

---

## 3. ★ REGION ≠ MECHANISM

| Region (Class A) | Mechanism (Class B) |
|---|---|
| `Back` — exposed body region | `Open Back` — designed garment opening |
| `Shoulder` — exposed body region | `Shoulder Cutout` — opening cut into a covered shoulder |
| `Midriff / Waist` — exposed body region | `Side Cutout` — cutout construction/location |

> Emitting both is **NOT duplication** — they preserve different observations.

⛔ **Class B never auto-derives Class A by name.** `Side Cutout` does not by itself prove `Midriff / Waist`; `Front Cutout` requires reading which region is actually bared. Body exposure is a **DIRECT VISUAL OBSERVATION**.

---

## 4. ★ THE FIREWALL — AUTHORIZED REPLACEMENT

**OLD (superseded):** `exposure_opening` was blanket-forbidden for *"mini/short length, an ordinary neckline, sleeveless/straps, a slit, or off-shoulder styling."* Under that rule a strapless gown could emit **nothing**, which is exactly the sourcing gap the B2-09 audit found.

**NEW (frozen):**

```text
CONSTRUCTION / CATEGORY ALONE      ->  insufficient. Emit nothing.
ACTUAL VISIBLE MEANINGFUL EXPOSURE ->  the corresponding REGION value MUST be emitted.
```

| Construction | Does NOT auto-create |
|---|---|
| Sleeveless · Strap | `Shoulder` |
| Off-shoulder · Strapless | `Shoulder` / `Chest / Décolletage` without visual confirmation |
| Crop | `Midriff / Waist` |
| Shorts · Mini · Slit | `Upper Thigh` |

> The exclusions were **not deleted** — they were narrowed from "never emit" to "never emit *from the label alone*", and paired with a positive obligation when exposure is actually visible.

---

## 5. EI E01–E05 SOURCING 🔒

| Region (Class A) | EI |
|---|---|
| `Chest / Décolletage` | **E01** |
| `Midriff / Waist` | **E02** |
| `Back` | **E03** |
| `Upper Thigh` | **E04** |
| `Shoulder` | **E05** |

⛔ **Class B has NO EI mapping.** `[Back, Open Back]` yields **exactly one** contribution (E03), never two.
⛔ **Region count does NOT stack EI magnitude.** `[Shoulder, Chest / Décolletage]` is two observations, not "two EI points". **No EI score physics was changed by this Order** — this closes OBSERVATION → EI SOURCING only.

---

## 6. CONSTRUCTION CARRIERS REMAIN INDEPENDENT

`shoulder_connection` · `slit` · `neckline_shape` / `neckline_position` · `sleeve` · `length` · `surface` are **untouched** and must still be reported.

**B2-09 worked example:**

```text
shoulder_connection = Strapless                        <- garment CONSTRUCTION
exposure_opening    = [Shoulder, Chest / Décolletage]  <- exposed BODY REGIONS  -> E05 + E01
```

Not redundant. Two different questions, two different records.

---

## 7. WHAT WAS **NOT** DONE

| | |
|---|---|
| 37th parameter | **NOT created** |
| `cutout` / `cutout_location` / `body_exposure` / `exposure_region` params | **NOT created** |
| Decomposition of `Side/Front/Shoulder Cutout` into Cutout + Location | **WITHDRAWN by CEO — not performed** |
| New location vocabulary | **NOT created** |
| Historical extraction rewrite | **NOT performed** |
| B2-09 / B2-10 scoring | **NOT performed — remain HOLD** |
| B2-16 `Front Cutout` migration | **NOT performed — preserved as provenance** |
| EI score physics | **NOT changed** |

---

## 8. HISTORICAL MIGRATION POLICY 🔒

The new domain applies **PROSPECTIVELY**. Old `Front/Side/Shoulder Cutout` and `Open Back` records remain **valid provenance** under the contract version that produced them — and remain domain-legal, because Class B preserved those values verbatim, so **no migration is mechanically required at all**.

⛔ No bulk rewrite. ⛔ No inference of Region from a historical string. Region values may be adjudicated under the new authority if an image is revisited during normal corpus review.

---

## 9. INTEGRITY

```text
Producer parameter count : 36

producer_rules_v1.js     3a8a1a595892862d  ->  fd5668b278e9187c
producer_prompt_v1.js    332d89a98d2b697b  ->  a1bb2a2db5f9e412
producer_validator_v1.js 0c2fff7861c6dbe8  ->  1f35d2f7eaf3e4a5
producer_controller_v1.js                      e912a3b7fc9ae198   UNCHANGED

VALUE_DOMAINS fingerprint 3b1673e661b5309f  ->  ac899aa64a01015d
    (only exposure_opening changed; every other domain byte-identical)

Producer regression   881 passed / 0 failed   (baseline 835 + 46)
Colour Contract V1     34 passed / 0 failed
One-Call prototype     32 passed / 0 failed
Vision API calls        0
```

---

## 10. Approval Anchor

```text
CEO Decision:   2026-08-21
Reason:         Body Exposure had no live carrier in the forward pipeline (B2-09 audit).
                Option A-Modified approved: exposure_opening becomes a TWO-CLASS MULTI
                carrier (Body Exposure Region + Designed Opening), preserving Producer-36.
                Cutout decomposition requirement withdrawn; existing fused values kept.
Affected Scope: producer_rules_v1.js · producer_prompt_v1.js · producer_validator_v1.js
                tests/producer_v1.test.js · this document
```

---

**🔒 BODY EXPOSURE TWO-CLASS ARCHITECTURE FROZEN. PRODUCER-36 PRESERVED. HARD STOP.**
