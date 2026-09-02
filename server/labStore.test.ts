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

  it("persists editable room master data", async () => {
    const room = await store.upsertRoom({ id: "room-test", roomNumber: "L-999", name: "Test Lab", capacity: 12, equipment: ["Test rigs"], active: false });
    expect(room).toMatchObject({ roomNumber: "L-999", capacity: 12, active: false });
  });

  it("blocks AI application until an admin review is persisted", async () => {
    const snapshot = await store.getSnapshot();
    const proposal = await store.addProposal({ prompt: "Test review gate", explanation: "Must be reviewed", allocationIds: [], proposedAllocations: [{ id: "ai-review-test", day: "Friday", startTime: "19:00", endTime: "20:00", departmentCode: "EE", practicalId: "prac-power", roomId: "room-303", seatsRequired: 10, status: "clear", source: "ai" }] });
    await expect(store.applyProposal(proposal.id)).rejects.toThrow("must be reviewed");
    await store.reviewProposal(proposal.id, 1);
    expect((await store.applyProposal(proposal.id)).status).toBe("applied");
    expect((await store.getSnapshot()).allocations.length).toBeGreaterThan(snapshot.allocations.length);
  });
});
