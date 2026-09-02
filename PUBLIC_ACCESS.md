# Public Access Mode

SmartSched is configured as a public-access workspace. Visitors can open the application without Manus sign-in and use the dashboard, timetable views, institutional data panel, optimization workflow, analytics, simulation, repair, and export controls.

The frontend no longer renders a sign-in or administrator-role gate. SmartSched and legacy lab procedures are exposed through public tRPC procedures so the unauthenticated browser can load and operate the application. Uploaded routine files use a shared public storage prefix rather than a user-specific identity prefix.

Because authentication has intentionally been removed, any public visitor can invoke data mutations and scheduling operations. This mode is appropriate for an internal trusted network or a controlled demonstration. Before exposing the site to the open Internet with real institutional data, add an alternative access control mechanism such as an institution SSO, signed admin links, network allow-listing, or a separate read-only public viewer with protected write APIs.

The application continues to use the deterministic development adapter unless a reachable remote `MONGODB_URI` and `MONGODB_DB_NAME` are configured for production persistence.
