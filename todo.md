# Project TODO

- [x] Establish role-gated admin dashboard access and admin-only mutations
- [x] Add editable department master data for CSE, CSE AIML, IT, ECE, ME, EEE, and EE
- [x] Add editable lab room master data with room numbers, capacities, and active status
- [x] Add editable practical master data and department-wise allocations
- [x] Implement MongoDB-compatible operational data model and CRUD backend contracts
- [x] Seed the initial four-day weekly routine with at least four practical sessions
- [x] Add conflict-aware scheduling checks for room/time clashes and capacity mismatches
- [x] Build interactive weekly calendar and routine editor
- [x] Support create, update, reschedule, and remove allocation workflows
- [x] Add secure routine PDF upload and persistent import records with external file references
- [x] Add admin review and apply workflow for uploaded routine updates
- [x] Add server-side AI scheduling proposal workflow using configured API keys
- [x] Ensure AI proposals explain decisions and require admin review before application
- [x] Implement modern isometric teal/blue/coral visual system with grid texture and geometric depth
- [x] Write and run Vitest coverage for backend scheduling and authorization behavior
- [x] Verify responsive UI, API behavior, and production build
- [x] Save final checkpoint and deliver the project version
- [x] Add development-safe local data adapter while preserving a production MongoDB repository boundary
- [x] Document that a reachable remote MONGODB_URI is required before production MongoDB persistence is enabled
- [x] Add practical CRUD methods, procedures, and UI for editable practical metadata
- [x] Expose and persist room active/inactive status toggles
- [x] Add edit/reschedule controls for existing allocations
- [x] Add import review parsing/apply procedures for uploaded routine updates
- [x] Enforce persisted AI proposal review server-side before apply
- [x] Add Vitest coverage for conflict detection and admin authorization
- [x] Run production build and browser-verify success/error API flows
- [x] Add practical deletion support in store, router, and admin UI
- [x] Generate PDF import review records with proposed allocation updates and apply them only after admin approval
- [x] Browser-test room save, conflict save, PDF validation, and AI review/apply success/error paths attempted; blocked by sign-in human verification
- [x] Derive proposed allocation updates from uploaded PDF text instead of hardcoded draft data
- [x] Test PDF import parsing, review/apply behavior, and invalid-document errors

# PRD Revision — SmartSched SIH MVP

- [x] Map existing lab allocator workflows to SmartSched PRD acceptance criteria
- [x] Expand deterministic demo data to approximately 30 courses, 15 faculty, 10 rooms, 3 labs, 5 student groups, equipment, availability, and configurable time slots
- [x] Add editable CRUD data management for courses, faculty, rooms, laboratories, equipment, student groups, and availability
- [x] Add configurable hard and soft constraint definitions with weights
- [x] Integrate a real OR-Tools CP-SAT optimization service; do not use LLM output as the timetable generator
- [x] Add schedule generation, hard/soft violation scoring, and quality metrics from backend data
- [x] Add timetable visualization with room/faculty/group filters and multiple views
- [x] Add resource utilization analytics for rooms, labs, faculty, and equipment
- [x] Add what-if resource unavailability simulation and affected-class identification
- [x] Add dynamic schedule repair with minimum-disruption comparison before versus after
- [x] Add final timetable export workflow
- [x] Add CSV import validation for institutional data files
- [x] Add PRD-specific backend tests, optimization tests, repair tests, import tests, and authorization tests
- [x] Verify PRD core journey and save revised checkpoint

# PRD Hardening Pass

- [x] Create a PRD traceability document mapping acceptance criteria to routes, store functions, UI sections, and tests
- [x] Make soft-constraint weights editable and feed enabled weights into the CP-SAT objective
- [x] Implement full schedule validation and scoring for faculty, student groups, resources, equipment, availability, and soft violations
- [x] Add equipment utilization analytics and dashboard presentation
- [x] Freeze unaffected assignments during repair and show exact before/after changes
- [x] Add PDF and Excel exports alongside CSV
- [x] Add SmartSched admin authorization tests for generate, schedule, analytics, simulate, repair, and export
- [x] Complete editable CRUD UI for institutional entities and richer timetable filters/views

# PRD Final Gap Closure

- [x] Add numeric soft-constraint weight controls and persist them through the UI
- [x] Validate faculty availability in schedule quality checks
- [x] Render equipment utilization in the analytics UI
- [x] Render exact before/after repair assignment changes
- [x] Expose PDF and Excel exports in the admin UI
- [x] Add simulate, repair, and export admin authorization tests

# Final Delivery Closure

- [x] Add create/delete controls for SmartSched master entities and availability editing
- [x] Render the complete repair change list without truncation
- [x] Save a new revised checkpoint after the PRD hardening pass
- [x] Attempt authenticated browser workflow verification; visual preview passed and external sign-in verification remains documented as blocked

# Final Gap Fix

- [x] Add an explicit Room versus Laboratory resource type in the admin editor
- [x] Route laboratory create/delete operations to the labs collection and test both paths
- [x] Document the actual authenticated preview verification state and remaining sign-in limitation, if any

# Final Presentation Fix

- [x] Add alternate timetable views for grid, room-centric, and faculty-centric inspection

# Timetable View Closure

- [x] Implement a true room-centric timetable view grouped into room/lab sections
- [x] Implement a true faculty-centric timetable view grouped into faculty sections
- [x] Validate distinct grid, room, and faculty timetable experiences

# Final Verification Closure

- [x] Run the timetable view-mode test in the project’s executed Vitest scope
- [x] Document that browser mode switching remains unverified if external sign-in blocks interaction
