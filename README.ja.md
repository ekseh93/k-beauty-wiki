# K-Beauty Atlas Japan

[English](README.md) · [한국어](README.ko.md) · [日本語](README.ja.md)

韓国旅行や韓国コスメの購入を検討する日本語ユーザー向けの、無料で独立したKビューティー情報ウィキです。

施術、スキンケア、メイクアップの情報を、出典、最終確認日、注意事項、比較情報とともに整理します。ショッピングモール、病院予約サービス、医療診断サービス、広告プラットフォームではありません。

## 公開環境

- ウェブサイト: https://main.d1ece7jdtq0bus.amplifyapp.com/
- GitHub: https://github.com/ekseh93/k-beauty-wiki
- AWSリージョン: `ap-northeast-1`（東京）
- AmplifyアプリID: `d1ece7jdtq0bus`
- デプロイブランチ: `main`

AWS Amplify HostingはGitHub Appを通じて`ekseh93/k-beauty-wiki`の`main`ブランチに接続されています。ビルド仕様は[`amplify.yml`](./amplify.yml)で管理します。

出典を確認していない情報はプロダクションコンテンツとして公開しません。開発用fixtureは検証済みコンテンツと明確に区別します。

## MVPの範囲

- 日本語タイトルと韓国語原名による統合検索
- 施術、スキンケア、メイクアップのカテゴリとフィルター
- 施術・製品の詳細情報と最大3件の比較
- 出典、価格調査条件、最終確認日の表示
- 独自ランキングと評価基準の公開
- 関連コンテンツ、訂正依頼、編集方針、免責、プライバシーポリシー
- コンテンツの作成、レビュー、公開、変更履歴を管理する管理者機能

コンテンツ保護のため、公式API、許可を得たデータ、利用規約で認められた収集方法だけを使用します。コミュニティ投稿やレビューコメントを無断転載せず、必要な場合は出典リンクと独自の要約を中心に記録します。詳しくは[`docs/content-rights-policy.md`](./docs/content-rights-policy.md)をご覧ください。

## AWSアーキテクチャ

- Next.js App Router、TypeScript、Tailwind CSS
- AWS Amplify Hosting
- Amazon API Gateway HTTP APIとAWS Lambda
- Amazon DynamoDB
- Amazon Cognito
- Amazon S3
- Amazon CloudWatch、Systems Manager Parameter Store、AWS Budgets
- TypeScriptによるAWS CDK
- AWS OIDCを利用するGitHub Actions

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
- バックエンド作業時はAWS CLIとCDK CLI

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

開発サーバーは通常 http://localhost:3000 で起動します。開発環境ではfixtureが表示される場合があり、出典を確認したプロダクションコンテンツとは異なります。

利用できる環境変数の例:

```env
NEXT_PUBLIC_CONTENT_API_URL=http://localhost:3000/api
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
CDK_DEFAULT_REGION=ap-northeast-1
```

実際の環境値、認証情報、シークレットをリポジトリにコミットしません。

## 検証コマンド

```bash
pnpm lint
pnpm test
pnpm build
pnpm cdk:synth
```

管理画面に登録する前に、AWSへ保存せずローカルでコンテンツを検証します。

```bash
pnpm validate:content --file=path/to/content.json
```

`review`コンテンツには出典、最終確認日、基本本文フィールドが必要です。`published`コンテンツは公開用の全検証を通過する必要があります。運用基準は[`docs/content-registration.md`](./docs/content-registration.md)をご覧ください。

## デプロイフロー

1. GitHub ActionsがAWS OIDCでCDKバックエンドをデプロイします。
2. ワークフローが`main`ブランチのAmplify Hostingリリースを明示的に開始します。
3. `amplify.yml`に従ってpnpmをインストールし、Next.jsをビルドします。
4. ワークフローがAmplifyビルドの成功を確認してから完了します。
5. Amplifyがビルド結果を公開ドメインにデプロイします。

AWSの認証情報や長期アクセスキーをリポジトリに保存しません。管理画面へのアクセスはCognitoとIAMポリシーで制限します。管理者アカウントの作成は[`docs/admin-provisioning.md`](./docs/admin-provisioning.md)をご覧ください。

## ディレクトリ構成

```text
src/                         # Next.jsアプリケーション
  app/                       # App RouterページとAPIルート
  components/                # UIコンポーネント
  lib/                       # APIクライアントと共通ロジック
backend/                     # Lambdaハンドラー、サービス、リポジトリ
infra/                       # AWS CDKスタック
docs/                        # 運用・コンテンツ保護ポリシー
tests/                       # テストとE2Eテスト
.github/workflows/           # GitHub ActionsとAWS OIDC
amplify.yml                  # Amplify Hostingビルド仕様
```

## ライセンスと免責

本プロジェクトは独立した情報整理サービスです。化粧品の使用や医療美容施術の前に、公式案内を確認し、資格を持つ専門家に相談してください。コンテンツは参考目的であり、診断、処方、治療を代替するものではありません。
