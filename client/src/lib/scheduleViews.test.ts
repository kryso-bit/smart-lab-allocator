import { describe, expect, it } from "vitest";
import { groupScheduleByView } from "./scheduleViews";

const items = [
  { room_name: "LAB-01", faculty_id: "faculty-1", course: "A" },
  { room_name: "LAB-01", faculty_id: "faculty-2", course: "B" },
  { room_name: "ROOM-01", faculty_id: "faculty-1", course: "C" },
];

describe("timetable views", () => {
  it("keeps a flat grid and creates distinct room/faculty groupings", () => {
    expect(groupScheduleByView(items, "grid").Grid).toHaveLength(3);
    expect(Object.keys(groupScheduleByView(items, "room"))).toEqual(["LAB-01", "ROOM-01"]);
    expect(groupScheduleByView(items, "room")["LAB-01"]).toHaveLength(2);
    expect(Object.keys(groupScheduleByView(items, "faculty"))).toEqual(["faculty-1", "faculty-2"]);
    expect(groupScheduleByView(items, "faculty")["faculty-1"]).toHaveLength(2);
  });
});
