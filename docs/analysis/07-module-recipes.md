# 07. 모듈 분석: 레시피(recipes)

## 주요 파일

- `src/app/recipes/page.tsx`: 목록 + 상세 보기 모달 + 생성/수정 폼(상세 포함)
- `src/components/recipes/RecipeCategoryIcon.tsx`: 타입/카테고리 아이콘
- `src/components/recipes/RecipeViewDetail.tsx`: 상세 뷰 컴포넌트

## 데이터 모델(코드 기준)

- `recipes`: 기본 정보(제목/유튜브 URL/메모/모드 + 선택적 kcal/servings/recipe_type)
- `recipe_ingredients`: 재료(이름/qty_text/unit + 정렬)
- `recipe_steps`: 단계(step_no/body)

## 동작 플로우

- **목록 로드**: `recipes` select → (컬럼 미존재 시) 축소 select로 재시도
- **상세 열기**: `recipes` 단건 + `recipe_ingredients` + `recipe_steps`를 병렬 조회 후 상세 구성
- **생성/편집**: 폼 상태를 `RecipeDetail`로 유지하고 저장 시 DB에 반영(코드 내부 로직에 포함)

## 내성(스키마 변화)

`recipes` 테이블의 옵션 컬럼(`kcal`, `servings`, `recipe_type`)은
없어도 동작하도록 fallback select가 준비되어 있습니다.

