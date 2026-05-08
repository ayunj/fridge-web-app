## 목적
사용자가 “무조건 커밋푸쉬해줘”라고 지시하면, **항상 동일한 안전 루트**로 진행한다.

## 전제
- 로컬 변경사항이 존재한다.
- 원격은 `origin`이며, 통합 브랜치는 `master`, 작업/개발 브랜치는 `main`이다.
- **절대** 강제 푸시(`--force`, `--force-with-lease`)는 하지 않는다.

## 고정 루트(반드시 이 순서)
1) **현재 상태 확인**
- `git status`
- `git diff`
- `git log -5 --oneline`
- `git branch -a`
- `git fetch --prune`

2) **작업 브랜치에서 커밋**
- 작업 브랜치가 `main`이 아니면, 작업 브랜치에서 먼저 커밋한다.
- `git add <변경 파일>`
- `git commit -m "<type>: <요약>" -m "<본문>"`

3) **작업 브랜치 푸시**
- `git push origin <작업 브랜치>`

4) **`master`로 머지 + 푸시**
- `git checkout master`
- `git pull origin master`
- `git merge <작업 브랜치>` (가능하면 fast-forward)
- `git push origin master`

5) **`main`으로 복귀**
- `git checkout main`

6) **최종 검증**
- `git status`
- `git log -3 --oneline`

## 예외 처리(이 경우에도 멈추지 말고 해결 후 계속)
- **커밋할 변경이 없음**: 커밋/푸시/머지 없이 `git status`로 깨끗한 상태를 확인하고 종료.
- **머지 충돌 발생**: 충돌 해결 → `git add` → `git commit`(머지 커밋) → `git push origin master` → `git checkout main`.
- **원격이 앞서 있는 경우**: `git pull --rebase`(작업 브랜치)로 정리 후 다시 2)부터 진행.

