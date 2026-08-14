# 관리자 계정 생성

관리자 User Pool은 CDK가 생성하고, `admin` Cognito 그룹의 멤버만 관리자 API를 호출할 수 있다. 공개 회원가입은 비활성화되어 있다.

## 최초 관리자 생성

CDK 배포 시 `ADMIN_EMAIL` 환경 변수가 있으면 User Pool과 `admin` 그룹을 만든 뒤, 해당 이메일로 Cognito 관리자 사용자를 자동 생성하고 초대 메일을 보낸다. 비밀번호는 코드나 CloudFormation에 저장하지 않는다.

로컬에서 자동 생성을 사용하려면 AWS 자격증명이 설정된 PowerShell에서 다음처럼 실행한다.

```powershell
$env:ADMIN_EMAIL = "관리자 이메일"
$env:CDK_DEFAULT_REGION = "ap-northeast-1"
pnpm cdk:deploy
```

GitHub Actions 배포에서 자동 생성을 사용하려면 저장소 Settings → Secrets and variables → Actions에 `ADMIN_EMAIL` secret을 추가한다. 비밀번호 secret은 추가하지 않는다. 초대 메일의 임시 비밀번호는 첫 로그인 때 변경한다.

자동 생성 없이 인프라만 배포한 뒤 별도로 생성하려면 AWS 자격증명이 설정된 PowerShell에서 다음처럼 실행한다.

```powershell
$env:COGNITO_USER_POOL_ID = "ap-northeast-1_발급된PoolId"
$env:ADMIN_EMAIL = "관리자 이메일"
$env:CDK_DEFAULT_REGION = "ap-northeast-1"
pnpm create:admin
```

이메일 초대 대신 임시 비밀번호를 직접 지정해야 하는 경우에만 다음 환경 변수를 추가한다.

```powershell
$env:ADMIN_TEMPORARY_PASSWORD = "일회성 임시 비밀번호"
pnpm create:admin
```

임시 비밀번호를 코드, `.env` 파일, GitHub, CDK context에 저장하지 않는다. 생성 후 Cognito 초대 메일에서 첫 로그인과 비밀번호 변경을 완료한다.

이미 같은 이메일 사용자가 있으면 스크립트는 새 사용자를 만들지 않고 `admin` 그룹 멤버십만 보장한다.

## 확인

1. 관리자 사이트에서 Cognito 계정으로 로그인한다.
2. `/admin`에서 콘텐츠를 `review` 상태로 저장한다.
3. 공개 API는 `published` 콘텐츠만 반환하므로 검수 대기 콘텐츠가 공개 사이트에 나타나지 않는지 확인한다.

비밀번호와 초대 메일은 이 저장소에 기록하지 않는다.
