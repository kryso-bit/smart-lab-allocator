import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("lab public access", () => {
  it("allows an unauthenticated visitor to read operational data", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.lab.snapshot()).resolves.toHaveProperty("departments");
  });
});
