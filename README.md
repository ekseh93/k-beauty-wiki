# K-Beauty Atlas Japan

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md)

An independent, free K-beauty knowledge wiki for Japanese users considering a trip to Korea or buying Korean beauty products.

The project organizes treatments, skincare, and makeup information with sources, last-verified dates, safety notes, and comparisons. It is not a shop, clinic booking service, medical diagnosis service, or advertising platform.

## Why this project

After moving to Japan, I met many Japanese friends who were interested in Korean beauty. When a friend asked for skincare and treatment recommendations before a trip to Korea, I noticed that information already existed across official sites, blogs, communities, and YouTube, but users still had to search, compare, and connect each source themselves.

People preparing for important events such as coming-of-age ceremonies, job-offer ceremonies, or weddings may want choices that fit their purpose and remaining time. This project started from the idea that the problem was not a lack of information, but a lack of connections between information. K-Beauty Atlas Japan links treatment and product information with purpose, schedule, price, precautions, sources, and last-verified dates for Japanese users.

The requirements are derived not only from what users explicitly ask for, but also from unmet needs observed in their research process. The project applies source, rights, and editorial review rules, including a policy not to republish community review text without permission.

## Live deployment

- Website: https://main.d1ece7jdtq0bus.amplifyapp.com/
- GitHub: https://github.com/ekseh93/k-beauty-wiki
- AWS Region: `ap-northeast-1` (Tokyo)
- Amplify App ID: `d1ece7jdtq0bus`
- Deployment branch: `main`

AWS Amplify Hosting is connected to the `main` branch of `ekseh93/k-beauty-wiki` through the GitHub App. The build specification is maintained in [`amplify.yml`](./amplify.yml).

Unverified information is never published as production content. Development fixtures are clearly separated from reviewed content.

## MVP scope

- Unified search using Japanese titles and Korean original names
- Category lists and filters for treatments, skincare, and makeup
- Treatment and product details with comparison of up to three items
- Sources, price research conditions, and last-verified dates
- Transparent in-house rankings and evaluation criteria
- Related content, correction requests, editorial policy, disclaimer, and privacy policy
- Admin workflows for content creation, review, publication, and revision history

To protect content rights, the project uses official APIs, authorized data, and collection methods permitted by applicable terms. Community posts and review comments are not republished without permission; when appropriate, the project records a source link and an original summary instead. See [`docs/content-rights-policy.md`](./docs/content-rights-policy.md).

## AWS architecture

- Next.js App Router, TypeScript, and Tailwind CSS
- AWS Amplify Hosting
- Amazon API Gateway HTTP API and AWS Lambda
- Amazon DynamoDB
- Amazon Cognito
- Amazon S3
- Amazon CloudWatch, Systems Manager Parameter Store, and AWS Budgets
- AWS CDK with TypeScript
- GitHub Actions with AWS OIDC

Lambda functions are separated by capability:

- `public-content-api`
- `admin-content-api`
- `correction-api`
- `maintenance-job`

The project does not use fixed-cost EC2, RDS/Aurora, NAT Gateway, OpenSearch, Application Load Balancer, or paid WAF rules.

## Local development

Requirements:

- Node.js 22 or later
- pnpm 11.19.0
- AWS CLI and CDK CLI for backend work

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The development server normally runs at http://localhost:3000. Fixtures may be visible locally and are not equivalent to source-verified production content.

Available environment variables include:

```env
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:3000/api
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
CDK_DEFAULT_REGION=ap-northeast-1
```

Never commit real environment values, credentials, or secrets.

## Verification

```bash
pnpm lint
pnpm test
pnpm build
pnpm cdk:synth
```

Before registering content in the admin console, validate it locally without saving it to AWS:

```bash
pnpm validate:content --file=path/to/content.json
```

`review` content must include sources, a last-verified date, and core body fields. `published` content must pass all publication checks. See [`docs/content-registration.md`](./docs/content-registration.md).

## Deployment flow

1. GitHub Actions deploys the CDK backend using AWS OIDC.
2. The workflow explicitly starts an Amplify Hosting release for `main`.
3. Amplify installs pnpm and builds Next.js according to `amplify.yml`.
4. The workflow records the Amplify job ID; the build continues in Amplify Hosting.
5. The deployment is verified through the hosted URL after the build completes.
6. Amplify publishes the build to the public domain.

AWS credentials and long-lived access keys are not stored in the repository. Admin access is restricted through Cognito and IAM policies. For administrator provisioning, see [`docs/admin-provisioning.md`](./docs/admin-provisioning.md).

Operational problems and one-off commands are recorded in [`docs/troubleshooting.md`](./docs/troubleshooting.md).

## Directory structure

```text
src/                         # Next.js application
  app/                       # App Router pages and API routes
  components/                # UI components
  lib/                       # API clients and shared logic
backend/                     # Lambda handlers, services, repositories
infra/                       # AWS CDK stacks
docs/                        # Operations and content-rights policies
tests/                       # Tests and E2E tests
.github/workflows/           # GitHub Actions and AWS OIDC
amplify.yml                  # Amplify Hosting build specification
```

## License and disclaimer

This is an independent information service. Check official guidance and consult a qualified professional before using cosmetic products or undergoing a medical beauty treatment. The content is for reference only and does not replace diagnosis, prescriptions, or treatment.
