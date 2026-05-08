# 02. 라우팅/페이지 맵

## 페이지 목록(코드 기준)

- `/` → `src/app/page.tsx`
- `/ingredients` → `src/app/ingredients/page.tsx`
- `/ingredients/[id]` → `src/app/ingredients/[id]/page.tsx`
- `/ingredients/item/[id]` → `src/app/ingredients/item/[id]/page.tsx`
- `/ingredients/@modal/[...catchAll]` → `src/app/ingredients/@modal/[...catchAll]/page.tsx`
- `/ingredients/@modal/(.)[id]` → `src/app/ingredients/@modal/(.)[id]/page.tsx`
- `/ingredients/@modal/(.)item/[id]` → `src/app/ingredients/@modal/(.)item/[id]/page.tsx`
- `/recipes` → `src/app/recipes/page.tsx`
- `/shopping` → `src/app/shopping/page.tsx`
- `/recommend` → `src/app/recommend/page.tsx`
- `/search` → `src/app/search/page.tsx`
- `/calendar` → `src/app/calendar/page.tsx`

## 라우팅 특징

### Ingredients의 모달 라우팅

`ingredients`는 `@modal` 병렬 라우트를 사용해, 목록 화면을 유지한 채 편집 UI를 모달로 띄우는 패턴을 채택했습니다.

- **목표 UX**: 목록 컨텍스트 유지 + 빠른 생성/수정/확인/닫기

### “데이터 소스 분기”가 라우트 전반에 공통

페이지들은 공통적으로 아래 우선순위를 가집니다.

- **Supabase Enabled**: DB 조회/저장
- **Disabled / 오류**: Mock 또는 LocalStorage로 fallback(가능한 범위 내)

