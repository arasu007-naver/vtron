# Component reference rules (as implemented in the frozen runtime)

- Every participating apparel / footwear / accessory object of the primary subject is one component `cN` in `component_registry` (participation principle, CEO 2026-10-02). Non-participants (`xN` in the model output: other people, background, carried non-worn objects judged excluded) are not admitted; the exclusion reason is never stored.
- Identity = an Item garment category (T-Shirt · Shirt · Sweater · Sweatshirt · Jacket · Coat · Trouser · Skirt · Dress · Jumpsuit) or an approved accessory family (footwear · bag · headwear · scarf · jewellery · belt · eyewear · hosiery · tie · gloves · other). `UNKNOWN` is a state, never a value; nothing is force-fitted.
- Footwear carries `footwear_product_family` (+ conditional `footwear_product_subtype`); other families may carry an optional `object_subtype`.
- One physical object = one record. A belt / tie / sash that belongs to a garment is part of that garment, never a component. An object attached to an accessory is that accessory's own appearance fact.
- Every reference in `component_fact_pool`, `colour_composition`, `relations`, `upper_realization.source_refs`, `canonical_exposure` and `dm_evidence` must name a registry component (validator; acceptance gate B-03).
- In evaluation alignments a component whose identity is UNKNOWN may be written `u:cN`; that prefix is an evaluation convention, not a packet value.
