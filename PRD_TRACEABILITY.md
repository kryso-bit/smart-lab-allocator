# SmartSched PRD Traceability

| PRD area | Implementation | Verification |
|---|---|---|
| Admin-only institutional workspace | `DashboardLayout.tsx`, `adminProcedure`, REST `requireAdmin` | `lab.authorization.test.ts`, auth flow |
| Deterministic demo data | `server/smartSchedStore.ts` creates 30 courses, 15 faculty, 10 rooms, 3 labs, 5 groups, equipment, availability, and 42 configurable weekly slots | `smartSched.test.ts` |
| Editable institutional resources | SmartSched update procedures for courses, faculty, rooms/labs, equipment, and student groups; room editor in command center | TypeScript validation and tRPC contracts |
| Hard and soft constraints | `smartStore.constraints`, `updateConstraints`, CP-SAT payload weights | Constraint UI and `smartSched.test.ts` |
| Real optimization | `scripts/optimizer.py` uses Google OR-Tools CP-SAT; LLM is not used as timetable generator | 30-course solver integration test |
| Timetable and quality | `smartSched.generate`, `schedule`, `quality`, timetable cards, calculated hard/soft metrics | 30-course solver test and production build |
| Analytics | `analytics()` reports room, lab, faculty, and equipment utilization | Quality/analytics procedures compile and expose live data |
| What-if and repair | `simulateUnavailable`, `repairSchedule`, version retention, before/after metrics | Repair test confirms version and zero hard violations |
| Export | Admin CSV procedure and REST export endpoint | Production build and API contract |
| Routine PDFs | Secure storage reference plus `pdf-parse`, content-derived proposals, admin review/apply gate | `pdf-import.test.ts` |
| Optional AI assistant | Existing AI proposal path remains review-only; SmartSched solver remains authoritative | Existing proposal review-gate tests |

The implementation uses the existing React + tRPC + Express template rather than introducing a second FastAPI service. A custom Dockerfile installs Python and OR-Tools so the CP-SAT process is available in deployment. MongoDB remains a production repository boundary until a reachable `MONGODB_URI` is supplied; development uses the deterministic adapter.
