# Glossary

정본은 [BDD/project_config.yaml](../BDD/project_config.yaml) 의 `terminology`. 명세 전용 용어는 [creator-link-tracking.md §3](proposal/workflows/creator-link-tracking.md#3-용어).

| ShopMy | STMX |
|---|---|
| Pin / Quick Link | 제휴 링크 (`affiliate_links`, source=loox/quick) |
| `go.shopmy.us/p-{id}` | `stmx.ai/go/{code}` |
| clickId / cid | `click_id` (불투명 uuid) |
| merchant source (shopmyshelf / network) | route (`direct_brand` / `naver`) |
| AffiliateCommission | `affiliate_orders` + `commissions` |
| Pending / Locked / Paid / Reversed | 같은 이름 (`commission_status`) |
| Brand Health discard reasons | `affiliate_order_ingests.discard_reason` |
