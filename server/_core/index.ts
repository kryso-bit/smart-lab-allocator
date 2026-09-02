import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { analytics, repairSchedule, runOptimizer, simulateUnavailable, smartStore } from "../smartSchedStore";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  const requireAdmin = async (req: express.Request, res: express.Response) => {
    const context = await createContext({ req, res } as any);
    if (!context.user || context.user.role !== "admin") { res.status(403).json({ error: "Administrator access required" }); return false; }
    return true;
  };
  app.get("/api/dashboard", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json({ courses: smartStore.courses.length, faculty: smartStore.faculty.length, rooms: smartStore.rooms.length, labs: smartStore.labs.length, equipment: smartStore.equipment.length, studentGroups: smartStore.student_groups.length, quality: analytics().metrics }); });
  app.get("/api/courses", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.courses); });
  app.get("/api/faculty", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.faculty); });
  app.get("/api/rooms", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.rooms); });
  app.get("/api/labs", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.labs); });
  app.get("/api/equipment", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.equipment); });
  app.get("/api/student-groups", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.student_groups); });
  app.get("/api/constraints", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(smartStore.constraints); });
  app.get("/api/schedule", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json({ schedule: smartStore.schedule, versions: smartStore.versions }); });
  app.get("/api/schedule/quality", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(analytics().metrics); });
  app.get("/api/analytics", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.json(analytics()); });
  app.post("/api/schedule/generate", async (req, res) => { if (!(await requireAdmin(req, res))) return; try { res.json(runOptimizer()); } catch (error) { res.status(422).json({ error: error instanceof Error ? error.message : "No feasible schedule found" }); } });
  app.get("/api/schedule/export", async (req, res) => { if (!(await requireAdmin(req, res))) return; const header = "Day,Time,Course,Course Code,Faculty,Student Group,Room,Duration\\n"; const body = smartStore.schedule.map(item => [item.day, `${item.start_time}-${item.end_time}`, item.course_name, item.course_code, item.faculty_id, item.student_group_id, item.room_name, item.duration_minutes].join(",")).join("\\n"); res.type("text/csv").send(header + body); });
  app.get("/api/schedule/export.xlsx", async (req, res) => { if (!(await requireAdmin(req, res))) return; const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet("Timetable"); sheet.columns = [{ header: "Day", key: "day" }, { header: "Time", key: "time" }, { header: "Course", key: "course" }, { header: "Course Code", key: "code" }, { header: "Faculty", key: "faculty" }, { header: "Student Group", key: "group" }, { header: "Room", key: "room" }, { header: "Duration", key: "duration" }]; smartStore.schedule.forEach(item => sheet.addRow({ day: item.day, time: `${item.start_time}-${item.end_time}`, course: item.course_name, code: item.course_code, faculty: item.faculty_id, group: item.student_group_id, room: item.room_name, duration: item.duration_minutes })); res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); res.setHeader("Content-Disposition", "attachment; filename=smartsched-timetable.xlsx"); await workbook.xlsx.write(res); res.end(); });
  app.get("/api/schedule/export.pdf", async (req, res) => { if (!(await requireAdmin(req, res))) return; res.type("application/pdf"); res.setHeader("Content-Disposition", "attachment; filename=smartsched-timetable.pdf"); const document = new PDFDocument({ margin: 36 }); document.pipe(res); document.fontSize(18).text("SmartSched Final Timetable"); document.moveDown(); document.fontSize(9); smartStore.schedule.forEach(item => document.text(`${item.day} ${item.start_time}-${item.end_time} | ${item.course_code} ${item.course_name} | ${item.room_name} | ${item.faculty_id}`)); document.end(); });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
