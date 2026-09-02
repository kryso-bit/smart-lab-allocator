import { describe, expect, it } from "vitest";
import { createRoom, deleteMaster, smartStore } from "./smartSchedStore";

describe("SmartSched resource CRUD", () => {
  it("creates and deletes rooms and laboratories in their correct collections", () => {
    const room = createRoom("Test Classroom", false);
    const lab = createRoom("Test Laboratory", true);
    expect(smartStore.rooms.some(item => item.id === room.id)).toBe(true);
    expect(smartStore.labs.some(item => item.id === lab.id)).toBe(true);
    deleteMaster("room", room.id);
    deleteMaster("lab", lab.id);
    expect(smartStore.rooms.some(item => item.id === room.id)).toBe(false);
    expect(smartStore.labs.some(item => item.id === lab.id)).toBe(false);
  });
});
