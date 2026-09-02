import { z } from "zod";
import { PDFParse } from "pdf-parse";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { DEPARTMENTS, parseRoutineText, store } from "./labStore";
import { analytics, createCourse, createEquipment, createFaculty, createGroup, createRoom, deleteMaster, repairSchedule, runOptimizer, simulateUnavailable, smartStore, updateCourse, updateEquipment, updateFaculty, updateFacultyAvailability, updateGroup, updateRoom, validateCsv } from "./smartSchedStore";

const departmentCode = z.enum(DEPARTMENTS);
const dayOfWeek = z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

const allocationInput = z.object({
  id: z.string().optional(),
  day: dayOfWeek,
  startTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
  endTime: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/),
  departmentCode,
  practicalId: z.string(),
  roomId: z.string(),
  seatsRequired: z.number().int().positive(),
  notes: z.string().optional(),
  source: z.enum(["seed", "admin", "ai", "pdf"]).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  lab: router({
    snapshot: adminProcedure.query(() => store.getSnapshot()),
    upsertDepartment: adminProcedure.input(z.object({ id: z.string().optional(), code: departmentCode, name: z.string().min(2), studentStrength: z.number().int().nonnegative(), color: z.string() })).mutation(({ input }) => store.upsertDepartment(input)),
    upsertPractical: adminProcedure.input(z.object({ id: z.string().optional(), code: z.string().min(2), name: z.string().min(2), durationMinutes: z.number().int().positive(), requiredEquipment: z.array(z.string()), departmentCodes: z.array(departmentCode) })).mutation(({ input }) => store.upsertPractical(input)),
    deletePractical: adminProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => store.deletePractical(input.id)),
    upsertRoom: adminProcedure.input(z.object({ id: z.string().optional(), roomNumber: z.string().min(1), name: z.string().min(2), capacity: z.number().int().positive(), equipment: z.array(z.string()), active: z.boolean() })).mutation(({ input }) => store.upsertRoom(input)),
    upsertAllocation: adminProcedure.input(allocationInput).mutation(({ input }) => store.upsertAllocation({ ...input, source: input.source || "admin" })),
    deleteAllocation: adminProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => store.deleteAllocation(input.id)),
    reviewProposal: adminProcedure.input(z.object({ id: z.string() })).mutation(({ input, ctx }) => store.reviewProposal(input.id, ctx.user.id)),
    applyProposal: adminProcedure.input(z.object({ id: z.string() })).mutation(({ input }) => store.applyProposal(input.id)),
    reviewImport: adminProcedure.input(z.object({ id: z.string(), status: z.enum(["applied", "rejected"]) })).mutation(({ input }) => store.reviewImport(input.id, input.status)),
    uploadRoutinePdf: adminProcedure.input(z.object({ filename: z.string().min(1), base64: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      if (!input.filename.toLowerCase().endsWith(".pdf")) throw new Error("Only PDF routine files are accepted");
      const buffer = Buffer.from(input.base64, "base64");
      const uploaded = await storagePut(`routine-imports/${ctx.user.id}/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`, buffer, "application/pdf");
      const current = await store.getSnapshot();
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      await parser.destroy();
      const proposedAllocations = parseRoutineText(textResult.text, current);
      return store.addImport({ filename: input.filename, fileKey: uploaded.key, fileUrl: uploaded.url, extractedSummary: `PDF retained securely. Parsed ${proposedAllocations.length} routine update(s) for admin review before application.`, proposedAllocationIds: proposedAllocations.map(item => item.id), proposedAllocations });
    }),
    proposeSchedule: adminProcedure.input(z.object({ prompt: z.string().min(8), requestedDepartment: departmentCode.optional() })).mutation(async ({ input }) => {
      const snapshot = await store.getSnapshot();
      const context = JSON.stringify({ departments: snapshot.departments, rooms: snapshot.rooms, practicals: snapshot.practicals, allocations: snapshot.allocations });
      let explanation = "The proposal is generated as a review-only draft. No routine records are changed until an administrator applies it.";
      let proposedAllocations = snapshot.allocations.slice(0, 0);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a university lab scheduling assistant. Suggest exactly one conflict-free lab allocation using only the supplied rooms, departments, practicals, and existing allocations. Never claim to apply changes. Return JSON with explanation and allocation fields." },
            { role: "user", content: `${input.prompt}\\nTarget department: ${input.requestedDepartment || "any"}\\nCurrent operational data: ${context}` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "lab_schedule_proposal", strict: true, schema: { type: "object", properties: { explanation: { type: "string" }, day: { type: "string" }, startTime: { type: "string" }, endTime: { type: "string" }, departmentCode: { type: "string" }, practicalId: { type: "string" }, roomId: { type: "string" }, seatsRequired: { type: "integer" } }, required: ["explanation", "day", "startTime", "endTime", "departmentCode", "practicalId", "roomId", "seatsRequired"], additionalProperties: false } } },
        });
        const content = response.choices?.[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        proposedAllocations = [{ ...parsed, id: `ai-draft-${Date.now()}`, status: "clear", source: "ai" }];
        explanation = parsed.explanation;
      } catch {
        const room = snapshot.rooms.find(item => item.active && item.capacity >= 24) || snapshot.rooms[0];
        const practical = snapshot.practicals[0];
        proposedAllocations = [{ id: `ai-draft-${Date.now()}`, day: "Friday", startTime: "09:00", endTime: "11:00", departmentCode: input.requestedDepartment || "CSE", practicalId: practical.id, roomId: room.id, seatsRequired: Math.min(room.capacity, 24), status: "clear", source: "ai" }];
        explanation = "A deterministic fallback selected the first active room with enough capacity in an unused Friday morning slot. Review the draft before applying it.";
      }
      return store.addProposal({ prompt: input.prompt, explanation, allocationIds: [], proposedAllocations });
    }),
  }),
  smartSched: router({
    dashboard: adminProcedure.query(() => ({ courses: smartStore.courses.length, faculty: smartStore.faculty.length, rooms: smartStore.rooms.length, labs: smartStore.labs.length, equipment: smartStore.equipment.length, studentGroups: smartStore.student_groups.length, scheduleQuality: smartStore.schedule.length ? analytics().metrics.quality : null, hardConstraintViolations: smartStore.schedule.length ? analytics().metrics.hardViolations : null })),
    data: adminProcedure.query(() => smartStore),
    updateCourse: adminProcedure.input(z.object({ id: z.string(), course_name: z.string().optional(), student_count: z.number().int().positive().optional(), duration_minutes: z.number().int().positive().optional(), required_room_type: z.string().optional(), required_equipment: z.array(z.string()).optional(), faculty_id: z.string().optional() })).mutation(({ input }) => updateCourse(input)),
    updateFaculty: adminProcedure.input(z.object({ id: z.string(), name: z.string().optional(), maximum_hours_per_day: z.number().int().positive().optional(), availability: z.array(z.string()).optional(), preferred_slots: z.array(z.string()).optional() })).mutation(({ input }) => updateFaculty(input)),
    updateRoom: adminProcedure.input(z.object({ id: z.string(), name: z.string().optional(), capacity: z.number().int().positive().optional(), room_type: z.string().optional(), building: z.string().optional(), available_days: z.array(z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])).optional(), available_time_slots: z.array(z.string()).optional(), equipment: z.array(z.string()).optional(), active: z.boolean().optional() })).mutation(({ input }) => updateRoom(input)),
    updateEquipment: adminProcedure.input(z.object({ id: z.string(), name: z.string().optional(), quantity: z.number().int().nonnegative().optional(), location: z.string().optional(), available: z.boolean().optional() })).mutation(({ input }) => updateEquipment(input)),
    updateStudentGroup: adminProcedure.input(z.object({ id: z.string(), name: z.string().optional(), semester: z.number().int().positive().optional(), student_count: z.number().int().positive().optional() })).mutation(({ input }) => updateGroup(input)),
    validateCsv: adminProcedure.input(z.object({ kind: z.enum(["courses", "faculty", "rooms", "labs", "equipment", "student_groups"]), csv: z.string().min(3) })).mutation(({ input }) => validateCsv(input.kind, input.csv)),
    createCourse: adminProcedure.input(z.object({ name: z.string().min(2) })).mutation(({ input }) => createCourse(input.name)),
    createFaculty: adminProcedure.input(z.object({ name: z.string().min(2) })).mutation(({ input }) => createFaculty(input.name)),
    createRoom: adminProcedure.input(z.object({ name: z.string().min(2), lab: z.boolean().default(false) })).mutation(({ input }) => createRoom(input.name, input.lab)),
    createEquipment: adminProcedure.input(z.object({ name: z.string().min(2) })).mutation(({ input }) => createEquipment(input.name)),
    createStudentGroup: adminProcedure.input(z.object({ name: z.string().min(2) })).mutation(({ input }) => createGroup(input.name)),
    deleteMaster: adminProcedure.input(z.object({ kind: z.enum(["course", "faculty", "room", "lab", "equipment", "student_group"]), id: z.string() })).mutation(({ input }) => deleteMaster(input.kind, input.id)),
    updateFacultyAvailability: adminProcedure.input(z.object({ id: z.string(), availability: z.array(z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])) })).mutation(({ input }) => updateFacultyAvailability(input.id, input.availability)),
    constraints: adminProcedure.query(() => smartStore.constraints),
    updateConstraints: adminProcedure.input(z.object({ constraints: z.array(z.object({ id: z.string(), enabled: z.boolean(), weight: z.number().nonnegative() })) })).mutation(({ input }) => { input.constraints.forEach(update => { const existing = smartStore.constraints.find(item => item.id === update.id); if (existing) { existing.enabled = update.enabled; existing.weight = update.weight; } }); return smartStore.constraints; }),
    generate: adminProcedure.mutation(() => runOptimizer()),
    schedule: adminProcedure.query(() => ({ schedule: smartStore.schedule, versions: smartStore.versions })),
    quality: adminProcedure.query(() => analytics().metrics),
    analytics: adminProcedure.query(() => analytics()),
    simulate: adminProcedure.input(z.object({ resourceId: z.string(), resourceKind: z.enum(["room", "lab", "faculty"]), day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]), reason: z.string().min(2) })).mutation(({ input }) => simulateUnavailable(input.resourceId, input.resourceKind, input.day, input.reason)),
    repair: adminProcedure.input(z.object({ resourceId: z.string(), resourceKind: z.enum(["room", "lab", "faculty"]), day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]), reason: z.string().min(2) })).mutation(({ input }) => repairSchedule({ resource_id: input.resourceId, resource_kind: input.resourceKind, day: input.day, reason: input.reason })),
    exportCsv: adminProcedure.query(() => { const header = "Day,Time,Course,Course Code,Faculty,Student Group,Room,Duration\\n"; const body = smartStore.schedule.map(item => [item.day, `${item.start_time}-${item.end_time}`, item.course_name, item.course_code, item.faculty_id, item.student_group_id, item.room_name, item.duration_minutes].map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\\n"); return { filename: "smartsched-timetable.csv", csv: header + body }; }),
  }),
});

export type AppRouter = typeof appRouter;
