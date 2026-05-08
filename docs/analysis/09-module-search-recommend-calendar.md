# 09. 모듈 분석: 검색(search) & 추천(recommend) & 달력(calendar)

## 검색(`/search`)

- 파일: `src/app/search/page.tsx`
- 입력은 querystring `q`로 유지: `/search?q=...`
- **재료 검색**
  - Supabase enabled: `v_ingredients`에서 `ilike('name', %q%)`
  - 실패/disabled: `src/lib/data.ts`의 목업 INGREDIENTS에서 substring 검색으로 fallback
- **레시피 검색**
  - 현재는 목업 `RECIPES`에서 제목 substring 검색(최대 50)
- 결과에서 재료를 클릭하면 `/ingredients/item/[id]`로 이동(목업 id는 `mock-*` 형태)

## 추천(`/recommend`)

- 파일: `src/app/recommend/page.tsx`
- 현재는 목업 `RECIPES`를 기반으로 카드 UI/확장 UI를 제공
- 결핍 재료(`missingItems`)는 “장보기 추가” CTA를 제공하지만, 실제 연결은 아직 목업 수준

## 달력(`/calendar`)

- 파일: `src/app/calendar/page.tsx`
- 현재는 코드 내부 상수 데이터로 월간 그리드와 요약 카드 UI를 구성(목업 단계)

