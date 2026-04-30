## fridge-web-app

1인용 냉장고/레시피 웹앱(폰/PC에서 같이 쓰는 걸 목표).

## 제품 컨셉 (우리가 합의한 방향)

- **메인**: “냉장고/냉동실/상온에 뭐가 있지?”를 가장 빠르게 관리
- **레시피**: 유튜브 레시피를 **내 DB로 정리**하고, 내 재료 기반으로 추천/장보기 자동화
- **차별점(정체성)**:
  - **입력이 귀찮은 게 제일 싫다 → 초고속 입력 UX**
  - **유튜브 레시피 정리(링크 + 내 메모 + 필요하면 직접 재료/단계 입력)**

## MVP 범위

### 1) 재료 인벤토리(냉장/냉동/상온)
- **필드(최소)**: `name`, `location`(냉장/냉동/상온), `created_at`
- **필드(옵션)**: 수량/단위, 유통기한, 메모, 태그
- **UX 목표**: “검색창 1개 → 엔터”로 추가(기본값 자동: 마지막 location, 수량=1, 유통기한 미설정)

### 2) 레시피 저장(내 레시피)
- **유튜브 링크(옵션)** + 제목 + 메모
- **입력 모드 2가지 중 선택**
  - **가벼운 모드**: 링크 + 메모 중심(북마크/기록)
  - **직접 입력 모드**: 재료 리스트 + 단계 리스트까지 정리
- 가벼운 모드로 저장한 레시피도 **나중에 직접 입력 모드로 확장** 가능해야 함

### 3) 레시피 추천 + 장보기 리스트
- 추천은 “내 인벤토리 vs 레시피 재료” 매칭 기반
  - **가능(부족 0)** / **거의 가능(부족 1~3)** 로 정렬
- 레시피를 선택하면 **부족 재료만 장보기 리스트로 자동 생성**(체크리스트)
- 추천/장보기 기능은 우선 **재료가 입력된 레시피** 위주로 정확하게 동작하게 만들고, 가벼운 모드는 “인박스”로 가치 제공

### 4) 남의 레시피 훔쳐보기(단계적으로)
- MVP에서는 운영 부담이 큰 “전체 공개 커뮤니티” 대신 아래 순서 권장
  - **1단계**: 공개 레시피 Seed 데이터(샘플) + 검색/필터
  - **2단계**: 공유 링크(읽기 전용) + **Fork(내 레시피로 복사)**  

## 데이터/인증 방향(클라우드 저장)

- **목표**: 폰/PC 동기화 → 로컬 저장이 아니라 **클라우드 DB** 필요
- **인증(현재 선택)**: **이메일 + 비밀번호 로그인** (나중에 간편인증 추가 가능)
- **추천 구현**: 비밀번호/세션은 직접 구현하지 말고 **Supabase Auth** 사용
- **보안 기본값**: “내 데이터는 나만”을 위해 DB는 **RLS 정책**(예: `user_id = auth.uid()`) 전제로 설계

### Supabase (나중에 연결)

- `.env.example`를 참고해서 `.env.local`을 만들고 키를 넣으면 됩니다.
- Supabase 클라이언트는 `src/lib/supabase/client.ts`에 준비해두었습니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Vercel로 배포하기 (운영)

이 프로젝트는 Next 앱이라 **Vercel 배포가 가장 간단**합니다.

#### 1) Vercel에 프로젝트 올리기

- GitHub(또는 Git) 레포를 Vercel에 Import
- Framework는 **Next.js** 자동 인식
- Build/Output 설정은 기본값으로 OK

#### 2) 환경변수 설정 (필수)

코드에서 아래 2개 환경변수를 강제합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Vercel → Project → **Settings → Environment Variables**에 위 2개를 등록하세요.
값은 Supabase 프로젝트의 **Project Settings → API**에서 확인합니다.

#### 3) “내 URL(커스텀 도메인)” 붙이기

Vercel → Project → **Settings → Domains**에서 도메인을 추가합니다.

- **도메인 구매/관리 업체(Cloudflare/가비아/Namecheap 등)** 쪽 DNS에 Vercel이 안내하는 레코드를 추가해야 합니다.
- 가장 흔한 구성:
  - **apex(루트) 도메인**: `@` → A 레코드 `76.76.21.21`
  - **www 서브도메인**: `www` → CNAME `cname.vercel-dns.com`

※ 어떤 DNS를 쓰는지/기존 레코드 상태에 따라 Vercel 화면에 표시되는 값이 다를 수 있으니,
**Vercel이 Domains 화면에서 제시하는 값을 우선**으로 적용하세요.

#### 4) Supabase 인증 리다이렉트 URL도 “내 URL”로 등록 (중요)

이 앱은 Supabase Auth를 쓰는 전제라서, 배포 도메인을 바꾸면 Supabase 쪽도 같이 맞춰야 합니다.

Supabase → Authentication → URL Configuration에서:

- **Site URL**: `https://내도메인`
- **Redirect URLs**: 아래를 모두 추가 권장
  - `https://내도메인/**`
  - `https://www.내도메인/**` (www도 쓴다면)
  - (옵션) Vercel Preview 도메인: `https://*.vercel.app/**` (프리뷰 환경에서 로그인 테스트할 때)

이 설정이 없으면 이메일 인증/로그인 플로우에서 “redirect mismatch”류 문제가 나기 쉽습니다.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
