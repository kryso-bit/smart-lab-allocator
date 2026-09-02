import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUserContext(role: "admin" | "user"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 2, openId: `${role}-smartsched`, email: `${role}@example.com`, name: role, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("SmartSched authorization", () => {
  it("blocks non-admin schedule generation and analytics", async () => {
    const caller = appRouter.createCaller(createUserContext("user"));
    await expect(caller.smartSched.generate()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.smartSched.analytics()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.smartSched.schedule()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.smartSched.simulate({ resourceId: "lab-2", resourceKind: "lab", day: "Wednesday", reason: "Maintenance" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.smartSched.repair({ resourceId: "lab-2", resourceKind: "lab", day: "Wednesday", reason: "Maintenance" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.smartSched.exportCsv()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
