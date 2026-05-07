-- 전체 스키마 (현재 프론트 코드 기준)
-- - 재료: ingredient_defs, ingredient_items, v_ingredients
-- - 분류/공통: categories, locations
-- - 장보기: shopping_items (직접 추가 + 레시피 추가 통합)
--
-- 실행 순서:
-- 1) 이 파일을 Supabase SQL Editor에서 그대로 실행
-- 2) (선택) RLS/owner_id 정책은 인증 붙일 때 추가

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1) 공통: locations (재료 보관 위치)
-- ─────────────────────────────────────────────────────────────
create table if not exists locations (
  code text primary key check (code in ('fridge', 'freezer', 'pantry')),
  label text not null
);

insert into locations (code, label) values
  ('fridge', '냉장'),
  ('freezer', '냉동'),
  ('pantry', '상온')
on conflict (code) do update set label = excluded.label;

-- ─────────────────────────────────────────────────────────────
-- 2) 공통: categories (재료 카테고리)
-- owner_id는 나중에 auth 붙일 때 사용 (지금은 null로만 써도 됨)
-- ─────────────────────────────────────────────────────────────
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- ─────────────────────────────────────────────────────────────
-- 3) 재료: ingredient_defs (재료 이름/정의)
-- ─────────────────────────────────────────────────────────────
create table if not exists ingredient_defs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category_id uuid null references categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4) 재료: ingredient_items (실제 보유 재료 아이템)
-- note 컬럼은 코드에서 "있을 수도/없을 수도"로 처리하지만,
-- 이 스키마에서는 기본으로 포함시켜 둔다.
-- ─────────────────────────────────────────────────────────────
create table if not exists ingredient_items (
  id uuid primary key default gen_random_uuid(),
  ingredient_def_id uuid not null references ingredient_defs(id) on delete cascade,
  loc text not null references locations(code),
  qty_text text null,
  expires_at date null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ingredient_items_loc_created_at
  on ingredient_items (loc, created_at desc);

create index if not exists idx_ingredient_items_expires_at
  on ingredient_items (expires_at asc);

-- ─────────────────────────────────────────────────────────────
-- 5) 재료 뷰: v_ingredients
-- 프론트에서 v_ingredients를 기본 조회 소스로 사용
-- ─────────────────────────────────────────────────────────────
create or replace view v_ingredients as
select
  i.id,
  d.name,
  i.loc::text as loc,
  i.qty_text as qty,
  coalesce(c.name, '기타') as category,
  i.expires_at,
  i.note,
  i.created_at
from ingredient_items i
join ingredient_defs d on d.id = i.ingredient_def_id
left join categories c on c.id = d.category_id;

-- ─────────────────────────────────────────────────────────────
-- 6) 장보기: shopping_items (직접 추가 + 레시피 추가 통합)
-- 레시피 테이블은 아직 없으니 recipe_id는 nullable로만 둔다.
-- ─────────────────────────────────────────────────────────────
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "from" text not null, -- '직접 추가' 또는 레시피 제목(또는 레시피명)
  memo text null,
  checked boolean not null default false,
  created_at timestamptz not null default now(),

  -- future: recipes 테이블 추가 시 사용
  source_type text null check (source_type in ('manual', 'recipe')),
  recipe_id uuid null
);

create index if not exists idx_shopping_items_checked_created_at
  on shopping_items (checked, created_at desc);

create index if not exists idx_shopping_items_name
  on shopping_items (name);

-- recipes 테이블을 만든 뒤(예: id uuid pk) 아래 FK를 추가하는 형태를 추천:
-- alter table shopping_items
--   add constraint shopping_items_recipe_fk
--   foreign key (recipe_id) references recipes(id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- 7) 레시피: recipes / recipe_ingredients / recipe_steps
-- 프론트(/recipes)에서 사용
-- - recipes.kcal, recipes.servings: 예상 정보(옵션)
-- - updated_at: 저장 시 갱신
-- ─────────────────────────────────────────────────────────────
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text null,
  recipe_type text null,
  memo text null,
  mode text not null default 'light',
  kcal integer null,
  servings integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존에 recipes 테이블이 있고 kcal/servings/updated_at이 없을 수 있어 안전하게 추가
alter table recipes add column if not exists recipe_type text null;
alter table recipes add column if not exists kcal integer null;
alter table recipes add column if not exists servings integer null;
alter table recipes add column if not exists updated_at timestamptz not null default now();

create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null,
  qty_text text null,
  unit text null,
  sort_order integer null,
  created_at timestamptz not null default now()
);

create index if not exists idx_recipe_ingredients_recipe_sort
  on recipe_ingredients (recipe_id, sort_order asc, created_at asc);

create table if not exists recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  step_no integer not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (recipe_id, step_no)
);

create index if not exists idx_recipe_steps_recipe_step
  on recipe_steps (recipe_id, step_no asc);

-- PostgREST 스키마 캐시 갱신(필요 시)
-- select pg_notify('pgrst', 'reload schema');

