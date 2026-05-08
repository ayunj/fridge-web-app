# 06. 모듈 분석: 재료(ingredients)

## 핵심 목표 UX

- “검색창 1개 → 엔터”에 가까운 **빠른 추가**
- 목록 컨텍스트를 유지한 채 **모달/상세 편집** 가능
- Supabase가 꺼져도 최소 UX 유지(로컬 add 캐시)

## 주요 파일

- `src/app/ingredients/page.tsx`: 목록/필터/정렬/빠른 추가 + DB 조회/merge
- `src/app/ingredients/_components/IngredientEditor.tsx`: 생성/수정/삭제 에디터(모달에서 사용)
- `src/app/ingredients/@modal/*`: 모달 라우팅 엔트리

## 데이터 흐름(목록)

- 우선 `v_ingredients`를 조회해 목록 기본 필드 확보
- 이후 `ingredient_items`를 `id in (...)`으로 조회해 `note`, `qty_text`, `quantity`, `unit`을 보강(가능할 때)
- 컬럼 미존재/권한/RLS 등으로 보강 조회가 실패해도 **목록 렌더링은 계속** 진행

## 필터/정렬/상태 저장

- 필터/정렬 상태를 LocalStorage에 저장해 재방문 시 유지
  - 키: `ingredients.filters.v1`

## 빠른 추가(추정)

목록 상단의 quick add는 DB 사용 시 `ingredient_defs` upsert + `ingredient_items` insert 형태로 들어갈 가능성이 높고,
DB가 꺼진 경우 `ingredients.localAdds.v1`에 임시로 쌓아 UX를 유지합니다.

## 에디터의 “스키마 지원 탐지”

에디터는 `ingredient_items`에 `quantity/unit` 컬럼이 있는지 probe 조회로 확인해,
지원 시 **수량(숫자)+단위** 분리 입력 UI를 활성화합니다.

