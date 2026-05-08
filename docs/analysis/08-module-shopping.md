# 08. 모듈 분석: 장보기(shopping)

## 주요 파일

- `src/app/shopping/page.tsx`: 장보기 CRUD + 완료 처리 + (완료 시) 재료 자동 추가
- `src/lib/shopping-local.ts`: LocalStorage 시드/스키마

## 저장소 전략

- **Supabase enabled**: `shopping_items` 테이블을 사용
- **disabled**: LocalStorage(`shopping.items.v1`)로 목록 유지

## 핵심 UX

- 항목 추가/수정/메모(로컬/DB 공통)
- 완료(done) 토글
- 완료 항목 묶음 보기(done drawer 등 UI)

## “완료 → 재료 자동 추가”

완료로 바뀌는 순간(체크가 false→true) 아래 처리가 실행됩니다.

- **DB 없음**: `ingredients.localAdds.v1`에 `{ name, loc:'fridge', ... }` 형태로 추가
- **DB 있음**: `ingredient_defs` upsert/조회 후 `ingredient_items` insert(단일 함수로 구현)

이 플로우 덕분에 “장보기에서 산 것 = 냉장고에 들어온 것”을 자연스럽게 연결합니다.

