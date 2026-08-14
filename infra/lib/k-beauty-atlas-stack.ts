import * as path from "node:path";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class KBeautyAtlasStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const contentTable = new dynamodb.Table(this, "ContentTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    contentTable.addGlobalSecondaryIndex({ indexName: "status-updated-index", partitionKey: { name: "status", type: dynamodb.AttributeType.STRING }, sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING }, projectionType: dynamodb.ProjectionType.ALL });

    const correctionTable = new dynamodb.Table(this, "CorrectionTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const revisionTable = new dynamodb.Table(this, "RevisionTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "revisionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const assetBucket = new s3.Bucket(this, "AssetBucket", { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, encryption: s3.BucketEncryption.S3_MANAGED, enforceSSL: true, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const userPool = new cognito.UserPool(this, "AdminUserPool", { userPoolName: "k-beauty-atlas-admin", selfSignUpEnabled: false, signInAliases: { email: true }, removalPolicy: cdk.RemovalPolicy.RETAIN });
    const userPoolClient = userPool.addClient("AdminWebClient", { authFlows: { userSrp: true } });

    const createFunction = (id: string, entry: string, environment: Record<string, string>) => {
      const fn = new lambdaNodejs.NodejsFunction(this, id, { runtime: lambda.Runtime.NODEJS_24_X, entry: path.join(__dirname, "../..", entry), handler: "handler", memorySize: 256, timeout: cdk.Duration.seconds(10), tracing: lambda.Tracing.PASS_THROUGH, environment, bundling: { minify: true, sourceMap: true, target: "es2022" } });
      new logs.LogGroup(this, `${id}Logs`, { logGroupName: `/aws/lambda/${fn.functionName}`, retention: logs.RetentionDays.ONE_MONTH, removalPolicy: cdk.RemovalPolicy.RETAIN });
      return fn;
    };

    const publicApi = createFunction("PublicContentApi", "backend/functions/public-content-api/index.ts", { CONTENT_TABLE_NAME: contentTable.tableName, ALLOWED_ORIGIN: "*" });
    const adminApi = createFunction("AdminContentApi", "backend/functions/admin-content-api/index.ts", { CONTENT_TABLE_NAME: contentTable.tableName, REVISION_TABLE_NAME: revisionTable.tableName, ALLOWED_ORIGIN: "*" });
    const correctionApi = createFunction("CorrectionApi", "backend/functions/correction-api/index.ts", { CORRECTION_TABLE_NAME: correctionTable.tableName, ALLOWED_ORIGIN: "*" });
    const maintenanceJob = createFunction("MaintenanceJob", "backend/functions/maintenance-job/index.ts", { CONTENT_TABLE_NAME: contentTable.tableName });
    contentTable.grantReadData(publicApi);
    contentTable.grantReadWriteData(adminApi);
    revisionTable.grantWriteData(adminApi);
    contentTable.grantReadWriteData(maintenanceJob);
    correctionTable.grantReadWriteData(correctionApi);
    assetBucket.grantReadWrite(adminApi);

    const httpApi = new apigwv2.HttpApi(this, "ContentHttpApi", { apiName: "k-beauty-atlas-content-api", corsPreflight: { allowHeaders: ["content-type", "authorization"], allowMethods: [apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.PUT, apigwv2.CorsHttpMethod.OPTIONS], allowOrigins: ["*"] } });
    httpApi.addRoutes({ path: "/content", methods: [apigwv2.HttpMethod.GET], integration: new integrations.HttpLambdaIntegration("PublicContentIntegration", publicApi) });
    httpApi.addRoutes({ path: "/corrections", methods: [apigwv2.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration("CorrectionIntegration", correctionApi) });
    const adminAuthorizer = new authorizers.HttpUserPoolAuthorizer("AdminAuthorizer", userPool, { userPoolClients: [userPoolClient] });
    httpApi.addRoutes({ path: "/admin/content", methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT], integration: new integrations.HttpLambdaIntegration("AdminContentIntegration", adminApi), authorizer: adminAuthorizer });
    httpApi.addRoutes({ path: "/admin/corrections", methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT], integration: new integrations.HttpLambdaIntegration("AdminCorrectionIntegration", correctionApi), authorizer: adminAuthorizer });

    new eventsRule(this, maintenanceJob);
    new ssm.StringParameter(this, "ContentApiUrlParameter", { parameterName: "/k-beauty-atlas/api-url", stringValue: httpApi.apiEndpoint });
    new ssm.StringParameter(this, "ContentTableParameter", { parameterName: "/k-beauty-atlas/content-table", stringValue: contentTable.tableName });
    new budgets.CfnBudget(this, "MonthlyBudget", { budget: { budgetName: "k-beauty-atlas-monthly", budgetLimit: { amount: Number(this.node.tryGetContext("budgetLimitUsd") ?? 20), unit: "USD" }, budgetType: "COST", timeUnit: "MONTHLY" } });

    const amplifyGithubToken = process.env.AMPLIFY_GITHUB_TOKEN ?? this.node.tryGetContext("amplifyGithubToken");
    if (amplifyGithubToken) {
      const amplifyApp = new amplify.CfnApp(this, "AmplifyApp", { name: "k-beauty-atlas-japan", platform: "WEB_COMPUTE", accessToken: amplifyGithubToken, repository: this.node.tryGetContext("githubRepository"), environmentVariables: [
        { name: "NEXT_PUBLIC_CONTENT_API_URL", value: httpApi.apiEndpoint },
        { name: "NEXT_PUBLIC_COGNITO_USER_POOL_ID", value: userPool.userPoolId },
        { name: "NEXT_PUBLIC_COGNITO_CLIENT_ID", value: userPoolClient.userPoolClientId },
      ], buildSpec: "version: 1\nfrontend:\n  phases:\n    preBuild:\n      commands:\n        - corepack enable\n        - pnpm install --frozen-lockfile\n    build:\n      commands:\n        - pnpm build\n  artifacts:\n    baseDirectory: .next\n    files:\n      - '**/*'\n  cache:\n    paths:\n      - node_modules/**/*\n" });
      new amplify.CfnBranch(this, "AmplifyMainBranch", { appId: amplifyApp.attrAppId, branchName: "main", enableAutoBuild: true, framework: "Next.js - SSR" });
    }

    new cdk.CfnOutput(this, "ContentApiEndpoint", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "AdminUserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "AdminClientId", { value: userPoolClient.userPoolClientId });
    const githubActionsRoleArn = this.node.tryGetContext("githubActionsRoleArn") ?? cdk.Stack.of(this).formatArn({ service: "iam", region: "", resource: "role", resourceName: "k-beauty-atlas-github-actions" });
    new cdk.CfnOutput(this, "GitHubActionsRoleArn", { value: githubActionsRoleArn });
  }
}

class eventsRule extends Construct {
  constructor(scope: Construct, job: lambda.IFunction) {
    super(scope, "MaintenanceSchedule");
    new events.Rule(this, "DailyMaintenance", { schedule: events.Schedule.rate(cdk.Duration.days(1)), targets: [new targets.LambdaFunction(job)] });
  }
}
