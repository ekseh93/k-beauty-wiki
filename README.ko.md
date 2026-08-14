# K-Beauty Atlas Japan

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md)

한국 여행이나 K-뷰티 제품 구매를 고려하는 일본어 사용자를 위한 무료 독립 K-뷰티 정보 위키입니다.

시술, 스킨케어, 메이크업 정보를 출처, 최종 확인일, 주의사항, 비교 정보와 함께 정리합니다. 쇼핑몰, 병원 예약 서비스, 의료 진단 서비스, 광고 플랫폼이 아닙니다.

## 배포 환경

- 웹사이트: https://main.d1ece7jdtq0bus.amplifyapp.com/
- GitHub: https://github.com/ekseh93/k-beauty-wiki
- AWS 리전: `ap-northeast-1`(도쿄)
- Amplify 앱 ID: `d1ece7jdtq0bus`
- 배포 브랜치: `main`

AWS Amplify Hosting은 GitHub App을 통해 `ekseh93/k-beauty-wiki`의 `main` 브랜치에 연결되어 있습니다. 빌드 사양은 [`amplify.yml`](./amplify.yml)에서 관리합니다.

출처를 확인하지 않은 정보는 프로덕션 콘텐츠로 공개하지 않습니다. 개발용 fixture는 검수된 콘텐츠와 명확히 구분합니다.

## MVP 범위

- 일본어 제목과 한국어 원명을 함께 검색하는 통합 검색
- 시술, 스킨케어, 메이크업 카테고리와 필터
- 시술·제품 상세 정보 및 최대 3개 항목 비교
- 출처, 가격 조사 조건, 최종 확인일 표시
- 자체 순위와 평가 기준 공개
- 관련 콘텐츠, 정정 요청, 편집 정책, 면책, 개인정보 처리방침
- 콘텐츠 생성·검수·공개·변경 이력을 관리하는 관리자 기능

콘텐츠 보호를 위해 공식 API, 허가받은 데이터, 이용약관에서 허용하는 수집 방식만 사용합니다. 커뮤니티 게시글과 리뷰 댓글을 허가 없이 재게시하지 않으며, 필요한 경우 출처 링크와 독자적인 요약 중심으로 기록합니다. 자세한 내용은 [`docs/content-rights-policy.md`](./docs/content-rights-policy.md)를 확인하세요.

## AWS 아키텍처

- Next.js App Router, TypeScript, Tailwind CSS
- AWS Amplify Hosting
- Amazon API Gateway HTTP API 및 AWS Lambda
- Amazon DynamoDB
- Amazon Cognito
- Amazon S3
- Amazon CloudWatch, Systems Manager Parameter Store, AWS Budgets
- TypeScript 기반 AWS CDK
- AWS OIDC를 사용하는 GitHub Actions

Lambda는 다음 기능 단위로 분리합니다.

- `public-content-api`
- `admin-content-api`
- `correction-api`
- `maintenance-job`

고정 비용이 발생하는 EC2, RDS/Aurora, NAT Gateway, OpenSearch, Application Load Balancer, 유료 WAF 규칙은 사용하지 않습니다.

## 로컬 개발

필요 환경:

- Node.js 22 이상
- pnpm 11.19.0
- 백엔드 작업 시 AWS CLI와 CDK CLI

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

개발 서버는 보통 http://localhost:3000에서 실행됩니다. 로컬에서는 fixture가 표시될 수 있으며, 출처를 확인한 프로덕션 콘텐츠와 동일하지 않습니다.

사용할 수 있는 환경 변수 예시는 다음과 같습니다.

```env
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:3000/api
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
CDK_DEFAULT_REGION=ap-northeast-1
```

실제 환경 변수, 인증 정보, 비밀값은 저장소에 커밋하지 않습니다.

## 검증 명령

```bash
pnpm lint
pnpm test
pnpm build
pnpm cdk:synth
```

관리자 화면에 콘텐츠를 등록하기 전에 AWS에 저장하지 않고 로컬에서 검증합니다.

```bash
pnpm validate:content --file=path/to/content.json
```

`review` 콘텐츠는 출처, 최종 확인일, 기본 본문 필드를 포함해야 합니다. `published` 콘텐츠는 모든 공개 검증을 통과해야 합니다. 운영 기준은 [`docs/content-registration.md`](./docs/content-registration.md)를 참고하세요.

## 배포 흐름

1. GitHub Actions가 AWS OIDC로 CDK 백엔드를 배포합니다.
2. Amplify Hosting이 `main` 브랜치 변경을 감지합니다.
3. `amplify.yml`에 따라 pnpm을 설치하고 Next.js를 빌드합니다.
4. Amplify가 빌드 결과를 공개 도메인에 배포합니다.

AWS 인증 정보와 장기 액세스 키는 저장소에 보관하지 않습니다. 관리자 접근은 Cognito와 IAM 정책으로 제한합니다. 관리자 계정 생성은 [`docs/admin-provisioning.md`](./docs/admin-provisioning.md)를 참고하세요.

## 디렉터리 구조

```text
src/                         # Next.js 애플리케이션
  app/                       # App Router 페이지와 API 라우트
  components/                # UI 컴포넌트
  lib/                       # API 클라이언트와 공통 로직
backend/                     # Lambda 핸들러, 서비스, 리포지토리
infra/                       # AWS CDK 스택
docs/                        # 운영·콘텐츠 보호 정책
tests/                       # 테스트와 E2E 테스트
.github/workflows/           # GitHub Actions와 AWS OIDC
amplify.yml                  # Amplify Hosting 빌드 사양
```

## 라이선스와 면책

본 프로젝트는 독립적인 정보 정리 서비스입니다. 화장품을 사용하거나 의료 미용 시술을 받기 전에 공식 안내를 확인하고 자격을 갖춘 전문가와 상담하세요. 콘텐츠는 참고용이며 진단, 처방 또는 치료를 대신하지 않습니다.
