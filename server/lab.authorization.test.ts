import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("lab authorization", () => {
  it("rejects a non-admin from operational data", async () => {
    const ctx: TrpcContext = {
      user: { id: 2, openId: "student", name: "Student", email: "student@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.lab.snapshot()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
