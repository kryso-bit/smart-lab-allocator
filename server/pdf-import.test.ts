import { describe, expect, it } from "vitest";
import { extractPdfText, parseRoutineText, store } from "./labStore";

describe("routine PDF imports", () => {
  it("parses supported routine rows from extracted PDF text", async () => {
    const snapshot = await store.getSnapshot();
    const allocations = parseRoutineText("Monday 09:00-11:00 CSE CSE-DBMS 24", snapshot);
    expect(allocations[0]).toMatchObject({ day: "Monday", departmentCode: "CSE", seatsRequired: 24, source: "pdf" });
  });

  it("rejects documents without supported routine rows", async () => {
    const snapshot = await store.getSnapshot();
    expect(() => parseRoutineText("not a routine", snapshot)).toThrow("supported routine row");
  });

  it("extracts text operators from a simple PDF content stream", () => {
    expect(extractPdfText(Buffer.from("(Monday 09:00-11:00 CSE CSE-DBMS 24) Tj", "latin1"))).toContain("Monday 09:00-11:00 CSE CSE-DBMS 24");
  });

  it("applies proposed allocation changes only when an import is reviewed", async () => {
    const snapshot = await store.getSnapshot();
    const allocation = { id: "pdf-test-allocation", day: "Friday" as const, startTime: "17:00", endTime: "19:00", departmentCode: "CSE" as const, practicalId: "prac-dbms", roomId: "room-101", seatsRequired: 20, status: "clear" as const, source: "pdf" as const };
    const record = await store.addImport({ filename: "review-test.pdf", fileKey: "test-key", fileUrl: "https://example.com/test.pdf", extractedSummary: "Parsed one row", proposedAllocationIds: [allocation.id], proposedAllocations: [allocation] });
    expect((await store.getSnapshot()).allocations.some(item => item.id === allocation.id)).toBe(false);
    await store.reviewImport(record.id, "applied");
    expect((await store.getSnapshot()).allocations.some(item => item.id === allocation.id)).toBe(true);
    expect(snapshot.allocations.length).toBeGreaterThan(0);
  });
});
