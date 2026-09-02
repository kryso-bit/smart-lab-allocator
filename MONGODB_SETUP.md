# MongoDB persistence setup

The current preview runs on a development-safe in-memory adapter so the admin dashboard remains usable without a reachable database server. The operational model is isolated behind `server/labStore.ts`, making the persistence implementation replaceable without changing the tRPC contracts or UI vocabulary.

To enable remote MongoDB persistence for a deployment, provide a reachable `MONGODB_URI` beginning with `mongodb://` or `mongodb+srv://`, set `MONGODB_DB_NAME` to `smart_lab_allocator` or another approved database name, and set `ENABLE_MONGODB=true`. A MongoDB Atlas cluster is recommended for managed hosting. The cluster network access rules must allow the deployed application to connect, and the database user must have read/write access to the allocator database.

Do not use `localhost` or `127.0.0.1` for a deployed application. The MongoDB URI must point to a remote cluster accessible from the managed runtime. Until those settings are supplied and validated, the local adapter is intentional and prevents failed database connections from breaking the preview.
