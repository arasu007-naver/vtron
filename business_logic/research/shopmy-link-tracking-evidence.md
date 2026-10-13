# ShopMy 링크 → 클릭 → 주문 → 커미션 → 지급 비즈니스 로직 증거 파일

- 조사일: 2026-10-13
- 방법: 공개 소스와 익명 HTTP 요청만 사용했다(블랙박스). 로그인, 계정 생성, 보호 장치 우회는 하지 않았다. ShopMy 도메인에 보낸 요청은 약 25건이다(help center 정적 문서 83건은 별도로 1초 간격으로 수집).
- 목적: 한국 패션 플랫폼이 이 모델을 따라 만들 때 쓸 business-logic spec의 근거 자료.
- 쿠키는 **이름만** 기록했다. clickId, click_token 같은 클릭 단위 식별자는 `<uuid>`, `<token>`으로 가렸다.

## 0. 출처 태그 규칙

각 주장 뒤에 `[유형:키]`와 신뢰도 `(high/med/low)`를 붙였다. 키와 URL은 아래 표에 대응된다.

### 0.1 공식 Creator Guide (help center: `https://shopmy.helpkit.so/...`, 구 guide.shopmy.us)

| 키 | URL |
|---|---|
| doc:pay-how | https://shopmy.helpkit.so/payment/43V9gf7Co7gb6ZT2oTe8eM/how-payment-works/43V9gf7Co7TmY3WPUawHgL |
| doc:pay-faq | https://shopmy.helpkit.so/payment/43V9gf7Co7gb6ZT2oTe8eM/payment-faq/43V9gf7Co5t5aH6rWwpwyi |
| doc:pay-pending | https://shopmy.helpkit.so/payment/43V9gf7Co7gb6ZT2oTe8eM/pending-earnings-explained/5Pqz516S948JBXgkjE8enN |
| doc:pay-tax | https://shopmy.helpkit.so/payment/43V9gf7Co7gb6ZT2oTe8eM/tax-information/66ZbJH9wzEu3iNjkAWgimr |
| doc:pay-setup | https://shopmy.helpkit.so/payment/43V9gf7Co7gb6ZT2oTe8eM/how-to-set-up-a-payment-method/43V9gf7CoanhPvwVgrr2BQ |
| doc:ec-afflink | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/what-is-an-affiliate-link/3ViMaZXyPZMRsDhymyDm3o |
| doc:ec-money | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/how-does-shopmy-make-money-from-transactions-/3ViMaZXyQ2dBGoH26xz7we |
| doc:ec-cookie | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/what-is-a-cookie-window-and-what-is-the-default-window-for-shopmy-brands/5kdVRoGw9pCxiADtBifvfD |
| doc:ec-appear | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/how-long-does-it-take-for-sales-to-appear-in-my-%E2%80%9Clinks%E2%80%9D-or-%E2%80%9Cearnings%E2%80%9D-tab/43V9gf7Co5NguwYAoNFnR9 |
| doc:ec-missing | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/a-retailer-was-listed-as-commissionable-but-i-did-not-earn-what-happened-and-why-is-my-order-missing/43V9gf7Co7Ah3sbbNyEvxG |
| doc:ec-less | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/why-did-i-earn-less-commission-than-expected-on-a-purchase/3ViMaZXyQ1Ndeha8rraLfd |
| doc:ec-fullcart | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/if-someone-uses-my-shopmy-link-but-purchases-a-different-product-on-the-retailer%E2%80%99s-website-will-i-earn-commission/43V9gf7Co5w5y6Pym4tktw |
| doc:ec-reversal | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/my-commission-earnings-disappeared-what-happened/43V9gf7Co6sJqb33SeKTkX |
| doc:ec-sku | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/can-retailers-offer-different-commission-rates-for-certain-items-/4Ua2ri1rg773nZkS2FjRBP |
| doc:ec-ratechange | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/why-did-a-retailer%E2%80%99s-commission-rate-change-/3ViMaZXyQ2xRHahm3YMD1K |
| doc:ec-noncomm | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/what-happens-when-i-link-a-non-commissionable-brand-or-product/8mfhW1hVTxaVw9rZgZ2y8z |
| doc:ec-notcatalog | https://shopmy.helpkit.so/earning-commission/3ViMaZXyQ1eDm8uT5tQWeC/how-to-add-a-product-that%E2%80%99s-not-in-the-shopmy-catalog/43V9gf7Co5nUKpFybDwGoJ |
| doc:ln-create | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/how-to-create-a-commissionable-link/43V9gf7Co8nkZrckwUPWEw |
| doc:ln-quick | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/what-is-a-quick-link/4Snb812Hu1vM9iTi15CEdL |
| doc:ln-geo | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/how-to-create-country-specific-links/3ViMaZXyQ2odM6v1oaP8Nv |
| doc:ln-autopub | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/auto-linking-for-publishers/4tx5RgywPA7Aybno4Vv5RA |
| doc:ln-autosite | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/can-i-auto-generate-affiliate-links-for-products-linked-on-my-website/4qRiSQ6s9WXBZNRYXS45Di |
| doc:ln-snapshop | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/snapshop/3ViMaZXyQ23gEGyhz4T2im |
| doc:ln-safari | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/safari-extension/5hZ7H2tBVxDLxNooWh5gvy |
| doc:ln-embed | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/embeddable-components/3ViMaZXyQ33DU2WWSmYxDV |
| doc:ln-shareshop | https://shopmy.helpkit.so/creating-and-sharing-links/3ViMaZXyQ3oy7Ai2FXgQY8/how-do-i-share-a-link-to-my-shop/5hZ7H2tBVvvHuTXUyVnzYW |
| doc:app-create | https://shopmy.helpkit.so/the-shopmy-app/3ViMaZXyQ1gadxVT2SG6i3/how-do-i-create-a-link-in-the-app/8n9dA9MhM6gRnUfitQnQ1r |
| doc:app-shop | https://shopmy.helpkit.so/the-shopmy-app/3ViMaZXyQ1gadxVT2SG6i3/how-do-i-build-and-edit-my-shop/8n9dA9MhM6KMvmZnQqgrDY |
| doc:app-track | https://shopmy.helpkit.so/the-shopmy-app/3ViMaZXyQ1gadxVT2SG6i3/how-do-i-track-my-links-and-earnings/8n9dA9MhM54BAoBFppii7g |
| doc:app-partners | https://shopmy.helpkit.so/the-shopmy-app/3ViMaZXyQ1gadxVT2SG6i3/how-do-i-work-with-brand-partners-in-the-app/8n9dA9MhM4xmy2LqbL3BjQ |
| doc:shop-setup | https://shopmy.helpkit.so/building-your-shop/43V9gf7Co5VBrmboNBWQ1S/how-to-set-up-your-shop/43V9gf7Coa389AEHhFJmkw |
| doc:shop-hidden | https://shopmy.helpkit.so/building-your-shop/43V9gf7Co5VBrmboNBWQ1S/how-do-i-create-a-private-or-hidden-collection/5hZ7H2tBVvMUNCrqsu3rzX |
| doc:shop-posts | https://shopmy.helpkit.so/building-your-shop/43V9gf7Co5VBrmboNBWQ1S/how-to-create-shoppable-posts/43V9gf7Co7HHFnmxzLcNMJ |
| doc:shop-amazon | https://shopmy.helpkit.so/building-your-shop/43V9gf7Co5VBrmboNBWQ1S/can-i-add-amazon-products-to-my-shop/43V9gf7Co83hoiLajKXQKX |
| doc:shop-consults | https://shopmy.helpkit.so/building-your-shop/43V9gf7Co5VBrmboNBWQ1S/how-do-i-set-up-consults/43V9gf7Co6xVaCHoroiUgR |
| doc:cw-circles | https://shopmy.helpkit.so/circles-wishlist-latest-finds-and-more/5jLY2jskGAENwEWJEf147B/deep-dive-circles/5kdVRoGw9oEj1srLpf4C4f |
| doc:cw-wishlist | https://shopmy.helpkit.so/circles-wishlist-latest-finds-and-more/5jLY2jskGAENwEWJEf147B/deep-dive-wishlist/5kdVRoGw9mCe9bwE63Ttab |
| doc:cw-store | https://shopmy.helpkit.so/circles-wishlist-latest-finds-and-more/5jLY2jskGAENwEWJEf147B/deep-dive-new-storefront/5jLY2jskGCTW8Skw5y1vdY |
| doc:cw-faq | https://shopmy.helpkit.so/circles-wishlist-latest-finds-and-more/5jLY2jskGAENwEWJEf147B/faqs/5kdVRoGw9nmmppW3uMKyRZ |
| doc:wb-types | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/types-of-brands-on-shopmy-/3ViMaZXyQ3sZHE8AUSWA9s |
| doc:wb-ways | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/what-are-the-ways-i-can-work-with-shopmy-brand-partners-/43V9gf7Co7UKkcnDk11B1s |
| doc:wb-collab | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/collaborations/43V9gf7Co839vf8fojNHc9 |
| doc:wb-opp | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/what-are-opportunities/43V9gf7Co8svXQaKb8KVLr |
| doc:wb-oppfaq | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/opportunities-faq-/43V9gf7Co6KEHcVaCNRcT3 |
| doc:wb-opppay | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/opportunity-payouts-faq/6MPRvdUy8qTDHgdL8J8MPz |
| doc:wb-oppperf | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/how-to-analyze-your-opportunities-performance/4tx5RgywPAbfVhem9aAaFy |
| doc:wb-spot | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/spotlights-faq/7DXEkqhHTYPKuuLwZjWxnw |
| doc:wb-chat | https://shopmy.helpkit.so/working-with-brands/3ViMaZXyQ2eoRf1eFbHfXN/chat-with-brands/63pu78c62tF5aTBeFLY99w |
| doc:nf-force | https://shopmy.helpkit.so/new-features/7gzwTL4HFnpBgaeYuxPS3d/force-capture-for-opportunities/7h2uHQiU88othkFLCF935X |
| doc:nf-codes | https://shopmy.helpkit.so/new-features/7gzwTL4HFnpBgaeYuxPS3d/discount-codes-on-storefronts/8n9dA9MhM66uFd1tXdvefc |
| doc:nf-insights | https://shopmy.helpkit.so/new-features/7gzwTL4HFnpBgaeYuxPS3d/new-links-tab-insights/7JrhC9JwkHnWun9V6MpCCW |
| doc:st-analyze | https://shopmy.helpkit.so/strategy-and-best-practices/43V9gf7Co7n5euHvJHVzyN/how-to-analyze-your-performance/43V9gf7CobtyvYKBukYnhv |
| doc:st-download | https://shopmy.helpkit.so/strategy-and-best-practices/43V9gf7Co7n5euHvJHVzyN/how-do-i-download-my-data/5hZ7H2tBVuxxp4qUhPUtF8 |
| doc:st-traffic | https://shopmy.helpkit.so/strategy-and-best-practices/43V9gf7Co7n5euHvJHVzyN/how-can-i-drive-more-traffic-and-volume-on-my-links-/43V9gf7Co7LJo4TqoH5unv |
| doc:tier-metrics | https://shopmy.helpkit.so/tiering-system/43V9gf7Co5oFCWYVULJ7C1/what-metrics-impact-my-creator-score/43V9gf7Co8suAbsWmGXF1v |
| doc:tier-down | https://shopmy.helpkit.so/tiering-system/43V9gf7Co5oFCWYVULJ7C1/why-did-i-lose-points-or-go-down-a-tier/43V9gf7Co8JSgZQZ6AQsUg |
| doc:ref-creator | https://shopmy.helpkit.so/refer--earn/43V9gf7Co6QQ6qZw3AcHxr/creator-referral-program/8tpGcbcNZSQgtEFesDqVZX |
| doc:ref-shopper | https://shopmy.helpkit.so/refer--earn/43V9gf7Co6QQ6qZw3AcHxr/shopper-referral-program/8tpGcbcNZTas7P4SAdMLPK |
| doc:ref-brand | https://shopmy.helpkit.so/refer--earn/43V9gf7Co6QQ6qZw3AcHxr/brand-referral-program/8tpGcbcNZUmZ3i9mMaGk9e |
| doc:mgr-split | https://shopmy.helpkit.so/for-managers/7HZjN5ukTVhuLHzPQcEaCR/setting-up-an-agency--split-take-rate/7HZjN5ukTVdFPXTdAcNtte |
| doc:mgr-earn | https://shopmy.helpkit.so/for-managers/7HZjN5ukTVhuLHzPQcEaCR/understanding-earnings--payments/7HZjN5ukTXcdFYnfhe8ud1 |
| doc:brand-sku | https://shopmyshelf.notion.site/SKU-Based-Commission-1c43a75a96c5809da7aeff781bb5c645 (brand용 Notion 가이드. 페이지는 JS 렌더링이라 직접 읽지 못했고 검색엔진 스니펫으로만 확인했다) |

### 0.2 관찰 (observed)

| 키 | 내용 |
|---|---|
| observed:hop-direct | `curl -s -o /dev/null -D - -A "Mozilla/5.0 ..." https://go.shopmy.us/p-80000894` 와 그 뒤 hop을 수동으로 따라간 기록(trace 스크립트). MM LaFleur(Shopify, ShopMy 직접 연동 브랜드) |
| observed:hop-direct2 | `p-80001284, p-80002779, p-80010197, p-80011593, p-80012457` 의 hop1 Location(Thatch, Zoe Chicco, Melissa Wood Health, Ruggable, rag & bone) |
| observed:hop-impact | `https://go.shopmy.us/p-71195558` 전체 hop(Nordstrom, Impact 네트워크 경유) |
| observed:apx | `curl ... "https://go.shopmy.us/apx/sDXyBS?url=https%3A%2F%2Fwww.nordstrom.com%2F"` (문서에 예시로 나온 auto-link id) → 이어서 `p-89994210` hop1 |
| observed:shortlinks | `go.shopmy.us/c-7077866`, `go.shopmy.us/p-1`(존재하지 않는 id) |
| observed:clicktrack-js | 브랜드 사이트에 삽입된 `https://static.shopmy.us/Affiliates/sms_aff_clicktrack.js?domain=mmlafleur.com&expires=30` (v2.1.1)을 1회 GET해서 읽음 |
| observed:collection-api | `GET https://apiv3.shopmy.us/api/Collections/7077866?limit=60` (공개 storefront SPA가 익명으로 호출하는 API). 응답의 pin 필드명을 확인 |
| observed:spa-bundle | `https://shopmy.us/static/js/main.0dfd86dc.js` (공개 SPA 번들, 약 16MB)의 문자열과 코드 조각 분석 |
| observed:html-meta | `https://shopmy.us/shop/collections/7077866` HTML `<head>`의 verification meta 태그 |
| observed:creator-blog | https://www.thewardrobeconsultant.com/blog/the-ultimate-guide-to-my-shopmy 와 /blog/easy-pants 에서 실제 go.shopmy.us 링크를 수집 |

### 0.3 3rd-party

| 키 | URL |
|---|---|
| 3rd-party:creatorhero | https://www.creator-hero.com/blog/shopmy-pricing-and-review (경쟁사가 쓴 리뷰라 편향 가능) |
| 3rd-party:influencerhero | https://www.influencer-hero.com/blogs/shopmy-pricing-and-review (검색 스니펫 기준) |
| 3rd-party:martech | https://martech.zone/shopmy-dtc-affiliate-marketing-for-influencers/ (검색 스니펫 기준) |

---

## 1. 관찰된 Entity와 추정 필드

> SPA 번들의 REST resource 이름(`/Pins`, `/Collections`, `/AffiliateCommissions`, `/Payouts`, `/CustomRates`, `/CustomAffiliateRates`, `/CustomCodes`, `/CuratorGroups`, `/Opportunities`, `/OpportunityResults`, `/OpportunityPaymentTiers`, `/Lookbooks`, `/LookbookOrders`, `/Contracts`, `/ContractInvoices`, `/AffiliateInvoices/for_brand`, `/BrandBudgetInvoices`, `/Merchants/*`, `/Shopify/*`, `/UserTiers`, `/UserManagers`, `/PaymentAccounts`, `/Spotlights`, `/Mentions` 등)이 entity 구조를 거의 그대로 보여준다. [observed:spa-bundle] (high)

| Entity | 의미 | 관찰·추정 필드 | 근거 |
|---|---|---|---|
| **User (Creator / Shopper / Brand user / Manager / Publisher)** | 한 계정 테이블에 역할 flag가 있다 | `id, username, name, Brand_id, Agent_id, ReferringUser_id, ReferringBrand_id, amazonCode, isShopper, isPublisher, isManager, isBanned, banExpiration, codes, sections` | [observed:collection-api] (high). creator 계정과 shopper 계정은 연결되어 토글할 수 있다 [doc:cw-faq] (high) |
| **Pin (= Link)** | 크리에이터가 만든 상품 링크 하나. `go.shopmy.us/p-{Pin.id}` | `id, User_id, Collection_id (Quick Link는 null), Product_id, link (원본 retailer URL), affiliate_link (템플릿), domain, merchant_data, title, image, description, isQuick, isHidden, geolinks, selectedGeoLink, Contract_id, ConsultResult_id, LookbookOrderItem_id, ForceOpportunityResult_id, Quick_Pin_Reference_id, OAuthApplication_id, disable_monetization, force_disable_monetization, allow_displaying_codes, allow_deep_link_to_app, click_token, sms_click_id, sortOrderRank, createdAt` | [observed:collection-api] (high) |
| **merchant_data (Pin에 붙는 Merchant 스냅샷)** | 이 링크가 어느 merchant 프로그램으로 수익화되는지 | `name, domain, source (affiliate network enum), stable_merchant_id, rateType ('percentage' / 'fixed_fee' / 'flat_fee'), isClosedProgram, Brand_id` | [observed:collection-api] (high) |
| **Merchant** | domain 하나에 여러 네트워크 프로그램이 붙을 수 있고, 그중 "winner"를 고른다 | `source, domain, fullPayout (gross rate), isSMSWinner, user_percentage_override, network_rate, network_rate_gmv_cut, raw.commission_rate, isClosedProgram, rateType` | [observed:spa-bundle] (`getAdjPayoutRateData`, `isSMSWinner`) (high) |
| **Merchant.source enum** | `awin, avantlink, digidip, flexoffer, goaffpro, impact, narrativ, pepperjam, rakuten, refersion, shareasale, shopmyshelf(=ShopMy 직접 연동), skimlink, viglink`. 그 밖에 `cj`, `amazon`이 코드에 등장 | [observed:spa-bundle] (high) |
| **Product / Variant / CatalogGroup** | 정규화된 상품 카탈로그. 같은 상품을 여러 retailer가 팔 수 있다 | `Product: id, title, image, AllBrand_id/name, Category, Department, Industry, fallbackPrice/Currency, fallbackUrl, daily/weekly/monthly/yearly/totalClicks, num_promoters`, `Variant (SpecificVariant_id)`, `CatalogGroup_id` | [observed:collection-api][observed:spa-bundle] (high) |
| **Collection** | 큐레이션 묶음. `shopmy.us/collections/{id}`, 단축 `go.shopmy.us/c-{id}` | `id, name, description, User_id, Section_id, private, isArchived, isQuick, Contract_id, social_links, numShoppablePins, pin_count, sortOrderRank, addPinsToTop, disclaimer` | [observed:collection-api][observed:shortlinks] (high) |
| **Section** | storefront 상단 탭. Shop → Section → Collection → Pin 3단 구조 | `id, title, order` | [doc:app-shop][doc:shop-setup] (high) |
| **Shop / Storefront** | `shopmy.us/{username}`. 기본 탭은 Latest Finds, Most Popular(최근 30일 rolling view 수 기준), For You | 표시 범위 설정(Visible Collections and Quick Links / +Popular Quick Links / Collections Only / All Links) | [doc:cw-store][doc:cw-faq] (high) |
| **Click** | 리다이렉트 1회마다 생성 | `clickId (UUID)`, `click_token`, `cid = user-{CreatorId}[-group-{CuratorGroupId}]-pin-{PinId}\|product-{ProductId}-puser-{clickingUserId\|null}-src-{ql\|web}[-ms-{MomentId}]-clk-{token}`, `code`(크리에이터 할인코드), `url` | [observed:hop-direct][observed:spa-bundle] (high) |
| **AffiliateCommission (Order)** | 귀속된 주문 1건(또는 1줄) | `transaction_date, order_amount, commission_amount, Pin_id(pin), domain, merchant, Collection_id/name, Contract_id/title, Consult_id/title, code, status, isLocked, isPending, isPaid, Payment_id/Payout_id, is_bonus, is_opportunity_bonus, wasFronted, brand_amount` | [observed:spa-bundle] (med: 필드 의미는 이름에서 추정) |
| **Payout / Payment** | 주간 지급 묶음 | `Payout_id, ManagerPayout_id, Payment_id, user_payout_total, user_payout_total_locked, user_payout_total_paid, expectedPayoutDate, payoutReleasableAt` | [observed:spa-bundle] (med) |
| **PaymentAccount** | Stripe / PayPal 연결 | provider. Plaid 연동 흔적(`/PlaidIntegration/*`)도 있다 | [doc:pay-setup][observed:spa-bundle] (high/med) |
| **CustomRate (creator×brand)** | 브랜드가 특정 크리에이터에게 주는 개별 요율 | `User_id, Brand_id, rate, rate_returning (신규/재구매 고객 별도 요율), brandMessage` | [observed:spa-bundle] (`POST /CustomRates`) (high) |
| **CustomAffiliateRate (SKU 단위)** | 브랜드가 상품·그룹 단위로 정하는 요율 | `Brand_id, rate, SpecificVariant_id, SpecificVariantSibling_id, CatalogGroup_id` | [observed:spa-bundle][doc:ec-sku] (high) |
| **CustomCode** | 크리에이터 전용 할인코드 | bulk 업데이트, 노출 여부(visibility) 관리. `BlacklistedCodes`도 있다 | [observed:spa-bundle][doc:nf-codes] (high) |
| **CuratorGroup (= Circle)** | 쇼퍼가 만든 "신뢰하는 크리에이터 묶음" | `CuratorGroupUsers, CuratorGroupFavorites`. 생성 경로: discover, from_instagram_zip, from_taste_profile, from_user_id_list | [observed:spa-bundle][doc:cw-circles] (high) |
| **Wishlist (Shopper pin)** | 쇼퍼가 저장한 상품. 처음 링크를 준 크리에이터에게 귀속된다 | (필드는 확인하지 못함) | [doc:cw-wishlist] (high: 동작 / low: 스키마) |
| **Opportunity / OpportunityResult / OpportunityPaymentTier** | flat-fee 보너스 캠페인 | `trackingStartsAt, trackingEndsAt, payment_tier.fixedFee, payment_tier.adjCommissionRate, auto_send_lookbook, isCompleted, isInReview, Payout_id, payoutPolicy (same week / standard + delay days)` | [observed:spa-bundle][doc:wb-oppfaq] (high) |
| **Lookbook / LookbookOrder** | gifting 제안과 발송 주문(Shopify 주문으로 동기화) | `/LookbookOrders/sync`, `shopify_order_names` | [observed:spa-bundle][doc:app-partners] (high) |
| **Contract (Collaboration)** | 유료 협업 제안·계약 | `ContractTasks, ContractLinks, ContractRatesCodes, ContractInvoices` | [observed:spa-bundle][doc:wb-collab] (high) |
| **Spotlight** | 브랜드가 크리에이터의 기존 게시물에 Meta Partnership Ad / TikTok Spark Ad 광고비를 붙이는 기능 | 원래 Pin을 복제한 링크를 쓴다(트래킹 분리) | [doc:wb-spot] (high) |
| **UserTier** | Enthusiast(0) / Ambassador(30) / Trendsetter(70) / Icon(85), 100점 만점 | | [doc:tier-metrics] (high) |
| **UserManager** | 에이전시나 매니저. Opportunity 수익에 take rate를 설정 | `takeRateOnOpportunities` | [doc:mgr-split][observed:spa-bundle] (high) |
| **Brand / BrandSettings / BrandIntegration (Shopify)** | | `allowOrderCreation, allowProductSyncing, allowAffiliateTracking, allowCustomCodes`, `altDomains`, `commission_rate`, budget(`amountRemaining, allowedBudgetOverage`), `developer_key`, `appDownloadCommissionRate` | [observed:spa-bundle] (high) |

---

## 2. 링크 생성 흐름과 URL 포맷

### 2.1 생성 경로

| 경로 | 동작 | 근거 |
|---|---|---|
| **Catalog search** | 상품명·브랜드·retailer로 검색해 선택한다. 제목, variant(shade), 설명을 편집할 수 있다. 커미션율이 함께 보인다 | [doc:ln-create][doc:app-create] (high) |
| **Add by URL (paste)** | retailer URL을 붙여넣으면 ShopMy가 해당 retailer의 affiliate 지원 여부를 확인하고, 가능하면 commissionable link를 만든다. 이미지와 제목은 크롤링으로 채우고, 실패하면 수동 입력한다. 앱 가이드는 붙여넣기 전에 URL의 `?` 뒤를 지우라고 권한다 | [doc:ec-notcatalog][doc:app-shop] (high) |
| **Websites (앱 내 브라우저)** | 앱 안에서 지원 retailer 사이트를 열어 상품 페이지에서 Create Link | [doc:app-shop] (high) |
| **Snapshop** | Chrome/Safari bookmarklet형 extension. 모바일은 iOS share sheet. "Found other rates"로 같은 상품의 다른 retailer 요율을 보여준다. 50k+ retailer 지원 | [doc:ln-snapshop][doc:ln-create] (high) |
| **iOS Safari Extension** | 인식된 상품 페이지에 현재 요율을 보여주는 pill이 뜬다. 길게 누르면 즉시 링크 생성, 탭하면 이미지·캡션·collection을 지정할 수 있다 | [doc:ln-safari] (high) |
| **Mobile Keyboard** | iOS 키보드에서 기존 링크를 넣거나 새 링크를 만든다 | [doc:app-shop] (high) |
| **My Links 재사용 / Duplicate to Collection** | 같은 상품을 다른 Collection에 넣으면 **별도로 트래킹되는 Pin이 새로 생긴다** | [doc:ln-create][doc:app-shop][doc:shop-setup] (high) |
| **Auto-linking script (publisher)** | 사이트에 `<script defer src="https://static.shopmy.us/Auto/{autoLinkId}.js" data-sms="{autoLinkId}">`를 삽입한다(2025-05-07 이전 버전은 `/Affiliates/`). 외부 상품 링크를 모두 `go.shopmy.us/apx/{id}?url=...`로 바꾼다. Allowed Domains와 Skipped Domains 설정이 있다. 링크는 **첫 클릭 시점에 Links 탭에 생긴다** | [doc:ln-autopub][doc:ln-autosite] (high) |
| **Manual wrap** | `go.shopmy.us/apx/{autoLinkId}?url={encoded}&c={collectionId}`. 서버가 Referer 헤더를 Allowed Domains와 대조한다고 문서에 적혀 있다 | [doc:ln-autopub] (high) |
| **Shoppable posts / Shelves** | IG/TikTok/YouTube 게시물을 가져와 상품 Pin을 태깅한다 | [doc:shop-posts] (high) |
| **Amazon** | Account Settings에 Amazon Associates tag를 저장해 두면 일반 Amazon URL에 그 tag가 자동으로 붙는다. 수수료는 **Amazon이 직접 지급**하고 ShopMy Earnings에는 잡히지 않는다. `shopmy.us/{username}`을 Associates 승인 사이트로 등록해야 한다 | [doc:shop-amazon] (high) |
| Amazon tag 미설정 시 | 프론트 코드에서 `<amazon_tag>` placeholder가 creator의 amazonCode로 치환되고, 값이 없으면 **`shopmyshelf00-20`(ShopMy 자체 tag)** 로 대체된다 | [observed:spa-bundle] (high: 코드 존재 / med: 실제 서버 동작) |
| **Retailer 교체 (re-target)** | 기존 링크의 retailer를 요율이 더 높은 다른 retailer로 바꿀 수 있고, URL(Pin id)은 그대로 유지된다 | [doc:ln-create][doc:shop-setup] (high) |
| **Geolinks** | 국가별 대체 URL. 다른 사용자가 등록한 geolink를 제안으로 보여준다. 자동 localization도 한다 | [doc:ln-geo][doc:cw-faq] (high) |
| **Non-commissionable link** | 아무 URL이나 링크로 만들 수 있다. 다만 0%나 Non-Commissionable이면 **주문이 아예 집계되지 않는다**(Links, Earnings, tier volume 모두 제외) | [doc:ec-noncomm] (high) |

### 2.2 URL 포맷

| 포맷 | 의미 | 근거 |
|---|---|---|
| `https://go.shopmy.us/p-{PinId}` | 수동 생성 링크(Quick Link와 Collection pin 공통). Pin id는 전역 순번(관찰 값 7천만~8천9백만대) | [doc:ln-quick][observed:creator-blog] (high) |
| `https://go.shopmy.us/apx/{autoLinkId}?url={enc}[&c={collectionId}]` | Auto-link. 첫 클릭 때 Pin을 만들거나 찾은 뒤 `302 → go.shopmy.us/p-{newPinId}` | [doc:ln-autopub][observed:apx] (high) |
| `https://go.shopmy.us/ap/{username}?url=` | 구 문서에 남아 있는 다른 auto-link 표기 | [doc:ln-autosite] (low) |
| `https://go.shopmy.us/c-{collectionId}` | `302 → https://shopmy.us/collections/{id}` | [observed:shortlinks] (high) |
| `https://go.shopmy.us/join/{username}` | creator 추천(가입) 링크 | [observed:creator-blog] (high) |
| `https://shopmy.us/{username}`, `/shop/{username}?tab=latest\|popular`, `?Section_id=` | storefront | [doc:ln-shareshop][observed:creator-blog] (high) |
| `https://shopmy.us/collections/{id}` 또는 `/shop/collections/{id}` | collection 페이지 | [observed:creator-blog] (high) |
| `https://shopmy.us/shop/product/{ProductId}` | 정규화 상품 페이지(가격 비교, 유사 상품) | [observed:spa-bundle][doc:cw-store] (high) |
| 존재하지 않는 `p-` id | `302 → https://shopmy.us` | [observed:shortlinks] (high) |
| Pin.affiliate_link 템플릿 | `https://apiv3.shopmy.us/api/redirect_click?clickId=<uuid>&code={code}&cid=<custom_id>&url=...`. placeholder는 `<custom_id>`, `<cur_ref>`, `<amazon_tag>` | [observed:collection-api][observed:spa-bundle] (high) |

---

## 3. Click → Redirect 파이프라인

### 3.1 관찰한 hop chain

**A. ShopMy 직접 연동 브랜드(merchant source = `shopmyshelf`, Shopify 스토어): MM LaFleur** [observed:hop-direct] (high)

| Hop | Status | URL / Location | Set-Cookie 이름 |
|---|---|---|---|
| 1 | 302 | `https://go.shopmy.us/p-80000894` | (없음) |
| 2 | 302 | `https://apiv3.shopmy.us/api/redirect_click?clickId=<uuid>&code=HALLIE15&cid=user-50735-pin-80000894-puser-null-src-ql-clk-<token>&url=https://mmlafleur.com/?utm_source=ShopMy&utm_medium=affiliate&utm_campaign={Creator Name}&utm_content={Collection name}&utm_referrer=shopmy.us` | (없음) |
| 3 | 200 | `https://mmlafleur.com/?utm_source=ShopMy&utm_medium=affiliate&utm_campaign=...&utm_content=...&utm_referrer=shopmy.us&smsclickid=<uuid>&smscode=HALLIE15&utm_term=<uuid>` | `localization, cart_currency, _shopify_essential, _shopify_analytics, _shopify_marketing` (Shopify 기본 쿠키) |

- 붙는 파라미터는 `smsclickid`(=clickId), `smscode`(크리에이터 할인코드), `utm_term`(=clickId), `utm_source=ShopMy`, `utm_medium=affiliate`, `utm_campaign`(크리에이터 이름), `utm_content`(Collection 이름), `utm_referrer=shopmy.us`이다. [observed:hop-direct] (high)
- 같은 Pin을 다시 요청하면 `clickId`와 `clk-` token이 매번 새로 발급된다. 즉 **클릭이 서버 리다이렉트 시점에 기록된다**. [observed:hop-direct] (high)
- 다른 직접 연동 브랜드(Thatch, Zoe Chicco, Melissa Wood Health, Ruggable, rag & bone)도 hop2가 `apiv3.shopmy.us/api/redirect_click`로 같은 구조다. `code` 파라미터는 크리에이터가 그 브랜드 코드를 가진 경우에만 붙는다(rag & bone에는 없음). [observed:hop-direct2] (high)

**B. 네트워크 경유 retailer(Impact): Nordstrom** [observed:hop-impact] (high)

| Hop | Status | URL / Location | Set-Cookie 이름 |
|---|---|---|---|
| 1 | 302 | `https://go.shopmy.us/p-71195558` | (없음) |
| 2 | 302 | `https://nordstrom.sjv.io/c/2340682/1960196/23920?subId1=user-50735-pin-71195558-puser-null-src-ql-clk-<token>&u={encoded nordstrom PDP}` (**apiv3 redirect_click hop 없이 네트워크로 바로 간다**) | (없음) |
| 3 | 302 | `https://www.ojrq.net/p/?return={hop2 URL}&level=1&cid=23920&tpsync=yes&auth=...` (Impact 브라우저 동기화 도메인) | `brwsr` |
| 4 | 301 | `https://nordstrom.sjv.io/c/...&level=1&brwsr=...&brwsrsig=...` | `brwsr, irld` |
| 5 | 200 | `https://www.nordstrom.com/s/...?...&utm_id=2340682&utm_source_platform=impa&utm_source=shopmyshelf&utm_medium=afndinf&utm_campaign=...affpub-2340682...&irclickid=<id>&irgwc=1&afsrc=1` | `Ad34bsY56` (retailer 쿠키) |

- Impact publisher id `2340682`는 **ShopMy 회사 계정 하나**다(크리에이터별 계정이 아니다). 크리에이터와 Pin 식별은 `subId1`(= cid 문자열)에 실어 보낸다. 리포트가 돌아오면 ShopMy가 cid를 파싱해 Creator와 Pin에 귀속시키는 sub-affiliate 구조로 추론된다. [observed:hop-impact] (high: 관찰 / med: 리포트 파싱은 추론)
- Nordstrom 랜딩 URL의 `utm_source=shopmyshelf`는 ShopMy의 옛 이름 "Shop My Shelf"(법인명 Shop My Shelf, Inc.)를 뜻한다. [observed:hop-impact][observed:html-meta] (high)

**C. Auto-link (apx)** [observed:apx] (high)

| Hop | Status | URL |
|---|---|---|
| 1 | 302 | `https://go.shopmy.us/apx/sDXyBS?url=https%3A%2F%2Fwww.nordstrom.com%2F` → `https://go.shopmy.us/p-89994210` |
| 2 | 302 | `https://go.shopmy.us/p-89994210` → `https://nordstrom.sjv.io/c/2340682/1960196/23920?subId1=user-5455-pin-89994210-puser-null-src-ql-clk-<token>&u=https%3A%2F%2Fwww.nordstrom.com%2F` |

- apx는 URL을 Pin으로 resolve(필요하면 생성)한 다음 일반 `p-` 흐름으로 다시 들어간다. Referer 헤더 없이 요청해도 302로 동작했다(문서와 달리 Referer 검증이 차단 조건은 아닌 것으로 보이거나, 다른 단계에서 판정하는 것으로 보인다). [observed:apx] (med)
- 앞서 받은 정보에 따르면 존재하지 않는 username으로 apx를 호출하면 400이 반환된다. (low: 이번 조사에서 재현하지 않음)
- **부작용 메모**: 이 probe가 문서 예시 id(user 5455) 계정에 Nordstrom 홈 Pin을 생성했거나 기존 Pin을 조회했을 수 있다. 추가 호출은 하지 않았다.

### 3.2 cid(sub-id) 문법

프론트 코드(`Kg`, product page click builder)에서 확인한 생성 규칙이다. [observed:spa-bundle] (high)

```
cid := "user-" CreatorUserId
       [ "-group-" CuratorGroupId ]          // Circle에서 클릭한 경우
       ( "-pin-" PinId | "-product-" ProductId )
       [ "-puser-" ClickingShopperUserId ]   // 로그인한 쇼퍼. 없으면 "null"
       "-src-" ( "ql" | "web" )              // ql: go.shopmy.us 서버 리다이렉트, web: shopmy.us 웹 안에서 클릭
       [ "-ms-" MomentId ]
       "-clk-" click_token
```

- 이 문자열 하나에 Creator, Circle, Pin/Product, Shopper, 유입 채널이 모두 들어 있다. 그래서 네트워크 sub-id 필드 하나만 돌아와도 Circle 분배(§4)와 Wishlist 귀속을 서버에서 재구성할 수 있다. (med: 추론)

### 3.3 직접 연동 브랜드의 브랜드 사이트 측 트래킹(first-party click pixel)

`sms_aff_clicktrack.js` v2.1.1 동작 [observed:clicktrack-js] (high)

1. URL의 `smsclickid`를 읽는다. 없으면 `document.referrer`에서 찾고, 그래도 없으면 `sessionStorage.sms_click_id`를 쓴다.
2. 1st-party 쿠키 `sms_click_id`, `sms_click_time`을 쓴다. 만료일은 스크립트 query의 `expires`(기본 **30일**), 도메인은 `domain` 파라미터로 정한다. `splitcookies` 옵션이 있으면 `smsclickid_{suffix}`를 property별 `sms_click_id_{suffix}` 쿠키로 따로 저장한다.
3. **Shopify 스토어로 감지되면** `/cart.js`를 읽고 `/cart/update.js`로 cart attributes에 `sms_click_id`와 `sms_click_time`을 넣는다(최대 3회 재시도). 이 값이 주문의 `note_attributes`로 넘어가 주문과 클릭을 연결한다.
4. `POST https://api.shopmy.us/api/confirm_click`으로 `{clickId, validation_status, url, metadata(cookies_succeeded, cart_token, recovered_from_referrer/session, custom_cookie_domain, custom_cookie_expire_in_days ...)}`를 보낸다. 서버는 이것으로 브랜드 사이트에 pixel이 정상 설치됐는지 판단한다.
5. `smscode`가 있으면 Shopify에서는 `fetch('/discount/{code}')`로 **할인코드를 자동 적용**하고, Shopify가 아니면 `sms_code` 쿠키에 저장한다.
6. `*.myshopify.com` checkout 링크에 `smsclickid`(필요하면 code도)를 덧붙여 도메인 이동 중 귀속이 끊기지 않게 한다.

### 3.4 주문 귀속 신호(직접 연동 브랜드)

번들 상수 `ORDER_ATTRIBUTION_SOURCES` [observed:spa-bundle] (high)

| source | 의미(추정) |
|---|---|
| `click_id` | 주문 데이터에 smsclickid가 들어 있음 |
| `landing_site` | Shopify 주문의 landing_site URL에 smsclickid가 있음 |
| `note_attributes` | 위 cart attributes 경로 |
| `ip_match` | 클릭 IP와 주문 IP를 대조하는 fallback |
| `offer` | private offer 또는 쇼퍼 오퍼 |
| `discount_code` | 크리에이터 코드 사용(링크 없이도 귀속) |

- 수집 경로(`BRAND_HEALTH_ROUTES`): `redirect_click → confirm_click → order_confirmation`, Shopify webhook(`/api/Shopify/order_created/:Brand_id`, `order_updated`, `order_fulfilled`, `order_cancelled`), `shopify_nightly_sync`, `/api/Affiliates/update`, `affiliates_cancel`, `partners_cancel`, 그리고 Zenoti, Miva, BigCommerce webhook. [observed:spa-bundle] (high)
- 클릭을 버리는 사유(`BRAND_HEALTH_CLICK_DISCARD_REASONS`): `expired_click`(attribution window 초과), `cross_brand_click`(다른 브랜드의 클릭), `property_mismatch`(도메인이나 property 불일치). [observed:spa-bundle] (high)
- 브랜드 Health 모니터링 알림 분류: `click_tracking, shopify_connectivity(app_uninstalled, token_revoked, missing_scopes, missing_webhooks …), clicks, orders, order_updates, order_cancellations, flat_line, attribution_drift`. [observed:spa-bundle] (high)

### 3.5 Affiliate network 추론

| 네트워크 | 근거 |
|---|---|
| Impact | 관찰한 hop(`*.sjv.io`, `irclickid`, `ojrq.net`, `brwsr` 쿠키). shopmy.us HTML의 `<meta name="ir-site-verification-token">` [observed:hop-impact][observed:html-meta] (high) |
| Rakuten, CJ, ShareASale, Awin, Pepperjam, AvantLink, Refersion, Partnerize, Webgains, Narrativ, Skimlinks, VigLink, Digidip, FlexOffers, GoAffPro | 번들의 merchant source enum과 표시 이름 [observed:spa-bundle] (high: 지원 코드 존재 / 실제 hop은 Impact만 관찰). 도움말은 "ShareASale, Impact, Rakuten, CJ 등"이라고 명시한다 [doc:wb-types] (high) |
| FlexOffers | HTML `<meta name="fo-verify">` [observed:html-meta] (med) |
| 기타 verification meta | `<meta name="verification">` 2개(어느 네트워크인지 미확인) [observed:html-meta] (low) |
| Skimlinks, VigLink, Digidip | sub-network(aggregator) fallback으로 보인다. 코드상 `cj`, `skimlink` source와 amazon 링크에는 `rel=nofollow noopener`를 붙인다 [observed:spa-bundle] (med) |
| Direct (ShopMy 자체 = `shopmyshelf`) | apiv3 `redirect_click`, `smsclickid`, Shopify cart attribute 경로 [observed:hop-direct][observed:clicktrack-js] (high) |
| Amazon Associates | creator 자신의 tag. 없으면 `shopmyshelf00-20` [doc:shop-amazon][observed:spa-bundle] (high/med) |

---

## 4. Attribution 규칙

| 규칙 | 내용 | 근거 |
|---|---|---|
| Last-click | 대부분의 프로그램이 last-click이다. 내 링크를 클릭한 뒤 다른 creator 링크, 검색광고, 뉴스레터 링크 등을 클릭하면 크레딧이 넘어간다 | [doc:ec-afflink][doc:ec-cookie][doc:pay-faq] (high) |
| Cookie window | **브랜드나 retailer가 정한다.** "한 세션"부터 "최대 30일"까지이고, 흔한 값은 7일이다. ShopMy 전체 기본값은 없다 | [doc:ec-cookie][doc:pay-faq] (high) |
| 직접 연동 브랜드의 기술적 기본값 | click pixel 쿠키 만료 기본 30일(`expires=30`). 범위를 벗어난 클릭은 `expired_click`으로 버린다 | [observed:clicktrack-js][observed:spa-bundle] (high) |
| Full-cart commission | 링크한 상품이 아니어도 같은 retailer에서 산 **commissionable 품목 전체**에 커미션이 붙는다 | [doc:ec-fullcart][doc:pay-faq] (high) |
| Link > Code | 링크 클릭이 할인코드보다 우선한다. A creator 링크를 클릭하고 B creator 코드를 쓰면 A가 크레딧을 받는다. 개인용 코드는 커미션이 없다 | [doc:ec-less] (high) |
| Code 단독 귀속 | 브랜드 코드를 쓴 주문은 링크 클릭이 없어도 creator에게 귀속된다("100% tracked", "link-less, cookie-less") | [doc:wb-collab][doc:wb-ways][doc:app-partners] (high) |
| Cross-device / app / incognito | 지원하지 않는다. 기기·브라우저 전환, 일부 retailer 앱 구매, 시크릿 모드, 쿠키 거부, Honey·Rakuten 확장, 다른 코드 사용, 자기구매가 모두 누락 사유로 명시돼 있다 | [doc:ec-missing][doc:pay-faq] (high) |
| IP match fallback | 직접 연동 브랜드는 `ip_match` 귀속 소스가 있다(쿠키가 없을 때 IP로 대조하는 것으로 추정) | [observed:spa-bundle] (med) |
| Self-purchase | 대부분의 브랜드가 자기구매를 제외하거나 나중에 reversal한다 | [doc:ec-missing][doc:ec-reversal] (high) |
| Storefront / direct link | 쇼퍼가 creator storefront나 direct link로 사면 그 creator가 **100%** 받는다 | [doc:cw-store][doc:cw-faq] (high) |
| **Wishlist** | 쇼퍼가 creator가 링크한 상품을 Wishlist에 저장하면 **저장 시점에 그 creator에게 귀속**된다. 이후 언제 사든(문서 예시는 1년 뒤) creator가 **full commission**을 받는다. 처음 링크한 retailer가 **아닌 다른 retailer**에서 사도 적용된다 | [doc:cw-wishlist][doc:cw-faq] (high: 정책 / low: 쿠키 window를 넘는 장기 귀속을 기술적으로 어떻게 구현하는지는 미확인. shopper 로그인 + cid의 `puser` 필드가 열쇠로 추정) |
| **Circles** | 쇼퍼가 Circle(CuratorGroup) 안에서 사면 **그 상품을 추천한 Circle 내 모든 creator가 나눠 받는다.** "쇼퍼가 당신의 공간에 있으면 full credit, Circle에 있으면 기여자 모두가 share" | [doc:cw-circles][doc:cw-faq] (high) |
| Circle 분배 정산 | 매주 일요일 **"Weekly Multi-Curator Sales Bonus"** 항목으로 Earnings와 All Orders에 표시된다. 즉 원 주문 커미션이 아니라 **보너스로 재분배**된다 | [doc:cw-faq] (high) |
| Circle 분배 비율 | 균등 분배인지 기여도 가중인지 문서에 없다 | (Unknown) |
| Circle 클릭 식별 | cid에 `-group-{CuratorGroupId}`가 붙고, 웹 상태값 `attributableCuratorId` / `attributableCuratorGroupId`로 귀속 주체를 고른다 | [observed:spa-bundle] (high) |
| Opportunity 카운트 규칙 | 링크 하나가 qualify하려면 클릭 10회 이상, 또는 판매가 있으면 클릭 3회 이상이 필요하다. Opportunity 시작 7일 전부터 만든 링크까지 인정하지만, 활동은 tracking window 안이어야 한다. "Linking Day"는 qualifying 링크가 하루 10클릭 이상인 날이다. 같은 링크는 한 번만 센다 | [doc:wb-oppfaq] (high) |
| Spotlight | 원래 Pin의 **복제 Pin**을 써서 별도로 트래킹한다. 요율은 승인 시점의 creator 요율(커스텀 요율 포함)이다 | [doc:wb-spot] (high) |
| Geo | 클릭한 쇼퍼의 위치로 geolink를 고르거나 자동 localization한다(관찰한 Pin 응답에 요청자 IP 기반 `geo` 객체가 포함됨) | [doc:ln-geo][observed:collection-api] (high) |

---

## 5. 커미션 Lifecycle, 요율, 반품·취소

### 5.1 상태

```
(click) → [주문 보고: 최대 7일 지연] → Pending → (retailer 반품기간 종료 + 검증 + 인보이스 + ShopMy 입금) → Locked → (다음 금요일 payout, 최소 $11 이상) → Paid
                                        └→ Reversed / Cancelled (negative row로 표시)
```

| 단계 | 규칙 | 근거 |
|---|---|---|
| 보고 지연 | 주문이 계정에 보이기까지 **최대 7일**(때로 몇 주). 7일이 지나야 누락 문의를 받는다 | [doc:ec-appear][doc:pay-faq] (high) |
| Pending | retailer가 반품기간 종료를 기다리고, 검증하고, affiliate 인보이스를 처리해 **ShopMy에 송금할 때까지.** 보통 **30~120일** | [doc:pay-how][doc:pay-pending][doc:pay-faq] (high) |
| Locked | **ShopMy가 retailer 대금을 실제로 받은 시점**에 Locked가 되고 다음 지급 대상이 된다(cash-received 기준) | [doc:pay-how] (high) |
| Lifetime | Lifetime Earnings = pending + locked 누적 | [doc:pay-faq] (high) |
| Pending 변동 | 브랜드가 reversal을 일괄 처리하면 Pending 금액이 한꺼번에 바뀐다 | [doc:ec-reversal] (high) |
| Reversal 사유 | 반품·교환, 취소, 결제 실패, 자기구매, 중복·사기, attribution 조정. **브랜드나 retailer 재량이고 ShopMy가 결정하지 않는다** | [doc:ec-reversal] (high) |
| 표시 | All Orders에서 음수 order total이나 commission은 취소·반품을 뜻한다. Standard Commissions Report(CSV)에서 확인한다 | [doc:st-analyze][doc:ec-reversal] (high) |
| 지급 후 반품 | "Once an order has been paid out, it won't be retroactively adjusted"(지급 후에는 소급 차감하지 않는다) | [doc:ec-less] (high) |
| "Fronted" | 번들의 브랜드 예산·인보이스 쪽에 `wasFronted` 필드가 있고 `fronted` / `pending` / `paid` 상태로 나뉜다. ShopMy가 브랜드 입금 전에 creator에게 먼저 지급(선지급)하는 경우가 있는 것으로 추정된다 | [observed:spa-bundle] (med) |
| Opportunity bonus | requirement를 채우고 complete되면 pending→locked 과정을 **건너뛰고** 그 주 금요일 지급에 포함된다(구 FAQ). 신 FAQ는 **Same Week Payout**과 **Standard Payout**(표시된 대기기간 후 첫 금요일)으로 나누고, 수락 시점의 조건이 고정된다. 브랜드가 미지급 인보이스를 갖고 있으면 지연될 수 있다 | [doc:pay-faq][doc:wb-opppay][doc:wb-oppfaq][doc:pay-pending] (high) |

### 5.2 요율

| 항목 | 내용 | 근거 |
|---|---|---|
| 설정 주체 | **브랜드나 retailer가 정한다.** ShopMy는 협상하고 표시만 한다. 여러 프로그램이 있으면 **가장 높은 요율을 보여준다** | [doc:ec-ratechange] (high) |
| 일반 범위 | 10%~30% | [doc:pay-how] (high) |
| 수익 배분 | **82/18**: creator 82%, ShopMy 18%. **표시되는 요율에 이미 반영돼 있다.** 또는 브랜드에 transaction fee를 따로 받는 경우 creator가 표시 요율의 100%를 받는다 | [doc:ec-money] (high) |
| 코드상 계산식 | `creatorRate = baseRate × user_percentage / 100`. `user_percentage` 기본값 **82**, merchant별 `user_percentage_override` 가능 | [observed:spa-bundle] (high) |
| 요율 우선순위(코드) | ① merchant `rateType ∈ {fixed_fee, flat_fee}`이면 fullPayout ② creator×brand **CustomRate** ③ SKU/Variant 요율(`SpecificVariant_id` 일치) 또는 CatalogGroup 요율 중 최대값 ④ merchant `fullPayout`(직접 연동이면 brand `commission_rate`). `isClosedProgram`이면 0 | [observed:spa-bundle] (high) |
| 직접 연동 브랜드 100% 조건 | `source == 'shopmyshelf'`이고 `network_rate`와 `network_rate_gmv_cut`이 둘 다 없으면 creator가 100%를 받는다(브랜드 fee 모델). 둘 중 하나라도 있으면 82%를 적용한다 | [observed:spa-bundle] (med: 필드 의미 추정) |
| 표시 요율 반올림 | 3% 미만은 소수 1자리, 그 이상은 정수로 표시(`roundCreatorRate`) | [observed:spa-bundle] (high) |
| SKU 요율 | 상품별 요율. 표준보다 높으면 초록 배지로 표시. 브랜드 측 최소 **5%**, 예약 적용 불가, 자격 요건 있음 | [doc:ec-sku] (high), [doc:brand-sku] (med: 스니펫) |
| 신규/재구매 차등 | CustomRate에 `rate`와 `rate_returning`이 있다. 도움말도 "New customers may earn a different rate than returning customers"라고 한다 | [observed:spa-bundle][doc:ec-less] (high) |
| 계산 기준액 | **할인 후 subtotal**. 배송비와 세금은 제외 | [doc:ec-less][doc:pay-faq] (high) |
| 제외 품목 | 세일·클리어런스, 기프트카드, 일부 3rd-party 브랜드, 특정 카테고리. "i" 아이콘에 disclaimer 표시 | [doc:ec-less][doc:ec-missing] (high) |
| Blended rate | 여러 상품 요율이 섞이면 평균 요율이 된다. 플랫폼에 표시되는 값은 "average commission rate" | [doc:pay-faq][doc:ec-less] (high) |
| 국가별 | 국제 사이트마다 요율이 다를 수 있다 | [doc:pay-faq] (high) |
| Opportunity 중 요율 조정 | Opportunity가 요율 자체를 바꿀 수 있다(`payment_tier.adjCommissionRate`) | [doc:wb-oppfaq][observed:spa-bundle] (high) |
| Consults | 상담 판매는 80/20(creator 80%) | [doc:shop-consults][doc:pay-faq] (high) |

---

## 6. Payout 규칙

| 항목 | 내용 | 근거 |
|---|---|---|
| 주기 | **매주 금요일** | [doc:pay-how][doc:pay-faq] (high) |
| 최소 금액 | "Next Payment"에 **$11 이상**(Locked 기준) | [doc:pay-how][doc:pay-faq] (high) |
| 수단 | **Stripe**(direct deposit) 또는 **PayPal**. Account Settings → Connected Accounts. 번들에 Plaid 연동 흔적도 있다 | [doc:pay-setup][observed:spa-bundle] (high/med) |
| 협업(Collaboration) 대금 | Stripe를 권장한다. Stripe가 없으면 커미션과 합쳐 금요일에 PayPal로 지급 | [doc:pay-faq] (high) |
| 세금 | 1099는 결제 플랫폼이 발행한다. PayPal은 1099-K(2025년 기준 $20,000 초과 **그리고** 200건 초과), Stripe는 Track1099 경유. ShopMy는 직접 발행하지 않는다. 가입 시 legal name을 받는다 | [doc:pay-tax][doc:pay-faq] (high) |
| Shopper referral | $1/active shopper(가입 + Circle 생성, pin, 또는 Wishlist). **creator 자신이 eligible order를 1건 이상 만들어야 지급** | [doc:ref-shopper] (high) |
| Creator referral | 피추천인이 Ambassador가 되면 $20, Trendsetter $80, Icon $900(합계 $1,000). Referral Credits로 tier 점수도 얻는다(최대 20점) | [doc:ref-creator][doc:tier-metrics] (high) |
| Brand referral | Icon 전용. 브랜드가 IO에 서명하고 kickoff까지 가면 $1,000. Core Package 이상만 해당 | [doc:ref-brand] (high) |
| Tier 보너스 | Ambassador $10, Trendsetter $50, Icon $100. 첫 주문 이후 지급 | [doc:tier-metrics] (high) |
| 매니저 split | Opportunity 수익에만 take-rate %를 적용해 매니저 계정에 자동으로 분리 지급한다. 소급 적용은 불가. ShopMy는 인보이스를 받지 않는다 | [doc:mgr-split][doc:mgr-earn] (high) |
| Amazon | Amazon이 직접 지급(ShopMy 지급 범위 밖) | [doc:shop-amazon] (high) |

---

## 7. Creator에게 보이는 Analytics

| 화면 | 지표·기능 | 근거 |
|---|---|---|
| 앱 Home | Link Performance(주 단위 Clicks / Commission 토글), All Earnings(today, next payment, lifetime), 링크별 rate·clicks·orders·earnings. 정렬: Recently Created, Most Clicks, Most Orders, Highest Earned. 기간 지정. 진행 바: 활동 없음 / 최근 복사·공유 / 클릭 있음 / 주문 있음 | [doc:app-track] (high) |
| 웹 Links › My Links | 링크별 created, clicks, orders, earned. 날짜 범위로 합계 재계산. CSV 다운로드 | [doc:st-analyze][doc:st-download] (high) |
| Links › By Product / By Brand(구 By Website) / By Category | 상품별 모든 링크, 브랜드별 링크 수·retailer·매출·수익, 카테고리별 기여 | [doc:nf-insights] (high) |
| Performance by Website | 도메인별 volume, clicks, orders, earnings. 초록 체크는 ShopMy 브랜드 파트너 | [doc:st-analyze] (high) |
| All Orders | 주문별 order total, commission, **discount code 사용 여부**. 음수는 취소·반품. (order volume은 웹에서만 보이고 앱은 commission만) | [doc:st-analyze][doc:ec-fullcart] (high) |
| Earnings | 월·연 합계, 월별 paid vs pending, 수익 유형 필터(commission, referral, opportunity, collaboration, Spotlight, Multi-Curator bonus), Payments(예정·최근 지급 상태), Standard Commissions Report 다운로드 | [doc:app-track][doc:ec-reversal][doc:cw-faq][doc:wb-spot] (high) |
| Collection Analytics | shop views, collection views, collection별 earnings, collection 안 item별 clicks, orders, earned | [doc:st-analyze] (high) |
| Storefront | Most Popular는 최근 30일 view 순(creator만 view 수를 볼 수 있다). "Trusted By"는 Circle 추가, 즐겨찾기, 12개월 내 구매자 수의 추정치 | [doc:cw-faq] (high) |
| Opportunity | 링크별 counting 여부와 사유. 종료 후 ROI 스케일과 percentile | [doc:wb-oppfaq][doc:wb-oppperf] (high) |
| Spotlight | impressions, clicks, orders, GMV, earnings. 주·월·분기·연 단위 | [doc:wb-spot] (high) |
| 서버 API | `/Pins/analytics/creator/{brands,categories,grouped_summary,mentions,products}` | [observed:spa-bundle] (high) |
| Tier 점수 | Profile 10, Recent Activity 15(최근 13주), Monthly Traffic 25(3개월 평균, 0~10K clicks), Monthly Order Volume 50(3개월 평균), Referral 최대 +20. 승급 후 최소 14일 유지 | [doc:tier-metrics][doc:tier-down] (high) |

---

## 8. Brand 측

| 항목 | 내용 | 근거 |
|---|---|---|
| 브랜드 2종 | **Brand Partner**(ShopMy 플랫폼 사용, 직접 연동, 실시간 성과, 커스텀 요율, 코드, gifting, Opportunities)와 **Commissionable Partner**(네트워크를 거쳐 ShopMy에 요율을 주는 retailer, 플랫폼 접근 없음, 요율 변동과 제약은 ShopMy 통제 밖) | [doc:wb-types] (high) |
| Shopify 연동 | OAuth(`/Shopify/oauth`). 권한 토글은 `allowOrderCreation`(Lookbook 주문 생성), `allowProductSyncing`(카탈로그), `allowAffiliateTracking`(주문 webhook), `allowCustomCodes`(할인코드 생성). 주문 webhook은 created / updated / fulfilled / cancelled + nightly sync. 클릭 pixel은 `sms_aff_clicktrack.js` | [observed:spa-bundle][observed:clicktrack-js] (high) |
| 비 Shopify | BigCommerce, Miva, Zenoti webhook, `/api/order_confirmation`(범용 conversion endpoint로 추정), `/api/Affiliates/update`, `affiliates_cancel`. 브랜드 `developer_key` 회전 기능 | [observed:spa-bundle] (high: 존재 / med: 용도) |
| Shopify App Store | `apps.shopify.com/shopmy`는 404. 공개 listing이 없고 비공개(unlisted) 앱으로 추정 | [observed: curl apps.shopify.com/shopmy → 404] (med) |
| 기본 요율 | brand `commission_rate`. SKU·카탈로그 그룹 요율(최소 5%). creator별 CustomRate(신규/재구매 분리). bulk 적용 | [observed:spa-bundle][doc:brand-sku] (high/med) |
| Brand Tiers | `BrandCreatorStatTiers`, `BrandTiers/example_programs`. creator 성과 단계별 요율 프로그램으로 추정 | [observed:spa-bundle] (low) |
| Gifting (Lookbooks) | 브랜드가 Lookbook을 보내면 creator가 상품을 고르고 주소를 입력한다. Shopify 주문으로 동기화. 게시 의무 없음. Trendsetter 이상은 직접 요청 가능 | [doc:app-partners][doc:wb-collab][observed:spa-bundle] (high) |
| Opportunities | flat-fee 보너스(Bonus / Promotion / Event / Gifting Opportunity). 요건 예: N개 링크, social mention, Linking Days. 브랜드가 링크를 invalid로 표시할 수 있다. 4시간마다 social scan. Force Capture | [doc:wb-oppfaq][doc:nf-force][doc:app-partners] (high) |
| Opportunity 예산 | 브랜드 budget(`amountRemaining`, `allowedBudgetOverage`, `monthlyLimitAmount`), `BrandBudgetInvoices`, budget increase take rate | [observed:spa-bundle] (high) |
| Collaborations | 제안 → 채팅 협상 → 승인 → 콘텐츠 승인 → 링크 트래킹 → 완료 → ShopMy 경유 지급. 제안은 Trendsetter 이상만 가능 | [doc:wb-collab] (high) |
| Codes | 브랜드가 creator 코드를 발급한다. 코드 주문은 링크 없이 귀속. 앱 storefront에 로그인한 쇼퍼에게만 코드 탭이 보인다 | [doc:wb-ways][doc:nf-codes] (high) |
| Spotlights | 브랜드가 creator의 기존 태그 게시물에 Meta Partnership Ad / TikTok Spark Ad를 집행. creator는 커미션만 받는다(별도 사용료 없음). 수락 기한 7일. Instant 또는 Roster 승인 | [doc:wb-spot] (high) |
| 브랜드 analytics | `/Pins/analytics/brand/{mentions,orders,promoters}`, `AffiliateCommissions/for_brand`, `AffiliateInvoices/for_brand`(브랜드가 ShopMy에 내는 affiliate 인보이스) | [observed:spa-bundle] (high) |
| 브랜드 채팅 | Enthusiast와 Ambassador는 브랜드가 먼저 말을 걸어야 답할 수 있다. Trendsetter 이상은 먼저 시작할 수 있다 | [doc:wb-chat] (high) |
| 가격(3rd-party) | 진입 $399/월(2024년엔 $999), full $2,799+/월. transaction fee는 직접 연동 GMV의 최대 2.9%, 네트워크 경유 약 3.9%. Opportunity 예산에 15% platform fee. Lookbook 가치 기반 수수료 | [3rd-party:creatorhero] (low~med: 경쟁사 작성) / [3rd-party:influencerhero] "affiliate package 3.9% of GMV, Network Access 2.9%" (low) |

---

## 9. 한국 플랫폼 spec에 바로 옮길 핵심 로직(요약)

1. **Pin 중심 모델**: 링크 하나 = Pin 하나. 같은 상품이라도 Collection이나 placement마다 새 Pin을 만들어 성과를 분리한다. 단축 URL은 `go/{p-PinId}`.
2. **Click은 서버 302 시점에 생성**한다. `clickId(UUID)`와 `cid`(creator·group·pin·shopper·src·token을 인코딩)를 만든다.
3. **Merchant 라우팅**: Pin의 merchant_data.source가 `direct`(자체 pixel·webhook)인지 `network`(subId1=cid)인지에 따라 리다이렉트 템플릿을 바꾼다.
4. **직접 연동 브랜드 pixel**: 1st-party 쿠키(30일) + cart attribute + confirm_click + 코드 자동 적용. 귀속 우선순위는 click_id / landing_site / note_attributes > discount_code > ip_match로 보인다(link > code는 문서에 명시, 나머지 순서는 추정).
5. **커미션 상태**: Pending(보고 후) → Locked(**브랜드나 네트워크 대금 입금 시**) → Paid(주간 배치, 최소 금액). 지급 후 반품은 소급하지 않는다.
6. **요율 = base × creator share(82%)**. base는 fixed fee > creator custom > SKU/group 최대 > merchant 기본 순서. 직접 연동이고 브랜드 fee 모델이면 100%.
7. **Wishlist**는 장기 귀속(저장 시점에 creator 고정, retailer가 바뀌어도 유지). **Circle**은 추천 creator 간 분배를 주간 보너스로 정산.

---

## Unknowns

1. Circle 분배 비율 공식(균등인지 클릭·추천 시점 가중인지)과 ShopMy 몫이 18%를 넘는지 여부.
2. Wishlist 장기 귀속의 기술 구현. 쇼퍼 로그인 세션의 `puser`로 매칭하는지, 다른 retailer 구매를 어떻게 확인하는지(네트워크 리포트의 product-level 매칭인지). Wishlist 귀속과 cookie last-click이 충돌하면 무엇이 이기는지.
3. 네트워크 경유 retailer의 실제 cookie window(retailer마다 다름. Nordstrom 같은 개별 값은 미확인)와 ShopMy가 creator UI에 window를 보여주는지.
4. `ip_match` 귀속의 조건(시간 창, 오탐 처리)과 귀속 소스 간 정확한 우선순위.
5. Pending → Locked 전이를 retailer 단위로 하는지 주문 단위로 하는지. 네트워크 인보이스 1건이 여러 주문을 일괄 lock하는지.
6. `wasFronted`(선지급)의 정확한 조건과 creator 측 영향.
7. `src` 값의 전체 enum(`ql`, `web` 외에 app, extension, auto-link 등 별도 값이 있는지). 실제 관찰한 apx 경유 클릭도 `src-ql`였다.
8. Referer 기반 apx 도메인 검증이 실제로 어떻게 동작하는지(Referer 없는 요청도 302로 처리됨).
9. 존재하지 않는 apx username → 400(이전 정보이며 이번에 재현하지 않음).
10. 브랜드 측 attribution window 설정 UI(`expires` 파라미터를 브랜드가 바꿀 수 있는지), Brand Tiers 요율 프로그램의 세부 규칙.
11. 공식 브랜드 가격과 transaction fee(3rd-party 수치만 있음), Shopify 앱의 정확한 OAuth scope(Notion 가이드는 JS 렌더링이라 읽지 못함).
12. 클릭 dedupe·봇 필터 규칙, Opportunity 10-click 기준 외의 click 유효성 기준.
13. 다통화·국제 주문의 커미션 통화 환산 규칙과 국가별 지급 수단(UK creator 언급만 있음).
14. 반품을 부분 반품 라인 단위로 조정하는지(문서는 "some or all of an order"라고만 함).
