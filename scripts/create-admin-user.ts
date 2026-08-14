import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length) || undefined;
}

function required(name: string, optionName: string): string {
  const value = readOption(optionName) ?? process.env[name];
  if (!value) throw new Error(`${name} or --${optionName}=... is required`);
  return value;
}

const region = process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1";
const userPoolId = required("COGNITO_USER_POOL_ID", "user-pool-id");
const email = required("ADMIN_EMAIL", "email");
const groupName = readOption("group") ?? process.env.ADMIN_GROUP_NAME ?? "admin";
const temporaryPassword = readOption("temporary-password") ?? process.env.ADMIN_TEMPORARY_PASSWORD;
const client = new CognitoIdentityProviderClient({ region });

async function addToAdminGroup(): Promise<void> {
  await client.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: email, GroupName: groupName }));
}

async function main(): Promise<void> {
  try {
    await client.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
    await addToAdminGroup();
    console.log(`Existing user ensured in Cognito group: ${groupName}`);
    return;
  } catch (error) {
    if (!(error instanceof Error) || !error.name.includes("UserNotFound")) throw error;
  }

  const attributes: AttributeType[] = [{ Name: "email", Value: email }];
  await client.send(new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: attributes,
    DesiredDeliveryMediums: ["EMAIL"],
    ...(temporaryPassword ? { TemporaryPassword: temporaryPassword } : {}),
  }));
  await addToAdminGroup();
  console.log(`Created Cognito admin user and added group: ${groupName}`);
  console.log("The user must follow the invitation email and change the temporary password on first sign-in.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
