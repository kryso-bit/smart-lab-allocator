import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("SmartSched public access", () => {
  it("allows unauthenticated visitors to load the workspace and schedule data", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.smartSched.dashboard()).resolves.toHaveProperty("courses", 30);
    await expect(caller.smartSched.data()).resolves.toHaveProperty("faculty");
    await expect(caller.smartSched.schedule()).resolves.toHaveProperty("schedule");
    await expect(caller.smartSched.analytics()).resolves.toHaveProperty("metrics");
    await expect(caller.smartSched.updateCourse({ id: "course-1", course_name: "Public Access Course" })).resolves.toHaveProperty("id", "course-1");
    await expect(caller.smartSched.exportCsv()).resolves.toHaveProperty("filename", "smartsched-timetable.csv");
    await expect(caller.smartSched.generate()).resolves.toHaveProperty("version");
  });
});
