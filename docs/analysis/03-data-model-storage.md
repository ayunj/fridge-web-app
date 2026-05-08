# 03. 데이터 모델 & 저장소 전략(Supabase/Local/Mock)

## 1) Mock 데이터(`src/lib/data.ts`)

UI/UX를 먼저 고정하기 위한 더미 데이터가 존재합니다.

- **Loc**: `'fridge' | 'freezer' | 'pantry'`
- **Ingredient(목업)**: `{ name, loc, qty, d, cat }`  
  - `d`: 유통기한 D-day 성격(숫자)로 severity 계산에 사용
- **Recipe(목업)**: 결핍 재료 개수(`missing`) / 목록(`missingItems`)을 포함해 추천 화면을 바로 구성 가능
- **Shopping(목업)**: `{ id, name, from, done }`

## 2) LocalStorage(오프라인/DB 미연결 fallback)

### 장보기

- **키**: `shopping.items.v1` (`src/lib/shopping-local.ts`)
- **스키마(저장)**: `{ id, name, from, done, memo? }`
- **시드**: Mock SHOPPING을 기반으로 초기값 제공

### 재료(추가 캐시)

DB가 없거나 특정 플로우에서 임시로 “재료 추가”를 유지하기 위해 로컬에 쌓는 구조가 있습니다.

- **키**: `ingredients.localAdds.v1` (여러 페이지에서 참조)

## 3) Supabase(DB)

페이지 구현을 보면 아래 테이블/뷰를 전제로 합니다.

- **Ingredients**
  - `ingredient_defs`: 재료 정의(이름, category)
  - `ingredient_items`: 실제 보유 재료(위치, 수량/텍스트, 유통기한, note 등)
  - `categories`: 카테고리(정렬 포함)
  - `locations`: 위치 코드/라벨
  - `v_ingredients`: 목록 표시용 뷰(조인 결과로 추정)

- **Recipes**
  - `recipes`
  - `recipe_ingredients`
  - `recipe_steps`

- **Shopping**
  - `shopping_items`

## 4) 스키마 변화 내성(중요)

코드는 **컬럼이 없거나(Postgres undefined_column: `42703`) 스키마 캐시 이슈(`PGRST204`)**가 나면,
해당 컬럼을 뺀 select로 다시 시도하는 형태로 “점진적 확장”을 지원합니다.

