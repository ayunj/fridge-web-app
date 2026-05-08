# 05. UI 셸(AppShell) & 네비게이션

## AppShell의 역할

- 파일: `src/components/AppShell.tsx`
- 공통 레이아웃/내비/요약 카운트(재료/레시피/장보기)를 제공

## 화면 구성(반응형)

- **Desktop**
  - 상단 sticky navbar(드롭다운 포함)
  - 우측 검색 인풋 → `/search?q=...` 라우팅
  - “재료 추가” CTA → `/ingredients`

- **Mobile**
  - Topbar(검색/추가/메뉴)
  - Bottom tab bar(`/`, `/ingredients`, `/recommend`, `/shopping`, `/recipes`)
  - Sidebar(슬라이드)로 전체 메뉴 노출

## 요약 카운트 fetch

- 재료 요약: `v_ingredients`에서 `loc, expires_at`를 가져와 위치별 개수 + D-7 계산
- 레시피 개수: `recipes`에서 `count: exact` 실패 시 limit 조회로 fallback
- 장보기 개수:
  - DB 사용 시 `shopping_items`에서 `checked=false` count
  - DB 미사용 시 LocalStorage(`shopping.items.v1`)에서 done=false 개수

## 이벤트 기반 갱신

- `ingredients:changed`, `shopping:changed` 커스텀 이벤트 및 `storage` 이벤트를 듣고 카운트를 갱신합니다.

