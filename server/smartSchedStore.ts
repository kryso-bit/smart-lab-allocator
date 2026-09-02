import { execFileSync } from "node:child_process";

export type SmartDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export const SMART_DAYS: SmartDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export type ResourceKind = "room" | "lab" | "faculty";
export type SmartCourse = { id: string; course_code: string; course_name: string; department: string; semester: number; student_group_id: string; student_count: number; duration_minutes: number; required_room_type: string; required_equipment: string[]; sessions_per_week: number; faculty_id: string };
export type SmartFaculty = { id: string; name: string; department: string; maximum_hours_per_day: number; availability: string[]; preferred_slots: string[] };
export type SmartRoom = { id: string; name: string; capacity: number; room_type: string; building: string; available_days: SmartDay[]; available_time_slots: string[]; equipment: string[]; active: boolean };
export type SmartLab = SmartRoom & { maintenance_status: "available" | "maintenance" };
export type SmartEquipment = { id: string; name: string; quantity: number; location: string; available: boolean };
export type SmartGroup = { id: string; name: string; department: string; semester: number; student_count: number; courses: string[] };
export type SmartSlot = { id: string; day: SmartDay; start_time: string; end_time: string; duration_minutes: number };
export type SmartConstraint = { id: string; name: string; kind: "hard" | "soft"; enabled: boolean; weight: number; description: string };
export type SmartScheduleItem = { course_id: string; course_code: string; course_name: string; faculty_id: string; student_group_id: string; room_id: string; room_name: string; slot_id: string; day: SmartDay; start_time: string; end_time: string; student_count: number; duration_minutes: number; required_equipment: string[] };
export type ScheduleVersion = { id: string; label: string; created_at: string; reason: "generated" | "repair"; schedule: SmartScheduleItem[]; metrics: Record<string, number> };
export type Unavailability = { resource_id: string; resource_kind: ResourceKind; day: SmartDay; reason: string };

const departments = ["CSE", "CSE AIML", "IT", "ECE", "ME", "EEE", "EE"];
const equipmentNames = ["Computers", "Projector", "Internet", "GPU", "Oscilloscope", "Function Generator", "Microcontrollers", "CNC Trainer", "CAD Workstations", "Power Supplies", "Multimeters", "Network Rack"];
const slotSeed = ["09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"];

function demoData() {
  const groups: SmartGroup[] = Array.from({ length: 5 }, (_, i) => ({ id: `group-${i + 1}`, name: `CSE-${3 + (i % 2)}${String.fromCharCode(65 + i)}`, department: departments[i % departments.length], semester: 3 + (i % 2), student_count: 42 + i * 4, courses: [] }));
  const faculty: SmartFaculty[] = Array.from({ length: 15 }, (_, i) => ({ id: `faculty-${i + 1}`, name: `Faculty ${String.fromCharCode(65 + i)}`, department: departments[i % departments.length], maximum_hours_per_day: 4, availability: SMART_DAYS.slice(0, 5), preferred_slots: ["10:00", "11:00"] }));
  const rooms: SmartRoom[] = Array.from({ length: 10 }, (_, i) => ({ id: `room-${i + 1}`, name: `ROOM-${String(i + 1).padStart(2, "0")}`, capacity: 28 + (i % 5) * 8, room_type: i < 5 ? "Computer Classroom" : "Lecture Room", building: i < 5 ? "Engineering Block" : "Science Block", available_days: SMART_DAYS, available_time_slots: slotSeed, equipment: i < 5 ? ["Computers", "Projector", "Internet", "GPU", ...(i % 2 ? ["Network Rack"] : [])] : ["Projector", "Internet"], active: true }));
  const labs: SmartLab[] = [
    { id: "lab-1", name: "LAB-01", capacity: 60, room_type: "Computer Laboratory", building: "Engineering Block", available_days: SMART_DAYS, available_time_slots: slotSeed, equipment: ["Computers", "Projector", "Internet", "GPU", "Oscilloscope", "Function Generator", "Microcontrollers", "CNC Trainer", "CAD Workstations", "Power Supplies", "Multimeters"], active: true, maintenance_status: "available" },
    { id: "lab-2", name: "LAB-02", capacity: 60, room_type: "Electronics Laboratory", building: "Engineering Block", available_days: SMART_DAYS, available_time_slots: slotSeed, equipment: ["Oscilloscope", "Function Generator", "Microcontrollers", "Projector", "CNC Trainer", "CAD Workstations", "Power Supplies", "Multimeters"], active: true, maintenance_status: "available" },
    { id: "lab-3", name: "LAB-03", capacity: 60, room_type: "Mechanical Laboratory", building: "Workshop Block", available_days: SMART_DAYS, available_time_slots: slotSeed, equipment: ["CNC Trainer", "CAD Workstations", "Projector", "Oscilloscope", "Function Generator", "Microcontrollers", "Power Supplies", "Multimeters"], active: true, maintenance_status: "available" },
  ];
  const allRooms = [...rooms, ...labs];
  const courses: SmartCourse[] = Array.from({ length: 30 }, (_, i) => { const group = groups[i % groups.length]; const lab = i % 3 === 0; const required = lab ? equipmentNames[4 + (i % 7)] : equipmentNames[i % 4]; return { id: `course-${i + 1}`, course_code: `SM${301 + i}`, course_name: `${departments[i % departments.length]} ${["Data Structures", "Networks", "Database Systems", "Embedded Systems", "Machine Learning"][i % 5]}`, department: group.department, semester: group.semester, student_group_id: group.id, student_count: group.student_count, duration_minutes: 60, required_room_type: lab ? "Laboratory" : "Classroom", required_equipment: [required], sessions_per_week: i % 4 === 0 ? 2 : 1, faculty_id: faculty[i % faculty.length].id }; });
  groups.forEach(group => { group.courses = courses.filter(course => course.student_group_id === group.id).map(course => course.id); });
  return { departments, courses, faculty, rooms, labs, equipment: equipmentNames.map((name, i) => ({ id: `equipment-${i + 1}`, name, quantity: 20 + i * 5, location: i < 4 ? "Engineering Block" : "Specialized Labs", available: true })), student_groups: groups, time_slots: SMART_DAYS.flatMap(day => slotSeed.map((range, i) => { const [start_time, end_time] = range.split("-"); return { id: `${day.toLowerCase()}-${i + 1}`, day, start_time, end_time, duration_minutes: 60 }; })), constraints: [
    ["room-capacity", "Room capacity", "hard", 100, "Student count must fit room capacity"], ["room-conflict", "Room conflicts", "hard", 100, "A room cannot host two classes at once"], ["faculty-conflict", "Faculty conflicts", "hard", 100, "Faculty cannot teach two classes at once"], ["group-conflict", "Student group conflicts", "hard", 100, "Student group cannot attend two classes at once"], ["equipment", "Equipment availability", "hard", 100, "Required equipment must exist in the assigned resource"], ["room-wastage", "Room capacity wastage", "soft", 5, "Prefer rooms close to student count"], ["preferred-slots", "Faculty preferences", "soft", 8, "Prefer faculty preferred slots"], ["minimum-change", "Minimum schedule disruption", "soft", 20, "Prefer keeping existing assignments during repair"]
  ].map(([id, name, kind, weight, description]) => ({ id: id as string, name: name as string, kind: kind as "hard" | "soft", enabled: true, weight: weight as number, description: description as string })), unavailable: [] as Unavailability[], schedule: [] as SmartScheduleItem[], versions: [] as ScheduleVersion[] };
}

export const smartStore = demoData();

export function buildOptimizerPayload(freezeCourseIds: string[] = []) { return { courses: smartStore.courses, faculty: smartStore.faculty, rooms: [...smartStore.rooms, ...smartStore.labs], time_slots: smartStore.time_slots, constraints: smartStore.constraints, unavailable: smartStore.unavailable, freeze_course_ids: freezeCourseIds, existing_schedule: smartStore.schedule.map(item => ({ course_id: item.course_id, room_id: item.room_id, slot_id: item.slot_id })) }; }

export function runOptimizer(options: { freezeCourseIds?: string[]; reason?: "generated" | "repair" } = {}) {
  const raw = execFileSync("python3", ["scripts/optimizer.py"], { input: JSON.stringify(buildOptimizerPayload(options.freezeCourseIds || [])), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const result = JSON.parse(raw) as { ok: boolean; schedule?: SmartScheduleItem[]; quality?: number; hard_violations?: number; soft_violations?: number; error?: string; reasons?: string[] };
  if (!result.ok) throw new Error(`${result.error || "No feasible schedule found"}: ${(result.reasons || []).join(", ")}`);
  smartStore.schedule = result.schedule || [];
  const qualityMetrics = calculateQuality(smartStore.schedule);
  const metrics = { quality: qualityMetrics.quality, hardViolations: qualityMetrics.hardViolations, softViolations: qualityMetrics.softViolations, roomUtilization: qualityMetrics.roomUtilization, facultyUtilization: qualityMetrics.facultyUtilization, labUtilization: qualityMetrics.labUtilization, studentGaps: qualityMetrics.studentGaps, capacityWaste: qualityMetrics.capacityWaste };
  const version: ScheduleVersion = { id: `schedule-${smartStore.versions.length + 1}`, label: `Schedule v${smartStore.versions.length + 1}`, created_at: new Date().toISOString(), reason: options.reason || "generated", schedule: [...smartStore.schedule], metrics };
  smartStore.versions.push(version);
  return { schedule: smartStore.schedule, version, metrics };
}

export function calculateQuality(schedule: SmartScheduleItem[]) {
  const resources = [...smartStore.rooms, ...smartStore.labs];
  const courses = new Map(smartStore.courses.map(item => [item.id, item]));
  const faculty = new Map(smartStore.faculty.map(item => [item.id, item]));
  const hardReasons: string[] = [];
  const seenRoom = new Set<string>(); const seenFaculty = new Set<string>(); const seenGroup = new Set<string>();
  let capacityWaste = 0; let earlyClasses = 0;
  schedule.forEach(item => {
    const course = courses.get(item.course_id); const room = resources.find(resource => resource.id === item.room_id);
    const instructor = faculty.get(item.faculty_id); const slot = smartStore.time_slots.find(candidate => candidate.id === item.slot_id);
    if (!course || !room || !slot) { hardReasons.push(`${item.course_id}: missing resource`); return; }
    if (seenRoom.has(`${item.room_id}:${item.slot_id}`)) hardReasons.push(`${item.course_id}: room conflict`); seenRoom.add(`${item.room_id}:${item.slot_id}`);
    if (seenFaculty.has(`${item.faculty_id}:${item.slot_id}`)) hardReasons.push(`${item.course_id}: faculty conflict`); seenFaculty.add(`${item.faculty_id}:${item.slot_id}`);
    if (seenGroup.has(`${item.student_group_id}:${item.slot_id}`)) hardReasons.push(`${item.course_id}: student group conflict`); seenGroup.add(`${item.student_group_id}:${item.slot_id}`);
    if (room.capacity < item.student_count) hardReasons.push(`${item.course_id}: capacity mismatch`);
    if (instructor && !instructor.availability.includes(item.day)) hardReasons.push(`${item.course_id}: faculty unavailable`);
    if (course.required_room_type && !room.room_type.toLowerCase().includes(course.required_room_type.toLowerCase().replace("laboratory", "lab"))) hardReasons.push(`${item.course_id}: room type mismatch`);
    if (course.required_equipment.some(required => !room.equipment.some(equipment => equipment.toLowerCase() === required.toLowerCase()))) hardReasons.push(`${item.course_id}: equipment unavailable`);
    if (!room.available_days.includes(item.day) || !room.available_time_slots.some(availableSlot => availableSlot === item.start_time || availableSlot.startsWith(`${item.start_time}-`))) hardReasons.push(`${item.course_id}: resource unavailable`);
    capacityWaste += Math.max(0, room.capacity - item.student_count); if (item.start_time < "10:00") earlyClasses += 1;
  });
  const roomUtilization = resources.length ? Math.round((new Set(schedule.map(item => item.room_id)).size / resources.length) * 100) : 0;
  const facultyUtilization = smartStore.faculty.length ? Math.round((new Set(schedule.map(item => item.faculty_id)).size / smartStore.faculty.length) * 100) : 0;
  const labCount = smartStore.labs.length; const labAssignments = schedule.filter(item => smartStore.labs.some(lab => lab.id === item.room_id)).length;
  const labUtilization = labCount ? Math.round((labAssignments / Math.max(1, schedule.length)) * 100) : 0;
  const softViolations = earlyClasses + (capacityWaste > schedule.length * 20 ? 1 : 0);
  const hardViolations = hardReasons.length;
  const quality = hardViolations ? 0 : Math.max(0, Math.round(100 - Math.min(35, softViolations * 2) - Math.min(25, capacityWaste / Math.max(1, schedule.length))));
  return { quality, hardViolations, softViolations, hardReasons, roomUtilization, facultyUtilization, labUtilization, studentGaps: 0, capacityWaste };
}

export function simulateUnavailable(resourceId: string, resourceKind: ResourceKind, day: SmartDay, reason: string) { const affected = smartStore.schedule.filter(item => item.day === day && ((resourceKind === "room" || resourceKind === "lab") ? item.room_id === resourceId : item.faculty_id === resourceId)); return { change: { resource_id: resourceId, resource_kind: resourceKind, day, reason }, affected }; }

export function repairSchedule(change: Unavailability) { smartStore.unavailable.push(change); const before = [...smartStore.schedule]; const beforeMetrics = calculateQuality(before); const affectedIds = new Set(simulateUnavailable(change.resource_id, change.resource_kind, change.day, change.reason).affected.map(item => item.course_id)); const freezeCourseIds = before.map(item => item.course_id).filter(id => !affectedIds.has(id)); const result = runOptimizer({ freezeCourseIds, reason: "repair" }); const changes = result.schedule.filter(item => { const prior = before.find(old => old.course_id === item.course_id); return prior && (prior.room_id !== item.room_id || prior.slot_id !== item.slot_id); }).map(item => { const prior = before.find(old => old.course_id === item.course_id)!; return { course_id: item.course_id, from: { room_id: prior.room_id, slot_id: prior.slot_id }, to: { room_id: item.room_id, slot_id: item.slot_id } }; }); return { ...result, before, beforeMetrics, afterMetrics: result.metrics, moved: changes.length, changes }; }

export function analytics() { const metrics = calculateQuality(smartStore.schedule); const equipment = smartStore.equipment.map(item => ({ name: item.name, requiredBy: smartStore.schedule.filter(scheduleItem => scheduleItem.required_equipment.some(required => required.toLowerCase() === item.name.toLowerCase())).length, available: item.available })); return { metrics, rooms: smartStore.rooms.map(room => ({ name: room.name, utilization: smartStore.schedule.filter(item => item.room_id === room.id).length })), faculty: smartStore.faculty.map(person => ({ name: person.name, workload: smartStore.schedule.filter(item => item.faculty_id === person.id).length })), labs: smartStore.labs.map(lab => ({ name: lab.name, utilization: smartStore.schedule.filter(item => item.room_id === lab.id).length })), equipment }; }

export function updateCourse(input: Partial<SmartCourse> & { id: string }) { const index = smartStore.courses.findIndex(item => item.id === input.id); if (index < 0) throw new Error("Course not found"); smartStore.courses[index] = { ...smartStore.courses[index], ...input }; return smartStore.courses[index]; }
export function updateFaculty(input: Partial<SmartFaculty> & { id: string }) { const index = smartStore.faculty.findIndex(item => item.id === input.id); if (index < 0) throw new Error("Faculty not found"); smartStore.faculty[index] = { ...smartStore.faculty[index], ...input }; return smartStore.faculty[index]; }
export function updateRoom(input: Partial<SmartRoom> & { id: string }) { const collection = smartStore.rooms.some(item => item.id === input.id) ? smartStore.rooms : smartStore.labs; const index = collection.findIndex(item => item.id === input.id); if (index < 0) throw new Error("Room or laboratory not found"); collection[index] = { ...collection[index], ...input } as typeof collection[number]; return collection[index]; }
export function updateEquipment(input: Partial<SmartEquipment> & { id: string }) { const index = smartStore.equipment.findIndex(item => item.id === input.id); if (index < 0) throw new Error("Equipment not found"); smartStore.equipment[index] = { ...smartStore.equipment[index], ...input }; return smartStore.equipment[index]; }
export function updateGroup(input: Partial<SmartGroup> & { id: string }) { const index = smartStore.student_groups.findIndex(item => item.id === input.id); if (index < 0) throw new Error("Student group not found"); smartStore.student_groups[index] = { ...smartStore.student_groups[index], ...input }; return smartStore.student_groups[index]; }

export function validateCsv(kind: "courses" | "faculty" | "rooms" | "labs" | "equipment" | "student_groups", csv: string) { const lines = csv.split(/\r?\n/).map(line => line.trim()).filter(Boolean); if (lines.length < 2) throw new Error("CSV must contain a header and at least one data row"); const headers = lines[0].split(",").map(value => value.trim().toLowerCase()); const required: Record<string, string[]> = { courses: ["course_code", "course_name", "student_count"], faculty: ["name", "department"], rooms: ["name", "capacity"], labs: ["name", "capacity"], equipment: ["name", "quantity"], student_groups: ["name", "student_count"] }; const missing = required[kind].filter(field => !headers.includes(field)); if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}`); return { kind, columns: headers, rowCount: lines.length - 1, preview: lines.slice(1, 4) }; }

export function createCourse(name: string) { const id = `course-${Date.now()}`; const group = smartStore.student_groups[0]; const item: SmartCourse = { id, course_code: `SM${400 + smartStore.courses.length}`, course_name: name, department: group.department, semester: group.semester, student_group_id: group.id, student_count: group.student_count, duration_minutes: 60, required_room_type: "Classroom", required_equipment: ["Projector"], sessions_per_week: 1, faculty_id: smartStore.faculty[0].id }; smartStore.courses.push(item); group.courses.push(id); return item; }
export function createFaculty(name: string) { const item: SmartFaculty = { id: `faculty-${Date.now()}`, name, department: "CSE", maximum_hours_per_day: 4, availability: SMART_DAYS.slice(0, 5), preferred_slots: ["10:00", "11:00"] }; smartStore.faculty.push(item); return item; }
export function createRoom(name: string, lab = false) { const item: SmartRoom = { id: `${lab ? "lab" : "room"}-${Date.now()}`, name, capacity: 40, room_type: lab ? "Computer Laboratory" : "Computer Classroom", building: "Engineering Block", available_days: SMART_DAYS, available_time_slots: slotSeed, equipment: ["Computers", "Projector", "Internet"], active: true }; (lab ? smartStore.labs : smartStore.rooms).push(item as SmartLab | SmartRoom); return item; }
export function createEquipment(name: string) { const item: SmartEquipment = { id: `equipment-${Date.now()}`, name, quantity: 1, location: "Engineering Block", available: true }; smartStore.equipment.push(item); return item; }
export function createGroup(name: string) { const item: SmartGroup = { id: `group-${Date.now()}`, name, department: "CSE", semester: 3, student_count: 40, courses: [] }; smartStore.student_groups.push(item); return item; }
export function deleteMaster(kind: "course" | "faculty" | "room" | "lab" | "equipment" | "student_group", id: string) { const collection = kind === "course" ? smartStore.courses : kind === "faculty" ? smartStore.faculty : kind === "room" ? smartStore.rooms : kind === "lab" ? smartStore.labs : kind === "equipment" ? smartStore.equipment : smartStore.student_groups; const index = collection.findIndex(item => item.id === id); if (index < 0) throw new Error("Master record not found"); return collection.splice(index, 1)[0]; }
export function updateFacultyAvailability(id: string, availability: SmartDay[]) { const faculty = smartStore.faculty.find(item => item.id === id); if (!faculty) throw new Error("Faculty not found"); faculty.availability = availability; return faculty; }
