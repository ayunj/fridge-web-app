# 01. 코드베이스 개요

## 한 줄 요약

Next.js(App Router) 기반의 1인용 냉장고/레시피 앱이며, **Supabase가 켜져 있으면 DB를 사용**하고, 꺼져 있으면 **Mock 데이터 + LocalStorage**로 UX를 유지하는 하이브리드 구조입니다.

## 기술 스택(코드 기준)

- **Framework**: Next `16.2.4`
- **React**: `19.2.4`
- **언어**: TypeScript
- **DB/Auth**: Supabase(`@supabase/supabase-js`)
- **상태/데이터**: 페이지 단위 `useState` + (Supabase | LocalStorage | Mock) 분기

## 핵심 설계 포인트(“하네스” 관점 체크리스트)

- **환경 스위치**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 유무로 Supabase 사용 여부 결정
- **동작 보장**: Supabase가 꺼져도 화면/입력 흐름이 “최소 기능”으로 동작(특히 장보기/검색/추천)
- **점진적 스키마 대응**: 컬럼 미존재/스키마 캐시 이슈를 코드에서 감지하고 fallback 쿼리로 다운그레이드
- **UI 셸**: `AppShell`이 데스크톱/모바일 네비를 통합 제공(상단/하단탭/사이드바)

## 디렉터리 스냅샷(중요 파일)

- `src/app/*/page.tsx`: 페이지 단위 기능 구현(대부분 client component)
- `src/components/AppShell.tsx`: 내비/셸 + 요약 카운트(fetch)
- `src/lib/supabase/client.ts`: Supabase 클라이언트 생성 및 enabled 플래그
- `src/lib/data.ts`: Mock(더미) 데이터 + 공통 라벨/유틸
- `src/lib/shopping-local.ts`: 장보기 LocalStorage 시드/스키마

