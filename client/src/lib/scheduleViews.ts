export type ScheduleView = "grid" | "room" | "faculty";

export function groupScheduleByView<T extends { room_name: string; faculty_id: string }>(items: T[], view: ScheduleView) {
  if (view === "grid") return { Grid: items };
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = view === "room" ? item.room_name : item.faculty_id;
    (groups[key] ||= []).push(item);
    return groups;
  }, {});
}
