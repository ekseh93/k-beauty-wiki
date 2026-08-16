import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mocks.send }) },
  GetCommand: class { constructor(readonly input: unknown) {} },
  PutCommand: class { constructor(readonly input: unknown) {} },
  ScanCommand: class { constructor(readonly input: unknown) {} },
  UpdateCommand: class { constructor(readonly input: unknown) {} },
}));

import { handler } from "./index";

function eventFor(method: string, body: unknown) {
  return {
      requestContext: {
        http: { method },
      authorizer: { jwt: { claims: { sub: "test-admin", "cognito:groups": ["admin"] } } },
    },
    body: JSON.stringify(body),
  } as never;
}

describe("correction handler", () => {
  beforeEach(() => {
    mocks.send.mockReset();
    process.env.CORRECTION_TABLE_NAME = "correction-table";
    process.env.CONTENT_TABLE_NAME = "content-table";
    process.env.REVISION_TABLE_NAME = "revision-table";
  });

  it("marks published review evidence pending when a correction request is under review", async () => {
    mocks.send
      .mockResolvedValueOnce({ Item: { id: "request-1", slug: "published-product", requestType: "rights" } })
      .mockResolvedValueOnce({ Items: [{
        id: "content-1",
        slug: "published-product",
        status: "published",
        reviewEvidence: {
          platform: "Example",
          sampleCount: 5,
          independentSourceCount: 1,
          reviewCountAtCollection: 10,
          reviewWindow: "2026-01~2026-08",
          collectedAt: "2026-08-16",
          summary: "Independent summary",
          sourceUrls: ["https://example.com/reviews"],
          approvalStatus: "approved",
          approvedAt: "2026-08-16T00:00:00.000Z",
          approvedBy: "previous-admin",
        },
      }] })
      .mockResolvedValue({});

    const response = await handler(eventFor("PUT", { id: "request-1", status: "in_review", resolutionNote: "확인 중" }));
    const body = JSON.parse(response.body);
    const heldContent = mocks.send.mock.calls[2][0].input.Item;

    expect(response.statusCode).toBe(200);
    expect(body.contentMarkedForReview).toBe(true);
    expect(heldContent.status).toBe("review");
    expect(heldContent.reviewEvidence).toMatchObject({ approvalStatus: "pending", approvalNote: "권리 요청으로 리뷰 근거 재검토 필요" });
    expect(heldContent.reviewEvidence).not.toHaveProperty("approvedAt");
    expect(heldContent.reviewEvidence).not.toHaveProperty("approvedBy");
  });

  it("does not change content when a correction request is resolved", async () => {
    mocks.send
      .mockResolvedValueOnce({ Item: { id: "request-1", slug: "published-product", requestType: "rights" } })
      .mockResolvedValueOnce({});

    const response = await handler(eventFor("PUT", { id: "request-1", status: "resolved" }));
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.contentMarkedForReview).toBe(false);
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("rejects admin correction reads without the admin group", async () => {
    const response = await handler({
      requestContext: { http: { method: "GET" }, authorizer: { jwt: { claims: { sub: "other-user", "cognito:groups": ["viewer"] } } } },
      queryStringParameters: {},
    } as never);

    expect(response.statusCode).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
