# Loox 상품 → 판매처 이동 (현행)

*2026-10-13 코드 분석으로 작성 — 대상: stmx-web-phase2 `main`, vton `main`*
*스킬: reverse-engineering-business-logic (Workflow-to-BL)*

## 1. Business Purpose

Loox(착장 게시물)에 붙은 상품을 사용자가 누르면 네이버 쇼핑의 해당 상품(또는 카탈로그) 페이지로 보낸다.
**어느 크리에이터의 어느 게시물이 그 이동을 만들었는지는 기록하지 않는다.** 따라서 크리에이터에게 성과를 보여 줄 수도, 커미션을 귀속시킬 수도 없다.

## 2. Actors

- **운영자**: vton `/products-2-link` 에서 Loox 게시물에 네이버 카탈로그 상품을 붙인다.
- **크리에이터(게시물 작성자)**: 모바일 작성 마법사에서 자기 게시물에 상품을 붙인다.
- **방문자(로그인/비로그인)**: 웹 또는 앱에서 상품을 눌러 판매처로 나간다.
- **네이버 쇼핑**: 최종 판매처. 우리에게 어떤 전환 신호도 돌려주지 않는다.

## 3. Preconditions

- 상품 행의 `naver_url` 이 `https://(*.)naver.(com|me)` 이어야 한다(DB CHECK).
- 게시물과 상품이 `post_products` 로 이어져 있어야 한다.

## 4. Main Flow

1. **상품 연결**: 운영자 또는 작성자가 브랜드 × 분류로 네이버 카탈로그 모델을 고른다. 고른 모델은 `products` 로 승격되고(`naver_url = catalog_url`, `sale_price = 0`) `post_products` 에 위치(position)와 함께 붙는다.
2. **노출**: 게시물 상세·검색 화면이 상품 카드들을 보여 준다.
3. **이동(웹)**: 카드를 누르면 "네이버 쇼핑으로 이동" 확인 창이 뜨고, 확인하면 `<a target=_blank>` 로 `naver_url` 을 연다.
4. **이동(앱)**: 카드를 누르면 확인 없이 곧바로 시스템 브라우저나 네이버 앱으로 `naver_url` 을 연다.
5. **끝**: 우리 쪽에 남는 것은 없다.

## 5. Decision Rules

| Condition | Action |
|---|---|
| `naver_url` 호스트가 `*.naver.com`/`naver.me` 가 아님 | 웹: 이동 버튼 비활성 / 앱: 열지 않고 경고 로그 |
| URL 에 사용자 정보(`@`) 포함 | 앱: 거절(웹보다 엄격) |
| 상품 `is_active = false` | 목록에서 빠짐(RLS) |

## 6. State Transitions

상태 없음. 이동은 기록되지 않는 단발 이벤트다.

## 7. Billing / Credit Impact

없음. 커미션 테이블(`affiliate_orders`, `commissions`, `payouts`)은 vton 0012 에 있으나, 이 흐름은 그곳에 아무 행도 만들지 않는다. `affiliate_orders.affiliate_link_id` 는 "추후 links 연동 예약" 컬럼으로 FK 없이 비어 있다.

## 8. Exceptions / Edge Cases

- 카탈로그 URL 형식(`search.shopping.naver.com/catalog/{id}`)은 코드 주석상 "형식 미검증".
- 승격된 상품의 `sale_price = 0` — 가격 정보가 없다.
- 클릭 로그로 쓸 만한 기존 장치는 광고(`feed_ad_events`)와 게시물 액션(`post_action_clicks`: 좋아요·댓글·공유·북마크)뿐이며 상품 탭은 포함하지 않는다.

## 9. Data Written / Read

- **Written**: 연결 시점에만 `products`, `post_products`. 이동 시점에는 없음.
- **Read**: `products.naver_url`, `post_products.position`.

## 10. Ambiguities / Questions

- ⚠️ 네이버 쇼핑 커넥트/브랜드스토어 제휴 등 **전환 데이터를 받을 경로가 확보되어 있는가?** 없으면 주문 귀속은 브랜드 정산 리포트 수작업 업로드가 유일한 원천이다.
- ⚠️ 프로덕션이 `master` 와 `main` 중 무엇으로 배포되어 있는가(CI 는 `master` 만 빌드).

## 11. Code References

- 앱 이동: `stmx-web-phase2/apps/mobile/src/lib/naver-shopping.ts:12-42` (`isNaverShoppingUrl`, `openNaverShopping`)
- 앱 호출처: `apps/mobile/.../loox-post-detail.tsx:380`, `loox-search.tsx:187`
- 웹 이동: `stmx-web-phase2/apps/web/components/LooxNaverLinkModal.tsx:42,84`
- 상품 승격: `stmx-web-phase2/apps/web/lib/server/loox-product-catalog.ts:239-313`
- 운영자 연결: `vton/lib/playground/stmx-loox.ts:556-661`, `vton/app/products-2-link`
- 상품 스키마: `stmx-web-phase2/sqls/phase2/11_products.sql:26-54` (`naver_url` CHECK :43-44)
- 크리에이터 링크(@닉네임): `stmx-web-phase2/apps/web/next.config.ts:84`
- 미적용 초안: `stmx-web-phase2/sqls/phase2/15_shopmy_commerce.sql:129-287` (affiliate_links, clicks, RPC)
- 커미션·페이아웃: `vton/supabase/migrations/0012_affiliate_commissions_payouts.sql`

*End of analysis*
