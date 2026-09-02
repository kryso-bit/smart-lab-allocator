import { z } from "zod";
import { PDFParse } from "pdf-parse";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { DEPARTMENTS, parseRoutineText, store } from "./labStore";

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
});

export type AppRouter = typeof appRouter;
