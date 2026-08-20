# 트러블슈팅 메모

이 문서는 K-Beauty Atlas Japan을 구축·배포하면서 실제로 확인한 문제와 별도로 실행해야 했던 명령을 기록한다. 비밀번호, 초대 메일 본문, 액세스 토큰, AWS 자격증명은 기록하지 않는다.

## 1. GitHub CLI가 인식되지 않는 경우

PowerShell에서 `gh`가 인식되지 않으면 GitHub CLI가 설치되지 않았거나 새 PATH가 현재 터미널에 반영되지 않은 상태다.

```powershell
winget install --id GitHub.cli
```

설치 후 PowerShell을 새로 열고 다음 순서로 확인한다.

```powershell
gh --version
gh auth login
gh auth status
```

로그인 방식은 GitHub.com, HTTPS, 브라우저 인증을 선택한다. 인증 토큰은 저장소 파일이나 명령 출력에 남기지 않는다.

## 2. Cognito 최초 관리자 생성과 임시 비밀번호

최초 관리자 생성은 `ADMIN_EMAIL`만 필요로 하며, 비밀번호를 GitHub Secret이나 코드에 저장하지 않는다.

GitHub Actions에서 자동 생성하려면 저장소의 Settings → Secrets and variables → Actions에 `ADMIN_EMAIL` Secret을 등록한다. 로컬에서 직접 실행할 때는 AWS 자격증명이 설정된 PowerShell에서 다음 명령을 별도로 실행한다.

```powershell
$env:ADMIN_EMAIL = "관리자 이메일"
$env:CDK_DEFAULT_REGION = "ap-northeast-1"
pnpm cdk:deploy
```

인프라 배포 후 별도 생성이 필요한 경우에는 User Pool ID를 확인한 뒤 다음을 실행한다.

```powershell
$env:COGNITO_USER_POOL_ID = "ap-northeast-1_발급된PoolId"
$env:ADMIN_EMAIL = "관리자 이메일"
$env:CDK_DEFAULT_REGION = "ap-northeast-1"
pnpm create:admin
```

임시 비밀번호를 직접 지정해야 할 때만 일회성 환경 변수를 추가한다. 사용 후 환경 변수와 터미널 기록에 남지 않도록 관리한다.

```powershell
$env:ADMIN_TEMPORARY_PASSWORD = "일회성 임시 비밀번호"
pnpm create:admin
```

초대 메일의 임시 비밀번호는 저장소가 아니라 Cognito 초대 메일에서 확인한다. 첫 로그인은 새 비밀번호 설정 단계가 필요하다.

## 3. `newPasswordRequired is not a function` 오류

Cognito의 최초 로그인은 일반 로그인 성공이 아니라 `NEW_PASSWORD_REQUIRED` 챌린지로 반환될 수 있다. 이때 임의의 `newPasswordRequired()` 메서드를 호출하면 오류가 발생한다.

현재 관리자 화면은 Cognito 사용자 객체의 `completeNewPasswordChallenge` 흐름을 사용한다.

확인할 항목:

1. 임시 비밀번호와 이메일을 초대 메일의 값으로 입력한다.
2. 새 비밀번호 설정 화면이 표시되는지 확인한다.
3. 새 비밀번호를 직접 입력하고 완료한다.
4. 로그아웃 후 새 비밀번호로 다시 로그인한다.

임시 비밀번호나 새 비밀번호는 이 메모, 테스트 결과, 브라우저 캡처에 기록하지 않는다.

## 4. Amplify GitHub OAuth 팝업이 흰 화면으로 닫히는 경우

Amplify의 저장소 연결은 GitHub OAuth 팝업과 리디렉션을 사용한다. 팝업이 예기치 않게 닫히거나 흰 화면으로 남으면 다음 순서로 재시도한다.

1. AWS Console과 GitHub에 로그인되어 있는지 확인한다.
2. AWS Console과 GitHub의 팝업·리디렉션을 허용한다.
3. 기존 OAuth 팝업을 닫고 Amplify의 저장소 추가 화면을 새로 연다.
4. GitHub 권한 승인 화면에서 저장소 접근 권한을 승인한다.
5. AWS Amplify 화면으로 돌아와 저장소 목록과 `main` 브랜치를 확인한다.

권한 승인 뒤에도 목록이 비어 있으면 같은 팝업을 반복해서 누르지 말고, Amplify 저장소 연결 화면을 새로고침한 뒤 인증 상태를 다시 확인한다. 이 프로젝트의 실제 연결 상태는 `ekseh93/k-beauty-wiki`의 `main` 브랜치로 확인한다.

## 5. CDK 완료와 Amplify 완료 시점이 다른 경우

CDK 백엔드 배포가 끝났다고 해서 Amplify 프런트엔드 빌드가 끝난 것은 아니다. 배포 워크플로는 Amplify 릴리스를 시작하거나 기존 릴리스를 채택한 뒤 완료 상태까지 기다린다.

GitHub Actions 상태는 다음처럼 확인한다.

```powershell
gh run list --repo ekseh93/k-beauty-wiki --branch main --limit 3
gh run view <run-id> --repo ekseh93/k-beauty-wiki
```

최종 확인은 Actions 성공만으로 끝내지 않고 다음 주소를 새로고침해 실제 화면을 확인한다.

- 공개 목록: <https://main.d1ece7jdtq0bus.amplifyapp.com/content>
- 관리자: <https://main.d1ece7jdtq0bus.amplifyapp.com/admin>

## 6. 콘텐츠 검증과 공개 경계

관리자 등록 전에는 AWS에 저장하지 않고 로컬 검증을 실행한다.

```powershell
pnpm validate:content --file=path/to/content.json
pnpm validate:content:all
pnpm lint
pnpm test
pnpm build
pnpm cdk:synth
git diff --check
```

`review` 상태는 출처와 필수 필드가 있어도 공개 승인을 의미하지 않는다. 공개 전에는 일본 현행 판매 정보, 용량·가격 조건, 성분·주의사항, 출처 접근 가능성, 권리 범위를 사람이 다시 확인한다. 검수 대기 콘텐츠는 공개 API에 노출하지 않는다.

커뮤니티 리뷰는 원문이나 댓글을 복사하지 않는다. 허용된 이용 범위와 표본 조건을 먼저 확인하고, 필요한 경우 출처 링크·수집일·독자적인 요약·권리 상태만 별도 기록한다.

## 7. 문서·커밋·배포 순서

문서나 코드 변경 후에는 작업 범위를 확인하고 관련 파일만 커밋한다.

```powershell
git status -sb
git diff -- docs/
git add docs/troubleshooting.md README.md README.ko.md README.ja.md
git commit -m "docs: record troubleshooting notes"
git push origin main
```

푸시 후에는 CI, Deploy AWS, Amplify 릴리스, GitHub 최신 커밋, 공개 URL을 순서대로 확인한다. 변경이 없는데 같은 내용을 반복 커밋하지 않는다.

## 8. 현재 미해결 항목

- Round Lab 자작나무 수분 선크림: 현재 판매 제품의 표시와 과거 공식 시험 자료가 같은 제품인지 추가 확인 필요
- SKIN1004 Madagascar Centella Ampoule: 일본 현행 전성분 확인 필요

두 항목은 조건이 충족되기 전까지 `review` 상태를 유지하며 공개하지 않는다.

## 9. 로컬 검증 전 Node.js와 AWS 자격증명 사전 점검

PowerShell에서 `node`가 인식되지 않으면 `pnpm` 스크립트도 실행되지 않는다. 새 터미널에서 다음을 먼저 확인한다.

```powershell
node --version
pnpm --version
```

Node.js 22 이상과 저장소의 `packageManager`에 지정된 pnpm 버전을 설치한 뒤, 터미널을 다시 열고 검증 명령을 실행한다. CI는 워크플로에서 Node.js와 pnpm을 별도로 설정하므로 로컬 PATH 문제와 CI 결과를 혼동하지 않는다.

CDK 배포나 DynamoDB 운영 데이터 확인 전에는 AWS 자격증명을 임의로 만들거나 이메일·비밀번호를 추정하지 않는다. 먼저 현재 인증 주체를 읽기 전용으로 확인한다.

```powershell
$env:CDK_DEFAULT_REGION = "ap-northeast-1"
aws sts get-caller-identity
```

`Unable to locate credentials`가 나오면 AWS CLI 로그인 또는 IAM Identity Center 프로필을 먼저 구성하고, 사용하려는 프로필을 명시한 뒤 같은 확인 명령을 다시 실행한다. 인증이 확인되기 전에는 DynamoDB 조회, CDK 배포, 관리자 계정 생성 명령을 실행하지 않는다.
