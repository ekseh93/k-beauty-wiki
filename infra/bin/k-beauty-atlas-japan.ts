#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KBeautyAtlasStack } from "../lib/k-beauty-atlas-stack";

const app = new cdk.App();
new KBeautyAtlasStack(app, "KBeautyAtlasJapanStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1" },
});
