# K-Beauty Atlas Japan

韓国旅行やK-ビューティー製品の購入を検討する日本語ユーザー向けの、無料で独立したK-ビューティー情報百科です。

施術・スキンケア・メイクアップについて、「何か」「誰に向いているか」「何に注意するか」「一般的な価格帯」「似た選択肢との違い」「情報の出典と最終確認日」を確認できることを目指します。

本プロジェクトはショッピングモール、病院予約、医療診断、広告プラットフォームではありません。

## MVPの範囲

- 日本語を基本言語とした公開サイト
- 日本語タイトルと韓国語原名による検索
- カテゴリ、タグ、肌悩みなどによる絞り込み
- 施術・製品の詳細と最大3件の比較
- 出典、価格調査日、最終確認日の表示
- ランキングと評価方法の公開
- 訂正依頼、編集方針、免責、プライバシーポリシー
- 管理者向けのコンテンツ・出典・価格・訂正依頼管理

実際の出典を確認していない情報はプロダクション公開しません。現在のサンプル情報は開発・テスト用fixtureとしてのみ扱います。

## AWSアーキテクチャ

```text
Next.js App Router
  ├─ AWS Amplify Hosting
  └─ 公開ページ / 管理画面

Amazon API Gateway HTTP API
  ├─ public-content-api  → DynamoDB
  ├─ admin-content-api   → Cognito + DynamoDB + S3
  ├─ correction-api      → DynamoDB
  └─ maintenance-job     → DynamoDB / CloudWatch

Amazon Cognito / S3 / CloudWatch / SSM Parameter Store / AWS Budgets
GitHub Actions ── OIDC ── AWS CDK
```

固定費を抑えるため、PostgreSQL、Prisma、Vercel、Supabase、EC2、RDS/Aurora、NAT Gateway、OpenSearch、ALB、ElastiCache、有料WAFルールは使用しません。画像配信の必要性が明確になった場合のみCloudFrontを追加します。

## 技術スタック

- Next.js App Router
- TypeScript（strict）
- Tailwind CSS
- Amazon API Gateway HTTP API
- AWS Lambda
- Amazon DynamoDB
- Amazon Cognito
- Amazon S3
- AWS Amplify Hosting
- Amazon CloudWatch
- AWS Systems Manager Parameter Store
- AWS Budgets
- AWS CDK（TypeScript）
- GitHub Actions + AWS OIDC
- Vitest + Testing Library + Playwright
- pnpm

## ローカル開発

### 必要なもの

- Node.js 24以上
- pnpm
- AWS CDK CLI（`cdk synth`を実行する場合）

### セットアップ

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

開発サーバーは通常 `http://localhost:3000` で起動します。AWS接続なしでも、開発用fixtureを使って公開画面を確認できます。fixtureは `NODE_ENV=development` のときだけ有効です。

### 環境変数

```env
# フロントエンドから呼び出すAPI Gateway HTTP API
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:3000/api

# デプロイ後に管理画面で使うCognito情報
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=

# CDKコンテキストで使用するAWSリージョン
CDK_DEFAULT_REGION=ap-northeast-1
```

秘密情報、AWSアクセスキー、Cognitoシークレットはコミットしません。GitHub ActionsではAWS OIDCを使い、長期アクセスキーを保存しません。

## コマンド

```bash
pnpm dev          # Next.js開発サーバー
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm test:e2e     # Playwright（開発サーバー起動が必要）
pnpm build        # Next.js本番ビルド
pnpm cdk:synth    # AWS CDK CloudFormationテンプレート生成
```

## ディレクトリ

```text
src/                         # Next.js公開サイト・管理画面
  app/                       # App Routerページとメタデータ
  components/                # UIコンポーネント
  lib/                       # ドメイン型、検索、開発用fixture
backend/
  functions/                 # Lambda handler
  shared/                    # Lambda共通型とバリデーション
infra/                       # AWS CDK（TypeScript）
  bin/
  lib/
tests/                       # Playwright E2E
.github/workflows/           # GitHub Actions + AWS OIDC
```

## コンテンツ公開ルール

コンテンツは `draft` → `review` → `published` → `archived` の状態で管理します。必須フィールド、出典、最終確認日が揃っていないコンテンツは公開できません。価格は通貨、調査条件、調査日、出典をセットで保存します。

施術情報には医療情報免責を表示し、個別の診断・治療判断を行いません。美容情報は変動するため、公開後も出典と確認日を定期的に見直します。

## AWSデプロイ準備

AWSアカウントと認証情報がない環境では、まずローカルテストとCDK synthまで実行します。実デプロイには以下を設定してください。

1. AWS CLIとCDKの初期設定
2. CDK bootstrap
3. GitHub Actions用AWS OIDCプロバイダーとリポジトリ限定IAMロール
4. GitHub Secretsの `AWS_ROLE_ARN` と `AWS_REGION`
5. 必要に応じたS3・Cognito・DynamoDBの初期データ投入
6. `pnpm cdk:deploy` またはGitHub Actionsによるデプロイ

推奨リージョンは `ap-northeast-1` です。予算上限はCDKのAWS Budgetsリソースで設定し、利用額とCloudWatchログを定期的に確認します。

## 開発方針

- 公開サイトは日本語、管理画面は韓国語を基本とする
- コード、変数名、コミットメッセージは英語で統一する
- モバイルとデスクトップの両方に対応する
- 新しいライブラリは必要最小限にする
- 変更ごとに関連Lint、テスト、ビルドを実行する
- 意味のある機能単位でコミットし、READMEには機能・セットアップ・運用上の重要な変更を反映する

## ライセンス

ライセンスは公開方針が決まり次第追加します。
