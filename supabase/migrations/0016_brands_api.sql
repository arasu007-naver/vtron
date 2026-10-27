-- brands.api · api_status — 브랜드 공식 홈페이지 기준 상품 조회 주소와 그 확인 결과
--
-- 네이버 브랜드와 매칭된 브랜드(고유 naver_brand_id 161개)마다 그 브랜드 공식 홈페이지에서
-- 상품을 조회할 수 있는 주소를 둔다. 매칭 못 한 브랜드(메종킴헤킴)는 셋 다 null.
--
--   api 고르는 순서
--   1) 상품 JSON 을 주는 공식 엔드포인트가 있으면 그것 (Shopify /products.json 등)
--   2) 없으면 공식몰의 상품 목록 페이지 (전체 · 신상품 카테고리, 한국몰 우선)
--   3) 자체 몰이 없으면 그룹 공식몰의 브랜드관 (SSF샵 · LF몰 · 더한섬닷컴 · 코오롱몰 등)
--
--   api_status — 주소를 확인한 결과
--   verified   119  응답(200)과 상품 목록·JSON 을 확인함
--   blocked     16  봇 차단(403·406·429·타임아웃)으로 응답 확인 못 함. 상품 목록 경로는 찾았거나 추정함
--   homepage    15  봇 차단으로 목록 경로를 못 찾아 공식 스토어 첫 화면을 넣음
--   unverified   6  200 은 오지만 SPA·대기열 페이지라 실제 상품 목록인지 확인 못 함
--   fallback     5  공식 상품 목록이 없어 대체 주소를 넣음(리다이렉트 사이트·소개 사이트·그룹몰 첫 화면 등)
--
--   api_status_note — 확인 내용 (예: "Shopify products.json 확인", "403 차단, 한국 스토어 루트")
--
-- 원천은 res/brand-product-apis.json (2026-10-20T06:31:40.472Z). 가장 긴 주소 100자.
-- npm run sync:brands 는 이 열들을 건드리지 않는다.
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣어 실행한다(여러 번 실행해도 된다).

alter table public.brands
  add column if not exists api varchar(2047),
  add column if not exists api_status text,
  add column if not exists api_status_note text;

alter table public.brands drop constraint if exists brands_api_status_check;
alter table public.brands
  add constraint brands_api_status_check
  check (api_status in ('verified', 'blocked', 'homepage', 'unverified', 'fallback'));

create index if not exists brands_api_status_idx on public.brands (api_status);

comment on column public.brands.api is
  '브랜드 공식 홈페이지 기준 상품 조회 주소(JSON 엔드포인트 또는 상품 목록 페이지). 원천 res/brand-product-apis.json.';
comment on column public.brands.api_status is
  'api 확인 결과: verified 확인함 · blocked 봇 차단 · homepage 스토어 첫 화면 · unverified SPA라 미확인 · fallback 대체 주소.';
comment on column public.brands.api_status_note is
  'api 를 확인한 내용(응답 코드, 차단 여부, 대체 사유 등).';

update public.brands b
set api = v.api,
    api_status = v.api_status,
    api_status_note = v.api_status_note
from (values
  (12401, 'https://www.chanel.com/kr/fashion/ready-to-wear/', 'verified', '한국 사이트 레디투웨어 목록 200 확인 (패션은 온라인 판매 안 함, 조회만 가능)'),
  (10716, 'https://www.gucci.com/kr/ko/ca/whats-new/new-in-c-new-in', 'blocked', '봇 차단(curl 타임아웃), 한국 스토어 신상품 목록'),
  (11468, 'https://kr.louisvuitton.com/kor-kr/homepage', 'homepage', '403 차단, 한국 공식 스토어 루트'),
  (13143, 'https://www.hermes.com/kr/ko/category/women/ready-wear/', 'verified', '한국 스토어 여성 레디투웨어 목록 200 확인'),
  (14298, 'https://www.dior.com/ko_kr/fashion', 'blocked', '403 차단, 한국 패션 페이지'),
  (14696, 'https://www.prada.com/kr/ko/womens.html', 'verified', '한국 스토어 여성 목록 200 확인'),
  (199941, 'https://www.ysl.com/ko-kr', 'homepage', '403 차단, 한국 스토어 루트'),
  (12034, 'https://kr.burberry.com/l/womens-clothing/new-arrivals/', 'verified', '한국 스토어 여성 신상품 200 확인 (남성: /l/mens-clothing/new-arrivals/)'),
  (12474, 'https://www.celine.com/ko-kr/home', 'homepage', '403 차단, 한국 스토어 루트'),
  (11416, 'https://www.loewe.com/int/en/women/accessories', 'verified', '한국 로케일(kor/ko) 404, 글로벌 스토어 목록 사용'),
  (11893, 'https://www.miumiu.com/kr/ko/new-arrivals/c/10200KR', 'verified', '한국 스토어 신상품 200 확인'),
  (15234, 'https://www.fendi.com/kr-ko/', 'homepage', '봇 차단(curl 타임아웃), 한국 스토어 루트'),
  (157292, 'https://www.bottegaveneta.com/ko-kr', 'homepage', '403 차단, 한국 스토어 루트'),
  (12004, 'https://www.valentino.com/ko-kr/women/new-arrivals', 'verified', '한국 스토어 여성 신상품 200 확인'),
  (920, 'https://www.balenciaga.com/ko-kr', 'homepage', '403 차단, 한국 스토어 루트'),
  (178498, 'https://www.thombrowne.com/products.json', 'verified', 'Shopify products.json 확인 (글로벌 스토어)'),
  (151532, 'https://www.moncler.com/ko-kr/', 'homepage', '403 차단, 한국 스토어 루트'),
  (1393, 'https://www.maxmara.com/ko-kr', 'homepage', '403 차단, 한국 스토어 루트'),
  (202242, 'https://www.therow.com/products.json', 'verified', 'Shopify products.json 확인 (룩 상품 포함, product_type으로 거를 것)'),
  (258428, 'https://www.lemaire.fr/products.json', 'verified', 'Shopify products.json 확인'),
  (202610, 'https://www.acnestudios.com/kr/ko/woman/new-arrivals/', 'verified', '한국 스토어 여성 신상품 200 확인'),
  (225643, 'https://www.cos.com/ko-kr/', 'homepage', '403 차단, 한국 스토어 루트'),
  (1146, 'https://www.ralphlauren.co.kr/', 'homepage', '403 차단, 한국 공식몰 루트'),
  (14670, 'https://www.ralphlauren.co.kr/', 'homepage', '403 차단, 랄프로렌 한국 공식몰 루트 (폴로 전용 경로 확인 못함)'),
  (233776, 'https://www.hugoboss.com/kr/women-all-new-arrivals/', 'verified', '한국 스토어 신상품 목록 (남성: /kr/men-all-new-arrivals/), 홈페이지에서 링크 확인'),
  (14392, 'https://www.thehandsome.com/ko/DP/timeMain', 'verified', '더한섬닷컴 TIME(BR01) 브랜드관 200 확인'),
  (12696, 'https://www.thehandsome.com/ko/DP/systemMain', 'verified', '더한섬닷컴 SYSTEM(BR03) 브랜드관 200 확인'),
  (11645, 'https://www.thehandsome.com/ko/DP/brandMain/BR02', 'verified', '한섬 더한섬닷컴 브랜드관(BR02=MINE 확인)'),
  (12551, 'https://www.idfmall.co.kr/shesmiss?brand=shesmiss', 'verified', '인동에프엔 공식몰 IDF몰 브랜드관(Cafe24) 200'),
  (13950, 'https://www.babathe.com/bnd/jigott', 'verified', '바바그룹 공식몰 바바더닷컴 브랜드관 200 (jigott.co.kr은 회사 소개로 리다이렉트)'),
  (37843, 'https://www.idfmall.co.kr/list?brand=list', 'verified', '인동에프엔 공식몰 IDF몰 브랜드관 200'),
  (37412, 'https://www.hyungjimall.com/front/brand_detail.php?vender=8', 'unverified', '공식 도메인이 형지몰 브랜드관으로 리다이렉트, 봇에 Loading 페이지만 반환'),
  (12070, 'https://www.shinwon.com/kor/m31_collection_2.php?brand=BESTI%20BELLI', 'fallback', '자사몰 없음(신원몰 폐쇄). 공식 ONLINE SHOP은 네이버 브랜드스토어뿐, 신원 공식 컬렉션 페이지로 대체'),
  (1104, 'https://www.roem.co.kr/category/new/99/', 'verified', '이랜드 로엠 공식몰(Cafe24) 신상품 목록 상품 확인'),
  (37912, 'https://sisun.com/ITMICHAA/shop/list?upper_cate_code=21', 'verified', '시선인터내셔널 공식몰 SISUN.COM 잇미샤관 상품 목록 확인'),
  (28603, 'https://www.sejungmall.com/product/list.html?cate_no=45', 'verified', '세정 공식몰(Cafe24) 올리비아로렌 카테고리 상품 확인'),
  (397, 'https://e-joinus.co.kr/product/list.html?cate_no=46', 'verified', '인디에프 조이너스 공식몰(Cafe24) SHOP 목록. joinus.co.kr은 파킹 도메인'),
  (11072, 'https://www.demoo.com/product/list.html?cate_no=77', 'verified', '데무 공식 온라인 스토어(Cafe24) Shop 목록 상품 확인'),
  (416064, 'https://www.thehandsome.com/ko/DP/brandMain/BR08', 'verified', '한섬 더한섬닷컴 브랜드관(BR08=the CASHMERE 확인)'),
  (222208, 'https://www.ssfshop.com/LEBEIGE/main?brandShopNo=BDMA07A06&brndShopId=ECBVF', 'verified', '삼성물산 SSF샵 브랜드관 200'),
  (1329, 'https://www.ssfshop.com/Galaxy/main?brandShopNo=BDMA04A01&brndShopId=HMBGA', 'verified', '삼성물산 SSF샵 브랜드관 200'),
  (14935, 'https://www.kolonmall.com/Brands/HENRY-COTTONS/List/4947', 'unverified', '코오롱몰 브랜드관. SPA라 아무 경로나 200, URL은 검색결과로 확인'),
  (39, 'https://www.lfmall.co.kr/app/exhibition/brandGroup/1002', 'verified', 'LF몰 브랜드관 200 (1002=HAZZYS, 검색결과로 확인)'),
  (1217, 'https://www.lfmall.co.kr/app/exhibition/brandGroup/1001', 'verified', 'LF몰 브랜드관 200 (1001=DAKS, 검색결과로 확인)'),
  (170, 'https://eshop.parkland.co.kr/nhome/shop/category_list.asp?gender=MEN', 'verified', '파크랜드 공식 쇼핑몰 eshop 카테고리 목록 200'),
  (13979, 'https://display.goodwearmall.com/brand/BDMABR', 'verified', '신성통상 공식몰 굿웨어몰 지오지아관(ziozia.goodwearmall.com 리다이렉트)'),
  (1116, 'https://www.ssfshop.com/Rogatis/main?brandShopNo=BDMA04A05&brndShopId=HMBRX', 'verified', '삼성물산 SSF샵 브랜드관 200'),
  (142943, 'https://www.sejungmall.com/product/list.html?cate_no=29', 'verified', '세정 공식몰(Cafe24) 인디안 카테고리 상품 확인'),
  (14138, 'https://www.kolonmall.com/Brands/CAMBRIDGE-MEMBERS/List/5682', 'unverified', '코오롱몰 브랜드관. 브랜드ID 5682는 상품 URL로 추정, SPA라 내용 미검증'),
  (398564, 'https://ptry.co.kr/product/list.html?cate_no=943', 'verified', '포터리 공식 스토어(Cafe24) 남성 카테고리 상품 확인. pottery.kr은 파킹 도메인'),
  (13594, 'https://www.uniqlo.com/kr/api/commerce/v5/ko/products?path=%2C%2C&limit=100&offset=0', 'verified', '공식 상품 API JSON 확인(total 1366), 홈페이지는 403 차단'),
  (13776, 'https://www.zara.com/kr/ko/woman-new-in-l1180.html', 'verified', '한국 공식몰 여성 신상품 목록 200. JSON 엔드포인트는 404'),
  (151125, 'https://www2.hm.com/ko_kr/ladies/shop-by-product/view-all.html', 'blocked', '한국 공식몰 여성 전체보기, 403 차단'),
  (175601, 'https://www.spao.com/s/shop', 'verified', '이랜드 스파오 공식몰 SHOP 페이지 200'),
  (175077, 'https://www.ssfshop.com/8Seconds/main?brandShopNo=BDMA07A01&brndShopId=8SBSS', 'verified', 'SSF샵(삼성물산) 브랜드관, 자체 몰 없음, 200 확인'),
  (178667, 'https://display-topten10.goodwearmall.com/category/SSMA41', 'verified', '신성통상 굿웨어몰 탑텐관 카테고리, 200 확인 (topten10mall.com은 굿웨어몰로 이동)'),
  (158615, 'https://mixxo.elandmall.co.kr/c/ctg?dispCategoryNo=1705319748', 'verified', '이랜드몰 미쏘관 카테고리 200 확인, 자체몰 mixxo.com(cafe24)도 있음'),
  (8, 'https://www.whoau.com/product/list.html?cate_no=32', 'verified', '공식몰(cafe24) 전체 카테고리, 200 확인'),
  (236422, 'https://mujikorea.co.kr/products/new', 'verified', '무인양품 한국 공식몰 신상품, 200 확인'),
  (257967, 'https://www.musinsa.com/brand/musinsastandard', 'verified', '무신사 브랜드 단독관(공식), 200 확인'),
  (1269, 'https://www.nike.com/kr/w', 'verified', '나이키 한국 공식 전체 상품, 200 확인'),
  (667, 'https://www.adidas.co.kr/new_arrivals', 'blocked', '403 차단, 한국 공식몰 신상품 페이지'),
  (10946, 'https://www.nbkorea.com/product/featuredList.action?cateGrpCode=250100&cIdx=1269', 'verified', '뉴발란스 공식몰 MEN New 목록, 200 확인'),
  (7, 'https://www.fila.co.kr/products.json', 'verified', 'Shopify products.json 확인'),
  (126, 'https://kr.puma.com/kr/ko/%EC%8B%A0%EC%83%81%ED%92%88-1', 'verified', '푸마 한국 공식몰 신상품, 200 확인'),
  (210327, 'https://www.lululemon.co.kr/ko-kr/c/whats-new', 'blocked', '403 차단, 한국 공식몰 신상품 경로 추정'),
  (209779, 'https://www.xexymix.com/shop/shopbrand.html?type=Y&xcode=062', 'verified', '공식몰(메이크샵) 카테고리, 200 확인, products.json 없음'),
  (223425, 'https://www.andar.co.kr/product/list.html?cate_no=2818', 'verified', '공식몰(cafe24) 카테고리, 200 확인'),
  (136246, 'https://dk-on.com/newArrival', 'verified', '데상트코리아 공식몰 DK-ON 신상품, 200 확인'),
  (654, 'https://www.asics.co.kr/c/new-arrivals', 'unverified', '200이나 대기열(netfunnel) JS 페이지, 실제 목록 미확인'),
  (197164, 'https://www.hoka.com/kr/ko/', 'homepage', '406 봇 차단, 글로벌 공식몰 한국 로케일'),
  (253229, 'https://www.on.com/ko-kr/shop', 'verified', 'On 공식몰 한국 전체 상품, 200 확인'),
  (946, 'https://kor.mizuno.com/product/list.html?cate_no=161', 'verified', '미즈노 한국 공식몰(cafe24, mizuno.co.kr 리다이렉트), 200 확인'),
  (32926, 'https://www.underarmour.co.kr/ko-kr/c/new-arrivals/', 'verified', '한국 공식몰 신상품, 200 확인'),
  (1250, 'https://www.thenorthfacekorea.co.kr/submainNew', 'verified', '영원아웃도어 공식몰 NEW, 200 확인'),
  (14219, 'https://www.kolonsport.com/View/NewArrival', 'verified', '코오롱스포츠 공식몰(코오롱몰 기반) 신상품, 200 확인'),
  (306, 'https://www.k-village.co.kr/k2', 'verified', 'K2코리아 통합몰 K.VILLAGE의 K2관, k2.co.kr은 nginx 기본 페이지만 나옴'),
  (29907, 'https://www.discovery-expedition.com/display/DXMB03NEW?gf=M', 'verified', 'F&F 공식몰 신상품, 200 확인'),
  (100236, 'https://www.nstationmall.com/natgeo', 'verified', '더네이쳐홀딩스 엔스테이션몰 브랜드관, natgeokorea.com/products.json은 JSON 아닌 HTML 반환'),
  (855, 'https://www.byn.kr/blackyak/shop/big_section.php?cno1=1019', 'verified', 'BYN블랙야크 통합몰 블랙야크관 카테고리, 200 확인'),
  (38562, 'https://www.nplus.co.kr/product/list.asp?cno=100', 'verified', '네파 공식몰 N+ MEN 목록, nepa.co.kr 리다이렉트, 200 확인'),
  (12572, 'https://snowpeakstore.co.kr/goods/goods_list.php?cateCd=001', 'verified', '스노우피크 어패럴 공식몰(고도몰), MEN 카테고리. WOMEN은 cateCd=002. 용품은 snowpeak.co.kr'),
  (798, 'https://salomon.co.kr/products.json', 'verified', '한국 공식몰, Shopify products.json 확인'),
  (179357, 'https://helinox.com/products.json', 'verified', '글로벌 공식몰, Shopify products.json 확인. helinox.co.kr은 403 차단'),
  (204675, 'https://www.kolonmall.com/Brands/GFORE', 'verified', '국내 공식 판매는 코오롱몰 브랜드관. gfore.com은 봇 차단 페이지'),
  (2197492, 'https://malbon.com/products.json', 'verified', '글로벌 공식몰, Shopify products.json 확인'),
  (203701, 'https://www.kolonmall.com/Brands/GOLDENBEAR', 'verified', '코오롱몰 브랜드관(코오롱FnC), 자체 몰 없음'),
  (239780, 'https://www.kolonmall.com/WAAC', 'verified', 'waacgolf.com이 코오롱몰 브랜드관으로 리다이렉트'),
  (821, 'https://www.ssfshop.com/BEANPOLE/main', 'verified', 'SSF샵 브랜드관. beanpole.com은 브랜드 소개 사이트'),
  (11592, 'https://marithe-official.com/product/list.html?cate_no=1001', 'verified', '카페24 공식몰, 전체상품 카테고리'),
  (2812692, 'https://satur.co.kr/product/list.html?cate_no=914', 'verified', '카페24 공식몰, NEW 카테고리(전체 카테고리는 확인 안 됨)'),
  (1058, 'https://levi.co.kr/products.json', 'verified', '한국 공식몰, Shopify products.json 확인'),
  (539, 'https://www.mlb-korea.com/display/MBMB01', 'verified', 'F&F 공식몰, WOMEN ALL 카테고리(MEN은 MBMB02, CAP은 MBMB03)'),
  (209299, 'https://adererror.com/kr/shop', 'unverified', 'SPA 구조라 /kr/shop이 200을 돌려주지만 목록 경로인지는 확인 안 됨'),
  (202815, 'https://anderssonbell.com/product/list.html?cate_no=384', 'verified', '카페24 공식몰, ALL 카테고리(385도 ALL)'),
  (203252, 'https://thisisneverthat.com/products', 'verified', '공식몰 sitemap의 /products 목록 페이지, products.json은 없음'),
  (210648, 'https://www.kirsh.co.kr/product/list.html?cate_no=217', 'verified', '카페24 공식몰, shop all'),
  (208806, 'https://www.romanticcrown.com/', 'fallback', '도메인이 외부 사이트(bos88a1.com)로 리다이렉트되고 403. 공식몰 확인 안 됨'),
  (227780, 'https://lostmanagementcities.com/product/list.html?cate_no=1365', 'verified', '레이어 공식 LMC몰(카페24), APPAREL 카테고리'),
  (257417, 'https://we11-done.com/goods/goods_list.php?cateCd=002', 'verified', '고도몰 공식몰, 신상품 카테고리'),
  (2078392, 'https://www.matinkim.com/product/list.html?cate_no=45', 'verified', '카페24 공식몰, NEW IN 카테고리'),
  (3301592, 'https://mardimercredi.com/product/list.html?cate_no=487', 'verified', '카페24 공식몰, SHOP 카테고리'),
  (2742892, 'https://glowny.co.kr/product/list.html?cate_no=253', 'verified', '카페24 공식몰, ALL 카테고리'),
  (2793492, 'https://standoil.kr/product/list.html?cate_no=652', 'verified', '카페24 공식몰, NEW 카테고리'),
  (210820, 'https://www.lowclassic.com/product/bn-list.html?cate_no=785', 'verified', '카페24 공식몰, SHOP NOW 목록'),
  (305300, 'https://amomento.co/product/list.html?cate_no=136', 'verified', '카페24 공식몰, Women all(Men all은 137)'),
  (239146, 'https://www.minjukim.co/ko/shop', 'verified', '공식몰 shop 페이지. minjukim.com은 파킹 도메인'),
  (225211, 'https://hyeinseo.com/products.json', 'verified', '공식몰, Shopify products.json 확인'),
  (3959692, 'https://open-yy.com/product/list.html?cate_no=213', 'verified', 'Cafe24 자사몰(구 theopenproduct.com) VIEW ALL 카테고리 200 확인'),
  (3377092, 'https://postarchivefaction.com/products.json', 'verified', 'Shopify products.json 확인'),
  (209832, 'https://www.ssfshop.com/JUUN-J/main?brandShopNo=BDMA07A11&brndShopId=ECBJC', 'verified', 'juunj.com은 소개 사이트(판매 없음), 삼성물산 SSF샵 브랜드관 200 확인'),
  (215605, 'https://wooyoungmi.com/product/list.html?cate_no=216', 'verified', 'Cafe24 자사몰 남성 모두보기(여성은 cate_no=223), products.json 없음'),
  (180345, 'https://www.gentlemonster.com/kr/ko/category/sunglasses/view-all', 'verified', '선글라스 전체보기 200 확인(안경은 /category/glasses/view-all)'),
  (253175, 'https://vunque.com/product/list.html?cate_no=144', 'verified', 'Cafe24 자사몰 SHOP/NEW 카테고리 200 확인'),
  (32574, 'https://www.kolonmall.com/Brands/SUECOMMABONNIE', 'verified', 'suecommabonnie.com이 코오롱몰로 리다이렉트, 코오롱몰 브랜드관'),
  (159044, 'https://www.kolonmall.com/Brands/COURONNE', 'verified', 'couronne.co.kr이 코오롱몰로 리다이렉트, 코오롱몰 브랜드관'),
  (14407, 'https://www.tandymall.com/shop/big_section.php?cno1=1072', 'verified', '공식몰 TANDYMALL 여성 ALL(남성 cno1=1071), tandy.co.kr은 무관 사이트'),
  (315, 'https://www.calvinklein.co.kr/ko/women/featured/new-arrivals/', 'verified', '한국 공식몰 여성 신상품(남성 /ko/men/featured/new-arrivals/)'),
  (27301, 'http://www.minkmui.co.kr', 'fallback', '수향몰(suhyangmall/thesymall)로 리다이렉트되나 연결 불가, 자사 상품목록 확인 못함'),
  (13678, 'https://www.liesangbong.com', 'fallback', 'Wix 공식 사이트, 홈 외 상품목록 페이지 없음'),
  (32809, 'https://www.toryburch.co.kr/public/display/category/2d/view?dspCtgryNo=TRYA23', 'verified', '한국 공식몰(삼성물산 운영) 신상 컬렉션 200 확인'),
  (1392, 'https://www.michaelkors.co.kr/shop/big_section.php?cno1=1004', 'verified', '한국 공식몰 핸드백 전체상품(신발 1005, 지갑 1006, 의류 1002)'),
  (14223, 'https://korea.coach.com/shop/new/women', 'blocked', '403 차단(Access Denied), kr.coach.com DNS 없음, 경로 미확인'),
  (14185, 'https://www.katespade.com/shop/new/view-all', 'blocked', 'katespade.co.kr은 파킹 도메인, 글로벌 사이트 403 차단'),
  (11444, 'https://www.longchamp.com/kr/ko/%EC%8B%A0%EC%A0%9C%ED%92%88/new-in/', 'verified', '한국 공식몰 신제품 200 확인'),
  (14445, 'https://www.tods.com/kr-ko/women.html', 'blocked', '403 차단'),
  (14623, 'https://www.ferragamo.com/kr/ko/women/', 'blocked', '403 차단'),
  (133532, 'https://www.mulberry.com/kr/shop/women', 'verified', '한국 사이트 여성 카테고리 200(봇 챌린지 페이지 가능성 있음)'),
  (204267, 'https://www.carlynmall.com/shop/shopbrand.html?type=N&xcode=010&mcode=001', 'verified', 'carlyn.co.kr→carlynmall.com(메이크샵) New Product 200 확인'),
  (249605, 'https://www.kolonmall.com/Brands/ARCHIVEPKE', 'verified', 'archivepke.com은 매물 도메인, 코오롱몰 브랜드관'),
  (207176, 'https://reikenen.com/product/list.html?cate_no=44', 'verified', 'Cafe24 자사몰 NEW ARRIVALS(슈즈 42, 백 51)'),
  (206955, 'https://oryany.com/products.json', 'verified', '글로벌 oryany.com Shopify products.json 확인(USD), 한국몰은 oryany.co.kr/product/list.html?cate_no=570'),
  (149383, 'https://www.lfmall.co.kr/app/exhibition/brand/JILLBYJILLSTUART', 'unverified', 'LF몰 브랜드관 추정 URL, SPA라 모든 경로 200 반환해 미확인'),
  (17755, 'https://www.ssfshop.com/Beanpole-Accessory/main?dspCtgryNo=&brandShopNo=BDMA01A04&brndShopId=BPBBE', 'verified', 'SSF샵 브랜드관 200 확인'),
  (14153, 'https://www.converse.co.kr/category/%EC%8B%A0%EC%A0%9C%ED%92%88%EC%A0%84%EC%B2%B4/1248/', 'verified', '한국 공식몰 신제품 전체 200 확인'),
  (923, 'https://www.vans.co.kr/category/new', 'verified', '반스 코리아 공식몰 신상품 목록 200 확인'),
  (31786, 'https://www.onitsukatiger.com/kr/ko-kr/', 'homepage', '한국 공식 스토어, 429 봇 차단, 목록 경로 미확인'),
  (1216, 'https://www.drmartens.co.kr/products.json', 'verified', 'Shopify products.json 확인(limit=250 시 250개)'),
  (29647, 'https://www.clarks.com/en-gb/womens/womens-shoes/w_shoes_uk-c', 'verified', '한국 공식몰(clarks.co.kr) 접속 불가, 글로벌(UK) 여성화 목록 200'),
  (182, 'https://www.timberland.co.kr/category/new', 'verified', '팀버랜드 코리아 공식몰 신상품 200 확인'),
  (13109, 'https://www.shinsegaev.com/', 'fallback', '국내는 신세계인터내셔날 수입, 신세계V(구 SI빌리지)에서 판매. 브랜드관 URL은 SPA라 미확인, ugg.com 406 차단'),
  (199402, 'https://www.camper.com/ko_KR/women/shoes', 'verified', '한국어 공식몰 여성화 목록 200'),
  (28473, 'https://kr.ecco.com/women/shoes', 'blocked', '한국 공식몰, 429 봇 차단, 목록 경로 추정'),
  (911, 'https://www.birkenstock.com/kr/sandals/', 'verified', '한국 공식몰 샌들 카테고리(홈 링크에서 확인)'),
  (29750, 'https://www.crocs.co.kr/c/new-arrivals', 'blocked', '한국 공식몰 홈 200, 카테고리 요청은 429 차단, 경로 추정'),
  (198207, 'https://www.rogervivier.com/kr-ko/', 'homepage', '한국 공식 사이트, 403 차단'),
  (30780, 'https://www.jimmychoo.com/ko-kr/women/shoes/', 'blocked', '403 차단, 목록 경로 추정'),
  (202392, 'https://www.manoloblahnik.com/int/women.html', 'verified', '한국 스토어 없음(/kr→/int 리다이렉트), 글로벌 여성 목록 200. products.json 없음'),
  (202633, 'https://apac.christianlouboutin.com/', 'homepage', 'kr_ko가 APAC 사이트로 리다이렉트, 403 차단'),
  (241978, 'https://www.valentino.com/ko-kr/women/shoes', 'verified', '한국어 공식몰 여성 슈즈 200'),
  (178717, 'https://www.goldengoose.com/kr/ko/ls/%EC%97%AC%EC%84%B1/%EC%8A%A4%EB%8B%88%EC%BB%A4%EC%A6%88-w-ko_kr', 'verified', '한국 공식몰 여성 스니커즈 목록 200'),
  (249009, 'https://www.cueren.com/product/list.html?cate_no=26', 'verified', '영문명 CUEREN, 카페24 공식 스토어 WOMEN 목록(MEN은 cate_no=27)'),
  (235724, 'https://www.lemouton.co.kr/product/list.html?cate_no=79', 'verified', '카페24 공식몰 전체보기 카테고리 200(products.json 없음)'),
  (13304, 'https://www.kolonmall.com/Brands/ELORDCLUB/Intro', 'verified', '자체몰 없음, 코오롱몰 엘로드클럽 브랜드관(골프웨어)'),
  (759, 'https://www.sodamall.com/category/new/233/', 'verified', '소다몰 공식쇼핑몰 NEW 카테고리 200(WOMEN 138, MEN 144)'),
  (228910, 'https://www.kumkangshoe.com/products?cate1=01', 'verified', '금강제화 공식몰 상품목록 200'),
  (13181, 'https://www.esquire.co.kr/category/new/24/', 'verified', '카페24 공식몰 NEW 카테고리 200'),
  (198426, 'https://www.ray-ban.com/korea/sunglasses/view-all/plp', 'blocked', '한국 공식몰, 403 차단, 경로 추정'),
  (513, 'https://www.oakley.com/ko-kr/category/sunglasses', 'blocked', '한국 공식몰, 403 차단, 경로 추정'),
  (205960, 'https://www.tiffany.kr/jewelry/', 'blocked', '한국 공식 사이트(tiffany.kr), 403 차단'),
  (11442, 'https://www.rolex.com/ko/watches', 'blocked', '온라인 판매 없음, 공식 시계 컬렉션 페이지, 403 차단')
) as v (naver_brand_id, api, api_status, api_status_note)
where b.naver_brand_id = v.naver_brand_id;
