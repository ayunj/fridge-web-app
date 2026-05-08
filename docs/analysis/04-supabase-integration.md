# 04. Supabase 연동 포인트(테이블/뷰/에러 처리)

## 클라이언트 생성

- 파일: `src/lib/supabase/client.ts`
- 기준: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 둘 다 존재하면 enabled

## 공통 패턴

- **enabled 체크**: `isSupabaseEnabled && supabase !== null`
- **fallback**: disabled 또는 오류 시 mock/local로 대체(페이지별 상이)

## 스키마/캐시 변화 대응

코드에서 다음 오류를 “컬럼 미존재/캐시 미스”로 보고 select를 축소합니다.

- `42703` (Postgres undefined_column)
- `PGRST204` (PostgREST schema cache / missing column)

이 전략 덕분에 DB 스키마가 “완전”하지 않아도, UI가 최대한 깨지지 않게 동작합니다.

## Ingredients 관련(추정되는 DB 구조)

- 목록: `v_ingredients`에서 목록 필드 조회 후, `ingredient_items`를 `id in (...)`으로 추가 조회해 note/qty_text/quantity/unit merge
- 에디터:
  - `categories` 로드/추가(upsert)
  - `locations` 로드
  - `ingredient_items` 컬럼 존재 여부(probe select)로 “분리 수량 입력(quantity/unit)” UI 지원 여부 결정

## Recipes 관련

- `recipes` 목록/상세 조회
- `recipe_ingredients`, `recipe_steps`를 recipe_id 기준으로 함께 조회해 상세 구성

## Shopping 관련

- `shopping_items`를 checked(완료) 기준으로 정렬/업데이트
- 완료 토글 시 `shopping_items.checked` 업데이트
- 완료로 바뀌는 순간에 “재료 자동 추가” 플로우가 있음(로컬/DB 분기)

