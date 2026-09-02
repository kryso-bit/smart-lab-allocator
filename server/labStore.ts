import { MongoClient, Db, Collection } from "mongodb";

export const DEPARTMENTS = ["CSE", "CSE AIML", "IT", "ECE", "ME", "EEE", "EE"] as const;
export type DepartmentCode = (typeof DEPARTMENTS)[number];
export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
export type AllocationStatus = "clear" | "room-conflict" | "capacity-mismatch" | "double-booked";

export type Department = {
  id: string;
  code: DepartmentCode;
  name: string;
  studentStrength: number;
  color: string;
};

export type LabRoom = {
  id: string;
  roomNumber: string;
  name: string;
  capacity: number;
  equipment: string[];
  active: boolean;
};

export type Practical = {
  id: string;
  code: string;
  name: string;
  durationMinutes: number;
  requiredEquipment: string[];
  departmentCodes: DepartmentCode[];
};

export type Allocation = {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  departmentCode: DepartmentCode;
  practicalId: string;
  roomId: string;
  seatsRequired: number;
  status: AllocationStatus;
  notes?: string;
  source?: "seed" | "admin" | "ai" | "pdf";
};

export type RoutineImport = {
  id: string;
  filename: string;
  fileKey: string;
  fileUrl: string;
  uploadedAt: string;
  status: "review" | "applied" | "rejected";
  extractedSummary: string;
  proposedAllocationIds: string[];
  proposedAllocations: Allocation[];
};

export type AiProposal = {
  id: string;
  createdAt: string;
  prompt: string;
  explanation: string;
  allocationIds: string[];
  proposedAllocations: Allocation[];
  status: "pending" | "applied" | "rejected";
  reviewedAt?: string;
  reviewedBy?: number;
};

export type LabSnapshot = {
  departments: Department[];
  rooms: LabRoom[];
  practicals: Practical[];
  allocations: Allocation[];
  imports: RoutineImport[];
  proposals: AiProposal[];
};

const seedDepartments: Department[] = [
  ["CSE", "Computer Science & Engineering", 72, "#13b8a6"],
  ["CSE AIML", "CSE — Artificial Intelligence & ML", 48, "#3677f5"],
  ["IT", "Information Technology", 60, "#ef6a59"],
  ["ECE", "Electronics & Communication", 54, "#8b6df6"],
  ["ME", "Mechanical Engineering", 42, "#f1a33c"],
  ["EEE", "Electrical & Electronics Engineering", 36, "#14a3a3"],
  ["EE", "Electrical Engineering", 30, "#d856a7"],
].map(([code, name, studentStrength, color], index) => ({
  id: `dept-${index + 1}`,
  code: code as DepartmentCode,
  name: name as string,
  studentStrength: studentStrength as number,
  color: color as string,
}));

const seedRooms: LabRoom[] = [
  { id: "room-101", roomNumber: "B-101", name: "Systems Lab", capacity: 36, equipment: ["Linux workstations", "Network rack"], active: true },
  { id: "room-202", roomNumber: "B-202", name: "AI & Data Lab", capacity: 32, equipment: ["GPU workstations", "Python stack"], active: true },
  { id: "room-303", roomNumber: "C-303", name: "Embedded Lab", capacity: 30, equipment: ["Oscilloscopes", "Microcontrollers"], active: true },
  { id: "room-404", roomNumber: "C-404", name: "Mechanical Workshop", capacity: 42, equipment: ["CNC trainer", "CAD workstations"], active: true },
  { id: "room-505", roomNumber: "D-505", name: "Power Electronics Lab", capacity: 36, equipment: ["Power supplies", "Multimeters"], active: true },
];

const seedPracticals: Practical[] = [
  { id: "prac-dbms", code: "CSE-DBMS", name: "Database Systems Practical", durationMinutes: 120, requiredEquipment: ["Linux workstations"], departmentCodes: ["CSE", "IT"] },
  { id: "prac-ml", code: "AIML-ML", name: "Machine Learning Studio", durationMinutes: 120, requiredEquipment: ["GPU workstations"], departmentCodes: ["CSE AIML", "CSE"] },
  { id: "prac-embedded", code: "ECE-EMB", name: "Embedded Systems Practical", durationMinutes: 120, requiredEquipment: ["Microcontrollers"], departmentCodes: ["ECE", "EEE"] },
  { id: "prac-cad", code: "ME-CAD", name: "CAD & Manufacturing Practical", durationMinutes: 120, requiredEquipment: ["CAD workstations"], departmentCodes: ["ME"] },
  { id: "prac-power", code: "EE-POWER", name: "Power Electronics Practical", durationMinutes: 120, requiredEquipment: ["Power supplies"], departmentCodes: ["EE", "EEE"] },
];

const seedAllocations: Allocation[] = [
  { id: "alloc-1", day: "Monday", startTime: "09:00", endTime: "11:00", departmentCode: "CSE", practicalId: "prac-dbms", roomId: "room-101", seatsRequired: 36, status: "clear", source: "seed" },
  { id: "alloc-2", day: "Monday", startTime: "11:30", endTime: "13:30", departmentCode: "CSE AIML", practicalId: "prac-ml", roomId: "room-202", seatsRequired: 32, status: "clear", source: "seed" },
  { id: "alloc-3", day: "Tuesday", startTime: "09:00", endTime: "11:00", departmentCode: "IT", practicalId: "prac-dbms", roomId: "room-101", seatsRequired: 30, status: "clear", source: "seed" },
  { id: "alloc-4", day: "Tuesday", startTime: "11:30", endTime: "13:30", departmentCode: "ECE", practicalId: "prac-embedded", roomId: "room-303", seatsRequired: 30, status: "clear", source: "seed" },
  { id: "alloc-5", day: "Wednesday", startTime: "09:00", endTime: "11:00", departmentCode: "ME", practicalId: "prac-cad", roomId: "room-404", seatsRequired: 42, status: "clear", source: "seed" },
  { id: "alloc-6", day: "Wednesday", startTime: "11:30", endTime: "13:30", departmentCode: "EEE", practicalId: "prac-power", roomId: "room-505", seatsRequired: 30, status: "clear", source: "seed" },
  { id: "alloc-7", day: "Thursday", startTime: "09:00", endTime: "11:00", departmentCode: "EE", practicalId: "prac-power", roomId: "room-505", seatsRequired: 28, status: "clear", source: "seed" },
  { id: "alloc-8", day: "Thursday", startTime: "11:30", endTime: "13:30", departmentCode: "CSE AIML", practicalId: "prac-ml", roomId: "room-202", seatsRequired: 30, status: "clear", source: "seed" },
];

const seedSnapshot: LabSnapshot = {
  departments: seedDepartments,
  rooms: seedRooms,
  practicals: seedPracticals,
  allocations: seedAllocations,
  imports: [],
  proposals: [],
};

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export function extractPdfText(buffer: Buffer): string {
  const source = buffer.toString("latin1");
  const pattern = /\(([^()]*)\)\s*T[Jj]/g;
  const literals: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) literals.push(match[1]);
  return literals.join(" ").replace(/\\n/g, "\n").replace(/\\([()\\])/g, "$1").trim();
}

export function parseRoutineText(text: string, snapshot: LabSnapshot): Allocation[] {
  const rows: Allocation[] = [];
  const rowPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday)\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(CSE AIML|CSE|IT|ECE|ME|EEE|EE)\s+([A-Za-z0-9-]+)\s+(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(text)) !== null) {
    const row = match;
    const practical = snapshot.practicals.find(item => item.code.toLowerCase() === row[5].toLowerCase()) || snapshot.practicals.find(item => item.name.toLowerCase().includes(row[5].toLowerCase()));
    const room = snapshot.rooms.find(item => item.active && item.capacity >= Number(row[6]));
    if (!practical || !room) continue;
    rows.push({ id: `pdf-draft-${Date.now()}-${rows.length}`, day: row[1] as Allocation["day"], startTime: row[2], endTime: row[3], departmentCode: row[4].toUpperCase() as Allocation["departmentCode"], practicalId: practical.id, roomId: room.id, seatsRequired: Number(row[6]), status: "clear", source: "pdf" });
  }
  if (!rows.length) throw new Error("PDF text did not contain a supported routine row. Expected: Day HH:MM-HH:MM Department PracticalCode Seats");
  return rows;
}

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function detectAllocationIssues(candidate: Allocation, snapshot: LabSnapshot, ignoreId?: string): AllocationStatus {
  const room = snapshot.rooms.find(item => item.id === candidate.roomId);
  if (!room || candidate.seatsRequired > room.capacity) return "capacity-mismatch";
  const overlap = snapshot.allocations.some(existing => {
    if (existing.id === ignoreId || existing.id === candidate.id) return false;
    return existing.day === candidate.day && existing.roomId === candidate.roomId && minutes(candidate.startTime) < minutes(existing.endTime) && minutes(existing.startTime) < minutes(candidate.endTime);
  });
  return overlap ? "room-conflict" : "clear";
}

export class MemoryLabStore {
  private snapshot: LabSnapshot = clone(seedSnapshot);

  async getSnapshot() { return clone(this.snapshot); }
  async upsertDepartment(input: Omit<Department, "id"> & { id?: string }) {
    const department = { ...input, id: input.id || `dept-${Date.now()}` };
    const index = this.snapshot.departments.findIndex(item => item.id === department.id);
    if (index >= 0) this.snapshot.departments[index] = department;
    else this.snapshot.departments.push(department);
    return clone(department);
  }
  async upsertPractical(input: Omit<Practical, "id"> & { id?: string }) {
    const practical = { ...input, id: input.id || `prac-${Date.now()}` };
    const index = this.snapshot.practicals.findIndex(item => item.id === practical.id);
    if (index >= 0) this.snapshot.practicals[index] = practical;
    else this.snapshot.practicals.push(practical);
    return clone(practical);
  }
  async deletePractical(id: string) {
    if (this.snapshot.allocations.some(item => item.practicalId === id)) throw new Error("Practical is used by an allocation and cannot be deleted until those sessions are reassigned");
    this.snapshot.practicals = this.snapshot.practicals.filter(item => item.id !== id);
    return { success: true };
  }
  async upsertRoom(input: Omit<LabRoom, "id"> & { id?: string }) {
    const room = { ...input, id: input.id || `room-${Date.now()}` };
    const index = this.snapshot.rooms.findIndex(item => item.id === room.id);
    if (index >= 0) this.snapshot.rooms[index] = room;
    else this.snapshot.rooms.push(room);
    this.revalidate();
    return clone(room);
  }
  async upsertAllocation(input: Omit<Allocation, "id" | "status"> & { id?: string; status?: AllocationStatus }) {
    const candidate = { ...input, id: input.id || `alloc-${Date.now()}`, status: "clear" as AllocationStatus };
    candidate.status = detectAllocationIssues(candidate, this.snapshot, candidate.id);
    const index = this.snapshot.allocations.findIndex(item => item.id === candidate.id);
    if (index >= 0) this.snapshot.allocations[index] = candidate;
    else this.snapshot.allocations.push(candidate);
    return clone(candidate);
  }
  async deleteAllocation(id: string) { this.snapshot.allocations = this.snapshot.allocations.filter(item => item.id !== id); this.revalidate(); return { success: true }; }
  async reviewImport(id: string, status: "applied" | "rejected") {
    const record = this.snapshot.imports.find(item => item.id === id);
    if (!record) throw new Error("Import not found");
    if (status === "applied") for (const allocation of record.proposedAllocations) await this.upsertAllocation({ ...allocation, source: "pdf" });
    record.status = status;
    return clone(record);
  }
  async addImport(input: Omit<RoutineImport, "id" | "uploadedAt" | "status">) {
    const record: RoutineImport = { ...input, id: `import-${Date.now()}`, uploadedAt: new Date().toISOString(), status: "review" };
    this.snapshot.imports.unshift(record);
    return clone(record);
  }
  async addProposal(input: Omit<AiProposal, "id" | "createdAt" | "status">) {
    const proposal: AiProposal = { ...input, id: `proposal-${Date.now()}`, createdAt: new Date().toISOString(), status: "pending" };
    this.snapshot.proposals.unshift(proposal);
    return clone(proposal);
  }
  async reviewProposal(id: string, reviewerId: number) {
    const proposal = this.snapshot.proposals.find(item => item.id === id);
    if (!proposal) throw new Error("Proposal not found");
    proposal.reviewedAt = new Date().toISOString();
    proposal.reviewedBy = reviewerId;
    return clone(proposal);
  }
  async applyProposal(id: string) {
    const proposal = this.snapshot.proposals.find(item => item.id === id);
    if (!proposal) throw new Error("Proposal not found");
    if (!proposal.reviewedAt || !proposal.reviewedBy) throw new Error("Proposal must be reviewed by an administrator before application");
    for (const allocation of proposal.proposedAllocations) await this.upsertAllocation({ ...allocation, source: "ai" });
    proposal.status = "applied";
    return clone(proposal);
  }
  private revalidate() { this.snapshot.allocations = this.snapshot.allocations.map(item => ({ ...item, status: detectAllocationIssues(item, this.snapshot, item.id) })); }
}

export type Store = MemoryLabStore;
export const store: Store = new MemoryLabStore();

// MongoDB is intentionally an adapter boundary: enable it only after a reachable remote URI is supplied.
export async function getMongoHealth() {
  const uri = process.env.MONGODB_URI || "";
  if (!process.env.ENABLE_MONGODB || process.env.ENABLE_MONGODB !== "true") return { enabled: false, connected: false };
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) return { enabled: true, connected: false };
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    await client.db(process.env.MONGODB_DB_NAME || "smart_lab_allocator").command({ ping: 1 });
    return { enabled: true, connected: true };
  } finally { await client.close(); }
}
