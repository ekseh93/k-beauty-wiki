import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { CdkCustomResourceHandler } from "aws-lambda";

const client = new CognitoIdentityProviderClient({});

export const handler: CdkCustomResourceHandler = async (event) => {
  const userPoolId = String(event.ResourceProperties.userPoolId);
  const email = String(event.ResourceProperties.email);
  const groupName = String(event.ResourceProperties.groupName ?? "admin");
  const physicalResourceId = `admin-user:${userPoolId}:${email}`;

  if (event.RequestType === "Delete") return { PhysicalResourceId: physicalResourceId };

  try {
    await client.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
  } catch (error) {
    if (!(error instanceof Error) || !error.name.includes("UserNotFound")) throw error;
    await client.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [{ Name: "email", Value: email }],
      DesiredDeliveryMediums: ["EMAIL"],
    }));
  }

  await client.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: email, GroupName: groupName }));
  return { PhysicalResourceId: physicalResourceId };
};
