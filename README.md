# K-Beauty Atlas Japan

韓国旅行やK-ビューティー製品の購入を検討する日本語ユーザー向けの、無料で独立したK-ビューティー情報ウィキです。

施術、スキンケア、メイクアップについて、出典、最終確認日、注意点と一緒に整理し、比較できる情報を提供します。ショッピングモール、病院予約、医療診断、広告プラットフォームではありません。

## 現在のデプロイ

- 公開サイト: https://main.d1ece7jdtq0bus.amplifyapp.com/
- GitHub: https://github.com/ekseh93/k-beauty-wiki
- AWSリージョン: `ap-northeast-1`（東京）
- AmplifyアプリID: `d1ece7jdtq0bus`
- デプロイブランチ: `main`

Amplify HostingはGitHub Appで`ekseh93/k-beauty-wiki`の`main`ブランチに接続し、自動デプロイしています。ビルド仕様はリポジトリルートの[`amplify.yml`](./amplify.yml)で管理します。

現在の公開サイトには、コンテンツ構造を確認するための開発用fixtureが表示されます。出典を確認していない情報は、プロダクションコンテンツとして公開しません。

## MVPの範囲

- 日本語タイトルと韓国語原名による統合検索
- 施術、スキンケア、メイクアップのカテゴリとフィルター
- 施術・製品の詳細情報と最大3件の比較
- 出典、価格調査条件、最終確認日の表示
- 独自ランキングと評価方法の公開
- 関連コンテンツ、訂正依頼、編集方針、免責、プライバシーポリシー
- 管理者向けコンテンツ作成、レビュー、公開、変更履歴管理

コンテンツ保護のため、公式API、許諾を得たデータ、利用条件で許可された範囲の収集だけを使用します。コミュニティ投稿やレビューの本文・コメントを無断転載せず、必要な場合は出典リンクと要約を中心に記録します。詳細は[`docs/content-rights-policy.md`](./docs/content-rights-policy.md)を参照してください。

## AWSアーキテクチャ

- Next.js App Router + TypeScript + Tailwind CSS
- AWS Amplify Hosting
- Amazon API Gateway HTTP API + AWS Lambda
- Amazon DynamoDB
- Amazon Cognito
- Amazon S3
- Amazon CloudWatch、Systems Manager Parameter Store、AWS Budgets
- AWS CDK（TypeScript）
- GitHub Actions + AWS OIDC

Lambdaは次の機能単位に分離します。

- `public-content-api`
- `admin-content-api`
- `correction-api`
- `maintenance-job`

固定費が発生するEC2、RDS/Aurora、NAT Gateway、OpenSearch、Application Load Balancer、有料WAFルールは使用しません。

## ローカル開発

必要な環境:

- Node.js 22以上
- pnpm 11.19.0
- AWS CLIとCDK CLI（バックエンド作業時）

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

通常は http://localhost:3000 で起動します。開発環境ではfixtureが表示される場合があります。実際の出典を確認した公開コンテンツとは明確に区別します。

`.env.local`には次の値を設定できます。

```env
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:3000/api
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
CDK_DEFAULT_REGION=ap-northeast-1
```

実際の環境値や認証情報はリポジトリにコミットしません。

## 検証コマンド

```bash
pnpm lint
pnpm test
pnpm build
pnpm cdk:synth
```

### コンテンツ登録前の検証

管理画面へ登録する前に、AWSへ保存せずローカルでコンテンツの状態を検証します。

```bash
pnpm validate:content --file=path/to/content.json
```

`review`は出典、最終確認日、基本本文などを要求し、`published`は公開用の全検証を通過する必要があります。運用基準は[`docs/content-registration.md`](./docs/content-registration.md)を参照してください。

## デプロイフロー

1. GitHub ActionsがAWS OIDCでCDKバックエンドをデプロイします。
2. Amplify Hostingが`main`ブランチの変更を検知します。
3. `amplify.yml`に従ってpnpmをインストールし、Next.jsをビルドします。
4. Amplifyがビルド結果を公開ドメインにデプロイします。

AWSアカウントの認証情報や長期アクセスキーをリポジトリに保存しません。管理画面へのアクセスはCognitoとIAMポリシーで制限します。

## ディレクトリ

```text
src/                         # Next.jsアプリケーション
  app/                       # App RouterページとAPI route
  components/                # UIコンポーネント
  lib/                       # APIクライアントと共通ロジック
backend/                     # Lambda handler、service、repository
infra/                       # AWS CDKスタック
docs/                        # 運用・コンテンツ保護ポリシー
tests/                       # テストとE2Eテスト
.github/workflows/           # GitHub Actions + AWS OIDC
amplify.yml                  # Amplify Hostingビルド仕様
```

## ライセンスと免責

本プロジェクトは独立した情報整理サービスです。医療施術や化粧品の使用前には、公式案内と専門家への相談を確認してください。本情報は参考目的であり、診断、処方、治療を代替するものではありません。
