import { describe, expect, it } from "vitest";
import { detectAllocationIssues, store } from "./labStore";

describe("lab allocation safety", () => {
  it("flags room overlaps and capacity mismatches", async () => {
    const snapshot = await store.getSnapshot();
    const overlap = { ...snapshot.allocations[0], id: "candidate-overlap", startTime: "10:00", endTime: "12:00" };
    expect(detectAllocationIssues(overlap, snapshot, overlap.id)).toBe("room-conflict");
    const oversized = { ...snapshot.allocations[0], id: "candidate-capacity", roomId: "room-202", seatsRequired: 999 };
    expect(detectAllocationIssues(oversized, snapshot, oversized.id)).toBe("capacity-mismatch");
  });
});
