# 나의 냉장고 — 프로젝트 컨텍스트

## 프로젝트 개요
1인용 냉장고/레시피 관리 웹앱. 폰과 PC 모두 사용 가능한 반응형.

**핵심 차별점**
- 입력이 귀찮은 게 제일 싫다 → 초고속 입력 UX (검색창 1개 → 엔터로 재료 추가)
- 유튜브 레시피를 내 DB로 정리하고, 내 재료 기반 추천/장보기 자동화

---

## 기술 스택

| 항목 | 버전 / 설정 |
|------|------------|
| Framework | Next.js 16.2.4 (App Router) |
| React | 19.2.4 + react-dom 19.2.4 |
| 언어 | TypeScript ^5 (`strict: true`, `jsx: react-jsx`) |
| DB | @supabase/supabase-js ^2.105.1 |
| Styling | Tailwind CSS |
| Lint | ESLint ^9 + eslint-config-next 16.2.4 (core-web-vitals + typescript) |
| 경로 별칭 | `@/*` → `./src/*` |

### 스크립트
```bash
next dev    # 개발 서버
next build  # 빌드
next start  # 프로덕션 서버
```

---

## 폴더 구조

```
src/
├── app/
│   ├── layout.tsx           # 루트 레이아웃 (네비 포함)
│   ├── page.tsx             # 대시보드 (/)
│   ├── ingredients/
│   │   └── page.tsx         # 전체 재료 (/ingredients)
│   ├── recipes/
│   │   ├── page.tsx         # 내 레시피 (/recipes)
│   │   └── [id]/
│   │       └── page.tsx     # 레시피 상세 (/recipes/[id])
│   ├── suggest/
│   │   └── page.tsx         # 추천 레시피 (/suggest)
│   └── shopping/
│       └── page.tsx         # 장보기 목록 (/shopping)
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx       # 데스크톱 상단 네비
│   │   ├── MobileHeader.tsx # 모바일 상단 헤더
│   │   ├── Sidebar.tsx      # 모바일 슬라이드 사이드바
│   │   └── BottomNav.tsx    # 모바일 하단 탭 네비
│   ├── ingredients/
│   │   ├── IngredientCard.tsx
│   │   ├── IngredientGrid.tsx
│   │   └── QuickAddInput.tsx  # 핵심: 빠른 입력 컴포넌트
│   ├── recipes/
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeList.tsx
│   │   └── RecipeAddSheet.tsx # 모드 선택 바텀시트
│   ├── suggest/
│   │   ├── SuggestCard.tsx    # 펼치면 부족 재료 + 장보기 추가
│   │   └── SuggestList.tsx
│   ├── shopping/
│   │   ├── ShoppingItem.tsx
│   │   └── ShoppingList.tsx
│   └── ui/
│       ├── FilterPills.tsx
│       ├── StatCard.tsx
│       └── Badge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Supabase 클라이언트 초기화
│   │   └── types.ts         # DB 타입 (generated)
│   └── utils.ts
└── types/
    └── index.ts             # 공통 타입 정의
```

---

## 레이아웃 (반응형)

### 데스크톱 (≥ 641px)
- **상단 네비바** 고정 (`TopNav.tsx`)
  - 로고 (나의 냉장고)
  - 메뉴 hover 드롭다운:
    - 재료 → 전체 재료 / 유통기한 임박
    - 레시피 → 내 레시피 / 추천 레시피
  - 단독 메뉴: 대시보드 / 장보기
  - 우측: 검색창 + 재료 추가 버튼 + 프로필 아바타
- 하단 네비 없음

### 모바일 (≤ 640px)
- **상단** (`MobileHeader.tsx`): 로고 + 검색창 + 추가 버튼 + 햄버거
- **사이드바** (`Sidebar.tsx`): 왼쪽 슬라이드, bg `#1e1e1c`
  - 섹션: 재료 (전체 재료 / 유통기한 임박) / 레시피 (내 레시피 / 추천) / 기타 (장보기)
- **하단 탭** (`BottomNav.tsx`): 홈 / 재료 / 추천 / 장보기 / 레시피

---

## 디자인 시스템 (tailwind.config.ts에 등록)

```ts
colors: {
  surface: '#f7f6f3',
  card: '#ffffff',
  sidebar: '#1e1e1c',
  action: '#2C2C2A',
  'action-text': '#D3D1C7',
  't-primary': '#2C2C2A',
  't-secondary': '#5F5E5A',
  't-tertiary': '#888780',

  // 상태 뱃지
  'status-ok-bg': '#f0ede8',
  'status-ok-text': '#444441',
  'status-near-bg': '#FAECE7',
  'status-near-text': '#712B13',
  'status-miss-bg': '#f7f6f3',
  'status-miss-text': '#5F5E5A',

  // 유통기한
  'exp-red': '#993C1D',
  'exp-amber': '#854F0B',
  'exp-green': '#3B6D11',

  // 위치 도트
  'dot-fridge': '#85B7EB',
  'dot-freezer': '#5DCAA5',
  'dot-pantry': '#EF9F27',
}
```

### 공통 클래스 패턴
```
카드:        bg-card border border-[0.5px] rounded-[10px] p-3
필터 pill:   rounded-full border text-xs px-3 py-1
             active → bg-action text-action-text border-action
인풋:        border border-[0.5px] rounded-lg h-9 px-3 text-sm outline-none
버튼 primary: bg-action text-action-text rounded-lg text-xs font-medium px-3 py-1.5
```

---

## 타입 정의 (`src/types/index.ts`)

```typescript
export type Location = 'fridge' | 'freezer' | 'pantry'
export type RecipeMode = 'light' | 'full'

export interface Ingredient {
  id: string
  name: string
  location: Location
  quantity?: number
  unit?: string
  expiresAt?: string   // ISO date string
  memo?: string
  createdAt: string
}

export interface RecipeIngredient {
  name: string
  quantity?: number
  unit?: string
}

export interface Recipe {
  id: string
  title: string
  youtubeUrl?: string
  memo?: string
  mode: RecipeMode
  ingredients?: RecipeIngredient[]
  steps?: string[]
  createdAt: string
}

export interface ShoppingItem {
  id: string
  name: string
  from: string       // 레시피명 또는 '수동'
  checked: boolean
  createdAt: string
}
```

---

## 기능 명세

### 1. 재료 관리 (`/ingredients`)
- 필터: 전체 / 냉장 / 냉동 / 상온
- **빠른 입력 (최우선 UX)**
  - 상단 입력창에 재료명 입력 → 엔터 → 즉시 추가
  - 기본값: 마지막 선택 location, 수량 1, 유통기한 없음
  - 추가 후 입력창 포커스 유지 (연속 입력 가능)
  - location 토글 버튼 (냉장/냉동/상온) 입력창 옆에 배치
- 재료 카드 클릭 → 수정 / 삭제 인라인 액션
- 수량 +/- 버튼, 0이 되면 소진 처리 (흐리게 표시 후 제거)

### 2. 레시피 관리 (`/recipes`, `/recipes/[id]`)
- 레시피 추가 → 모드 선택
  - **가벼운 모드**: 제목 + 유튜브 링크(옵션) + 메모
  - **직접 입력 모드**: 제목 + 재료 리스트 + 단계 리스트 + 유튜브 링크(옵션)
  - 가벼운 모드 → 나중에 직접 입력 모드로 확장 가능
- 레시피 상세: 재료 목록, 단계, 유튜브 링크, 메모
- **요리 완료 처리**
  1. 완료 버튼 클릭
  2. 사용한 재료 체크박스로 선택 (전체 선택 옵션 포함)
  3. 확인 → 선택 재료 인벤토리에서 차감

### 3. 추천 레시피 (`/suggest`)
- 내 인벤토리 vs 레시피 재료 매칭
- 정렬: 바로 가능 (부족 0) → 거의 가능 (부족 1~3) → 재료 부족 (부족 4+)
- 필터 pill: 전체 / 바로 가능 / 거의 가능 / 재료 부족
- 카드 클릭 → 펼침:
  - 부족 재료 목록 + 개별 "장보기 추가" 버튼
  - "부족 재료 전체 장보기 추가" 버튼
  - 보유 재료 태그 목록
- 재료 없는 레시피(가벼운 모드)는 "인박스" 섹션에 별도 표시

### 4. 장보기 목록 (`/shopping`)
- 상단 직접 입력창 (엔터로 추가)
- 섹션: 구매 예정 / 완료
- 완료 항목 "모두 삭제" 버튼
- 구매 완료 → 인벤토리 자동 추가 (체크 시 확인 → 재료로 저장)

---

## Supabase 테이블 설계

```sql
-- ingredients
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null check (location in ('fridge','freezer','pantry')),
  quantity numeric,
  unit text,
  expires_at date,
  memo text,
  created_at timestamptz default now()
);

-- recipes
create table recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text,
  memo text,
  mode text not null check (mode in ('light','full')),
  ingredients jsonb,
  steps jsonb,
  created_at timestamptz default now()
);

-- shopping_items
create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "from" text not null,
  checked boolean default false,
  created_at timestamptz default now()
);
```

---

## 작업 순서 (우선순위)

1. **레이아웃 셋업** — TopNav / MobileHeader / Sidebar / BottomNav 반응형 구현
2. **재료 페이지** — 빠른 입력 UX + 카드 목록 + 필터
3. **레시피 페이지** — 추가 시트 (가벼운/직접 모드) + 상세 페이지
4. **추천 페이지** — 매칭 로직 + 카드 펼침 + 장보기 연동
5. **장보기 페이지** — 목록 + 완료 처리 + 인벤토리 자동 추가
6. **Supabase 연동** — 각 페이지 로컬 state → DB로 교체

---

## 주의사항

- 모든 컴포넌트 `'use client'` / `'use server'` 명시할 것
- Supabase 연동 전까지는 `useState` + 더미 데이터로 UI 먼저 완성
- 보더는 항상 `border-[0.5px]` (Tailwind 기본 1px 아님)
- 색상은 위 디자인 시스템 토큰만 사용, 임의 hex 직접 사용 금지
- `@/*` 경로 별칭 항상 사용 (상대 경로 `../` 금지)
